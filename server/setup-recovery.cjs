// Script para criar tabelas de recuperação de senha
const Database = require('better-sqlite3');
const fs = require('fs');

async function setupRecoveryTables() {
  console.log('🔧 Configurando sistema de recuperação de senha...');
  
  try {
    // Ler arquivo SQL
    const sql = fs.readFileSync('./server/create-recovery-tables.sql', 'utf8');
    
    // Conectar ao banco
    const db = new Database('./database.sqlite');
    
    // Executar SQL
    db.exec(sql);
    
    console.log('✅ Tabelas de recuperação criadas com sucesso!');
    console.log('📋 Tabelas criadas:');
    console.log('   - password_recovery_codes');
    console.log('   - temp_tokens');
    
    db.close();
    
  } catch (error) {
    console.error('❌ Erro ao criar tabelas:', error);
  }
}

setupRecoveryTables();
