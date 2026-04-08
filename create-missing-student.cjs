const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const dbPath = './server/school.db';

try {
  const db = new Database(dbPath);
  
  console.log('=== CRIANDO USUÁRIO ALUNO@ESCOLA.COM ===');
  
  // Verificar se já existe
  const existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get('aluno@escola.com');
  if (existingUser) {
    console.log('✅ Usuário já existe:', existingUser.firstName, existingUser.lastName);
    process.exit(0);
  }
  
  // Criar hash da senha
  const password = '123456';
  const hashedPassword = bcrypt.hashSync(password, 10);
  
  // Criar usuário
  const userId = uuidv4();
  const now = new Date().toISOString();
  
  const insertUser = db.prepare(`
    INSERT INTO users (
      id, email, password, firstName, lastName, role, status, 
      phone, address, registrationNumber, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const result = insertUser.run(
    userId,
    'aluno@escola.com',
    hashedPassword,
    'Aluno',
    'Padrão',
    'student',
    'active',
    '(11) 99999-9999',
    'Endereço do Aluno',
    '123456',
    now,
    now
  );
  
  if (result.changes > 0) {
    console.log('✅ Usuário criado com sucesso!');
    console.log(`   ID: ${userId}`);
    console.log('   Email: aluno@escola.com');
    console.log('   Nome: Aluno Padrão');
    console.log('   Senha: 123456');
    console.log('   Role: student');
    
    // Matricular o aluno na primeira turma disponível
    const firstClass = db.prepare('SELECT * FROM classes WHERE status = ? LIMIT 1').get('active');
    if (firstClass) {
      const enrollmentId = uuidv4();
      const insertEnrollment = db.prepare(`
        INSERT INTO studentClass (id, studentId, classId, status, enrolledAt)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      const enrollmentResult = insertEnrollment.run(
        enrollmentId,
        userId,
        firstClass.id,
        'active',
        now
      );
      
      if (enrollmentResult.changes > 0) {
        console.log(`✅ Aluno matriculado na turma: ${firstClass.name}`);
      }
    }
    
  } else {
    console.log('❌ Erro ao criar usuário');
  }
  
  db.close();
  
} catch (error) {
  console.error('❌ Erro:', error.message);
  process.exit(1);
}