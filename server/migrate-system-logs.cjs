const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, 'school.db');

function columnExists(db, table, column) {
  const stmt = db.prepare('PRAGMA table_info(' + table + ')');
  const rows = stmt.all();
  return rows.some(r => r.name === column);
}

function addColumn(db, table, column, type) {
  if (columnExists(db, table, column)) return;
  db.prepare('ALTER TABLE ' + table + ' ADD COLUMN ' + column + ' ' + type).run();
}

try {
  const db = new Database(dbPath);

  addColumn(db, 'systemLogs', 'locationCity', 'TEXT');
  addColumn(db, 'systemLogs', 'locationRegion', 'TEXT');
  addColumn(db, 'systemLogs', 'locationCountry', 'TEXT');
  addColumn(db, 'systemLogs', 'latitude', 'REAL');
  addColumn(db, 'systemLogs', 'longitude', 'REAL');
  addColumn(db, 'systemLogs', 'timezone', 'TEXT');
  addColumn(db, 'systemLogs', 'deviceType', 'TEXT');
  addColumn(db, 'systemLogs', 'os', 'TEXT');
  addColumn(db, 'systemLogs', 'osVersion', 'TEXT');
  addColumn(db, 'systemLogs', 'browser', 'TEXT');
  addColumn(db, 'systemLogs', 'browserVersion', 'TEXT');

  addColumn(db, 'systemLogs', 'metadata', 'TEXT');
  addColumn(db, 'systemLogs', 'code', 'TEXT');

  console.log('SystemLogs table migration completed successfully.');
  db.close();
} catch (err) {
  console.error('Migration failed:', err);
  process.exit(1);
}
