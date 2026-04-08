import { db } from "./db";
import { 
  users, 
  subjects, 
  classes, 
  classSubjects, 
  studentClass, 
  grades, 
  attendance, 
  events, 
  messages 
} from "../shared/schema";
import { v4 as uuidv4 } from "uuid";

async function seedTestData() {
  try {
    console.log("🌱 Iniciando seed de dados de teste...");
    console.log("📊 Verificando conexão com banco...");
    
    // Testar conexão
    const testResult = await db.select().from(users).limit(1);
    console.log("✅ Conexão OK, tabela users existe");
    
    // Criar usuários de teste
    const testUsers = [
      {
        id: "admin_001",
        email: "admin@escola.com",
        password: "admin123",
        firstName: "Administrador",
        lastName: "Sistema",
        role: "admin" as const,
        status: "active" as const,
        registrationNumber: "ADM001",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "coord_001",
        email: "coord@escola.com",
        password: "coord123",
        firstName: "Coordenador",
        lastName: "Pedagógico",
        role: "coordinator" as const,
        status: "active" as const,
        registrationNumber: "COORD001",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "prof_001",
        email: "prof@escola.com",
        password: "prof123",
        firstName: "Professor",
        lastName: "Matemática",
        role: "teacher" as const,
        status: "active" as const,
        lastSeen: new Date().toISOString(),
        registrationNumber: "PROF001",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "prof_002",
        email: "prof2@escola.com",
        password: "prof123",
        firstName: "Professora",
        lastName: "História",
        role: "teacher" as const,
        status: "active" as const,
        lastSeen: new Date().toISOString(),
        registrationNumber: "PROF002",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "aluno_001",
        email: "aluno1@escola.com",
        password: "aluno123",
        firstName: "Pedro",
        lastName: "Oliveira",
        role: "student" as const,
        status: "active" as const,
        lastSeen: new Date().toISOString(),
        registrationNumber: "ALUNO001",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    console.log("👥 Criando usuários de teste...");
    for (const user of testUsers) {
      await db.insert(users).values(user);
    }
    console.log("✅ Usuários criados com sucesso!");

    // Criar disciplinas
    const testSubjects = [
      {
        id: "subj_001",
        name: "Matemática",
        code: "MAT",
        description: "Matemática do Ensino Fundamental",
        credits: 4,
        workload: 80,
        teacherId: "prof_001",
        status: "active" as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "subj_002",
        name: "História",
        code: "HIST",
        description: "História do Ensino Fundamental",
        credits: 3,
        workload: 60,
        teacherId: "prof_002",
        status: "active" as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "subj_003",
        name: "Português",
        code: "PORT",
        description: "Língua Portuguesa",
        credits: 4,
        workload: 80,
        teacherId: "prof_001",
        status: "active" as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    console.log("📚 Criando disciplinas...");
    for (const subject of testSubjects) {
      await db.insert(subjects).values(subject);
    }
    console.log("✅ Disciplinas criadas com sucesso!");

    // Criar turmas
    const testClasses = [
      {
        id: "class_001",
        name: "1º Ano A",
        grade: "1º Ano",
        section: "A",
        academicYear: "2024",
        capacity: 30,
        currentStudents: 1,
        coordinatorId: "coord_001",
        status: "active" as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "class_9a",
        name: "9º Ano A",
        grade: "9º Ano",
        section: "A",
        academicYear: "2024",
        capacity: 30,
        currentStudents: 1,
        coordinatorId: "coord_001",
        status: "active" as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    console.log("🏫 Criando turmas...");
    for (const testClass of testClasses) {
      await db.insert(classes).values(testClass);
    }
    console.log("✅ Turmas criadas com sucesso!");

    // Criar relacionamentos turma-disciplina
    const testClassSubjects = [
      {
        id: "cs_001",
        classId: "class_001",
        subjectId: "subj_001",
        teacherId: "prof_001",
        schedule: "Segunda-feira 8:00-9:30",
        room: "Sala 101",
        semester: "1º Semestre",
        academicYear: "2024",
        status: "active" as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "cs_002",
        classId: "class_001",
        subjectId: "subj_002",
        teacherId: "prof_002",
        schedule: "Terça-feira 8:00-9:30",
        room: "Sala 102",
        semester: "1º Semestre",
        academicYear: "2024",
        status: "active" as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "cs_003",
        classId: "class_001",
        subjectId: "subj_003",
        teacherId: "prof_001",
        schedule: "Quarta-feira 8:00-9:30",
        room: "Sala 101",
        semester: "1º Semestre",
        academicYear: "2024",
        status: "active" as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      // Relacionamentos para turma 9A
      {
        id: "cs_9a_001",
        classId: "class_9a",
        subjectId: "subj_001",
        teacherId: "prof_001",
        schedule: "Segunda-feira 10:00-11:30",
        room: "Sala 201",
        semester: "1º Semestre",
        academicYear: "2024",
        status: "active" as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "cs_9a_002",
        classId: "class_9a",
        subjectId: "subj_003",
        teacherId: "prof_001",
        schedule: "Quinta-feira 10:00-11:30",
        room: "Sala 201",
        semester: "1º Semestre",
        academicYear: "2024",
        status: "active" as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    console.log("🔗 Criando relacionamentos turma-disciplina...");
    for (const cs of testClassSubjects) {
      await db.insert(classSubjects).values(cs);
    }
    console.log("✅ Relacionamentos criados com sucesso!");

    // Matricular alunos nas turmas
    const testStudentClasses = [
      {
        id: "sc_001",
        studentId: "aluno_001",
        classId: "class_001",
        enrollmentDate: new Date().toISOString(),
        status: "enrolled" as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "sc_9a_001",
        studentId: "aluno_001",
        classId: "class_9a",
        enrollmentDate: new Date().toISOString(),
        status: "enrolled" as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    console.log("📝 Matriculando alunos...");
    for (const sc of testStudentClasses) {
      await db.insert(studentClass).values(sc);
    }
    console.log("✅ Alunos matriculados com sucesso!");

    // Criar notas de teste
    const testGrades = [
      {
        id: "grade_001",
        studentId: "aluno_001",
        classSubjectId: "cs_001",
        type: "exam" as const,
        title: "Prova Bimestral 1",
        grade: 8.5,
        maxGrade: 10,
        weight: 1,
        date: "2024-03-15",
        comments: "Bom desempenho",
        createdBy: "prof_001",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "grade_002",
        studentId: "aluno_001",
        classSubjectId: "cs_002",
        type: "homework" as const,
        title: "Trabalho sobre Revolução Industrial",
        grade: 9.0,
        maxGrade: 10,
        weight: 0.8,
        date: "2024-03-10",
        comments: "Excelente trabalho",
        createdBy: "prof_002",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    console.log("📊 Criando notas...");
    for (const grade of testGrades) {
      await db.insert(grades).values(grade);
    }
    console.log("✅ Notas criadas com sucesso!");

    // Criar frequência de teste
    const testAttendance = [
      {
        id: "att_001",
        studentId: "aluno_001",
        classSubjectId: "cs_001",
        date: "2024-03-15",
        status: "present" as const,
        justification: null,
        recordedBy: "prof_001",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "att_002",
        studentId: "aluno_001",
        classSubjectId: "cs_002",
        date: "2024-03-16",
        status: "present" as const,
        justification: null,
        recordedBy: "prof_002",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    console.log("📅 Criando frequência...");
    for (const att of testAttendance) {
      await db.insert(attendance).values(att);
    }
    console.log("✅ Frequência criada com sucesso!");

    // Criar eventos de teste
    const testEvents = [
      {
        id: "event_001",
        title: "Prova Bimestral de Matemática",
        description: "Prova sobre equações do 2º grau",
        type: "exam" as const,
        startDate: "2024-04-15",
        endDate: "2024-04-15",
        location: "Sala 101",
        color: "#EF4444",
        classId: "class_001",
        subjectId: "subj_001",
        createdBy: "prof_001",
        status: "active" as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "event_002",
        title: "Entrega de Trabalho de História",
        description: "Trabalho sobre Revolução Industrial",
        type: "homework" as const,
        startDate: "2024-04-20",
        endDate: "2024-04-20",
        location: "Sala 102",
        color: "#F59E0B",
        classId: "class_001",
        subjectId: "subj_002",
        createdBy: "prof_002",
        status: "active" as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    console.log("📅 Criando eventos...");
    for (const event of testEvents) {
      await db.insert(events).values(event);
    }
    console.log("✅ Eventos criados com sucesso!");

    // Criar mensagens de teste
    const testMessages = [
      {
        id: "msg_001",
        senderId: "prof_001",
        recipientId: "aluno_001",
        subject: "Dúvida sobre exercício",
        content: "Olá Pedro! Tem alguma dúvida sobre o exercício de equações?",
        type: "private" as const,
        read: false,
        priority: "medium" as const,
        parentMessageId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "msg_002",
        senderId: "aluno_001",
        recipientId: "prof_001",
        subject: "Re: Dúvida sobre exercício",
        content: "Oi professor! Sim, tenho dúvida no exercício 5. Pode me ajudar?",
        type: "private" as const,
        read: false,
        priority: "medium" as const,
        parentMessageId: "msg_001",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    console.log("💬 Criando mensagens...");
    for (const msg of testMessages) {
      await db.insert(messages).values(msg);
    }
    console.log("✅ Mensagens criadas com sucesso!");

    console.log("✅ Seed de dados de teste concluído com sucesso!");
    console.log("\n📋 Dados criados:");
    console.log(`- ${testUsers.length} usuários`);
    console.log(`- ${testSubjects.length} disciplinas`);
    console.log(`- 1 turma`);
    console.log(`- ${testClassSubjects.length} relacionamentos turma-disciplina`);
    console.log(`- 1 matrícula de aluno`);
    console.log(`- ${testGrades.length} notas`);
    console.log(`- ${testAttendance.length} registros de frequência`);
    console.log(`- ${testEvents.length} eventos`);
    console.log(`- ${testMessages.length} mensagens`);

  } catch (error) {
    console.error("❌ Erro durante o seed:", error);
    throw error;
  }
}

// Executar o seed se o arquivo for executado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  seedTestData()
    .then(() => {
      console.log("🎉 Seed concluído!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Falha no seed:", error);
      process.exit(1);
    });
}

export { seedTestData };
