const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

async function addDirector() {
  try {
    console.log('👤 Adicionando usuário diretor...');

    const db = new Database('server/school.db');
    const now = new Date().toISOString();
    const hashedPassword = await bcrypt.hash('123456', 10);

    // Verificar se o diretor já existe
    const existingDirector = db.prepare('SELECT * FROM users WHERE email = ?').get('diretor@escola.com');
    
    if (existingDirector) {
      console.log('✅ Diretor já existe no banco de dados');
      db.close();
      return;
    }

    // Criar o diretor
    const stmt = db.prepare(`
      INSERT INTO users (id, email, password, firstName, lastName, role, status, phone, address, registrationNumber, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
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
    );

    console.log('✅ Diretor criado com sucesso!');
    console.log('📧 Email: diretor@escola.com');
    console.log('🔑 Senha: 123456');

    db.close();

  } catch (error) {
    console.error('❌ Erro ao criar diretor:', error);
    throw error;
  }
}

addDirector()
  .then(() => {
    console.log('🎉 Diretor adicionado com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro:', error);
    process.exit(1);
  });

