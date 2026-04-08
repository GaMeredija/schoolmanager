const Database = require('better-sqlite3');
const path = require('path');

try {
  const dbPath = path.join(__dirname, 'school.db');
  const db = new Database(dbPath);

  const table = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='systemLogs'`).get();
  if (!table) {
    console.log('Tabela systemLogs não existe. Nada para limpar.');
    process.exit(0);
  }

  const before = db.prepare(`SELECT COUNT(*) AS total FROM systemLogs`).get();
  db.prepare(`DELETE FROM systemLogs`).run();
  // Otimizar arquivo após limpeza
  db.pragma('wal_checkpoint(TRUNCATE)');
  db.prepare(`VACUUM`).run();
  const after = db.prepare(`SELECT COUNT(*) AS total FROM systemLogs`).get();

  console.log(`✅ Logs limpos. Antes: ${before.total} | Depois: ${after.total}`);
  db.close();
} catch (err) {
  console.error('❌ Falha ao limpar logs:', err.message);
  process.exit(1);
}