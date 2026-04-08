import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';

async function setupDatabase() {
  const client = createClient({
    url: 'file:school.db',
  });

  try {
    console.log('🚀 Configurando banco de dados...');

    // Criar tabelas
    await client.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        firstName TEXT NOT NULL,
        lastName TEXT NOT NULL,
        profileImageUrl TEXT,
        role TEXT NOT NULL CHECK (role IN ('admin', 'coordinator', 'teacher', 'student')),
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
        lastSeen TEXT,
        phone TEXT,
        address TEXT,
        birthDate TEXT,
        registrationNumber TEXT NOT NULL UNIQUE,
        createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
      );
    `);

    // Migrar coluna birthDate se banco já existir sem a coluna
    try {
      const cols = await client.execute({ sql: `PRAGMA table_info(users)`, args: [] });
      const hasBirthDate = Array.isArray(cols.rows) && cols.rows.some((r: any) => String((r as any).name || (r as any).Name || '').toLowerCase() === 'birthdate');
      if (!hasBirthDate) {
        await client.execute(`ALTER TABLE users ADD COLUMN birthDate TEXT`);
        console.log('✅ Coluna birthDate adicionada na tabela users');
      }
    } catch (e) {
      console.warn('Não foi possível verificar/adicionar coluna birthDate:', e);
    }

    await client.execute(`
      CREATE TABLE IF NOT EXISTS subjects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        code TEXT NOT NULL UNIQUE,
        description TEXT,
        credits INTEGER NOT NULL DEFAULT 0,
        workload INTEGER NOT NULL DEFAULT 0,
        teacherId TEXT REFERENCES users(id),
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS classes (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        grade TEXT NOT NULL,
        section TEXT NOT NULL,
        academicYear TEXT NOT NULL,
        capacity INTEGER NOT NULL DEFAULT 30,
        currentStudents INTEGER NOT NULL DEFAULT 0,
        coordinatorId TEXT REFERENCES users(id),
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed')),
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS classSubjects (
        id TEXT PRIMARY KEY,
        classId TEXT REFERENCES classes(id),
        subjectId TEXT REFERENCES subjects(id),
        teacherId TEXT REFERENCES users(id),
        schedule TEXT,
        room TEXT,
        semester TEXT,
        academicYear TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed')),
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS studentClass (
        id TEXT PRIMARY KEY,
        studentId TEXT REFERENCES users(id),
        classId TEXT REFERENCES classes(id),
        enrollmentDate TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'dropped', 'completed')),
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS activities (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        subjectId TEXT REFERENCES subjects(id),
        teacherId TEXT REFERENCES users(id),
        classId TEXT REFERENCES classes(id),
        dueDate TEXT NOT NULL,
        maxGrade REAL NOT NULL DEFAULT 10,
        instructions TEXT,
        requirements TEXT,
        status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'expired', 'archived')),
        allowLateSubmission INTEGER NOT NULL DEFAULT 0,
        latePenalty REAL NOT NULL DEFAULT 0,
        maxFileSize INTEGER NOT NULL DEFAULT 10,
        allowedFileTypes TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS activitySubmissions (
        id TEXT PRIMARY KEY,
        activityId TEXT REFERENCES activities(id),
        studentId TEXT REFERENCES users(id),
        submittedAt TEXT NOT NULL,
        comment TEXT,
        status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'late', 'graded', 'returned', 'resubmitted')),
        grade REAL,
        maxGrade REAL NOT NULL DEFAULT 10,
        feedback TEXT,
        gradedBy TEXT REFERENCES users(id),
        gradedAt TEXT,
        isLate INTEGER NOT NULL DEFAULT 0,
        latePenaltyApplied REAL NOT NULL DEFAULT 0,
        finalGrade REAL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
    `);

    console.log('✅ Tabelas criadas!');

    // Inserir dados básicos
    const now = new Date().toISOString();
    const defaultPassword = await bcrypt.hash('123456', 10);

    // Usuários
    await client.execute({
      sql: `INSERT OR REPLACE INTO users (id, email, password, firstName, lastName, role, status, birthDate, registrationNumber, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: ['admin_001', 'admin@escola.com', defaultPassword, 'Admin', 'Sistema', 'admin', 'active', '1980-01-15', 'ADM001', now, now]
    });

    await client.execute({
      sql: `INSERT OR REPLACE INTO users (id, email, password, firstName, lastName, role, status, birthDate, registrationNumber, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: ['teacher_001', 'professor@escola.com', defaultPassword, 'João', 'Santos', 'teacher', 'active', '1985-06-23', 'PROF001', now, now]
    });

    await client.execute({
      sql: `INSERT OR REPLACE INTO users (id, email, password, firstName, lastName, role, status, birthDate, registrationNumber, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: ['student_001', 'aluno@escola.com', defaultPassword, 'Pedro', 'Oliveira', 'student', 'active', '2012-09-08', 'ALU001', now, now]
    });

    await client.execute({
      sql: `INSERT OR REPLACE INTO users (id, email, password, firstName, lastName, role, status, birthDate, registrationNumber, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: ['student_002', 'aluna@escola.com', defaultPassword, 'Ana', 'Costa', 'student', 'active', '2013-02-11', 'ALU002', now, now]
    });

    // Disciplinas
    await client.execute({
      sql: `INSERT OR REPLACE INTO subjects (id, name, code, description, credits, workload, teacherId, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: ['subject_001', 'Matemática', 'MAT001', 'Matemática básica e avançada', 4, 80, 'teacher_001', 'active', now, now]
    });

    // Turmas
    await client.execute({
      sql: `INSERT OR REPLACE INTO classes (id, name, grade, section, academicYear, capacity, currentStudents, coordinatorId, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: ['class_001', '9º Ano A', '9', 'A', '2024', 30, 2, 'admin_001', 'active', now, now]
    });

    // Relacionar turma com disciplina
    await client.execute({
      sql: `INSERT OR REPLACE INTO classSubjects (id, classId, subjectId, teacherId, schedule, room, semester, academicYear, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: ['cs_001', 'class_001', 'subject_001', 'teacher_001', 'Segunda 08:00-09:40', 'Sala 101', '1º Semestre', '2024', 'active', now, now]
    });

    // Matricular alunos
    await client.execute({
      sql: `INSERT OR REPLACE INTO studentClass (id, studentId, classId, enrollmentDate, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: ['sc_001', 'student_001', 'class_001', now, 'enrolled', now, now]
    });

    await client.execute({
      sql: `INSERT OR REPLACE INTO studentClass (id, studentId, classId, enrollmentDate, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: ['sc_002', 'student_002', 'class_001', now, 'enrolled', now, now]
    });

    // Criar atividade
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);
    const dueDateStr = dueDate.toISOString();

    await client.execute({
      sql: `INSERT OR REPLACE INTO activities (id, title, description, subjectId, teacherId, classId, dueDate, maxGrade, instructions, requirements, status, allowLateSubmission, latePenalty, maxFileSize, allowedFileTypes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: ['activity_001', 'Exercícios de Álgebra', 'Resolver os exercícios do capítulo 5 sobre equações do segundo grau', 'subject_001', 'teacher_001', 'class_001', dueDateStr, 10.0, 'Resolva todos os exercícios mostrando os cálculos', 'Arquivo PDF ou imagem legível', 'active', 1, 1.0, 10, 'pdf,jpg,png,doc,docx', now, now]
    });

    console.log('✅ Dados básicos inseridos!');
    console.log('📚 Usuários criados:');
    console.log('  - Admin: admin@escola.com (senha: 123456)');
    console.log('  - Professor: professor@escola.com (senha: 123456)');
    console.log('  - Aluno 1: aluno@escola.com (senha: 123456)');
    console.log('  - Aluno 2: aluna@escola.com (senha: 123456)');
    console.log('🎯 1 disciplina, 1 turma, 1 atividade criada');

    // Verificar dados
    const users = await client.execute('SELECT id, email, firstName, lastName, role FROM users');
    console.log('👥 Usuários no banco:', users.rows);

    const activities = await client.execute('SELECT id, title, status FROM activities');
    console.log('📚 Atividades no banco:', activities.rows);

  } catch (error) {
    console.error('❌ Erro:', error);
    throw error;
  } finally {
    client.close();
  }
}

setupDatabase()
  .then(() => {
    console.log('🎉 Setup concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Falha:', error);
    process.exit(1);
  });
