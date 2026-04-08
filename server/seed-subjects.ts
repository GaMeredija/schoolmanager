import { db } from './db';
import { subjects } from '../shared/schema';
import { nanoid } from 'nanoid';

async function seedSubjects() {
  try {
    console.log('🌱 Criando disciplinas...');

    const subjectsData = [
      {
        id: nanoid(),
        name: 'Matemática',
        code: 'MAT001',
        description: 'Disciplina de matemática fundamental',
        credits: 4,
        workload: 80,
        status: 'active' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: nanoid(),
        name: 'Programação',
        code: 'PROG001',
        description: 'Introdução à programação',
        credits: 6,
        workload: 120,
        status: 'active' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: nanoid(),
        name: 'Física',
        code: 'FIS001',
        description: 'Física básica',
        credits: 4,
        workload: 80,
        status: 'active' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: nanoid(),
        name: 'Português',
        code: 'PORT001',
        description: 'Língua portuguesa',
        credits: 3,
        workload: 60,
        status: 'active' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    const insertedSubjects = await db.insert(subjects).values(subjectsData).returning();
    console.log(`✅ ${insertedSubjects.length} disciplinas criadas`);

    console.log('🎉 Seed de disciplinas concluído com sucesso!');

  } catch (error) {
    console.error('❌ Erro ao criar disciplinas:', error);
    throw error;
  }
}

// Executar se for o arquivo principal
seedSubjects()
  .then(() => {
    console.log('✅ Script executado com sucesso');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro na execução:', error);
    process.exit(1);
  });

export { seedSubjects };