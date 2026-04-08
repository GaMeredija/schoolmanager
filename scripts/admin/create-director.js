const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

async function createDirector() {
  const db = new sqlite3.Database('./server/school.db');
  
  try {
    const hashedPassword = await bcrypt.hash('123', 10);
    const now = new Date().toISOString();
    
    const sql = `INSERT INTO users (id, email, password, firstName, lastName, role, status, phone, address, registrationNumber, createdAt, updatedAt) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    db.run(sql, [
      'director_001',
      'diretor@escola.com', 
      hashedPassword,
      'Diretor',
      'Escola',
      'director',
      'active',
      '(11) 99999-9999',
      'Rua da Escola, 123',
      'DIR001',
      now,
      now
    ], function(err) {
      if (err) {
        console.error('❌ Erro:', err);
      } else {
        console.log('✅ Diretor criado com sucesso!');
        console.log('📧 Email: diretor@escola.com');
        console.log('🔑 Senha: 123');
      }
      db.close();
    });
    
  } catch (error) {
    console.error('❌ Erro:', error);
    db.close();
  }
}

createDirector();




