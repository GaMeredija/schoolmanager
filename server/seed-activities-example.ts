import { db } from './db';
import { activities, activitySubmissions, users, subjects, classes } from '../shared/schema';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';

async function seedActivitiesExample() {
  try {
    console.log('🌱 Iniciando seed de atividades de exemplo...');

    // Buscar usuários existentes
    const teachers = await db.select().from(users).where(eq(users.role, 'teacher'));
    const students = await db.select().from(users).where(eq(users.role, 'student'));
    const subjectsData = await db.select().from(subjects);
    const classesData = await db.select().from(classes);

    if (teachers.length === 0 || students.length === 0 || subjectsData.length === 0) {
      console.log('❌ Não há dados suficientes (professores, alunos ou disciplinas). Execute o seed básico primeiro.');
      return;
    }

    const teacher = teachers[0];
    const student1 = students[0];
    const student2 = students[1] || students[0]; // Fallback para o mesmo aluno se só houver um
    const subject = subjectsData[0];
    const classData = classesData[0];

    // Criar atividades de exemplo
    const activitiesData = [
      {
        id: nanoid(),
        title: 'Exercícios de Matemática - Álgebra Linear',
        description: 'Resolva os exercícios 1 a 10 do capítulo 3 sobre sistemas lineares. Mostre todos os cálculos.',
        dueDate: new Date('2025-09-16T17:49:00Z').toISOString(), // Data específica para corresponder ao exemplo
        maxGrade: 100,
        instructions: 'Utilize os métodos de eliminação gaussiana e substituição.',
        requirements: 'Mostrar todos os passos dos cálculos',
        status: 'active' as const,
        subjectId: subject.id,
        classId: classData.id,
        teacherId: teacher.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: nanoid(),
        title: 'Projeto Final - Sistema Web',
        description: 'Desenvolva um sistema web completo utilizando React e Node.js. O projeto deve incluir autenticação, CRUD e interface responsiva.',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 dias a partir de agora
        maxGrade: 200,
        instructions: 'Use React para frontend e Node.js para backend. Implemente autenticação JWT.',
        requirements: 'Sistema funcional com deploy, documentação e testes',
        status: 'active' as const,
        subjectId: subject.id,
        classId: classData.id,
        teacherId: teacher.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: nanoid(),
        title: 'Prova - Conceitos Fundamentais',
        description: 'Avaliação sobre os conceitos fundamentais estudados no primeiro bimestre.',
        dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 dias atrás (já passou)
        maxGrade: 150,
        instructions: 'Prova individual, sem consulta. Duração: 2 horas.',
        requirements: 'Responder todas as questões com justificativas',
        status: 'expired' as const,
        subjectId: subject.id,
        classId: classData.id,
        teacherId: teacher.id,
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: nanoid(),
        title: 'Relatório de Pesquisa',
        description: 'Elabore um relatório de 5 páginas sobre o tema escolhido na aula anterior. Inclua referências bibliográficas.',
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 dias a partir de agora
        maxGrade: 80,
        instructions: 'Formato ABNT, mínimo 5 páginas, máximo 10 páginas.',
        requirements: 'Pelo menos 5 referências bibliográficas confiáveis',
        status: 'active' as const,
        subjectId: subject.id,
        classId: classData.id,
        teacherId: teacher.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    // Inserir atividades
    const insertedActivities = await db.insert(activities).values(activitiesData).returning();
    console.log(`✅ ${insertedActivities.length} atividades criadas`);

    // Criar submissões de exemplo
    const submissionsData = [
      {
        id: nanoid(),
        activityId: insertedActivities[0].id, // Exercícios de Matemática
        studentId: student1.id,
        comment: 'Resolução dos exercícios 1 a 10:\n\n1. Sistema: 2x + 3y = 7, x - y = 1\nSolução: x = 2, y = 1\n\n2. Sistema: 3x + 2y = 12, x + 4y = 10\nSolução: x = 2, y = 3\n\n[... demais exercícios resolvidos]',
        submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 dia atrás
        grade: 85,
        maxGrade: 100,
        feedback: 'Boa resolução! Apenas o exercício 7 teve um pequeno erro de cálculo. Continue assim!',
        status: 'graded' as const,
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: nanoid(),
        activityId: insertedActivities[1].id, // Projeto Final
        studentId: student1.id,
        comment: 'Link do repositório: https://github.com/student1/projeto-final\n\nDescrição: Sistema de gerenciamento escolar desenvolvido com React + TypeScript no frontend e Node.js + Express no backend. Implementei autenticação JWT, CRUD completo para usuários e interface responsiva.',
        submittedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 dias atrás
        grade: null, // Ainda não avaliado
        maxGrade: 200,
        feedback: null,
        status: 'submitted' as const,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: nanoid(),
        activityId: insertedActivities[2].id, // Prova
        studentId: student1.id,
        comment: 'Respostas da prova:\n\n1. Conceito de algoritmo: Sequência finita de instruções...\n2. Estruturas de dados: Arrays, listas, pilhas...\n3. Complexidade: O(n), O(log n)...\n\n[... demais respostas]',
        submittedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 dias atrás
        grade: 142,
        maxGrade: 150,
        feedback: 'Excelente prova! Demonstrou domínio dos conceitos fundamentais. Parabéns!',
        status: 'graded' as const,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: nanoid(),
        activityId: insertedActivities[0].id, // Exercícios de Matemática (segundo aluno)
        studentId: student2.id,
        comment: 'Exercícios resolvidos:\n\n1. 2x + 3y = 7, x - y = 1 → x = 2, y = 1\n2. 3x + 2y = 12, x + 4y = 10 → x = 2, y = 3\n\n[... continuação dos exercícios]',
        submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 dias atrás
        grade: 92,
        maxGrade: 100,
        feedback: 'Muito bem! Todos os exercícios corretos. Ótima organização na apresentação.',
        status: 'graded' as const,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: nanoid(),
        activityId: insertedActivities[3].id, // Relatório de Pesquisa
        studentId: student2.id,
        comment: 'Relatório sobre Inteligência Artificial na Educação\n\nIntrodução:\nA inteligência artificial tem revolucionado diversos setores...\n\n[... conteúdo do relatório de 5 páginas]\n\nReferências:\n1. Silva, J. (2023). IA na Educação...\n2. Santos, M. (2022). Tecnologia Educacional...',
        submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 dia atrás
        grade: null, // Ainda não avaliado
        maxGrade: 80,
        feedback: null,
        status: 'submitted' as const,
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    // Inserir submissões
    const insertedSubmissions = await db.insert(activitySubmissions).values(submissionsData).returning();
    console.log(`✅ ${insertedSubmissions.length} submissões criadas`);

    console.log('\n📊 Resumo das atividades criadas:');
    console.log('- Exercícios de Matemática (2 submissões avaliadas)');
    console.log('- Projeto Final (1 submissão pendente de avaliação)');
    console.log('- Prova (1 submissão avaliada)');
    console.log('- Relatório de Pesquisa (1 submissão pendente de avaliação)');
    console.log('\n🎉 Seed de atividades de exemplo concluído com sucesso!');

  } catch (error) {
    console.error('❌ Erro ao executar seed de atividades:', error);
    throw error;
  }
}

// Executar se for o arquivo principal
seedActivitiesExample()
  .then(() => {
    console.log('✅ Script executado com sucesso');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro na execução:', error);
    process.exit(1);
  });

export { seedActivitiesExample };