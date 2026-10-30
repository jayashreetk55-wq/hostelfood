/**
 * migrate_sit_features.js
 * Non-destructive migration to add:
 * 1. Hostels & Messes master tables
 * 2. Extended food_items columns (source, density, weight_per_piece)
 * 3. food_records table (with prepared, served, leftover, discarded, hostel, mess, reason, remarks)
 * 4. carbon_calculations table
 * 5. Initial data seeding for SIT Hostels
 */

const db = require('../config/database');

async function migrate() {
  console.log('--- Starting SIT Features Database Migration ---');

  // 1. Hostels table
  await db.run(`
    CREATE TABLE IF NOT EXISTS hostels (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL UNIQUE,
      block_type  TEXT NOT NULL CHECK(block_type IN ('boys', 'girls')),
      capacity    INTEGER NOT NULL,
      mess_name   TEXT NOT NULL,
      created_at  DATETIME NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Insert or ignore the 6 official SIT Hostels
  const hostels = [
    { id: 1, name: 'Lalbahadur Shastri Block', block_type: 'boys', capacity: 328, mess_name: 'LBS Mess' },
    { id: 2, name: 'Basaveshwara Block', block_type: 'boys', capacity: 580, mess_name: 'Basaveshwara Mess' },
    { id: 3, name: 'Allamaprabhu Block', block_type: 'boys', capacity: 328, mess_name: 'Allamaprabhu Mess' },
    { id: 4, name: 'Mahatma Gandhi Block', block_type: 'girls', capacity: 355, mess_name: 'MG Block Mess' },
    { id: 5, name: 'Akkamahadevi Block', block_type: 'girls', capacity: 240, mess_name: 'Akkamahadevi Mess' },
    { id: 6, name: 'Ganga Hostel', block_type: 'girls', capacity: 300, mess_name: 'Ganga Mess' }
  ];

  for (const h of hostels) {
    const exists = await db.get(`SELECT id FROM hostels WHERE name = ?`, [h.name]);
    if (!exists) {
      await db.run(
        `INSERT INTO hostels (id, name, block_type, capacity, mess_name) VALUES (?, ?, ?, ?, ?)`,
        [h.id, h.name, h.block_type, h.capacity, h.mess_name]
      );
    }
  }

  // 2. Messes table
  await db.run(`
    CREATE TABLE IF NOT EXISTS messes (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL UNIQUE,
      hostel_id  INTEGER REFERENCES hostels(id),
      created_at DATETIME NOT NULL DEFAULT (datetime('now'))
    )
  `);

  for (const h of hostels) {
    const exists = await db.get(`SELECT id FROM messes WHERE name = ?`, [h.mess_name]);
    if (!exists) {
      await db.run(`INSERT INTO messes (name, hostel_id) VALUES (?, ?)`, [h.mess_name, h.id]);
    }
  }

  // 3. Add columns to food_items if not present
  const tableInfo = await db.all(`PRAGMA table_info(food_items)`);
  const colNames = tableInfo.map(c => c.name);

  if (!colNames.includes('source')) {
    await db.run(`ALTER TABLE food_items ADD COLUMN source TEXT DEFAULT 'IPCC / FAO 2023'`);
  }
  if (!colNames.includes('density_kg_per_l')) {
    await db.run(`ALTER TABLE food_items ADD COLUMN density_kg_per_l REAL DEFAULT 1.0`);
  }
  if (!colNames.includes('weight_per_piece_kg')) {
    await db.run(`ALTER TABLE food_items ADD COLUMN weight_per_piece_kg REAL DEFAULT 0.05`);
  }

  // Update specific known items with realistic conversion parameters & sources
  await db.run(`UPDATE food_items SET density_kg_per_l = 1.03, source = 'FAO Dairy LCA Study' WHERE name IN ('Milk', 'Curd')`);
  await db.run(`UPDATE food_items SET density_kg_per_l = 1.02, source = 'IPCC / Indian Food Composition Tables' WHERE name IN ('Sambar')`);
  await db.run(`UPDATE food_items SET weight_per_piece_kg = 0.05, source = 'NIN ICMR Dietary Guidelines' WHERE name = 'Idli'`);
  await db.run(`UPDATE food_items SET weight_per_piece_kg = 0.04, source = 'NIN ICMR Dietary Guidelines' WHERE name = 'Chapati'`);
  await db.run(`UPDATE food_items SET weight_per_piece_kg = 0.05, source = 'FAO Poultry LCA' WHERE name = 'Egg Bhurji'`);

  // 4. Create food_records table
  await db.run(`
    CREATE TABLE IF NOT EXISTS food_records (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      record_date         DATE NOT NULL,
      record_time         TEXT NOT NULL DEFAULT '12:00',
      hostel_id           INTEGER NOT NULL REFERENCES hostels(id),
      hostel_name         TEXT NOT NULL,
      mess_name           TEXT NOT NULL,
      meal_type           TEXT NOT NULL CHECK(meal_type IN ('breakfast', 'lunch', 'evening_snacks', 'dinner')),
      food_item_id        INTEGER REFERENCES food_items(id),
      food_name           TEXT NOT NULL,
      category            TEXT NOT NULL,
      quantity_prepared   REAL NOT NULL DEFAULT 0 CHECK(quantity_prepared >= 0),
      quantity_served     REAL NOT NULL DEFAULT 0 CHECK(quantity_served >= 0),
      quantity_leftover   REAL NOT NULL DEFAULT 0 CHECK(quantity_leftover >= 0),
      quantity_discarded  REAL NOT NULL DEFAULT 0 CHECK(quantity_discarded >= 0),
      unit                TEXT NOT NULL CHECK(unit IN ('kg', 'g', 'litres', 'ml', 'pieces')),
      total_waste_kg      REAL NOT NULL DEFAULT 0 CHECK(total_waste_kg >= 0),
      emission_factor     REAL NOT NULL DEFAULT 1.0,
      factor_source       TEXT DEFAULT 'IPCC / FAO',
      carbon_emission_kg  REAL NOT NULL DEFAULT 0 CHECK(carbon_emission_kg >= 0),
      reason              TEXT DEFAULT 'Normal operational leftovers',
      remarks             TEXT,
      logged_by           INTEGER DEFAULT 1 REFERENCES users(id),
      created_at          DATETIME NOT NULL DEFAULT (datetime('now')),
      updated_at          DATETIME NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // 5. Create carbon_calculations table (for Carbon Footprint Calculator history)
  await db.run(`
    CREATE TABLE IF NOT EXISTS carbon_calculations (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      hostel_id           INTEGER NOT NULL REFERENCES hostels(id),
      hostel_name         TEXT NOT NULL,
      calculation_date    DATE NOT NULL,
      meal_type           TEXT NOT NULL,
      food_item_id        INTEGER REFERENCES food_items(id),
      food_name           TEXT NOT NULL,
      category            TEXT NOT NULL,
      wasted_quantity     REAL NOT NULL CHECK(wasted_quantity >= 0),
      unit                TEXT NOT NULL,
      converted_kg        REAL NOT NULL,
      conversion_notes    TEXT,
      emission_factor     REAL NOT NULL,
      factor_source       TEXT,
      carbon_emission_kg  REAL NOT NULL,
      created_at          DATETIME NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // 6. Migrate existing legacy waste_entries to food_records if food_records is empty
  const recCount = await db.get(`SELECT COUNT(*) as c FROM food_records`);
  if (recCount.c === 0) {
    console.log('Migrating historical waste_entries into food_records...');
    const legacyEntries = await db.all(`
      SELECT
        m.date AS record_date,
        m.meal_type,
        fi.id AS food_item_id,
        fi.name AS food_name,
        fi.category,
        fi.unit,
        fi.emission_factor,
        fi.source AS factor_source,
        mi.quantity_planned AS quantity_prepared,
        (mi.quantity_planned - we.quantity_wasted) AS quantity_served,
        0 AS quantity_leftover,
        we.quantity_wasted AS quantity_discarded,
        we.quantity_wasted AS total_waste_kg,
        we.carbon_emission_kg,
        we.notes AS remarks,
        we.logged_by,
        we.logged_at AS created_at
      FROM waste_entries we
      JOIN menu_items mi ON mi.id = we.menu_item_id
      JOIN food_items fi ON fi.id = mi.food_item_id
      JOIN menus       m ON  m.id = mi.menu_id
    `);

    // Assign to SIT Hostels proportionally
    let hIdx = 0;
    for (const row of legacyEntries) {
      const hostel = hostels[hIdx % hostels.length];
      hIdx++;

      await db.run(`
        INSERT INTO food_records (
          record_date, record_time, hostel_id, hostel_name, mess_name,
          meal_type, food_item_id, food_name, category,
          quantity_prepared, quantity_served, quantity_leftover, quantity_discarded,
          unit, total_waste_kg, emission_factor, factor_source, carbon_emission_kg,
          reason, remarks, logged_by, created_at, updated_at
        ) VALUES (
          ?, '13:00', ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          'Normal mess service waste', ?, ?, ?, ?
        )
      `, [
        row.record_date, hostel.id, hostel.name, hostel.mess_name,
        row.meal_type, row.food_item_id, row.food_name, row.category,
        row.quantity_prepared, Math.max(0, row.quantity_served), row.quantity_leftover, row.quantity_discarded,
        row.unit, row.total_waste_kg, row.emission_factor, row.factor_source || 'IPCC / FAO', row.carbon_emission_kg,
        row.remarks, row.logged_by, row.created_at, row.created_at
      ]);
    }
    console.log(`Migrated ${legacyEntries.length} legacy entries to food_records across the 6 SIT hostels.`);
  }

  console.log('--- Migration completed successfully ---');
}

if (require.main === module) {
  migrate().then(() => process.exit(0)).catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
}

module.exports = migrate;
