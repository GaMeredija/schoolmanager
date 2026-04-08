const Database = require('better-sqlite3');

try {
  const db = new Database('./school.db');
  
  // Verificar se a tabela existe
  const tableExists = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='systemLogs'
  `).get();
  
  console.log('Tabela systemLogs existe:', !!tableExists);
  
  if (tableExists) {
    // Verificar estrutura da tabela
    const schema = db.prepare(`PRAGMA table_info(systemLogs)`).all();
    console.log('Estrutura da tabela:');
    schema.forEach(col => {
      console.log(`  ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
    });
    
    // Contar registros
    const count = db.prepare(`SELECT COUNT(*) as total FROM systemLogs`).get();
    console.log(`Total de registros: ${count.total}`);
    
    // Mostrar alguns registros se existirem
    if (count.total > 0) {
      const logs = db.prepare(`SELECT * FROM systemLogs ORDER BY timestamp DESC LIMIT 5`).all();
      console.log('Últimos 5 logs:');
      logs.forEach(log => {
        console.log(`  ${log.timestamp} [${log.level}] ${log.action}: ${log.description}`);
      });
    }
  }
  
  db.close();
} catch (error) {
  console.error('Erro:', error.message);
}