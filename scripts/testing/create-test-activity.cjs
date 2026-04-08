const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');

const dbPath = './server/school.db';

try {
  const db = new Database(dbPath);
  
  console.log('=== CRIANDO ATIVIDADE DE TESTE ===');
  
  // Buscar turma do aluno teste
  const student = db.prepare('SELECT * FROM users WHERE email = ?').get('teste.teste@escola.com');
  if (!student) {
    console.log('❌ Aluno teste não encontrado');
    process.exit(1);
  }
  
  console.log(`✅ Aluno encontrado: ${student.firstName} ${student.lastName} (ID: ${student.id})`);
  
  // Buscar matrícula do aluno
  const enrollment = db.prepare('SELECT * FROM studentClass WHERE studentId = ? AND status = ?').get(student.id, 'active');
  if (!enrollment) {
    console.log('❌ Aluno não está matriculado em nenhuma turma');
    process.exit(1);
  }
  
  console.log(`✅ Aluno matriculado na turma ID: ${enrollment.classId}`);
  
  // Buscar informações da turma
  const classInfo = db.prepare('SELECT * FROM classes WHERE id = ?').get(enrollment.classId);
  console.log(`✅ Turma: ${classInfo.name}`);
  
  // Buscar uma matéria para a turma
  const subject = db.prepare('SELECT * FROM subjects LIMIT 1').get();
  if (!subject) {
    console.log('❌ Nenhuma matéria encontrada');
    process.exit(1);
  }
  
  console.log(`✅ Matéria: ${subject.name} (${subject.code})`);
  
  // Criar atividade de teste
  const activityId = uuidv4();
  const now = new Date().toISOString();
  const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 dias a partir de hoje
  
  const insertActivity = db.prepare(`
    INSERT INTO activities (
      id, title, description, subjectId, teacherId, classId, dueDate, maxGrade,
      instructions, requirements, status, allowLateSubmission, latePenalty,
      maxFileSize, allowedFileTypes, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const result = insertActivity.run(
    activityId,
    'Atividade de Teste',
    'Esta é uma atividade de teste para verificar o sistema',
    subject.id,
    student.id, // teacherId - usando o próprio aluno como professor para teste
    enrollment.classId,
    dueDate,
    10.0,
    'Complete esta atividade de teste seguindo as instruções.',
    'Arquivo em formato PDF ou DOC',
    'active',
    1, // allowLateSubmission
    0.1, // latePenalty (10%)
    5242880, // maxFileSize (5MB)
    'pdf,doc,docx,txt',
    now,
    now
  );
  
  if (result.changes > 0) {
    console.log('✅ Atividade de teste criada com sucesso!');
    console.log(`   ID: ${activityId}`);
    console.log(`   Título: Atividade de Teste`);
    console.log(`   Matéria: ${subject.name}`);
    console.log(`   Turma: ${classInfo.name}`);
    console.log(`   Data de entrega: ${new Date(dueDate).toLocaleDateString('pt-BR')}`);
  } else {
    console.log('❌ Erro ao criar atividade');
  }
  
  db.close();
  
} catch (error) {
  console.error('❌ Erro:', error.message);
  process.exit(1);
}