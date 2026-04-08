import { db } from './db.js';
import { activities, activitySubmissions, users, subjects, classes } from '../shared/schema.js';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';

async function seedActivities() {
  try {
    console.log('🌱 Iniciando seed de atividades...');

    // Buscar dados existentes
    const existingSubjects = await db.select().from(subjects).limit(5);
    const existingClasses = await db.select().from(classes).limit(3);
    const existingUsers = await db.select().from(users).where(eq(users.role, 'teacher')).limit(2);
    const existingStudents = await db.select().from(users).where(eq(users.role, 'student')).limit(3);

    if (existingSubjects.length === 0 || existingClasses.length === 0 || existingUsers.length === 0) {
      console.log('❌ Dados básicos não encontrados. Execute o seed principal primeiro.');
      return;
    }

    const now = new Date().toISOString();
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Limpar atividades existentes
    await db.delete(activitySubmissions);
    await db.delete(activities);
    console.log('🧹 Atividades anteriores removidas');

    // Criar atividades de exemplo
    const demoActivities = [
      {
        id: uuidv4(),
        title: 'Exercícios de Álgebra Linear',
        description: 'Resolver os exercícios do capítulo 3 sobre sistemas de equações lineares',
        subjectId: existingSubjects[0]?.id || 'math_001',
        teacherId: existingUsers[0]?.id || 'prof_001',
        classId: existingClasses[0]?.id || 'class_001',
        dueDate: nextWeek,
        maxGrade: 10,
        instructions: 'Resolva todos os exercícios do capítulo 3, mostrando os cálculos detalhados.',
        requirements: 'Entrega em PDF ou manuscrito legível. Máximo 5 páginas.',
        status: 'active' as const,
        allowLateSubmission: true,
        latePenalty: 1,
        createdAt: now,
        updatedAt: now
      },
      {
        id: uuidv4(),
        title: 'Redação sobre Literatura Brasileira',
        description: 'Escreva uma redação sobre o Romantismo no Brasil',
        subjectId: existingSubjects[1]?.id || 'port_001',
        teacherId: existingUsers[0]?.id || 'prof_001',
        classId: existingClasses[0]?.id || 'class_001',
        dueDate: tomorrow,
        maxGrade: 10,
        instructions: 'Redação de 20-30 linhas sobre as características do Romantismo brasileiro.',
        requirements: 'Texto original, sem plágio. Citar pelo menos 3 autores românticos.',
        status: 'active' as const,
        allowLateSubmission: false,
        latePenalty: 0,
        createdAt: now,
        updatedAt: now
      },
      {
        id: uuidv4(),
        title: 'Projeto de Ciências - Sistema Solar',
        description: 'Criar uma maquete do sistema solar com materiais recicláveis',
        subjectId: existingSubjects[2]?.id || 'sci_001',
        teacherId: existingUsers[1]?.id || 'prof_002',
        classId: existingClasses[1]?.id || 'class_002',
        dueDate: nextWeek,
        maxGrade: 15,
        instructions: 'Maquete deve incluir todos os planetas em escala aproximada.',
        requirements: 'Usar apenas materiais recicláveis. Incluir legenda explicativa.',
        status: 'active' as const,
        allowLateSubmission: true,
        latePenalty: 2,
        createdAt: now,
        updatedAt: now
      },
      {
        id: uuidv4(),
        title: 'Análise Histórica - Segunda Guerra Mundial',
        description: 'Análise crítica dos principais eventos da Segunda Guerra Mundial',
        subjectId: existingSubjects[3]?.id || 'hist_001',
        teacherId: existingUsers[0]?.id || 'prof_001',
        classId: existingClasses[0]?.id || 'class_001',
        dueDate: lastWeek, // Atividade vencida
        maxGrade: 12,
        instructions: 'Análise de 3-5 páginas sobre causas, desenvolvimento e consequências.',
        requirements: 'Mínimo 5 fontes bibliográficas confiáveis.',
        status: 'active' as const,
        allowLateSubmission: true,
        latePenalty: 1,
        createdAt: lastWeek,
        updatedAt: lastWeek
      },
      {
        id: uuidv4(),
        title: 'Exercícios de Inglês - Present Perfect',
        description: 'Completar exercícios sobre Present Perfect Tense',
        subjectId: existingSubjects[4]?.id || 'eng_001',
        teacherId: existingUsers[1]?.id || 'prof_002',
        classId: existingClasses[1]?.id || 'class_002',
        dueDate: nextWeek,
        maxGrade: 8,
        instructions: 'Complete todos os exercícios das páginas 45-50 do livro.',
        requirements: 'Respostas em inglês, com justificativas quando solicitado.',
        status: 'active' as const,
        allowLateSubmission: false,
        latePenalty: 0,
        createdAt: now,
        updatedAt: now
      }
    ];

    // Inserir atividades
    await db.insert(activities).values(demoActivities);
    console.log(`✅ ${demoActivities.length} atividades criadas`);

    // Criar algumas submissões de exemplo
    if (existingStudents.length > 0) {
      const demoSubmissions = [
        {
          id: uuidv4(),
          activityId: demoActivities[3].id, // Atividade vencida
          studentId: existingStudents[0]?.id || 'aluno_001',
          submittedAt: now,
          comment: 'Análise completa sobre a Segunda Guerra Mundial conforme solicitado.',
          status: 'graded' as const,
          grade: 10,
          feedback: 'Excelente trabalho! Análise bem fundamentada e fontes confiáveis.',
          isLate: true,
          finalGrade: 9, // Com penalidade
          maxGrade: 12,
          createdAt: now,
          updatedAt: now
        },
        {
          id: uuidv4(),
          activityId: demoActivities[0].id, // Álgebra
          studentId: existingStudents[1]?.id || 'aluno_002',
          submittedAt: now,
          comment: 'Exercícios resolvidos com cálculos detalhados.',
          status: 'submitted' as const,
          maxGrade: 10,
          createdAt: now,
          updatedAt: now
        }
      ];

      await db.insert(activitySubmissions).values(demoSubmissions);
      console.log(`✅ ${demoSubmissions.length} submissões criadas`);
    }

    console.log('🎉 Seed de atividades concluído com sucesso!');
    console.log('\n📚 Atividades disponíveis:');
    demoActivities.forEach((activity, index) => {
      console.log(`${index + 1}. ${activity.title} (${activity.status})`);
    });

  } catch (error) {
    console.error('❌ Erro no seed de atividades:', error);
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  seedActivities().then(() => process.exit(0));
}

export { seedActivities };