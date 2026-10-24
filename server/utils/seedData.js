/**
 * seedData.js — Populates the DB with sample data
 * Run: npm run seed
 */
require('dotenv').config();
const bcrypt = require('bcrypt');
const dbConn = require('../config/database');

// Run migration first (creates tables if they don't exist)
const fs   = require('fs');
const path = require('path');

async function seed() {
  // ── 1. Run schema ─────────────────────────────────────────
  const schema = fs.readFileSync(path.join(__dirname, '../db/schema.sql'), 'utf-8');
  const cleaned = schema.split('\n').filter(l => !l.trim().startsWith('--')).join('\n');
  await dbConn.exec(cleaned);
  console.log('🌱 Seeding database...');

  // ── 2. Users ──────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('password123', 10);
  const users = [
    { name: 'Admin User',     email: 'admin@hostel.edu',   role: 'admin'   },
    { name: 'Mess Manager',   email: 'manager@hostel.edu', role: 'manager' },
    { name: 'Student Viewer', email: 'student@hostel.edu', role: 'viewer'  }
  ];
  for (const u of users) {
    await dbConn.run(
      `INSERT OR IGNORE INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)`,
      [u.name, u.email, passwordHash, u.role]
    );
  }
  console.log('  ✅ Users seeded');

  // ── 3. Food Items ─────────────────────────────────────────
  const foodItems = [
    { name: 'Rice',          category: 'Grain',     unit: 'kg',     ef: 2.7  },
    { name: 'Chapati',       category: 'Grain',     unit: 'kg',     ef: 1.4  },
    { name: 'Dal',           category: 'Legume',    unit: 'kg',     ef: 0.9  },
    { name: 'Sambar',        category: 'Legume',    unit: 'litres', ef: 0.8  },
    { name: 'Paneer',        category: 'Dairy',     unit: 'kg',     ef: 3.2  },
    { name: 'Milk',          category: 'Dairy',     unit: 'litres', ef: 3.2  },
    { name: 'Mixed Veggies', category: 'Vegetable', unit: 'kg',     ef: 0.4  },
    { name: 'Potato Curry',  category: 'Vegetable', unit: 'kg',     ef: 0.45 },
    { name: 'Chicken Curry', category: 'Non-Veg',   unit: 'kg',     ef: 6.9  },
    { name: 'Egg Bhurji',    category: 'Non-Veg',   unit: 'kg',     ef: 4.8  },
    { name: 'Curd',          category: 'Dairy',     unit: 'kg',     ef: 2.4  },
    { name: 'Idli',          category: 'Grain',     unit: 'pieces', ef: 0.5  },
    { name: 'Upma',          category: 'Grain',     unit: 'kg',     ef: 0.6  },
    { name: 'Fruit Salad',   category: 'Fruit',     unit: 'kg',     ef: 0.3  },
    { name: 'Kheer',         category: 'Dairy',     unit: 'kg',     ef: 2.9  }
  ];
  for (const f of foodItems) {
    await dbConn.run(
      `INSERT OR IGNORE INTO food_items (name, category, unit, emission_factor) VALUES (?, ?, ?, ?)`,
      [f.name, f.category, f.unit, f.ef]
    );
  }
  console.log('  ✅ Food items seeded');

  // ── 4. Get IDs ────────────────────────────────────────────
  const admin   = await dbConn.get(`SELECT id FROM users WHERE email = 'admin@hostel.edu'`);
  const manager = await dbConn.get(`SELECT id FROM users WHERE email = 'manager@hostel.edu'`);

  const getFoodId = (name) => dbConn.get(
    `SELECT id, emission_factor FROM food_items WHERE name = ?`, [name]
  );

  // ── 5. Sample Menus (last 7 days) ─────────────────────────
  const sampleDays = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    sampleDays.push(d.toISOString().split('T')[0]);
  }

  const mealPlans = {
    breakfast: [
      { name: 'Idli',   qty: 200 },
      { name: 'Sambar', qty: 20  },
      { name: 'Curd',   qty: 15  }
    ],
    lunch: [
      { name: 'Rice',         qty: 40 },
      { name: 'Dal',          qty: 20 },
      { name: 'Mixed Veggies', qty: 15 },
      { name: 'Chapati',      qty: 10 }
    ],
    dinner: [
      { name: 'Chapati', qty: 25 },
      { name: 'Paneer',  qty: 8  },
      { name: 'Dal',     qty: 15 },
      { name: 'Kheer',   qty: 10 }
    ]
  };

  const wasteRatios = [0.20, 0.15, 0.30, 0.10, 0.25, 0.18, 0.22];

  for (let di = 0; di < sampleDays.length; di++) {
    const date  = sampleDays[di];
    const ratio = wasteRatios[di];

    for (const [mealType, items] of Object.entries(mealPlans)) {
      // Create menu (ignore if exists from a previous seed run)
      await dbConn.run(
        `INSERT OR IGNORE INTO menus (date, meal_type, created_by) VALUES (?, ?, ?)`,
        [date, mealType, admin.id]
      );
      const menu = await dbConn.get(
        `SELECT id FROM menus WHERE date = ? AND meal_type = ?`, [date, mealType]
      );

      for (const item of items) {
        const food = await getFoodId(item.name);
        if (!food) continue;

        // Add menu item
        const { lastID: menuItemId } = await dbConn.run(
          `INSERT INTO menu_items (menu_id, food_item_id, quantity_planned) VALUES (?, ?, ?)`,
          [menu.id, food.id, item.qty]
        );

        // Log waste
        const wasted = parseFloat((item.qty * ratio * (0.8 + Math.random() * 0.4)).toFixed(2));
        const pct    = parseFloat(((wasted / item.qty) * 100).toFixed(2));
        const co2    = parseFloat((wasted * food.emission_factor).toFixed(4));

        await dbConn.run(`
          INSERT INTO waste_entries
            (menu_item_id, quantity_wasted, waste_percentage, carbon_emission_kg, logged_by)
          VALUES (?, ?, ?, ?, ?)
        `, [menuItemId, wasted, pct, co2, manager.id]);
      }
    }
  }

  console.log('  ✅ Sample menus and waste entries seeded (7 days)');
  console.log('\n🎉 Seeding complete!');
  console.log('\n📋 Login credentials:');
  console.log('   Admin:   admin@hostel.edu   / password123');
  console.log('   Manager: manager@hostel.edu / password123');
  console.log('   Viewer:  student@hostel.edu / password123');
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
