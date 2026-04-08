import { db } from "./db";
import bcrypt from "bcryptjs";
import { 
  users, 
  subjects, 
  classes, 
  classSubjects, 
  studentClass, 
  activities,
  activitySubmissions
} from "../shared/schema";
import { v4 as uuidv4 } from "uuid";

async function setupCompleteSystem() {
  try {
    console.log("🚀 Configurando sistema escolar completo...");
    console.log("📊 Criando estrutura do banco de dados...");

    const hashedPassword = await bcrypt.hash("123", 10);
    const now = new Date().toISOString();
    
    // 1. Criar usuários com credenciais corretas
    console.log("👥 Criando usuários...");
    const testUsers = [
      {
        id: "admin_001",
        email: "admin@escola.com",
        password: hashedPassword,
        firstName: "Admin",
        lastName: "Sistema",
        role: "admin" as const,
        status: "active" as const,
        phone: "(11) 99999-9999",
        address: "Rua das Flores, 123",
        registrationNumber: "ADM001",
        createdAt: now,
        updatedAt: now
      },
      {
        id: "prof_001",
        email: "prof@escola.com",
        password: hashedPassword,
        firstName: "João",
        lastName: "Professor",
        role: "teacher" as const,
        status: "active" as const,
        phone: "(11) 77777-7777",
        address: "Rua dos Professores, 789",
        registrationNumber: "PROF001",
        createdAt: now,
        updatedAt: now
      },
      {
        id: "aluno_001",
        email: "aluno@escola.com",
        password: hashedPassword,
        firstName: "Pedro",
        lastName: "Aluno",
        role: "student" as const,
        status: "active" as const,
        phone: "(11) 55555-5555",
        address: "Rua dos Estudantes, 654",
        registrationNumber: "ALU001",
        createdAt: now,
        updatedAt: now
      },
      {
        id: "aluno_002",
        email: "maria@escola.com",
        password: hashedPassword,
        firstName: "Maria",
        lastName: "Silva",
        role: "student" as const,
        status: "active" as const,
        phone: "(11) 44444-4444",
        address: "Rua dos Estudantes, 321",
        registrationNumber: "ALU002",
        createdAt: now,
        updatedAt: now
      }
    ];

    for (const user of testUsers) {
      await db.insert(users).values(user);
    }
    console.log("✅ Usuários criados!");

    // 2. Criar disciplinas
    console.log("📚 Criando disciplinas...");
    const testSubjects = [
      {
        id: "subj_mat",
        name: "Matemática",
        code: "MAT001",
        description: "Matemática Básica",
        credits: 4,
        workload: 80,
        teacherId: "prof_001",
        status: "active" as const,
        createdAt: now,
        updatedAt: now
      },
      {
        id: "subj_por",
        name: "Português",
        code: "POR001",
        description: "Língua Portuguesa",
        credits: 4,
        workload: 80,
        teacherId: "prof_001",
        status: "active" as const,
        createdAt: now,
        updatedAt: now
      },
      {
        id: "subj_his",
        name: "História",
        code: "HIS001",
        description: "História do Brasil",
        credits: 3,
        workload: 60,
        teacherId: "prof_001",
        status: "active" as const,
        createdAt: now,
        updatedAt: now
      },
      {
        id: "subj_geo",
        name: "Geografia",
        code: "GEO001",
        description: "Geografia Geral",
        credits: 3,
        workload: 60,
        teacherId: "prof_001",
        status: "active" as const,
        createdAt: now,
        updatedAt: now
      },
      {
        id: "subj_cie",
        name: "Ciências",
        code: "CIE001",
        description: "Ciências Naturais",
        credits: 3,
        workload: 60,
        teacherId: "prof_001",
        status: "active" as const,
        createdAt: now,
        updatedAt: now
      }
    ];

    for (const subject of testSubjects) {
      await db.insert(subjects).values(subject);
    }
    console.log("✅ Disciplinas criadas!");

    // 3. Criar turmas
    console.log("🏫 Criando turmas...");
    const testClasses = [
      {
        id: "class_9a",
        name: "9º Ano A",
        grade: "9º Ano",
        section: "A",
        academicYear: "2024",
        capacity: 30,
        currentStudents: 2,
        coordinatorId: "admin_001",
        status: "active" as const,
        createdAt: now,
        updatedAt: now
      },
      {
        id: "class_9b",
        name: "9º Ano B",
        grade: "9º Ano",
        section: "B",
        academicYear: "2024",
        capacity: 30,
        currentStudents: 0,
        coordinatorId: "admin_001",
        status: "active" as const,
        createdAt: now,
        updatedAt: now
      }
    ];

    for (const cls of testClasses) {
      await db.insert(classes).values(cls);
    }
    console.log("✅ Turmas criadas!");

    // 4. Criar relacionamentos turma-disciplina-professor
    console.log("🔗 Criando relacionamentos...");
    const testClassSubjects = [
      {
        id: uuidv4(),
        classId: "class_9a",
        subjectId: "subj_mat",
        teacherId: "prof_001",
        schedule: "Segunda-feira 08:00-09:30",
        room: "Sala 101",
        semester: "1º Semestre",
        academicYear: "2024",
        status: "active" as const,
        createdAt: now,
        updatedAt: now
      },
      {
        id: uuidv4(),
        classId: "class_9a",
        subjectId: "subj_por",
        teacherId: "prof_001",
        schedule: "Terça-feira 08:00-09:30",
        room: "Sala 102",
        semester: "1º Semestre",
        academicYear: "2024",
        status: "active" as const,
        createdAt: now,
        updatedAt: now
      },
      {
        id: uuidv4(),
        classId: "class_9a",
        subjectId: "subj_his",
        teacherId: "prof_001",
        schedule: "Quarta-feira 08:00-09:30",
        room: "Sala 103",
        semester: "1º Semestre",
        academicYear: "2024",
        status: "active" as const,
        createdAt: now,
        updatedAt: now
      },
      {
        id: uuidv4(),
        classId: "class_9a",
        subjectId: "subj_geo",
        teacherId: "prof_001",
        schedule: "Quinta-feira 08:00-09:30",
        room: "Sala 104",
        semester: "1º Semestre",
        academicYear: "2024",
        status: "active" as const,
        createdAt: now,
        updatedAt: now
      },
      {
        id: uuidv4(),
        classId: "class_9a",
        subjectId: "subj_cie",
        teacherId: "prof_001",
        schedule: "Sexta-feira 08:00-09:30",
        room: "Sala 105",
        semester: "1º Semestre",
        academicYear: "2024",
        status: "active" as const,
        createdAt: now,
        updatedAt: now
      }
    ];

    for (const classSubject of testClassSubjects) {
      await db.insert(classSubjects).values(classSubject);
    }
    console.log("✅ Relacionamentos criados!");

    // 5. Matricular alunos na turma
    console.log("📝 Matriculando alunos...");
    const enrollments = [
      {
        id: uuidv4(),
        studentId: "aluno_001",
        classId: "class_9a",
        enrollmentDate: now,
        status: "enrolled" as const,
        createdAt: now,
        updatedAt: now
      },
      {
        id: uuidv4(),
        studentId: "aluno_002",
        classId: "class_9a",
        enrollmentDate: now,
        status: "enrolled" as const,
        createdAt: now,
        updatedAt: now
      }
    ];

    for (const enrollment of enrollments) {
      await db.insert(studentClass).values(enrollment);
    }
    console.log("✅ Alunos matriculados!");

    // 6. Criar atividades variadas e interessantes
    console.log("📋 Criando atividades...");
    const testActivities = [
      {
        id: "act_mat_001",
        title: "Exercícios de Álgebra Básica",
        description: "Resolva os exercícios do capítulo 1 sobre álgebra básica. Inclua desenvolvimento detalhado das questões.",
        subjectId: "subj_mat",
        teacherId: "prof_001",
        classId: "class_9a",
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 dias
        maxGrade: 10,
        instructions: "Resolva todas as questões mostrando o desenvolvimento. Use caneta azul ou preta.",
        requirements: "Entrega em PDF ou documento Word. Arquivo deve ter no máximo 10MB.",
        status: "active" as const,
        allowLateSubmission: true,
        latePenalty: 0.5,
        maxFileSize: 10,
        allowedFileTypes: JSON.stringify(["pdf", "doc", "docx"]),
        createdAt: now,
        updatedAt: now
      },
      {
        id: "act_por_001",
        title: "Redação: O Futuro da Educação",
        description: "Escreva uma redação dissertativa sobre o futuro da educação no Brasil, considerando as tecnologias emergentes.",
        subjectId: "subj_por",
        teacherId: "prof_001",
        classId: "class_9a",
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 dias
        maxGrade: 10,
        instructions: "Redação deve ter entre 25 e 30 linhas. Use argumentos convincentes e cite exemplos.",
        requirements: "Formato PDF. Use fonte Times New Roman, tamanho 12.",
        status: "active" as const,
        allowLateSubmission: false,
        latePenalty: 1,
        maxFileSize: 5,
        allowedFileTypes: JSON.stringify(["pdf"]),
        createdAt: now,
        updatedAt: now
      },
      {
        id: "act_his_001",
        title: "Pesquisa: Revolução Industrial",
        description: "Faça uma pesquisa completa sobre a Revolução Industrial e seus impactos na sociedade moderna.",
        subjectId: "subj_his",
        teacherId: "prof_001",
        classId: "class_9a",
        dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(), // 21 dias
        maxGrade: 10,
        instructions: "Inclua cronologia, principais inventos, consequências sociais e econômicas.",
        requirements: "Apresentação em PowerPoint (10-15 slides) ou documento com imagens.",
        status: "active" as const,
        allowLateSubmission: true,
        latePenalty: 0.3,
        maxFileSize: 20,
        allowedFileTypes: JSON.stringify(["pdf", "ppt", "pptx", "doc", "docx"]),
        createdAt: now,
        updatedAt: now
      },
      {
        id: "act_geo_001",
        title: "Mapa Mental: Biomas Brasileiros",
        description: "Crie um mapa mental completo sobre os biomas brasileiros, destacando características e localização.",
        subjectId: "subj_geo",
        teacherId: "prof_001",
        classId: "class_9a",
        dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 dias
        maxGrade: 8,
        instructions: "Use cores diferentes para cada bioma. Inclua fauna, flora e características climáticas.",
        requirements: "Pode ser feito à mão (foto em alta qualidade) ou digitalmente.",
        status: "active" as const,
        allowLateSubmission: true,
        latePenalty: 0.2,
        maxFileSize: 15,
        allowedFileTypes: JSON.stringify(["pdf", "jpg", "jpeg", "png"]),
        createdAt: now,
        updatedAt: now
      },
      {
        id: "act_cie_001",
        title: "Experimento: Densidade dos Líquidos",
        description: "Realize o experimento sobre densidade dos líquidos e documente todo o processo com fotos e explicações.",
        subjectId: "subj_cie",
        teacherId: "prof_001",
        classId: "class_9a",
        dueDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(), // 12 dias
        maxGrade: 9,
        instructions: "Documente materiais, procedimento, observações e conclusões. Inclua fotos de cada etapa.",
        requirements: "Relatório em PDF com fotos. Mínimo 3 páginas, máximo 6 páginas.",
        status: "active" as const,
        allowLateSubmission: false,
        latePenalty: 0,
        maxFileSize: 25,
        allowedFileTypes: JSON.stringify(["pdf"]),
        createdAt: now,
        updatedAt: now
      }
    ];

    for (const activity of testActivities) {
      await db.insert(activities).values(activity);
    }
    console.log("✅ Atividades criadas!");

    // 7. Criar algumas submissões de exemplo
    console.log("📤 Criando submissões de exemplo...");
    const testSubmissions = [
      {
        id: uuidv4(),
        activityId: "act_mat_001",
        studentId: "aluno_001",
        submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 dias atrás
        comment: "Professor, resolvi todos os exercícios. Tive dúvida apenas no exercício 7, mas consegui resolver consultando o livro.",
        status: "submitted" as const,
        maxGrade: 10,
        isLate: false,
        latePenaltyApplied: 0,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: uuidv4(),
        activityId: "act_por_001",
        studentId: "aluno_002",
        submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 dia atrás
        comment: "Escrevi sobre como a inteligência artificial pode transformar a educação. Espero ter desenvolvido bem o tema!",
        status: "submitted" as const,
        maxGrade: 10,
        isLate: false,
        latePenaltyApplied: 0,
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    for (const submission of testSubmissions) {
      await db.insert(activitySubmissions).values(submission);
    }
    console.log("✅ Submissões de exemplo criadas!");
    
    console.log("\n🎉 Sistema escolar configurado com sucesso!");
    console.log("\n🔑 Credenciais de acesso:");
    console.log("   📧 Admin: admin@escola.com | 🔒 Senha: 123");
    console.log("   📧 Professor: prof@escola.com | 🔒 Senha: 123");
    console.log("   📧 Aluno 1: aluno@escola.com | 🔒 Senha: 123");
    console.log("   📧 Aluno 2: maria@escola.com | 🔒 Senha: 123");
    
    console.log("\n📊 Estatísticas do sistema:");
    console.log(`   👥 ${testUsers.length} usuários criados`);
    console.log(`   📚 ${testSubjects.length} disciplinas criadas`);
    console.log(`   🏫 ${testClasses.length} turmas criadas`);
    console.log(`   📋 ${testActivities.length} atividades criadas`);
    console.log(`   📤 ${testSubmissions.length} submissões de exemplo`);
    
  } catch (error) {
    console.error("❌ Erro durante a configuração:", error);
    throw error;
  }
}

setupCompleteSystem()
  .then(() => {
    console.log("\n🚀 Sistema pronto para uso!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Falha na configuração:", error);
    process.exit(1);
  });






















