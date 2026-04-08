import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'school.db');

function columnExists(db: Database.Database, table: string, column: string): boolean {
  const stmt = db.prepare(PRAGMA table_info());
  const rows = stmt.all() as Array<{ name: string }>;
  return rows.some(r => r.name === column);
}

function addColumn(db: Database.Database, table: string, column: string, type: string) {
  if (columnExists(db, table, column)) return;
  db.prepare(ALTER TABLE  ADD COLUMN  ).run();
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
