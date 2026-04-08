import { db } from "./db";
import bcrypt from "bcryptjs";
import { 
  users, 
  classes, 
  subjects, 
  classSubjects, 
  studentClass
} from "@shared/schema";

async function seedAllUsers() {
  try {
    console.log("🌱 Iniciando seed completo com todos os tipos de usuários...");

    // Limpar dados existentes
    console.log("🗑️ Limpando dados existentes...");
    await db.delete(studentClass);
    await db.delete(classSubjects);
    await db.delete(subjects);
    await db.delete(classes);
    await db.delete(users);
    console.log("✅ Dados limpos");

    // Criar hash da senha padrão
    const hashedPassword = await bcrypt.hash("123", 10);
    const now = new Date().toISOString();
    
    // Criar usuários de todos os tipos
    console.log("👥 Criando usuários...");
    const allUsers = [
      // Diretor
      {
        id: "director_001",
        email: "diretor@escola.com",
        password: hashedPassword,
        firstName: "Carlos",
        lastName: "Diretor",
        role: "director" as const,
        status: "active" as const,
        phone: "(11) 99999-0001",
        address: "Rua da Direção, 1",
        registrationNumber: "DIR001",
        createdAt: now,
        updatedAt: now
      },
      // Administrador
      {
        id: "admin_001",
        email: "admin@escola.com",
        password: hashedPassword,
        firstName: "Ana",
        lastName: "Administradora",
        role: "admin" as const,
        status: "active" as const,
        phone: "(11) 99999-0002",
        address: "Rua da Administração, 2",
        registrationNumber: "ADM001",
        createdAt: now,
        updatedAt: now
      },
      // Coordenador
      {
        id: "coord_001",
        email: "coordenador@escola.com",
        password: hashedPassword,
        firstName: "Maria",
        lastName: "Coordenadora",
        role: "coordinator" as const,
        status: "active" as const,
        phone: "(11) 99999-0003",
        address: "Rua da Coordenação, 3",
        registrationNumber: "COORD001",
        createdAt: now,
        updatedAt: now
      },
      // Professor 1
      {
        id: "prof_001",
        email: "professor@escola.com",
        password: hashedPassword,
        firstName: "João",
        lastName: "Professor",
        role: "teacher" as const,
        status: "active" as const,
        phone: "(11) 99999-0004",
        address: "Rua dos Professores, 4",
        registrationNumber: "PROF001",
        createdAt: now,
        updatedAt: now
      },
      // Professor 2
      {
        id: "prof_002",
        email: "professora@escola.com",
        password: hashedPassword,
        firstName: "Sandra",
        lastName: "Professora",
        role: "teacher" as const,
        status: "active" as const,
        phone: "(11) 99999-0005",
        address: "Rua dos Educadores, 5",
        registrationNumber: "PROF002",
        createdAt: now,
        updatedAt: now
      },
      // Aluno 1
      {
        id: "aluno_001",
        email: "aluno@escola.com",
        password: hashedPassword,
        firstName: "Pedro",
        lastName: "Aluno",
        role: "student" as const,
        status: "active" as const,
        phone: "(11) 99999-0006",
        address: "Rua dos Estudantes, 6",
        registrationNumber: "ALU001",
        createdAt: now,
        updatedAt: now
      },
      // Aluno 2
      {
        id: "aluno_002",
        email: "aluna@escola.com",
        password: hashedPassword,
        firstName: "Carla",
        lastName: "Aluna",
        role: "student" as const,
        status: "active" as const,
        phone: "(11) 99999-0007",
        address: "Rua da Juventude, 7",
        registrationNumber: "ALU002",
        createdAt: now,
        updatedAt: now
      }
    ];

    // Inserir usuários
    for (const user of allUsers) {
      await db.insert(users).values(user);
      console.log(`✅ Usuário criado: ${user.firstName} ${user.lastName} (${user.role}) - ${user.email}`);
    }

    // Criar disciplinas básicas
    console.log("📚 Criando disciplinas...");
    const basicSubjects = [
      {
        id: "subj_001",
        name: "Matemática",
        code: "MAT001",
        description: "Disciplina de Matemática",
        status: "active" as const,
        createdAt: now,
        updatedAt: now
      },
      {
        id: "subj_002",
        name: "Português",
        code: "PORT001",
        description: "Disciplina de Português",
        status: "active" as const,
        createdAt: now,
        updatedAt: now
      },
      {
        id: "subj_003",
        name: "História",
        code: "HIST001",
        description: "Disciplina de História",
        status: "active" as const,
        createdAt: now,
        updatedAt: now
      }
    ];

    for (const subject of basicSubjects) {
      await db.insert(subjects).values(subject);
      console.log(`✅ Disciplina criada: ${subject.name}`);
    }

    // Criar turmas básicas
    console.log("🏫 Criando turmas...");
    const basicClasses = [
      {
        id: "class_001",
        name: "9º Ano A",
        grade: "9º Ano",
        section: "A",
        academicYear: "2025",
        capacity: 30,
        coordinatorId: "coord_001",
        status: "active" as const,
        createdAt: now,
        updatedAt: now
      },
      {
        id: "class_002",
        name: "8º Ano B",
        grade: "8º Ano",
        section: "B",
        academicYear: "2025",
        capacity: 25,
        coordinatorId: "coord_001",
        status: "active" as const,
        createdAt: now,
        updatedAt: now
      }
    ];

    for (const classData of basicClasses) {
      await db.insert(classes).values(classData);
      console.log(`✅ Turma criada: ${classData.name}`);
    }

    // Matricular alunos nas turmas
    console.log("📝 Matriculando alunos...");
    const enrollments = [
      {
        id: "enroll_001",
        studentId: "aluno_001",
        classId: "class_001",
        enrollmentDate: now,
        status: "active" as const,
        createdAt: now,
        updatedAt: now
      },
      {
        id: "enroll_002",
        studentId: "aluno_002",
        classId: "class_002",
        enrollmentDate: now,
        status: "active" as const,
        createdAt: now,
        updatedAt: now
      }
    ];

    for (const enrollment of enrollments) {
      await db.insert(studentClass).values(enrollment);
      console.log(`✅ Aluno matriculado na turma`);
    }

    console.log("\n🎉 Seed completo finalizado!");
    console.log("\n📧 Credenciais de acesso:");
    console.log("👑 Diretor: diretor@escola.com (senha: 123)");
    console.log("🔧 Admin: admin@escola.com (senha: 123)");
    console.log("📋 Coordenador: coordenador@escola.com (senha: 123)");
    console.log("👨‍🏫 Professor: professor@escola.com (senha: 123)");
    console.log("👩‍🏫 Professora: professora@escola.com (senha: 123)");
    console.log("👨‍🎓 Aluno: aluno@escola.com (senha: 123)");
    console.log("👩‍🎓 Aluna: aluna@escola.com (senha: 123)");

  } catch (error) {
    console.error("❌ Erro durante o seed:", error);
    throw error;
  }
}

seedAllUsers()
  .then(() => {
    console.log("✅ Processo concluído com sucesso!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Falha no processo:", error);
    process.exit(1);
  });