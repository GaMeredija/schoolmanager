import { db } from "./db";
import bcrypt from "bcryptjs";
import { 
  users, 
  classes, 
  subjects, 
  classSubjects, 
  studentClass, 
  grades, 
  attendance, 
  events, 
  notifications,
  settings 
} from "@shared/schema";

async function seed() {
  console.log("🌱 Iniciando seed do banco de dados...");

  try {
    // Limpar dados existentes
    await db.delete(notifications);
    await db.delete(events);
    await db.delete(attendance);
    await db.delete(grades);
    await db.delete(studentClass);
    await db.delete(classSubjects);
    await db.delete(subjects);
    await db.delete(classes);
    await db.delete(users);
    await db.delete(settings);

    console.log("🗑️ Dados antigos removidos");

    // Hash das senhas
    const passwordHash = await bcrypt.hash("123456", 10);

    // 1. Criar usuários
    const createdUsers = await db.insert(users).values([
      // Administradores
      {
        id: "admin1",
        email: "admin@escola.com",
        password: passwordHash,
        firstName: "João",
        lastName: "Silva",
        role: "admin",
        status: "active",
        phone: "(11) 99999-9999",
        address: "Rua das Flores, 123 - São Paulo/SP",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      // Coordenadores
      {
        id: "coord1",
        email: "coordenador@escola.com",
        password: passwordHash,
        firstName: "Maria",
        lastName: "Santos",
        role: "coordinator",
        status: "active",
        phone: "(11) 88888-8888",
        address: "Av. Paulista, 456 - São Paulo/SP",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: "coord2",
        email: "ana.coord@escola.com",
        password: passwordHash,
        firstName: "Ana",
        lastName: "Oliveira",
        role: "coordinator",
        status: "active",
        phone: "(11) 77777-7777",
        address: "Rua Augusta, 789 - São Paulo/SP",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      // Professores
      {
        id: "prof1",
        email: "joao@escola.com",
        password: passwordHash,
        firstName: "João",
        lastName: "Pereira",
        role: "teacher",
        status: "active",
        phone: "(11) 66666-6666",
        address: "Rua Consolação, 321 - São Paulo/SP",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: "prof2",
        email: "carla@escola.com",
        password: passwordHash,
        firstName: "Carla",
        lastName: "Ferreira",
        role: "teacher",
        status: "active",
        phone: "(11) 55555-5555",
        address: "Av. Brigadeiro Faria Lima, 654 - São Paulo/SP",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: "prof3",
        email: "pedro@escola.com",
        password: passwordHash,
        firstName: "Pedro",
        lastName: "Costa",
        role: "teacher",
        status: "active",
        phone: "(11) 44444-4444",
        address: "Rua Oscar Freire, 987 - São Paulo/SP",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: "prof4",
        email: "lucia@escola.com",
        password: passwordHash,
        firstName: "Lúcia",
        lastName: "Rodrigues",
        role: "teacher",
        status: "active",
        phone: "(11) 33333-3333",
        address: "Rua Haddock Lobo, 147 - São Paulo/SP",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      // Alunos
      {
        id: "aluno1",
        email: "pedro@escola.com",
        password: passwordHash,
        firstName: "Pedro",
        lastName: "Almeida",
        role: "student",
        status: "active",
        phone: "(11) 22222-2222",
        address: "Rua Pamplona, 258 - São Paulo/SP",
        registrationNumber: "2024001",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: "aluno2",
        email: "ana.aluno@escola.com",
        password: passwordHash,
        firstName: "Ana",
        lastName: "Souza",
        role: "student",
        status: "active",
        phone: "(11) 11111-1111",
        address: "Rua Bela Cintra, 369 - São Paulo/SP",
        registrationNumber: "2024002",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: "aluno3",
        email: "lucas@escola.com",
        password: passwordHash,
        firstName: "Lucas",
        lastName: "Martins",
        role: "student",
        status: "active",
        phone: "(11) 00000-0000",
        address: "Rua Estados Unidos, 741 - São Paulo/SP",
        registrationNumber: "2024003",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: "aluno4",
        email: "julia@escola.com",
        password: passwordHash,
        firstName: "Júlia",
        lastName: "Lima",
        role: "student",
        status: "active",
        phone: "(11) 99999-0000",
        address: "Rua Alameda Santos, 852 - São Paulo/SP",
        registrationNumber: "2024004",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: "aluno5",
        email: "gabriel@escola.com",
        password: passwordHash,
        firstName: "Gabriel",
        lastName: "Rocha",
        role: "student",
        status: "active",
        phone: "(11) 88888-0000",
        address: "Rua Peixoto Gomide, 963 - São Paulo/SP",
        registrationNumber: "2024005",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ]).returning();

    console.log("👥 Usuários criados:", createdUsers.length);

    // 2. Criar turmas
    const createdClasses = await db.insert(classes).values([
      {
        id: "class1",
        name: "9º Ano A",
        grade: "9º Ano",
        section: "A",
        academicYear: "2024",
        capacity: 30,
        currentStudents: 5,
        coordinatorId: "coord1",
        status: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: "class2",
        name: "9º Ano B",
        grade: "9º Ano",
        section: "B",
        academicYear: "2024",
        capacity: 30,
        currentStudents: 0,
        coordinatorId: "coord1",
        status: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: "class3",
        name: "3º Ano A",
        grade: "3º Ano",
        section: "A",
        academicYear: "2024",
        capacity: 35,
        currentStudents: 0,
        coordinatorId: "coord2",
        status: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ]).returning();

    console.log("🏫 Turmas criadas:", createdClasses.length);

    // 3. Criar disciplinas
    const createdSubjects = await db.insert(subjects).values([
      {
        id: "subj1",
        name: "Matemática",
        code: "MAT001",
        description: "Matemática do Ensino Fundamental",
        credits: 1,
        workload: 80,
        status: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: "subj2",
        name: "Português",
        code: "PORT001",
        description: "Língua Portuguesa",
        credits: 1,
        workload: 80,
        status: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: "subj3",
        name: "História",
        code: "HIST001",
        description: "História Geral e do Brasil",
        credits: 1,
        workload: 60,
        status: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: "subj4",
        name: "Geografia",
        code: "GEO001",
        description: "Geografia Geral e do Brasil",
        credits: 1,
        workload: 60,
        status: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: "subj5",
        name: "Ciências",
        code: "CIEN001",
        description: "Ciências Naturais",
        credits: 1,
        workload: 60,
        status: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: "subj6",
        name: "Educação Física",
        code: "EDF001",
        description: "Educação Física",
        credits: 1,
        workload: 40,
        status: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ]).returning();

    console.log("📚 Disciplinas criadas:", createdSubjects.length);

    // 4. Criar relacionamentos turma-disciplina-professor
    const createdClassSubjects = await db.insert(classSubjects).values([
      // 9º Ano A
      {
        id: "cs1",
        classId: "class1",
        subjectId: "subj1",
        teacherId: "prof1",
        schedule: "Segunda-feira 8:00-9:30",
        room: "Sala 101",
        semester: "1º Semestre",
        academicYear: "2024",
        status: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: "cs2",
        classId: "class1",
        subjectId: "subj2",
        teacherId: "prof2",
        schedule: "Segunda-feira 10:00-11:30",
        room: "Sala 102",
        semester: "1º Semestre",
        academicYear: "2024",
        status: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: "cs3",
        classId: "class1",
        subjectId: "subj3",
        teacherId: "prof3",
        schedule: "Terça-feira 8:00-9:30",
        room: "Sala 103",
        semester: "1º Semestre",
        academicYear: "2024",
        status: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: "cs4",
        classId: "class1",
        subjectId: "subj4",
        teacherId: "prof4",
        schedule: "Terça-feira 10:00-11:30",
        room: "Sala 104",
        semester: "1º Semestre",
        academicYear: "2024",
        status: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: "cs5",
        classId: "class1",
        subjectId: "subj5",
        teacherId: "prof1",
        schedule: "Quarta-feira 8:00-9:30",
        room: "Laboratório 1",
        semester: "1º Semestre",
        academicYear: "2024",
        status: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: "cs6",
        classId: "class1",
        subjectId: "subj6",
        teacherId: "prof4",
        schedule: "Quarta-feira 10:00-11:30",
        room: "Quadra",
        semester: "1º Semestre",
        academicYear: "2024",
        status: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ]).returning();

    console.log("🔗 Relacionamentos turma-disciplina criados:", createdClassSubjects.length);

    // 5. Matricular alunos na turma
    const createdStudentClasses = await db.insert(studentClass).values([
      {
        id: "sc1",
        studentId: "aluno1",
        classId: "class1",
        enrollmentDate: Date.now(),
        status: "enrolled",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: "sc2",
        studentId: "aluno2",
        classId: "class1",
        enrollmentDate: Date.now(),
        status: "enrolled",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: "sc3",
        studentId: "aluno3",
        classId: "class1",
        enrollmentDate: Date.now(),
        status: "enrolled",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: "sc4",
        studentId: "aluno4",
        classId: "class1",
        enrollmentDate: Date.now(),
        status: "enrolled",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: "sc5",
        studentId: "aluno5",
        classId: "class1",
        enrollmentDate: Date.now(),
        status: "enrolled",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ]).returning();

    console.log("📝 Matrículas criadas:", createdStudentClasses.length);

    // 6. Criar algumas notas
    const createdGrades = await db.insert(grades).values([
      // Pedro - Matemática
      {
        id: "grade1",
        studentId: "aluno1",
        classSubjectId: "cs1",
        type: "exam",
        title: "Prova 1 - Números Inteiros",
        grade: 8.5,
        maxGrade: 10,
        weight: 1,
        date: Date.now(),
        comments: "Bom desempenho, precisa melhorar na resolução de problemas",
        createdBy: "prof1",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: "grade2",
        studentId: "aluno1",
        classSubjectId: "cs1",
        type: "homework",
        title: "Trabalho - Equações",
        grade: 9.0,
        maxGrade: 10,
        weight: 0.5,
        date: Date.now(),
        comments: "Excelente trabalho",
        createdBy: "prof1",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      // Ana - Português
      {
        id: "grade3",
        studentId: "aluno2",
        classSubjectId: "cs2",
        type: "exam",
        title: "Prova 1 - Gramática",
        grade: 9.5,
        maxGrade: 10,
        weight: 1,
        date: Date.now(),
        comments: "Excelente domínio da matéria",
        createdBy: "prof2",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      // Lucas - História
      {
        id: "grade4",
        studentId: "aluno3",
        classSubjectId: "cs3",
        type: "exam",
        title: "Prova 1 - Idade Média",
        grade: 7.0,
        maxGrade: 10,
        weight: 1,
        date: Date.now(),
        comments: "Precisa estudar mais",
        createdBy: "prof3",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ]).returning();

    console.log("📊 Notas criadas:", createdGrades.length);

    // 7. Criar registros de presença
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    
    const createdAttendance = await db.insert(attendance).values([
      // Presença de hoje
      {
        id: "att1",
        studentId: "aluno1",
        classSubjectId: "cs1",
        date: today.getTime(),
        status: "present",
        recordedBy: "prof1",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: "att2",
        studentId: "aluno2",
        classSubjectId: "cs1",
        date: today.getTime(),
        status: "present",
        recordedBy: "prof1",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: "att3",
        studentId: "aluno3",
        classSubjectId: "cs1",
        date: today.getTime(),
        status: "late",
        justification: "Trânsito",
        recordedBy: "prof1",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: "att4",
        studentId: "aluno4",
        classSubjectId: "cs1",
        date: today.getTime(),
        status: "absent",
        justification: "Consulta médica",
        recordedBy: "prof1",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: "att5",
        studentId: "aluno5",
        classSubjectId: "cs1",
        date: today.getTime(),
        status: "present",
        recordedBy: "prof1",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      // Presença de ontem
      {
        id: "att6",
        studentId: "aluno1",
        classSubjectId: "cs2",
        date: yesterday.getTime(),
        status: "present",
        recordedBy: "prof2",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: "att7",
        studentId: "aluno2",
        classSubjectId: "cs2",
        date: yesterday.getTime(),
        status: "present",
        recordedBy: "prof2",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ]).returning();

    console.log("✅ Registros de presença criados:", createdAttendance.length);

    // 8. Criar eventos
    const createdEvents = await db.insert(events).values([
      {
        id: "event1",
        title: "Prova de Matemática",
        description: "Prova sobre números inteiros e equações",
        type: "exam",
        startDate: new Date(2024, 6, 15, 8, 0).getTime(), // 15 de julho, 8h
        endDate: new Date(2024, 6, 15, 9, 30).getTime(),
        location: "Sala 101",
        color: "#ef4444",
        classId: "class1",
        subjectId: "subj1",
        createdBy: "prof1",
        status: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: "event2",
        title: "Entrega de Trabalho de História",
        description: "Trabalho sobre Idade Média",
        type: "homework",
        startDate: new Date(2024, 6, 20, 14, 0).getTime(), // 20 de julho, 14h
        endDate: new Date(2024, 6, 20, 15, 30).getTime(),
        location: "Sala 103",
        color: "#3b82f6",
        classId: "class1",
        subjectId: "subj3",
        createdBy: "prof3",
        status: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: "event3",
        title: "Reunião de Pais",
        description: "Reunião para apresentação do desempenho dos alunos",
        type: "meeting",
        startDate: new Date(2024, 6, 25, 19, 0).getTime(), // 25 de julho, 19h
        endDate: new Date(2024, 6, 25, 21, 0).getTime(),
        location: "Auditório",
        color: "#10b981",
        classId: "class1",
        createdBy: "coord1",
        status: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: "event4",
        title: "Feira de Ciências",
        description: "Apresentação dos projetos de ciências",
        type: "activity",
        startDate: new Date(2024, 7, 5, 9, 0).getTime(), // 5 de agosto, 9h
        endDate: new Date(2024, 7, 5, 17, 0).getTime(),
        location: "Ginásio",
        color: "#8b5cf6",
        createdBy: "coord1",
        status: "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ]).returning();

    console.log("📅 Eventos criados:", createdEvents.length);

    // 9. Criar notificações
    const createdNotifications = await db.insert(notifications).values([
      {
        id: "notif1",
        title: "Prova de Matemática",
        message: "Lembrete: Prova de Matemática amanhã às 8h na Sala 101",
        type: "reminder",
        priority: "high",
        senderId: "prof1",
        classId: "class1",
        subjectId: "subj1",
        read: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: "notif2",
        title: "Trabalho de História",
        message: "Entrega do trabalho sobre Idade Média na próxima semana",
        type: "announcement",
        priority: "medium",
        senderId: "prof3",
        classId: "class1",
        subjectId: "subj3",
        read: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: "notif3",
        title: "Reunião de Pais",
        message: "Reunião de pais marcada para o dia 25/07 às 19h",
        type: "announcement",
        priority: "high",
        senderId: "coord1",
        classId: "class1",
        read: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: "notif4",
        title: "Nota Lançada",
        message: "Sua nota da Prova 1 de Matemática foi lançada",
        type: "grade",
        priority: "medium",
        senderId: "prof1",
        recipientId: "aluno1",
        read: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ]).returning();

    console.log("🔔 Notificações criadas:", createdNotifications.length);

    // 10. Criar configurações do sistema
    const createdSettings = await db.insert(settings).values([
      {
        id: "setting1",
        key: "school_name",
        value: "Escola Modelo Digital",
        description: "Nome da escola",
        category: "general",
        updatedBy: "admin1",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: "setting2",
        key: "academic_year",
        value: "2024",
        description: "Ano letivo atual",
        category: "academic",
        updatedBy: "admin1",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: "setting3",
        key: "grade_scale",
        value: "10",
        description: "Escala de notas (0-10)",
        category: "academic",
        updatedBy: "admin1",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: "setting4",
        key: "attendance_threshold",
        value: "75",
        description: "Percentual mínimo de presença (%)",
        category: "academic",
        updatedBy: "admin1",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ]).returning();

    console.log("⚙️ Configurações criadas:", createdSettings.length);

    console.log("✅ Seed concluído com sucesso!");
    console.log("\n📊 Resumo dos dados criados:");
    console.log(`👥 Usuários: ${createdUsers.length}`);
    console.log(`🏫 Turmas: ${createdClasses.length}`);
    console.log(`📚 Disciplinas: ${createdSubjects.length}`);
    console.log(`🔗 Relacionamentos: ${createdClassSubjects.length}`);
    console.log(`📝 Matrículas: ${createdStudentClasses.length}`);
    console.log(`📊 Notas: ${createdGrades.length}`);
    console.log(`✅ Presenças: ${createdAttendance.length}`);
    console.log(`📅 Eventos: ${createdEvents.length}`);
    console.log(`🔔 Notificações: ${createdNotifications.length}`);
    console.log(`⚙️ Configurações: ${createdSettings.length}`);

    console.log("\n🔑 Credenciais de acesso:");
    console.log("Admin: admin@escola.com / 123456");
    console.log("Coordenador: coordenador@escola.com / 123456");
    console.log("Professor: joao@escola.com / 123456");
    console.log("Aluno: pedro@escola.com / 123456");

  } catch (error) {
    console.error("❌ Erro durante o seed:", error);
    throw error;
  }
}

seed().catch(console.error);
