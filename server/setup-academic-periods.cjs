// Script para criar tabela de períodos acadêmicos
const Database = require('better-sqlite3');
const fs = require('fs');

async function setupAcademicPeriods() {
  console.log('🔧 Configurando tabela de períodos acadêmicos...');
  
  try {
    // Ler arquivo SQL
    const sql = fs.readFileSync('./server/create-academic-periods-table.sql', 'utf8');
    
    // Conectar ao banco
    const db = new Database('./server/school.db');
    
    // Executar SQL
    db.exec(sql);
    
    console.log('✅ Tabela academicPeriods criada com sucesso!');
    
    db.close();
    
  } catch (error) {
    console.error('❌ Erro ao criar tabela:', error);
  }
}

setupAcademicPeriods();



