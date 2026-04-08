import { db } from './db';
import { sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function seedBasicData() {
  try {
    console.log('🌱 Populando banco com dados básicos...');

    const now = new Date().toISOString();
    
    // Hash da senha padrão
    const defaultPassword = await bcrypt.hash('123456', 10);

    // Inserir usuários básicos
    await db.run(sql`
      INSERT OR REPLACE INTO users (id, email, password, firstName, lastName, role, status, registrationNumber, createdAt, updatedAt) VALUES
      ('admin_001', 'admin@escola.com', ${defaultPassword}, 'Admin', 'Sistema', 'admin', 'active', 'ADM001', ${now}, ${now}),
      ('coord_001', 'coordenador@escola.com', ${defaultPassword}, 'Maria', 'Silva', 'coordinator', 'active', 'COORD001', ${now}, ${now}),
      ('teacher_001', 'professor@escola.com', ${defaultPassword}, 'João', 'Santos', 'teacher', 'active', 'PROF001', ${now}, ${now}),
      ('student_001', 'aluno@escola.com', ${defaultPassword}, 'Pedro', 'Oliveira', 'student', 'active', 'ALU001', ${now}, ${now}),
      ('student_002', 'aluna@escola.com', ${defaultPassword}, 'Ana', 'Costa', 'student', 'active', 'ALU002', ${now}, ${now})
    `);

    // Inserir disciplinas
    await db.run(sql`
      INSERT OR REPLACE INTO subjects (id, name, code, description, credits, workload, teacherId, status, createdAt, updatedAt) VALUES
      ('subject_001', 'Matemática', 'MAT001', 'Matemática básica e avançada', 4, 80, 'teacher_001', 'active', ${now}, ${now}),
      ('subject_002', 'Português', 'PORT001', 'Língua Portuguesa e Literatura', 4, 80, 'teacher_001', 'active', ${now}, ${now}),
      ('subject_003', 'História', 'HIST001', 'História do Brasil e Mundial', 3, 60, 'teacher_001', 'active', ${now}, ${now})
    `);

    // Inserir turmas
    await db.run(sql`
      INSERT OR REPLACE INTO classes (id, name, grade, section, academicYear, capacity, currentStudents, coordinatorId, status, createdAt, updatedAt) VALUES
      ('class_001', '9º Ano A', '9', 'A', '2024', 30, 2, 'coord_001', 'active', ${now}, ${now}),
      ('class_002', '8º Ano B', '8', 'B', '2024', 30, 0, 'coord_001', 'active', ${now}, ${now})
    `);

    // Relacionar turma com disciplinas
    await db.run(sql`
      INSERT OR REPLACE INTO classSubjects (id, classId, subjectId, teacherId, schedule, room, semester, academicYear, status, createdAt, updatedAt) VALUES
      ('cs_001', 'class_001', 'subject_001', 'teacher_001', 'Segunda 08:00-09:40', 'Sala 101', '1º Semestre', '2024', 'active', ${now}, ${now}),
      ('cs_002', 'class_001', 'subject_002', 'teacher_001', 'Terça 08:00-09:40', 'Sala 102', '1º Semestre', '2024', 'active', ${now}, ${now}),
      ('cs_003', 'class_001', 'subject_003', 'teacher_001', 'Quarta 08:00-09:40', 'Sala 103', '1º Semestre', '2024', 'active', ${now}, ${now})
    `);

    // Matricular alunos na turma
    await db.run(sql`
      INSERT OR REPLACE INTO studentClass (id, studentId, classId, enrollmentDate, status, createdAt, updatedAt) VALUES
      ('sc_001', 'student_001', 'class_001', ${now}, 'enrolled', ${now}, ${now}),
      ('sc_002', 'student_002', 'class_001', ${now}, 'enrolled', ${now}, ${now})
    `);

    // Criar atividades de exemplo
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7); // 7 dias a partir de hoje
    const dueDateStr = dueDate.toISOString();

    await db.run(sql`
      INSERT OR REPLACE INTO activities (id, title, description, subjectId, teacherId, classId, dueDate, maxGrade, instructions, requirements, status, allowLateSubmission, latePenalty, maxFileSize, allowedFileTypes, createdAt, updatedAt) VALUES
      ('activity_001', 'Exercícios de Álgebra', 'Resolver os exercícios do capítulo 5 sobre equações do segundo grau', 'subject_001', 'teacher_001', 'class_001', ${dueDateStr}, 10.0, 'Resolva todos os exercícios mostrando os cálculos', 'Arquivo PDF ou imagem legível', 'active', 1, 1.0, 10, 'pdf,jpg,png,doc,docx', ${now}, ${now}),
      ('activity_002', 'Redação sobre Meio Ambiente', 'Escreva uma redação de 30 linhas sobre preservação ambiental', 'subject_002', 'teacher_001', 'class_001', ${dueDateStr}, 10.0, 'Mínimo 30 linhas, máximo 50 linhas', 'Arquivo de texto', 'active', 1, 0.5, 5, 'pdf,doc,docx,txt', ${now}, ${now}),
      ('activity_003', 'Pesquisa sobre Brasil Colônia', 'Pesquise sobre o período colonial brasileiro e faça um resumo', 'subject_003', 'teacher_001', 'class_001', ${dueDateStr}, 10.0, 'Resumo de 2 páginas com fontes', 'Documento formatado', 'active', 0, 0, 10, 'pdf,doc,docx', ${now}, ${now})
    `);

    // Criar algumas submissões de exemplo
    const submissionDate = new Date();
    submissionDate.setDate(submissionDate.getDate() - 1); // Ontem
    const submissionDateStr = submissionDate.toISOString();

    await db.run(sql`
      INSERT OR REPLACE INTO activitySubmissions (id, activityId, studentId, submittedAt, comment, status, grade, maxGrade, feedback, gradedBy, gradedAt, isLate, latePenaltyApplied, finalGrade, createdAt, updatedAt) VALUES
      ('submission_001', 'activity_001', 'student_001', ${submissionDateStr}, 'Resolvi todos os exercícios conforme solicitado', 'graded', 8.5, 10.0, 'Ótimo trabalho! Apenas alguns erros de cálculo no exercício 3.', 'teacher_001', ${now}, 0, 0, 8.5, ${submissionDateStr}, ${now}),
      ('submission_002', 'activity_002', 'student_002', ${submissionDateStr}, 'Redação sobre preservação da natureza', 'submitted', null, 10.0, null, null, null, 0, 0, null, ${submissionDateStr}, ${submissionDateStr})
    `);

    // Inserir algumas configurações básicas
    await db.run(sql`
      INSERT OR REPLACE INTO settings (id, key, value, description, category, updatedBy, createdAt, updatedAt) VALUES
      ('setting_001', 'school_name', 'Escola Exemplo', 'Nome da escola', 'general', 'admin_001', ${now}, ${now}),
      ('setting_002', 'academic_year', '2024', 'Ano letivo atual', 'academic', 'admin_001', ${now}, ${now}),
      ('setting_003', 'max_file_size', '10', 'Tamanho máximo de arquivo em MB', 'general', 'admin_001', ${now}, ${now})
    `);

    console.log('✅ Dados básicos inseridos com sucesso!');
    console.log('📚 Usuários criados:');
    console.log('  - Admin: admin@escola.com (senha: 123456)');
    console.log('  - Coordenador: coordenador@escola.com (senha: 123456)');
    console.log('  - Professor: professor@escola.com (senha: 123456)');
    console.log('  - Aluno 1: aluno@escola.com (senha: 123456)');
    console.log('  - Aluno 2: aluna@escola.com (senha: 123456)');
    console.log('🎯 3 disciplinas, 1 turma, 3 atividades e 2 submissões criadas');
    
  } catch (error) {
    console.error('❌ Erro ao popular dados:', error);
    throw error;
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  seedBasicData()
    .then(() => {
      console.log('🎉 Processo concluído!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Falha:', error);
      process.exit(1);
    });
}

export { seedBasicData };