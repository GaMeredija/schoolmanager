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
  notifications 
} from "@shared/schema";
import { eq } from "drizzle-orm";

async function seedDatabase() {
  try {
    console.log("🌱 Starting database seeding...");

    // Clear existing data
    console.log("🗑️ Clearing existing data...");
    await db.delete(notifications);
    await db.delete(events);
    await db.delete(attendance);
    await db.delete(grades);
    await db.delete(studentClass);
    await db.delete(classSubjects);
    await db.delete(subjects);
    await db.delete(classes);
    await db.delete(users);

    console.log("✅ Database cleared");

    // Create users
    console.log("👥 Creating users...");
    const hashedPassword = await bcrypt.hash("123", 10);
    
    const now = new Date().toISOString();
    
    const demoUsers = [
      {
        id: "admin_001",
        email: "admin@escola.com",
        password: hashedPassword,
        firstName: "Administrador",
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
        id: "coord_001",
        email: "coord@escola.com",
        password: hashedPassword,
        firstName: "Maria",
        lastName: "Coordenadora",
        role: "coordinator" as const,
        status: "active" as const,
        phone: "(11) 88888-8888",
        address: "Av. Principal, 456",
        registrationNumber: "COORD001",
        createdAt: now,
        updatedAt: now
      },
      {
        id: "prof_001",
        email: "prof1@escola.com",
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
        id: "prof_002",
        email: "prof2@escola.com",
        password: hashedPassword,
        firstName: "Ana",
        lastName: "Professora",
        role: "teacher" as const,
        status: "active" as const,
        phone: "(11) 66666-6666",
        address: "Av. da Educação, 321",
        registrationNumber: "PROF002",
        createdAt: now,
        updatedAt: now
      },
      {
        id: "aluno_001",
        email: "aluno1@escola.com",
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
        email: "aluno2@escola.com",
        password: hashedPassword,
        firstName: "Carla",
        lastName: "Aluna",
        role: "student" as const,
        status: "active" as const,
        phone: "(11) 44444-4444",
        address: "Av. da Juventude, 987",
        registrationNumber: "ALU002",
        createdAt: now,
        updatedAt: now
      }
    ];

    for (const user of demoUsers) {
      await db.insert(users).values(user);
    }
    console.log("✅ Users created");

    // Create classes
    console.log("🏫 Creating classes...");
    const demoClasses = [
      {
        id: "class_001",
        name: "Turma 1A",
        grade: "Ensino Fundamental",
        section: "1º Ano",
        academicYear: "2025",
        capacity: 30,
        coordinatorId: "coord_001",
        status: "active" as const,
        createdAt: now,
        updatedAt: now
      },
      {
        id: "class_002",
        name: "Turma 2B",
        grade: "Ensino Fundamental",
        section: "2º Ano",
        academicYear: "2025",
        capacity: 25,
        coordinatorId: "coord_001",
        status: "active" as const,
        createdAt: now,
        updatedAt: now
      },
      {
        id: "class_003",
        name: "Turma 3C",
        grade: "Ensino Médio",
        section: "1º Ano",
        academicYear: "2025",
        capacity: 35,
        coordinatorId: "coord_001",
        status: "active" as const,
        createdAt: now,
        updatedAt: now
      }
    ];

    for (const classData of demoClasses) {
      await db.insert(classes).values(classData);
    }
    console.log("✅ Classes created");

    // Create subjects
    console.log("📚 Creating subjects...");
    const demoSubjects = [
      {
        id: "subj_001",
        name: "Matemática",
        code: "MAT001",
        description: "Álgebra, geometria e cálculo",
        status: "active" as const,
        createdAt: now,
        updatedAt: now
      },
      {
        id: "subj_002",
        name: "Português",
        code: "PORT001",
        description: "Gramática e literatura",
        status: "active" as const,
        createdAt: now,
        updatedAt: now
      },
      {
        id: "subj_003",
        name: "Ciências",
        code: "CIEN001",
        description: "Física, química e biologia",
        status: "active" as const,
        createdAt: now,
        updatedAt: now
      },
      {
        id: "subj_004",
        name: "História",
        code: "HIST001",
        description: "História mundial e do Brasil",
        status: "active" as const,
        createdAt: now,
        updatedAt: now
      },
      {
        id: "subj_005",
        name: "Geografia",
        code: "GEO001",
        description: "Geografia física e humana",
        status: "active" as const,
        createdAt: now,
        updatedAt: now
      }
    ];

    for (const subject of demoSubjects) {
      await db.insert(subjects).values(subject);
    }
    console.log("✅ Subjects created");

    // Create class-subject assignments
    console.log("📋 Creating class-subject assignments...");
    const demoAssignments = [
      {
        id: "cs_001",
        classId: "class_001",
        subjectId: "subj_001",
        teacherId: "prof_001",
        schedule: "Segunda-feira, 08:00-09:30",
        room: "Sala 101",
        semester: "1º Semestre",
        academicYear: "2025",
        status: "active" as const,
        createdAt: now,
        updatedAt: now
      },
      {
        id: "cs_002",
        classId: "class_001",
        subjectId: "subj_002",
        teacherId: "prof_002",
        schedule: "Terça-feira, 08:00-09:30",
        room: "Sala 102",
        semester: "1º Semestre",
        academicYear: "2025",
        status: "active" as const,
        createdAt: now,
        updatedAt: now
      },
      {
        id: "cs_003",
        classId: "class_001",
        subjectId: "subj_003",
        teacherId: "prof_001",
        schedule: "Quarta-feira, 08:00-09:30",
        room: "Sala 103",
        semester: "1º Semestre",
        academicYear: "2025",
        status: "active" as const,
        createdAt: now,
        updatedAt: now
      },
      {
        id: "cs_004",
        classId: "class_002",
        subjectId: "subj_001",
        teacherId: "prof_001",
        schedule: "Segunda-feira, 10:00-11:30",
        room: "Sala 201",
        semester: "1º Semestre",
        academicYear: "2025",
        status: "active" as const,
        createdAt: now,
        updatedAt: now
      },
      {
        id: "cs_005",
        classId: "class_002",
        subjectId: "subj_004",
        teacherId: "prof_002",
        schedule: "Terça-feira, 10:00-11:30",
        room: "Sala 202",
        semester: "1º Semestre",
        academicYear: "2025",
        status: "active" as const,
        createdAt: now,
        updatedAt: now
      }
    ];

    for (const assignment of demoAssignments) {
      await db.insert(classSubjects).values(assignment);
    }
    console.log("✅ Class-subject assignments created");

    // Create student enrollments
    console.log("🎓 Creating student enrollments...");
    const demoEnrollments = [
      {
        id: "sc_001",
        studentId: "aluno_001",
        classId: "class_001",
        enrollmentDate: now,
        status: "active" as const,
        createdAt: now,
        updatedAt: now
      },
      {
        id: "sc_002",
        studentId: "aluno_002",
        classId: "class_001",
        enrollmentDate: now,
        status: "active" as const,
        createdAt: now,
        updatedAt: now
      }
    ];

    for (const enrollment of demoEnrollments) {
      await db.insert(studentClass).values(enrollment);
    }
    console.log("✅ Student enrollments created");

    // Update current students count - removido pois o campo não existe no schema

    // Create grades
    console.log("📊 Creating grades...");
    const demoGrades = [
      {
        id: "grade_001",
        studentId: "aluno_001",
        classSubjectId: "cs_001",
        type: "exam" as const,
        title: "Prova Bimestral - Álgebra",
        grade: 8.5,
        maxGrade: 10,
        weight: 1,
        date: now,
        comments: "Bom desempenho em álgebra, precisa melhorar em geometria.",
        createdBy: "prof_001",
        createdAt: now,
        updatedAt: now
      },
      {
        id: "grade_002",
        studentId: "aluno_001",
        classSubjectId: "cs_002",
        type: "exam" as const,
        title: "Prova Bimestral - Gramática",
        grade: 7.8,
        maxGrade: 10,
        weight: 1,
        date: now,
        comments: "Boa redação, precisa melhorar em gramática.",
        createdBy: "prof_002",
        createdAt: now,
        updatedAt: now
      },
      {
        id: "grade_003",
        studentId: "aluno_002",
        classSubjectId: "cs_001",
        type: "exam" as const,
        title: "Prova Bimestral - Álgebra",
        grade: 9.2,
        maxGrade: 10,
        weight: 1,
        date: now,
        comments: "Excelente desempenho!",
        createdBy: "prof_001",
        createdAt: now,
        updatedAt: now
      }
    ];

    for (const grade of demoGrades) {
      await db.insert(grades).values(grade);
    }
    console.log("✅ Grades created");

    // Create attendance records
    console.log("📅 Creating attendance records...");
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const demoAttendance = [
      {
        id: "att_001",
        studentId: "aluno_001",
        classId: "class_001",
        subjectId: "subj_001",
        teacherId: "prof_001",
        date: today,
        status: "present" as const,
        notes: "",
        createdAt: now,
        updatedAt: now
      },
      {
        id: "att_002",
        studentId: "aluno_001",
        classId: "class_001",
        subjectId: "subj_002",
        teacherId: "prof_002",
        date: yesterday,
        status: "present" as const,
        notes: "",
        createdAt: now,
        updatedAt: now
      },
      {
        id: "att_003",
        studentId: "aluno_002",
        classId: "class_001",
        subjectId: "subj_001",
        teacherId: "prof_001",
        date: today,
        status: "absent" as const,
        notes: "Atestado médico",
        createdAt: now,
        updatedAt: now
      }
    ];

    for (const attendanceRecord of demoAttendance) {
      await db.insert(attendance).values(attendanceRecord);
    }
    console.log("✅ Attendance records created");

    // Create events
    console.log("📅 Creating events...");
    const demoEvents = [
      {
        id: "event_001",
        title: "Reunião de Pais",
        description: "Reunião com pais e responsáveis para discutir o desempenho dos alunos",
        type: "meeting" as const,
        startDate: "2025-02-15",
        endDate: "2025-02-15",
        location: "Auditório",
        color: "#3B82F6",
        classId: "class_001",
        subjectId: null,
        createdBy: "coord_001",
        isGlobal: false,
        status: "active" as const,
        createdAt: now,
        updatedAt: now
      },
      {
        id: "event_002",
        title: "Prova Bimestral",
        description: "Provas do primeiro bimestre",
        type: "exam" as const,
        startDate: "2025-03-10",
        endDate: "2025-03-14",
        location: "Salas de aula",
        color: "#EF4444",
        classId: "class_001",
        subjectId: null,
        createdBy: "prof_001",
        isGlobal: false,
        status: "active" as const,
        createdAt: now,
        updatedAt: now
      },
      {
        id: "event_003",
        title: "Feira de Ciências",
        description: "Alunos apresentam projetos científicos",
        type: "activity" as const,
        startDate: "2025-04-20",
        endDate: "2025-04-20",
        location: "Pátio",
        color: "#10B981",
        classId: null,
        subjectId: null,
        createdBy: "coord_001",
        isGlobal: true,
        status: "active" as const,
        createdAt: now,
        updatedAt: now
      }
    ];

    for (const event of demoEvents) {
      await db.insert(events).values(event);
    }
    console.log("✅ Events created");

    // Create notifications
    console.log("🔔 Creating notifications...");
    const demoNotifications = [
      {
        id: "notif_001",
        title: "Boas-vindas",
        message: "Bem-vindo ao novo sistema escolar! Explore as funcionalidades.",
        type: "info" as const,
        priority: "medium" as const,
        senderId: "admin_001",
        recipientId: null,
        classId: null,
        subjectId: null,
        read: false,
        createdAt: now,
        updatedAt: now
      },
      {
        id: "notif_002",
        title: "Agenda de Provas",
        message: "As provas do primeiro bimestre serão realizadas na próxima semana.",
        type: "reminder" as const,
        priority: "high" as const,
        senderId: "coord_001",
        recipientId: null,
        classId: "class_001",
        subjectId: null,
        read: false,
        createdAt: now,
        updatedAt: now
      },
      {
        id: "notif_003",
        title: "Trabalho de Matemática",
        message: "Trabalho sobre funções quadráticas deve ser entregue até dia 10/05.",
        type: "assignment" as const,
        priority: "medium" as const,
        senderId: "prof_001",
        recipientId: "aluno_001",
        classId: "class_001",
        subjectId: "subj_001",
        read: false,
        createdAt: now,
        updatedAt: now
      }
    ];

    for (const notification of demoNotifications) {
      await db.insert(notifications).values(notification);
    }
    console.log("✅ Notifications created");

    console.log("🎉 Database seeding completed successfully!");
    console.log("\n📋 Demo Data Summary:");
    console.log("- Users: 6 (1 admin, 1 coordinator, 2 teachers, 2 students)");
    console.log("- Classes: 3");
    console.log("- Subjects: 5");
    console.log("- Class-Subject Assignments: 5");
    console.log("- Student Enrollments: 2");
    console.log("- Grades: 3");
    console.log("- Attendance Records: 3");
    console.log("- Events: 3");
    console.log("- Notifications: 3");
    console.log("\n🔑 Login Credentials:");
    console.log("- Admin: admin@escola.com / 123456");
    console.log("- Coordinator: coord@escola.com / 123456");
    console.log("- Teacher 1: prof1@escola.com / 123456");
    console.log("- Teacher 2: prof2@escola.com / 123456");
    console.log("- Student 1: aluno1@escola.com / 123456");
    console.log("- Student 2: aluno2@escola.com / 123456");

  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

// Run the seed function
seedDatabase()
  .then(() => {
    console.log("✅ Seeding completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  });
