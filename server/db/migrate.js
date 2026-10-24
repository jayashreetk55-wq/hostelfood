/**
 * migrate.js — Creates all tables from schema.sql
 * Run: node server/db/migrate.js
 */
require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const { exec } = require('../config/database');

async function migrate() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema     = fs.readFileSync(schemaPath, 'utf-8');

  // Remove comment lines so exec() doesn't choke on them
  const cleaned = schema
    .split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .join('\n');

  await exec(cleaned);
  console.log('✅ Database migration complete — all tables created.');
  process.exit(0);
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
