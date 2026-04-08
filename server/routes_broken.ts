import express from "express";
import passport from "passport";
import { db } from "./db";
import { logger } from "./utils/logger";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { 
  activities, 
  activitySubmissions, 
  activityFiles, 
  submissionFiles, 
  submissionHistory, 
  users, 
  subjects,
  classes,
  classSubjects,
  studentClass,
  grades,
  attendance,
  events,
  notifications,
  settings,
  messages,
  reports,
  systemLogs,
  materials,
  materialFiles,
  rubricEvaluations
} from "../shared/schema";
import { eq, and, desc, asc, or, count, avg, sum, like, sql, inArray, ne, isNotNull } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import multer from "multer";
import path from "path";
import fs from "fs";
import { getRealtimeManager } from "./realtime";

// Definir __dirname para modulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuracao do Multer para upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 5 // maximo 5 arquivos
  },
  fileFilter: (req, file, cb) => {
    // Tipos de arquivo permitidos para submissA�es
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];
    
    const isValidMimeType = allowedTypes.includes(file.mimetype);
    const allowedExtensions = /jpeg|jpg|png|gif|pdf|doc|docx|txt|ppt|pptx/;
    const isValidExtension = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
    
    if (isValidMimeType && isValidExtension) {
      return cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo nao permitido para submissA�es'));
    }
  }
});


export function registerRoutes(app: express.Application) {
  // Middleware de autenticacao
  const isAuthenticated = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Not authenticated" });
  };

const hasRole = (roles: string[]) => {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
      if (!req.user || !roles.includes((req.user as any).role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
    }
    next();
  };
};

  // ===== ROTAS DE AUTENTICAA�A�O =====
  
  app.get('/api/auth/user', isAuthenticated, (req, res) => {
    const user = req.user as any;
    res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      phone: user.phone,
      address: user.address,
      registrationNumber: user.registrationNumber
    });
  });

  app.post('/api/auth/login', (req, res, next) => {
    passport.authenticate('local', (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ message: "Internal server error" });
      }
      
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      
      req.logIn(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Login failed" });
        }
        
        res.json({
          message: "Login successful",
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role
          }
        });
      });
    })(req, res, next);
  });

  app.post('/api/auth/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
        return res.status(500).json({ message: "Error during logout" });
    }
    res.json({ message: "Logged out successfully" });
  });
});

  // ===== ROTAS DE USUA�RIOS =====
  
  // Buscar usuario por ID (DEVE vir ANTES da rota /api/users)
  // Buscar usuarios para chat (busca por nome/email) - DEVE VIR ANTES da rota /:id
  app.get('/api/users/search', isAuthenticated, async (req, res) => {
    try {
      const { query } = req.query;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ message: "Query de busca e obrigatoria" });
      }

      const searchQuery = `%${query.toLowerCase()}%`;
      
      const searchResults = await db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          profileImageUrl: users.profileImageUrl
        })
        .from(users)
        .where(
          or(
            like(users.firstName, searchQuery),
            like(users.lastName, searchQuery),
            like(users.email, searchQuery)
          )
        )
        .limit(10);

      // Filtrar o usuario atual da busca
      const filteredResults = searchResults.filter(user => user.id !== (req.user as any)?.id);
      
      res.json({ data: filteredResults });
    } catch (error) {
      console.error('Erro ao buscar usuarios:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  app.get('/api/users/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      
      const user = await db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          profileImageUrl: users.profileImageUrl,
          status: users.status
        })
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (user.length === 0) {
        return res.status(404).json({ message: "Usuario nao encontrado" });
      }

      res.json(user[0]);
    } catch (error) {
      console.error('Erro ao buscar usuario:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  
  // Listar usuarios
  app.get('/api/users', isAuthenticated, hasRole(['admin', 'coordinator']), async (req, res) => {
    try {
      const { role, status, search } = req.query;
      
      let whereConditions = [];
      
      if (role && role !== 'all') {
        whereConditions.push(eq(users.role, role as any));
      }
      
      if (status && status !== 'all') {
        whereConditions.push(eq(users.status, status as any));
      }
      
      if (search) {
        whereConditions.push(
          or(
            like(users.firstName, `%${search}%`),
            like(users.lastName, `%${search}%`),
            like(users.email, `%${search}%`)
          )
        );
      }
      
      const allUsers = await db
        .select()
        .from(users)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .orderBy(asc(users.firstName));
      
      res.json(allUsers);
    } catch (error) {
      console.error('Erro ao buscar usuarios:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Criar usuario
  app.post('/api/users', isAuthenticated, hasRole(['admin']), async (req, res) => {
    try {
      const {
        email,
        password,
        firstName,
        lastName,
        role,
        phone,
        address,
        registrationNumber
      } = req.body;

      if (!email || !password || !firstName || !lastName || !role) {
        return res.status(400).json({ message: "Campos obrigatorios nao preenchidos" });
      }

      // Hash da senha usando bcrypt
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = {
        id: uuidv4(),
        email,
        password: hashedPassword, // Agora usando senha com hash
        firstName,
        lastName,
        role,
        status: 'active' as const,
        phone: phone || null,
        address: address || null,
        registrationNumber: registrationNumber || uuidv4().slice(0, 8).toUpperCase(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await db.insert(users).values(newUser);

      res.status(201).json({
        message: "Usuario criado com sucesso",
        user: newUser
      });
    } catch (error) {
      console.error('Erro ao criar usuario:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // GET /api/student/test - Teste simples para verificar autenticacao
  app.get('/api/student/test', isAuthenticated, hasRole(['student']), async (req, res) => {
    try {
      const user = req.user;
      console.log(`🧪 Teste de autenticacao para: ${user.firstName} ${user.lastName}`);
      console.log(`🆔 ID do usuario: ${user.id}`);
      
      res.json({
        message: "Teste de autenticacao funcionando",
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Erro no teste de autenticacao:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // GET /api/student/subjects - Buscar disciplinas da turma do aluno
  app.get('/api/student/subjects', isAuthenticated, hasRole(['student']), async (req, res) => {
    try {
      const user = req.user;
      console.log(`Buscando disciplinas da turma para aluno: ${user.firstName} ${user.lastName}`);

      // Buscar turma do aluno
      const studentClassInfo = await db
        .select({
          classId: studentClass.classId,
          enrollmentDate: studentClass.enrollmentDate,
          status: studentClass.status
        })
        .from(studentClass)
        .where(
          and(
            eq(studentClass.studentId, user.id),
            eq(studentClass.status, 'active')
          )
        );

      if (studentClassInfo.length === 0) {
        return res.status(404).json({ message: "Aluno nao esta matriculado em nenhuma turma" });
      }

      const classId = studentClassInfo[0].classId;

      // Buscar disciplinas da turma
      const subjectsData = await db
        .select({
          id: subjects.id,
          name: subjects.name,
          code: subjects.code,
          description: subjects.description
        })
        .from(subjects)
        .innerJoin(classSubjects, eq(subjects.id, classSubjects.subjectId))
        .where(
          and(
            eq(classSubjects.classId, classId),
            eq(classSubjects.status, 'active')
          )
        );

      console.log(`Encontradas ${subjectsData.length} disciplinas para o aluno`);

      res.json({ data: subjectsData });
    } catch (error) {
      console.error('Erro ao buscar disciplinas da turma:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // GET /api/student/class-info - Buscar informacA�es da turma do aluno
  app.get('/api/student/class-info', isAuthenticated, hasRole(['student']), async (req, res) => {
    try {
      const user = req.user;
      console.log(`�"� InformacA�es da turma solicitadas por: ${user.firstName} ${user.lastName}`);
      console.log(`�" ID do usuario: ${user.id}`);

      // Buscar turma do aluno
      const studentClassInfo = await db
        .select({
          classId: studentClass.classId,
          enrollmentDate: studentClass.enrollmentDate,
          status: studentClass.status
        })
        .from(studentClass)
        .where(and(
          eq(studentClass.studentId, user.id),
          eq(studentClass.status, 'active')
        ))
        .limit(1);

      console.log(`🔍 Resultado da query:`, studentClassInfo);

      if (studentClassInfo.length === 0) {
        return res.status(404).json({ message: "Aluno nao esta matriculado em nenhuma turma" });
      }

      const classId = studentClassInfo[0].classId;
      console.log(`🔍 ID da turma encontrada: ${classId}`);

      // Buscar informacA�es da turma
      const classInfo = await db
        .select({
          id: classes.id,
          name: classes.name,
          grade: classes.grade,
          section: classes.section,
          academicYear: classes.academicYear,
          capacity: classes.capacity
        })
        .from(classes)
        .where(eq(classes.id, classId))
        .limit(1);

      console.log(`🏫 InformacA�es da turma:`, classInfo);

      if (classInfo.length === 0) {
        return res.status(404).json({ message: "Turma nao encontrada" });
      }

      console.log(`✅ Turma encontrada: ${classInfo[0].name}`);

      // Buscar professores da turma
      let teachers = [];
      try {
        teachers = await db
          .select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
            phone: users.phone,
            subjectName: subjects.name,
            subjectCode: subjects.code
          })
          .from(classSubjects)
          .innerJoin(users, eq(classSubjects.teacherId, users.id))
          .innerJoin(subjects, eq(classSubjects.subjectId, subjects.id))
          .where(and(
            eq(classSubjects.classId, classId),
            eq(classSubjects.status, 'active')
          ));
        console.log(`👨‍🏫 Professores encontrados: ${teachers.length}`);
      } catch (teacherError) {
        console.error('Erro ao buscar professores:', teacherError);
        teachers = [];
      }

      // Buscar colegas de turma
      let classmates = [];
      try {
        classmates = await db
          .select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
            registrationNumber: users.registrationNumber
          })
          .from(studentClass)
          .innerJoin(users, eq(studentClass.studentId, users.id))
          .where(and(
            eq(studentClass.classId, classId),
            eq(studentClass.status, 'active'),
            ne(studentClass.studentId, user.id) // Excluir o proprio aluno
          ));
        console.log(`👫 Colegas encontrados: ${classmates.length}`);
      } catch (classmateError) {
        console.error('Erro ao buscar colegas:', classmateError);
        classmates = [];
      }

      // Contar total de alunos
      let totalStudents = 0;
      try {
        const totalStudentsResult = await db
          .select({ count: sql`count(*)` })
          .from(studentClass)
          .where(and(
            eq(studentClass.classId, classId),
            eq(studentClass.status, 'active')
          ));
        totalStudents = totalStudentsResult[0].count;
        console.log(`👥 Total de alunos: ${totalStudents}`);
      } catch (countError) {
        console.error('Erro ao contar alunos:', countError);
        totalStudents = classmates.length + 1; // +1 para incluir o proprio aluno
      }

      res.json({
        data: {
          class: classInfo[0],
          teachers,
          classmates,
          totalStudents,
          enrollmentDate: studentClassInfo[0].enrollmentDate
        }
      });
    } catch (error) {
      console.error('Erro ao buscar informacA�es da turma:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // POST /api/admin/enroll-student - Matricular aluno em turma (temporario)
  app.post('/api/admin/enroll-student', isAuthenticated, hasRole(['admin']), async (req, res) => {
    try {
      const { studentEmail, className } = req.body;
      
      console.log(`🎓 Matriculando aluno ${studentEmail} na turma ${className}`);
      
      // Buscar aluno
      const student = await db
        .select()
        .from(users)
        .where(eq(users.email, studentEmail))
        .limit(1);
      
      if (student.length === 0) {
        return res.status(404).json({ message: "Aluno nao encontrado" });
      }
      
      // Buscar turma
      const classInfo = await db
        .select()
        .from(classes)
        .where(eq(classes.name, className))
        .limit(1);
      
      if (classInfo.length === 0) {
        return res.status(404).json({ message: "Turma nao encontrada" });
      }
      
      // Verificar se ja esta matriculado
      const existingEnrollment = await db
        .select()
        .from(studentClass)
        .where(eq(studentClass.studentId, student[0].id))
        .limit(1);
      
      if (existingEnrollment.length > 0) {
        // Atualizar matricula
        await db
          .update(studentClass)
          .set({
            classId: classInfo[0].id,
            updatedAt: new Date().toISOString()
          })
          .where(eq(studentClass.studentId, student[0].id));
        
        console.log(`✅ Matricula atualizada: ${student[0].firstName} na turma ${className}`);
      } else {
        // Criar nova matricula
        const enrollment = {
          id: uuidv4(),
          studentId: student[0].id,
          classId: classInfo[0].id,
          enrollmentDate: new Date().toISOString(),
          status: 'enrolled',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        await db.insert(studentClass).values(enrollment);
        console.log(`✅ Nova matricula criada: ${student[0].firstName} na turma ${className}`);
      }
      
      res.json({ 
        message: "Aluno matriculado com sucesso",
        student: student[0].firstName + ' ' + student[0].lastName,
        class: className
      });
    } catch (error) {
      console.error('Erro ao matricular aluno:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // GET /api/student/activities - Buscar atividades do aluno
  app.get('/api/student/activities', isAuthenticated, hasRole(['student']), async (req, res) => {
    try {
      const user = req.user;
      console.log(`📚 Buscando atividades do aluno: ${user.firstName} ${user.lastName}`);

      // Buscar turma do aluno
      const studentClassInfo = await db
        .select({
          classId: studentClass.classId
        })
        .from(studentClass)
        .where(and(
          eq(studentClass.studentId, user.id),
          eq(studentClass.status, 'active')
        ))
        .limit(1);

      if (studentClassInfo.length === 0) {
        return res.json({ data: [] });
      }

      const classId = studentClassInfo[0].classId;

      // Buscar atividades da turma do aluno
      const studentActivities = await db
        .select({
          id: activities.id,
          title: activities.title,
          description: activities.description,
          subjectId: activities.subjectId,
          subjectName: subjects.name,
          subjectCode: subjects.code,
          classId: activities.classId,
          className: classes.name,
          dueDate: activities.dueDate,
          maxGrade: activities.maxGrade,
          instructions: activities.instructions,
          requirements: activities.requirements,
          status: activities.status,
          allowLateSubmission: activities.allowLateSubmission,
          latePenalty: activities.latePenalty,
          maxFileSize: activities.maxFileSize,
          allowedFileTypes: activities.allowedFileTypes,
          createdAt: activities.createdAt,
          updatedAt: activities.updatedAt,
          // Status da submissao do aluno
          submissionStatus: activitySubmissions.status,
          submissionGrade: activitySubmissions.grade,
          submissionFeedback: activitySubmissions.feedback,
          submissionDate: activitySubmissions.submittedAt
        })
        .from(activities)
        .innerJoin(subjects, eq(activities.subjectId, subjects.id))
        .innerJoin(classes, eq(activities.classId, classes.id))
        .leftJoin(activitySubmissions, and(
          eq(activitySubmissions.activityId, activities.id),
          eq(activitySubmissions.studentId, user.id)
        ))
        .where(and(
          eq(activities.classId, classId),
          eq(activities.status, 'active')
        ))
        .orderBy(desc(activities.createdAt));

      console.log(`✅ Encontradas ${studentActivities.length} atividades para o aluno`);

      res.json({ data: studentActivities });
    } catch (error) {
      console.error('Erro ao buscar atividades do aluno:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  
  // Listar turmas
  app.get('/api/classes', isAuthenticated, async (req, res) => {
    try {
      const { status, coordinatorId } = req.query;
      const user = req.user as any;
      
      let whereConditions = [];
      
      // Filtros baseados no role
      if (user.role === 'coordinator') {
        whereConditions.push(eq(classes.coordinatorId, user.id));
      } else if (user.role === 'teacher') {
        // Professor ve apenas turmas onde leciona
        const teacherClasses = await db
          .select({ classId: classSubjects.classId })
          .from(classSubjects)
          .where(and(
            eq(classSubjects.teacherId, user.id),
            eq(classSubjects.status, 'active')
          ));
        
        const classIds = teacherClasses.map(tc => tc.classId);
        if (classIds.length > 0) {
          whereConditions.push(sql`${classes.id} IN (${sql.join(classIds.map(id => sql`${id}`), sql`, `)})`);
        } else {
          // Se nao tem turmas, retornar array vazio
          whereConditions.push(sql`1 = 0`);
        }
      }
      
      if (status && status !== 'all') {
        whereConditions.push(eq(classes.status, status as any));
      }
      
      if (coordinatorId) {
        whereConditions.push(eq(classes.coordinatorId, coordinatorId as string));
      }
      
      const allClasses = await db
        .select()
        .from(classes)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .orderBy(asc(classes.name));
      
      res.json(allClasses);
    } catch (error) {
      console.error('Erro ao buscar turmas:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Criar turma
  app.post('/api/classes', isAuthenticated, hasRole(['admin', 'coordinator']), async (req, res) => {
    try {
      const {
        name,
        grade,
        section,
        academicYear,
        capacity,
        coordinatorId
      } = req.body;

      if (!name || !grade || !section || !academicYear) {
        return res.status(400).json({ message: "Campos obrigatorios nao preenchidos" });
      }

      const newClass = {
        id: uuidv4(),
        name,
        grade,
        section,
        academicYear,
        capacity: capacity || 30,
        currentStudents: 0,
        coordinatorId: coordinatorId || (req.user as any).id,
        status: 'active' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await db.insert(classes).values(newClass);

      res.status(201).json({
        message: "Turma criada com sucesso",
        class: newClass
      });
    } catch (error) {
      console.error('Erro ao criar turma:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // ===== ROTAS DE DISCIPLINAS =====
  
  // Listar disciplinas
  app.get('/api/subjects', isAuthenticated, async (req, res) => {
    try {
      const { status, search, classId } = req.query;
      const user = req.user as any;
      
      console.log('=== BUSCANDO DISCIPLINAS ===');
      console.log('User ID:', user.id);
      console.log('User Role:', user.role);
      console.log('ClassId filter:', classId);
      
      let subjectsList;
      
      if (user.role === 'teacher') {
        // Professor ve apenas disciplinas que leciona
        console.log('🔍 Filtrando disciplinas para professor:', user.id);
        
        // Primeiro, verificar se existem vinculos
        const teacherLinks = await db
          .select()
          .from(classSubjects)
          .where(and(
            eq(classSubjects.teacherId, user.id),
            eq(classSubjects.status, 'active')
          ));
        
        console.log(`📊 Vinculos encontrados para professor: ${teacherLinks.length}`);
        teacherLinks.forEach(link => {
          console.log(`  - ClassId: ${link.classId}, SubjectId: ${link.subjectId}, Status: ${link.status}`);
        });
        
        let whereConditions = [
          eq(classSubjects.teacherId, user.id),
          eq(classSubjects.status, 'active')
        ];
        
        // Se classId for fornecido, filtrar por turma especifica
        if (classId) {
          whereConditions.push(eq(classSubjects.classId, classId));
        }
        
        subjectsList = await db
          .select({
            id: subjects.id,
            name: subjects.name,
            code: subjects.code,
            description: subjects.description,
            classId: classSubjects.classId,
            className: classes.name
          })
          .from(subjects)
          .innerJoin(classSubjects, eq(classSubjects.subjectId, subjects.id))
          .innerJoin(classes, eq(classSubjects.classId, classes.id))
          .where(and(
            ...whereConditions,
            eq(subjects.status, 'active')
          ))
          .groupBy(subjects.id, classSubjects.classId)
          .orderBy(asc(subjects.name));
        
        console.log(`✅ Disciplinas encontradas para professor: ${subjectsList.length}`);
        subjectsList.forEach(subj => {
          console.log(`  - ${subj.name} (${subj.id}) - Turma: ${subj.className}`);
        });
      } else {
        // Admin, coordinator e student veem todas
      let whereConditions = [];
      
      if (status && status !== 'all') {
        whereConditions.push(eq(subjects.status, status as "active" | "inactive"));
      }
      
      if (search) {
        whereConditions.push(
          or(
            like(subjects.name, `%${search}%`),
            like(subjects.code, `%${search}%`)
          )
        );
      }
      
        subjectsList = await db
          .select({
            id: subjects.id,
            name: subjects.name,
            code: subjects.code,
            description: subjects.description,
            status: subjects.status
          })
        .from(subjects)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .orderBy(asc(subjects.name));
      }
      
      console.log(`✅ Encontradas ${subjectsList.length} disciplinas para ${user.role}`);
      
      res.json(subjectsList);
    } catch (error) {
      console.error('Erro ao buscar disciplinas:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Criar disciplina
  app.post('/api/subjects', isAuthenticated, hasRole(['admin', 'coordinator']), async (req, res) => {
    try {
      const {
        name,
        code,
        description,
        credits,
        workload,
        teacherId
      } = req.body;

      if (!name || !code) {
        return res.status(400).json({ message: "Campos obrigatorios nao preenchidos" });
      }

      const newSubject = {
        id: uuidv4(),
        name,
        code,
        description: description || null,
        credits: credits || 1,
        workload: workload || 60,
        teacherId: teacherId || null,
        status: 'active' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await db.insert(subjects).values(newSubject);

      res.status(201).json({
        message: "Disciplina criada com sucesso",
        subject: newSubject
      });
    } catch (error) {
      console.error('Erro ao criar disciplina:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // ===== ROTAS DE ESTATA�STICAS DO DASHBOARD =====
  
  // Estatisticas gerais
  app.get('/api/dashboard/stats', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      
      let stats: any = {};
      
      if (user.role === 'admin') {
        // Stats para admin
        const [userCount] = await db.select({ count: count() }).from(users);
        const [classCount] = await db.select({ count: count() }).from(classes);
        const [subjectCount] = await db.select({ count: count() }).from(subjects);
        
        stats = {
          totalUsers: userCount.count,
          totalClasses: classCount.count,
          totalSubjects: subjectCount.count,
          totalStudents: await db.select({ count: count() }).from(users).where(eq(users.role, 'student')).then(r => r[0].count),
          totalTeachers: await db.select({ count: count() }).from(users).where(eq(users.role, 'teacher')).then(r => r[0].count)
        };
      } else if (user.role === 'coordinator') {
        // Stats para coordenador
        const myClasses = await db.select({ count: count() }).from(classes).where(eq(classes.coordinatorId, user.id));
        
        stats = {
          totalClasses: myClasses[0].count,
          totalStudents: await db
            .select({ count: count() })
            .from(studentClass)
            .innerJoin(classes, eq(studentClass.classId, classes.id))
            .where(eq(classes.coordinatorId, user.id))
            .then(r => r[0]?.count || 0)
        };
      } else if (user.role === 'teacher') {
        // Stats para professor
        const myClassSubjects = await db.select({ count: count() }).from(classSubjects).where(eq(classSubjects.teacherId, user.id));
        
        stats = {
          totalAssignments: myClassSubjects[0].count,
          totalStudents: await db
            .select({ count: count() })
            .from(studentClass)
            .innerJoin(classSubjects, eq(studentClass.classId, classSubjects.classId))
            .where(eq(classSubjects.teacherId, user.id))
            .then(r => r[0]?.count || 0)
        };
      }
      
      res.json(stats);
    } catch (error) {
      console.error('Erro ao buscar estatisticas:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // ===== ROTAS DE NOTIFICAA�A�ES =====
  
  // Listar notificacA�es
  app.get('/api/notifications', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const { read, type } = req.query;
      
      let whereConditions = [];
      
      // NotificacA�es para o usuario especifico ou globais
      whereConditions.push(
        or(
          eq(notifications.recipientId, user.id)
          // NotificacA�es globais serao tratadas separadamente
        )
      );
      
      if (read !== undefined) {
        whereConditions.push(eq(notifications.read, read === 'true'));
      }
      
      if (type && type !== 'all') {
        whereConditions.push(eq(notifications.type, type as "error" | "info" | "warning" | "success" | "reminder" | "announcement" | "grade" | "assignment"));
      }
      
      const allNotifications = await db
        .select()
        .from(notifications)
        .where(and(...whereConditions))
        .orderBy(desc(notifications.createdAt))
        .limit(50);
      
      res.json(allNotifications);
    } catch (error) {
      console.error('Erro ao buscar notificacA�es:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Marcar notificacao como lida
  app.patch('/api/notifications/:id/read', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user as any;
      
      await db
        .update(notifications)
        .set({ 
          read: true,
          updatedAt: new Date().toISOString()
        })
        .where(
          and(
            eq(notifications.id, id),
            eq(notifications.recipientId, user.id)
          )
        );
      
      res.json({ message: "Notificacao marcada como lida" });
    } catch (error) {
      console.error('Erro ao marcar notificacao:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // ===== ROTAS DO PROFESSOR =====
  
  // Buscar dados do professor
  app.get('/api/teacher/:teacherId', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const { teacherId } = req.params;
      
      const teacher = await db.select().from(users).where(eq(users.id, teacherId)).limit(1);
      
      if (teacher.length === 0) {
        return res.status(404).json({ message: "Professor nao encontrado" });
      }
      
      res.json({ data: teacher[0] });
    } catch (error) {
      console.error('Erro ao buscar dados do professor:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  
  // Buscar turmas do professor
  app.get('/api/teacher/:teacherId/classes', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const { teacherId } = req.params;
      
      const teacherClasses = await db
        .select({
          id: classSubjects.id,
          classId: classSubjects.classId,
          subjectId: classSubjects.subjectId,
          className: classes.name,
          subjectName: subjects.name,
          schedule: classSubjects.schedule,
          room: classSubjects.room,
          semester: classSubjects.semester,
          academicYear: classSubjects.academicYear,
          status: classSubjects.status
        })
        .from(classSubjects)
        .innerJoin(classes, eq(classSubjects.classId, classes.id))
        .innerJoin(subjects, eq(classSubjects.subjectId, subjects.id))
        .where(eq(classSubjects.teacherId, teacherId));
      
      // Buscar contagem de alunos para cada turma
      const classesWithStudents = await Promise.all(
        teacherClasses.map(async (cls) => {
          const studentsCount = await db
            .select({ count: count() })
            .from(studentClass)
            .where(eq(studentClass.classId, cls.classId!));
          
          return {
            ...cls,
            currentStudents: studentsCount[0]?.count || 0
          };
        })
      );
      
      res.json({ data: classesWithStudents });
    } catch (error) {
      console.error('Erro ao buscar turmas do professor:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  
  // Buscar proximas aulas do professor
  app.get('/api/teacher/:teacherId/upcoming-classes', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const { teacherId } = req.params;
      
      // Simular proximas aulas baseado no schedule das turmas
      const teacherClasses = await db
        .select({
          id: classSubjects.id,
          classId: classSubjects.classId,
          className: classes.name,
          subjectName: subjects.name,
          schedule: classSubjects.schedule,
          room: classSubjects.room
        })
        .from(classSubjects)
        .innerJoin(classes, eq(classSubjects.classId, classes.id))
        .innerJoin(subjects, eq(classSubjects.subjectId, subjects.id))
        .where(eq(classSubjects.teacherId, teacherId));
      
      // Buscar contagem de alunos para cada turma
      const classesWithStudents = await Promise.all(
        teacherClasses.map(async (cls) => {
          const studentsCount = await db
            .select({ count: count() })
            .from(studentClass)
            .where(eq(studentClass.classId, cls.classId!));
          
          return {
            ...cls,
            studentsCount: studentsCount[0]?.count || 0
          };
        })
      );
      
      // Adicionar informacA�es simuladas de horario
      const upcomingClasses = classesWithStudents.map((cls, index) => ({
        ...cls,
        day: ['Segunda-feira', 'Terca-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'][index % 5],
        time: ['07:30 - 09:10', '09:30 - 11:10', '13:30 - 15:10', '15:30 - 17:10'][index % 4]
      }));
      
      res.json({ data: upcomingClasses });
    } catch (error) {
      console.error('Erro ao buscar proximas aulas:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  
  // Buscar notas recentes do professor
  app.get('/api/teacher/:teacherId/recent-grades', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const { teacherId } = req.params;
      
      const recentGrades = await db
        .select({
          id: grades.id,
          className: classes.name,
          subjectName: subjects.name,
          createdAt: grades.createdAt,
          status: grades.type,
          studentsCount: count()
        })
        .from(grades)
        .innerJoin(classSubjects, eq(grades.classSubjectId, classSubjects.id))
        .innerJoin(classes, eq(classSubjects.classId, classes.id))
        .innerJoin(subjects, eq(classSubjects.subjectId, subjects.id))
        .where(eq(classSubjects.teacherId, teacherId))
        .groupBy(grades.id, classes.name, subjects.name, grades.createdAt, grades.type)
        .orderBy(desc(grades.createdAt))
        .limit(5);
      
      res.json({ data: recentGrades });
    } catch (error) {
      console.error('Erro ao buscar notas recentes:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  
  // Buscar alunos em atencao do professor
  app.get('/api/teacher/:teacherId/students-watch', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const { teacherId } = req.params;
      
      // Buscar alunos com baixo desempenho ou muitas faltas
      const studentsToWatch = await db
        .select({
          id: users.id,
          name: users.firstName,
          className: classes.name
        })
        .from(users)
        .innerJoin(studentClass, eq(users.id, studentClass.studentId))
        .innerJoin(classes, eq(studentClass.classId, classes.id))
        .innerJoin(classSubjects, eq(classes.id, classSubjects.classId))
        .where(eq(classSubjects.teacherId, teacherId));
      
      // Processar dados para identificar problemas (simulado por enquanto)
      const processedStudents = studentsToWatch.slice(0, 5).map((student, index) => {
        const issues = ["Baixo desempenho", "Faltas frequentes", "Indisciplina"];
        const issue = issues[index % issues.length];
        const averageGrade = (4 + Math.random() * 3).toFixed(1); // Simular nota entre 4.0 e 7.0
        
        return {
          ...student,
          issue,
          averageGrade
        };
      });
      
      res.json({ data: processedStudents });
    } catch (error) {
      console.error('Erro ao buscar alunos em atencao:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });



  // ===== SISTEMA DE ATIVIDADES (MANTENDO AS ROTAS EXISTENTES) =====

  // Buscar todas as atividades (com filtros)
  app.get('/api/activities', isAuthenticated, async (req, res) => {
    try {
      const { role, teacherId, studentId, subjectId, status, search } = req.query;
      const user = req.user as any;
    
    let whereConditions = [];
    
      // Filtrar por papel do usuario
      if (user.role === 'teacher') {
        whereConditions.push(eq(activities.teacherId, user.id));
      } else if (user.role === 'student') {
        // Em producao, filtraria pelas materias em que o aluno esta matriculado
        whereConditions.push(eq(activities.status, 'active'));
      }

      // Filtros adicionais
      if (subjectId && subjectId !== 'all') {
        whereConditions.push(eq(activities.subjectId, subjectId as string));
      }

      if (status && status !== 'all') {
        whereConditions.push(eq(activities.status, status as "active" | "draft" | "expired" | "archived"));
    }
    
    if (search) {
      whereConditions.push(
          // Busca por titulo ou descricao
          // Implementar busca full-text se necessario
        );
      }

      const allActivities = await db
        .select()
        .from(activities)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .orderBy(desc(activities.createdAt));

      // Buscar submissA�es para cada atividade
      const activitiesWithSubmissions = await Promise.all(
        allActivities.map(async (activity) => {
          const submissions = await db
            .select()
            .from(activitySubmissions)
            .where(eq(activitySubmissions.activityId, activity.id));

          const files = await db
            .select()
            .from(activityFiles)
            .where(eq(activityFiles.activityId, activity.id));

          // Verificar se o usuario atual ja submeteu esta atividade
          let submitted = false;
          if (user.role === 'student') {
            const userSubmission = await db
              .select()
              .from(activitySubmissions)
              .where(
                and(
                  eq(activitySubmissions.activityId, activity.id),
                  eq(activitySubmissions.studentId, user.id)
                )
              )
              .limit(1);
            
            submitted = userSubmission.length > 0;
          }

          return {
            ...activity,
            allowedFileTypes: activity.allowedFileTypes ? JSON.parse(activity.allowedFileTypes) : [],
            submissions,
            files,
            submitted
          };
        })
      );

      res.json(activitiesWithSubmissions);
    } catch (error) {
      console.error('Erro ao buscar atividades:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
  }
});

  // Buscar atividade especifica
  app.get('/api/activities/:id', isAuthenticated, async (req, res) => {
  try {
      const { id } = req.params;
    const user = req.user as any;
    
      const activity = await db
        .select()
        .from(activities)
        .where(eq(activities.id, id))
        .limit(1);

      if (activity.length === 0) {
        return res.status(404).json({ message: "Atividade nao encontrada" });
      }

      // Verificar permissA�es
      if (user.role === 'student' && activity[0].status !== 'active') {
        return res.status(403).json({ message: "Acesso negado" });
      }

      if (user.role === 'teacher' && activity[0].teacherId !== user.id) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      // Buscar submissA�es e arquivos das submissA�es
      const submissions = await db
        .select()
        .from(activitySubmissions)
        .where(eq(activitySubmissions.activityId, id));

      // Buscar arquivos das submissA�es (nao da atividade)
      const submissionFilesData = await db
        .select({
          id: submissionFiles.id,
          submissionId: submissionFiles.submissionId,
          fileName: submissionFiles.fileName,
          originalFileName: submissionFiles.originalFileName,
          filePath: submissionFiles.filePath,
          fileSize: submissionFiles.fileSize,
          fileType: submissionFiles.fileType,
          uploadedAt: submissionFiles.uploadedAt
        })
        .from(submissionFiles)
        .innerJoin(activitySubmissions, eq(submissionFiles.submissionId, activitySubmissions.id))
        .where(eq(activitySubmissions.activityId, id));

      // Buscar arquivos da atividade (anexos do professor)
      const activityFilesData = await db
        .select()
        .from(activityFiles)
        .where(eq(activityFiles.activityId, id));

      console.log(`🔍 [${user.role}] Buscando atividade ${id}:`);
      console.log(`📄 SubmissA�es encontradas: ${submissions.length}`);
      console.log(`📁 Arquivos de submissA�es encontrados: ${submissionFilesData.length}`);
      console.log(`📎 Arquivos da atividade encontrados: ${activityFilesData.length}`);
      
      if (submissionFilesData.length > 0) {
        console.log('📎 Detalhes dos arquivos de submissA�es:');
        submissionFilesData.forEach((file, index) => {
          console.log(`   ${index + 1}. ${file.originalFileName} (${file.fileSize} bytes)`);
        });
      }

      const result = {
        ...activity[0],
        allowedFileTypes: activity[0].allowedFileTypes ? JSON.parse(activity[0].allowedFileTypes) : [],
        submissions: submissions.map(submission => ({
          ...submission,
          files: submissionFilesData
            .filter(file => file.submissionId === submission.id)
            .map(file => file)
        })),
        files: activityFilesData // Arquivos da atividade (anexos do professor)
      };
      
      console.log(`✅ Retornando resultado com ${submissionFilesData.length} arquivo(s) de submissao e ${activityFilesData.length} arquivo(s) da atividade`);
      console.log('📋 Estrutura do resultado:', Object.keys(result));

      res.json(result);
  } catch (error) {
      console.error('Erro ao buscar atividade:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Deletar arquivo especifico de uma atividade
  app.delete('/api/activities/:id/files/:fileId', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const { id: activityId, fileId } = req.params;
      const user = req.user as any;
      
      console.log('=== DELETANDO ARQUIVO DE ATIVIDADE ===');
      console.log('Activity ID:', activityId);
      console.log('File ID:', fileId);
      console.log('Teacher ID:', user.id);
      
      // Verificar se a atividade pertence ao professor
      const activity = await db
        .select()
        .from(activities)
        .where(and(
          eq(activities.id, activityId),
          eq(activities.teacherId, user.id)
        ))
        .limit(1);
      
      if (activity.length === 0) {
        console.log('❌ Atividade nao encontrada ou nao pertence ao professor');
        return res.status(404).json({ message: "Atividade nao encontrada" });
      }
      
      // Buscar o arquivo para obter o caminho
      const file = await db
        .select()
        .from(activityFiles)
        .where(and(
          eq(activityFiles.id, fileId),
          eq(activityFiles.activityId, activityId)
        ))
        .limit(1);
      
      if (file.length === 0) {
        console.log('❌ Arquivo nao encontrado');
        return res.status(404).json({ message: "Arquivo nao encontrado" });
      }
      
      const activityFile = file[0];
      console.log('✅ Arquivo encontrado:', activityFile.originalFileName);
      
      // Deletar o arquivo do banco de dados
      await db
        .delete(activityFiles)
        .where(eq(activityFiles.id, fileId));
      
      // Tentar deletar o arquivo fisico
      try {
        const filePath = path.join(__dirname, '..', activityFile.filePath);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log('🗑️ Arquivo fisico deletado:', filePath);
        } else {
          console.log('🔸 Arquivo fisico nao encontrado (ok)');
        }
      } catch (error) {
        console.log('⚠️ Erro ao deletar arquivo fisico (continuando):', error);
      }
      
      console.log('✅ Arquivo deletado com sucesso!');
      res.json({ 
        message: "Arquivo deletado com sucesso",
        fileId: fileId,
        fileName: activityFile.originalFileName
      });
      
    } catch (error) {
      console.error('❌ Erro ao deletar arquivo:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Deletar atividade (apenas professores)
  app.delete('/api/activities/:id', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const activityId = req.params.id;
      const user = req.user as any;
      
      console.log('=== DELETANDO ATIVIDADE ===');
      console.log('Activity ID:', activityId);
      console.log('Teacher ID:', user.id);
      
      // 1. Verificar se a atividade existe e pertence ao professor
      const activity = await db
        .select()
        .from(activities)
        .where(and(
          eq(activities.id, activityId),
          eq(activities.teacherId, user.id)
        ))
        .limit(1);
      
      if (activity.length === 0) {
        console.log('❌ Atividade nao encontrada ou nao pertence ao professor');
        return res.status(404).json({ message: "Atividade nao encontrada" });
      }
      
      console.log('✅ Atividade encontrada:', activity[0].title);
      
      // 2. Deletar registros relacionados em ordem correta para evitar foreign key constraints
      
      console.log('📋 Iniciando processo de delecao em cascata...');
      
      // 2.1. Buscar todas as submissA�es da atividade
      const submissions = await db
        .select({ id: activitySubmissions.id })
        .from(activitySubmissions)
        .where(eq(activitySubmissions.activityId, activityId));
      
      console.log(`📄 Encontradas ${submissions.length} submissao(A�es) para deletar`);
      
      // 2.2. Deletar arquivos das submissA�es (se existirem)
      if (submissions.length > 0) {
        console.log('🗂️ Deletando arquivos das submissA�es...');
        for (const submission of submissions) {
          const deletedFiles = await db
            .delete(submissionFiles)
            .where(eq(submissionFiles.submissionId, submission.id));
          console.log(`   └─ Arquivos da submissao ${submission.id}: deletados`);
        }
      }
      
      // 2.3. Deletar historico das submissA�es (se existir)
      if (submissions.length > 0) {
        console.log('📚 Deletando historico das submissA�es...');
        for (const submission of submissions) {
          try {
            await db
              .delete(submissionHistory)
              .where(eq(submissionHistory.submissionId, submission.id));
            console.log(`   └─ Historico da submissao ${submission.id}: deletado`);
          } catch (error) {
            console.log(`   └─ Historico da submissao ${submission.id}: nao encontrado (ok)`);
          }
        }
      }
      
      // 2.4. Deletar as submissA�es
      if (submissions.length > 0) {
        console.log('📝 Deletando submissA�es...');
        const deletedSubmissions = await db
          .delete(activitySubmissions)
          .where(eq(activitySubmissions.activityId, activityId));
        console.log(`✅ ${submissions.length} submissao(A�es) deletada(s)`);
      }
      
      // 2.5. Deletar arquivos da atividade
      console.log('🗃️ Deletando arquivos da atividade...');
      try {
        const deletedActivityFiles = await db
          .delete(activityFiles)
          .where(eq(activityFiles.activityId, activityId));
        console.log('✅ Arquivos da atividade deletados');
      } catch (error) {
        console.log('🔸 Arquivos da atividade: nao encontrados (ok)');
      }
      
      // 2.6. Finalmente, deletar a atividade
      console.log('📋 Deletando a atividade...');
      await db.delete(activities).where(eq(activities.id, activityId));
      console.log('✅ Atividade deletada com sucesso!');
      
      res.json({ 
        message: "Atividade deletada com sucesso",
        activityId: activityId,
        activityTitle: activity[0].title
      });
      
    } catch (error) {
      console.error('❌ Erro ao deletar atividade:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Download de arquivo de atividade
  app.get('/api/activities/files/:fileId/download', isAuthenticated, async (req, res) => {
    try {
      const fileId = req.params.fileId;
      
      console.log('=== BAIXANDO ARQUIVO DE ATIVIDADE ===');
      console.log('File ID:', fileId);
      
      // Buscar arquivo da atividade
      const file = await db
        .select()
        .from(activityFiles)
        .where(eq(activityFiles.id, fileId))
        .limit(1);
      
      if (file.length === 0) {
        console.log('❌ Arquivo nao encontrado');
        return res.status(404).json({ message: "Arquivo nao encontrado" });
      }
      
      const activityFile = file[0];
      console.log('✅ Arquivo encontrado:', activityFile.originalFileName);
      
      // Verificar se o arquivo existe no disco
      const filePath = path.resolve(activityFile.filePath);
      if (!fs.existsSync(filePath)) {
        console.log('❌ Arquivo nao encontrado no disco:', filePath);
        return res.status(404).json({ message: "Arquivo nao encontrado no servidor" });
      }
      
      // Enviar arquivo para download
      res.setHeader('Content-Disposition', `attachment; filename="${activityFile.originalFileName}"`);
      res.setHeader('Content-Type', activityFile.fileType);
      
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
      
    } catch (error) {
      console.error('❌ Erro ao baixar arquivo de atividade:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Visualizar arquivo de atividade
  app.get('/api/activities/files/:fileId/view', isAuthenticated, async (req, res) => {
    try {
      const fileId = req.params.fileId;
      
      console.log('=== VISUALIZANDO ARQUIVO DE ATIVIDADE ===');
      console.log('File ID:', fileId);
      
      // Buscar arquivo da atividade
      const file = await db
        .select()
        .from(activityFiles)
        .where(eq(activityFiles.id, fileId))
        .limit(1);
      
      if (file.length === 0) {
        console.log('❌ Arquivo nao encontrado');
        return res.status(404).json({ message: "Arquivo nao encontrado" });
      }
      
      const activityFile = file[0];
      console.log('✅ Arquivo encontrado:', activityFile.originalFileName);
      
      // Verificar se o arquivo existe no disco
      const filePath = path.resolve(activityFile.filePath);
      if (!fs.existsSync(filePath)) {
        console.log('❌ Arquivo nao encontrado no disco:', filePath);
        return res.status(404).json({ message: "Arquivo nao encontrado no servidor" });
      }
      
      // Enviar arquivo para visualizacao
      // Definir Content-Type baseado na extensao do arquivo
      const fileExtension = path.extname(activityFile.originalFileName).toLowerCase();
      let contentType = activityFile.fileType;
      
      // Mapear extensA�es para Content-Types corretos
      const mimeTypes = {
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.txt': 'text/plain',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif'
      };
      
      if (mimeTypes[fileExtension]) {
        contentType = mimeTypes[fileExtension];
      }
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `inline; filename="${activityFile.originalFileName}"`);
      
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
      
    } catch (error) {
      console.error('❌ Erro ao visualizar arquivo de atividade:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Criar nova atividade (apenas professores)
  app.post('/api/activities', isAuthenticated, hasRole(['teacher']), upload.array('files', 5), async (req, res) => {
    try {
      const user = req.user as any;
      const {
        title,
        description,
        subjectId,
        classId,
        dueDate,
        maxGrade,
        instructions,
        requirements,
        allowLateSubmission,
        latePenalty,
        maxFileSize,
        allowedFileTypes
      } = req.body;

      console.log('=== CRIANDO NOVA ATIVIDADE ===');
      console.log('Dados recebidos:', {
        title,
        description,
        subjectId,
        classId,
        teacherId: user.id,
        dueDate,
        maxGrade
      });

      if (!title || !description || !dueDate) {
        return res.status(400).json({ message: "Campos obrigatorios nao preenchidos" });
      }

      // Verificar se subjectId existe (se fornecido)
      if (subjectId) {
        const subjectExists = await db
          .select()
          .from(subjects)
          .where(eq(subjects.id, subjectId))
          .limit(1);
        
        if (subjectExists.length === 0) {
          console.log('❌ Subject nao encontrado:', subjectId);
          return res.status(400).json({ message: "Disciplina nao encontrada" });
        }
      }

      // Verificar se classId existe (se fornecido)
      if (classId) {
        const classExists = await db
          .select()
          .from(classes)
          .where(eq(classes.id, classId))
          .limit(1);
        
        if (classExists.length === 0) {
          console.log('❌ Class nao encontrada:', classId);
          return res.status(400).json({ message: "Turma nao encontrada" });
        }
      }

      // Verificar se o professor existe
      const teacherExists = await db
        .select()
        .from(users)
        .where(and(eq(users.id, user.id), eq(users.role, 'teacher')))
        .limit(1);
      
      if (teacherExists.length === 0) {
        console.log('❌ Teacher nao encontrado:', user.id);
        return res.status(400).json({ message: "Professor nao encontrado" });
      }

      const newActivity = {
        id: uuidv4(),
        title,
        description,
        subjectId: subjectId || null,
        teacherId: user.id,
        classId: classId || null,
        dueDate,
        maxGrade: maxGrade || 10,
        instructions: instructions || null,
        requirements: requirements || null,
        status: 'active' as const,
        allowLateSubmission: allowLateSubmission || false,
        latePenalty: latePenalty || 0,
        maxFileSize: maxFileSize || 10,
        allowedFileTypes: allowedFileTypes ? JSON.stringify(allowedFileTypes) : null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      console.log('✅ Inserindo atividade:', newActivity);
      await db.insert(activities).values(newActivity);

      // Processar arquivos enviados
      const files = req.files as Express.Multer.File[] || [];
      
      for (const file of files) {
        const fileId = uuidv4();
        
        // Salvar informacA�es do arquivo no banco
        await db.insert(activityFiles).values({
          id: fileId,
          activityId: newActivity.id,
          fileName: file.filename, // Nome unico gerado pelo multer
          originalFileName: file.originalname,
          filePath: file.path,
          fileSize: file.size,
          fileType: file.mimetype,
          fileCategory: 'reference' as const, // Categoria padrao para arquivos de referencia
          uploadedBy: user.id,
          createdAt: new Date().toISOString()
        });
      }

      console.log(`📁 ${files.length} arquivo(s) processado(s) para a atividade`);

      // Notificar alunos em tempo real sobre nova atividade
      const realtimeManager = getRealtimeManager();
      if (realtimeManager && classId) {
        realtimeManager.notifyNewActivity(newActivity, classId);
      }

      console.log('✅ Atividade criada com sucesso!');
      res.status(201).json({
        message: "Atividade criada com sucesso",
        activity: newActivity
      });
    } catch (error) {
      console.error('Erro ao criar atividade:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Atualizar atividade
  app.put('/api/activities/:id', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user as any;
      const updateData = req.body;

      // Verificar se a atividade pertence ao professor
      const existingActivity = await db
        .select()
        .from(activities)
        .where(eq(activities.id, id))
        .limit(1);

      if (existingActivity.length === 0) {
        return res.status(404).json({ message: "Atividade nao encontrada" });
      }

      if (existingActivity[0].teacherId !== user.id) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      updateData.updatedAt = new Date().toISOString();

      await db
        .update(activities)
        .set(updateData)
        .where(eq(activities.id, id));

      // Notificar alunos em tempo real sobre atualizacao da atividade
      const realtimeManager = getRealtimeManager();
      if (realtimeManager && existingActivity[0].classId) {
        const updatedActivity = { ...existingActivity[0], ...updateData };
        realtimeManager.notifyActivityUpdate(updatedActivity, existingActivity[0].classId);
      }

      res.json({ message: "Atividade atualizada com sucesso" });
    } catch (error) {
      console.error('Erro ao atualizar atividade:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Deletar atividade
  app.delete('/api/activities/:id', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user as any;

      // Verificar se a atividade pertence ao professor
      const existingActivity = await db
        .select()
        .from(activities)
        .where(eq(activities.id, id))
        .limit(1);

      if (existingActivity.length === 0) {
        return res.status(404).json({ message: "Atividade nao encontrada" });
      }

      if (existingActivity[0].teacherId !== user.id) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      // Verificar se ha submissA�es
      const submissions = await db
        .select()
        .from(activitySubmissions)
        .where(eq(activitySubmissions.activityId, id));

      if (submissions.length > 0) {
        return res.status(400).json({ 
          message: "Nao e possivel deletar uma atividade que possui submissA�es" 
        });
      }

      await db.delete(activities).where(eq(activities.id, id));

      // Notificar alunos em tempo real sobre remocao da atividade
      const realtimeManager = getRealtimeManager();
      if (realtimeManager && existingActivity[0].classId) {
        realtimeManager.notifyActivityRemoved(id, existingActivity[0].classId);
      }

      res.json({ message: "Atividade deletada com sucesso" });
  } catch (error) {
      console.error('Erro ao deletar atividade:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Submeter atividade (apenas alunos) - VERSA�O SIMPLIFICADA
  // Rota de submissao removida - usando a versao mais completa abaixo

  // Desfazer entrega de atividade (apenas alunos)
  app.post('/api/activities/:id/undo-submit', isAuthenticated, hasRole(['student']), async (req, res) => {
    try {
      console.log('=== DESFAZENDO SUBMISSA�O ===');
      
      const { id: activityId } = req.params;
      const user = req.user as any;
      
      // Verificar se a atividade existe
      if (!activityId) {
        return res.status(400).json({ message: "ID da atividade e obrigatorio" });
      }
      
      console.log('Tentando desfazer submissao para:', activityId, 'usuario:', user.id);

      // Buscar e deletar a submissao
      const submissions = await db
        .select()
        .from(activitySubmissions)
        .where(
          and(
            eq(activitySubmissions.activityId, activityId),
            eq(activitySubmissions.studentId, user.id)
          )
        );

      if (submissions.length === 0) {
        return res.status(404).json({ message: "Submissao nao encontrada" });
      }

      // Deletar a submissao
      await db
        .delete(activitySubmissions)
        .where(
          and(
            eq(activitySubmissions.activityId, activityId),
            eq(activitySubmissions.studentId, user.id)
          )
        );
      
      console.log('Submissao desfeita com sucesso!');

      res.json({
        message: "Entrega desfeita com sucesso"
      });
  } catch (error) {
      console.error('Erro ao desfazer submissao:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
  }
});

  // Avaliar submissao (apenas professores)
  app.post('/api/submissions/:id/grade', isAuthenticated, hasRole(['teacher']), async (req, res) => {
  try {
      const { id: submissionId } = req.params;
    const user = req.user as any;
      const { grade, feedback } = req.body;

      if (grade === undefined || grade === null) {
        return res.status(400).json({ message: "Nota e obrigatoria" });
      }

      // Verificar se a submissao existe
      const submission = await db
        .select()
        .from(activitySubmissions)
        .where(eq(activitySubmissions.id, submissionId))
        .limit(1);

      if (submission.length === 0) {
        return res.status(404).json({ message: "Submissao nao encontrada" });
      }

      // Verificar se o professor pode avaliar (e o professor da atividade)
      if (!submission[0].activityId) {
        return res.status(400).json({ message: "ID da atividade nao encontrado" });
      }
      
      const activity = await db
        .select()
        .from(activities)
        .where(eq(activities.id, submission[0].activityId))
        .limit(1);

      if (activity.length === 0 || activity[0].teacherId !== user.id) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      // Calcular nota final considerando penalidades
      const maxGrade = submission[0].maxGrade;
      const finalGrade = Math.max(0, grade - submission[0].latePenaltyApplied);

      // Atualizar submissao
      await db
        .update(activitySubmissions)
        .set({
          grade,
          feedback: feedback || null,
          status: 'graded',
          gradedBy: user.id,
          gradedAt: new Date().toISOString(),
          finalGrade,
          updatedAt: new Date().toISOString()
        })
        .where(eq(activitySubmissions.id, submissionId));

      // Registrar no historico
      await db.insert(submissionHistory).values({
        id: uuidv4(),
        submissionId,
        action: 'graded',
        performedBy: user.id,
        performedAt: new Date().toISOString(),
        details: `Avaliado com nota ${grade}/${maxGrade}. Nota final: ${finalGrade}/${maxGrade}`,
        previousStatus: submission[0].status,
        newStatus: 'graded',
        gradeChange: grade
      });

      res.json({ 
        message: "Submissao avaliada com sucesso",
        finalGrade
      });
  } catch (error) {
      console.error('Erro ao avaliar submissao:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Buscar submissA�es de uma atividade
  app.get('/api/activities/:id/submissions', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const { id: activityId } = req.params;
      const user = req.user as any;

      // Verificar se o professor pode ver as submissA�es
      const activity = await db
        .select()
        .from(activities)
        .where(eq(activities.id, activityId))
        .limit(1);

      if (activity.length === 0 || activity[0].teacherId !== user.id) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const submissions = await db
        .select({
          submission: activitySubmissions,
          student: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email
          }
        })
        .from(activitySubmissions)
        .innerJoin(users, eq(activitySubmissions.studentId, users.id))
        .where(eq(activitySubmissions.activityId, activityId))
        .orderBy(asc(activitySubmissions.submittedAt));

      // Buscar arquivos para cada submissao
      const submissionsWithFiles = await Promise.all(
        submissions.map(async (item) => {
          const files = await db
            .select()
            .from(submissionFiles)
            .where(eq(submissionFiles.submissionId, item.submission.id));

          return {
            ...item,
            files
          };
        })
      );

      res.json(submissionsWithFiles);
  } catch (error) {
      console.error('Erro ao buscar submissA�es:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
  }
});

  // Avaliacao em lote de submissA�es
  app.post('/api/activities/:id/submissions/batch-grade', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const { id: activityId } = req.params;
      const { submissionIds, grade, feedback } = req.body;
      const user = req.user as any;

      // Verificar se o professor pode avaliar as submissA�es
      const activity = await db
        .select()
        .from(activities)
        .where(eq(activities.id, activityId))
        .limit(1);

      if (activity.length === 0 || activity[0].teacherId !== user.id) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      // Avaliar todas as submissA�es selecionadas
      const results = [];
      for (const submissionId of submissionIds) {
        try {
          const submission = await db
            .select()
            .from(activitySubmissions)
            .where(and(
              eq(activitySubmissions.id, submissionId),
              eq(activitySubmissions.activityId, activityId)
            ))
            .limit(1);

          if (submission.length === 0) continue;

          // Calcular penalidade por atraso
          let finalGrade = grade;
          if (submission[0].submittedAt && activity[0].dueDate) {
            const submissionDate = new Date(submission[0].submittedAt);
            const dueDate = new Date(activity[0].dueDate);
            if (submissionDate > dueDate) {
              const daysLate = Math.ceil((submissionDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
              const penalty = Math.min(daysLate * 0.1, 0.5); // 10% por dia, maximo 50%
              finalGrade = Math.max(grade * (1 - penalty), 0);
            }
          }

          // Atualizar submissao
          await db
            .update(activitySubmissions)
            .set({
              grade: finalGrade,
              feedback,
              gradedAt: new Date().toISOString(),
              gradedBy: user.id
            })
            .where(eq(activitySubmissions.id, submissionId));

          // Registrar no historico
          await db.insert(submissionHistory).values({
            id: uuidv4(),
            submissionId,
            action: 'graded',
            performedBy: user.id,
            performedAt: new Date().toISOString(),
            details: JSON.stringify({ grade: finalGrade, feedback })
          });

          results.push({ submissionId, success: true, grade: finalGrade });
        } catch (error) {
          results.push({ submissionId, success: false, error: error.message });
        }
      }

      res.json({ results });
    } catch (error) {
      console.error('Erro na avaliacao em lote:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Buscar submissA�es com filtros avancados
  app.get('/api/activities/:id/submissions/filtered', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const { id: activityId } = req.params;
      const { status, search, sortBy = 'submittedAt', sortOrder = 'desc', page = 1, limit = 20 } = req.query;
      const user = req.user as any;

      // Verificar permissA�es
      const activity = await db
        .select()
        .from(activities)
        .where(eq(activities.id, activityId))
        .limit(1);

      if (activity.length === 0 || activity[0].teacherId !== user.id) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      // Construir query base
      let query = db
        .select({
          submission: activitySubmissions,
          student: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email
          }
        })
        .from(activitySubmissions)
        .innerJoin(users, eq(activitySubmissions.studentId, users.id))
        .where(eq(activitySubmissions.activityId, activityId));

      // Aplicar filtros
      const conditions = [eq(activitySubmissions.activityId, activityId)];
      
      if (status) {
        switch (status) {
          case 'pending':
            conditions.push(eq(activitySubmissions.grade, null));
            break;
          case 'graded':
            conditions.push(ne(activitySubmissions.grade, null));
            break;
          case 'late':
            if (activity[0].dueDate) {
              conditions.push(sql`${activitySubmissions.submittedAt} > ${activity[0].dueDate}`);
            }
            break;
        }
      }

      if (search) {
        conditions.push(
          or(
            like(users.firstName, `%${search}%`),
            like(users.lastName, `%${search}%`),
            like(users.email, `%${search}%`)
          )
        );
      }

      query = query.where(and(...conditions));

      // Aplicar ordenacao
      const orderColumn = sortBy === 'student' ? users.firstName : activitySubmissions[sortBy];
      query = sortOrder === 'asc' ? query.orderBy(asc(orderColumn)) : query.orderBy(desc(orderColumn));

      // Aplicar paginacao
      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
      const submissions = await query.limit(parseInt(limit as string)).offset(offset);

      // Buscar arquivos para cada submissao
      const submissionsWithFiles = await Promise.all(
        submissions.map(async (item) => {
          const files = await db
            .select()
            .from(submissionFiles)
            .where(eq(submissionFiles.submissionId, item.submission.id));

          return {
            ...item,
            files
          };
        })
      );

      // Contar total para paginacao
      const totalQuery = db
        .select({ count: count() })
        .from(activitySubmissions)
        .innerJoin(users, eq(activitySubmissions.studentId, users.id))
        .where(and(...conditions));
      
      const [{ count: total }] = await totalQuery;

      res.json({
        submissions: submissionsWithFiles,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          totalPages: Math.ceil(total / parseInt(limit as string))
        }
      });
    } catch (error) {
      console.error('Erro ao buscar submissA�es filtradas:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Buscar historico de uma submissao
  app.get('/api/submissions/:id/history', isAuthenticated, async (req, res) => {
  try {
      const { id: submissionId } = req.params;
    const user = req.user as any;
    
      // Verificar se o usuario pode ver o historico
      const submission = await db
        .select()
        .from(activitySubmissions)
        .where(eq(activitySubmissions.id, submissionId))
        .limit(1);

      if (submission.length === 0) {
        return res.status(404).json({ message: "Submissao nao encontrada" });
      }

      // Verificar permissA�es
      if (user.role === 'student' && submission[0].studentId !== user.id) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      if (user.role === 'teacher') {
        if (!submission[0].activityId) {
          return res.status(400).json({ message: "ID da atividade nao encontrado" });
        }
        
        const activity = await db
          .select()
          .from(activities)
          .where(eq(activities.id, submission[0].activityId))
          .limit(1);

        if (activity.length === 0 || activity[0].teacherId !== user.id) {
          return res.status(403).json({ message: "Acesso negado" });
        }
      }

      const history = await db
        .select({
          history: submissionHistory,
          performer: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            role: users.role
          }
        })
        .from(submissionHistory)
        .innerJoin(users, eq(submissionHistory.performedBy, users.id))
        .where(eq(submissionHistory.submissionId, submissionId))
        .orderBy(asc(submissionHistory.performedAt));

      res.json(history);
    } catch (error) {
      console.error('Erro ao buscar historico:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
  }
});

  // Upload de arquivos para atividade (apenas professores)
  app.post('/api/activities/:id/files', isAuthenticated, hasRole(['teacher']), upload.array('files', 5), async (req, res) => {
  try {
      const { id: activityId } = req.params;
    const user = req.user as any;
      const { category } = req.body;
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        return res.status(400).json({ message: "Arquivo nao fornecido" });
      }

      if (!category || !['reference', 'template', 'example'].includes(category)) {
        return res.status(400).json({ message: "Categoria invalida" });
      }

      // Verificar se o professor pode adicionar arquivos
      const activity = await db
        .select()
        .from(activities)
        .where(eq(activities.id, activityId))
        .limit(1);

      if (activity.length === 0 || activity[0].teacherId !== user.id) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const fileRecords = files.map(file => ({
        id: uuidv4(),
        activityId,
        fileName: file.filename,
        originalFileName: file.originalname,
        filePath: file.path,
        fileSize: file.size,
        fileType: file.mimetype,
        fileCategory: category,
        uploadedBy: user.id,
        createdAt: new Date().toISOString()
      }));

      await db.insert(activityFiles).values(fileRecords);

      res.status(201).json({
        message: "Arquivos enviados com sucesso",
        files: fileRecords
      });
  } catch (error) {
      console.error('Erro ao enviar arquivos:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Download de arquivo
  app.get('/api/files/:filename', isAuthenticated, (req, res) => {
    try {
      const { filename } = req.params;
      const filePath = path.join(__dirname, '../uploads', filename);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "Arquivo nao encontrado" });
      }

      res.download(filePath);
  } catch (error) {
      console.error('Erro ao fazer download:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Rota de teste
  app.get('/api/test', (req, res) => {
    res.json({ message: 'API is working!' });
  });

  // ===== ROTAS DE NOTAS =====
  
  // Buscar notas do aluno
  app.get('/api/grades/student/:studentId', isAuthenticated, async (req, res) => {
    try {
      const { studentId } = req.params;
      const { academicYear } = req.query;
      const user = req.user as any;
      
      // Verificar permissA�es
      if (user.role === 'student' && user.id !== studentId) {
        return res.status(403).json({ message: "Acesso negado" });
      }
      
      let whereConditions = [eq(grades.studentId, studentId)];
      
      // Buscar notas atraves de classSubjects para obter o ano academico
      const studentGrades = await db
        .select({
          id: grades.id,
          classSubjectId: grades.classSubjectId,
          type: grades.type,
          title: grades.title,
          grade: grades.grade,
          maxGrade: grades.maxGrade,
          weight: grades.weight,
          date: grades.date,
          comments: grades.comments,
          subjectName: subjects.name,
          subjectCode: subjects.code,
          teacherName: users.firstName,
          teacherLastName: users.lastName,
          academicYear: classSubjects.academicYear,
          createdAt: grades.createdAt,
          updatedAt: grades.updatedAt
        })
        .from(grades)
        .innerJoin(classSubjects, eq(grades.classSubjectId, classSubjects.id))
        .innerJoin(subjects, eq(classSubjects.subjectId, subjects.id))
        .innerJoin(users, eq(classSubjects.teacherId, users.id))
        .where(
          academicYear && academicYear !== 'all' 
            ? and(...whereConditions, eq(classSubjects.academicYear, academicYear as string))
            : and(...whereConditions)
        )
        .orderBy(asc(subjects.name), asc(grades.date));
      
      res.json(studentGrades);
    } catch (error) {
      console.error('Erro ao buscar notas:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Criar/atualizar nota
  app.post('/api/grades', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const {
        studentId,
        classSubjectId,
        type,
        title,
        grade,
        maxGrade,
        weight,
        date,
        comments
      } = req.body;

      if (!studentId || !classSubjectId || !type || !title || !grade || !date) {
        return res.status(400).json({ message: "Campos obrigatorios nao preenchidos" });
      }

      // Verificar se ja existe nota para este aluno/atividade
      const existingGrade = await db
        .select()
        .from(grades)
        .where(
          and(
            eq(grades.studentId, studentId),
            eq(grades.classSubjectId, classSubjectId),
            eq(grades.title, title)
          )
        )
        .limit(1);

      if (existingGrade.length > 0) {
        // Atualizar nota existente
        await db
          .update(grades)
          .set({
            grade,
            maxGrade: maxGrade || 10,
            weight: weight || 1,
            date,
            comments,
            updatedAt: new Date().toISOString()
          })
          .where(eq(grades.id, existingGrade[0].id));

        res.json({
          message: "Nota atualizada com sucesso",
          grade: { ...existingGrade[0], grade, maxGrade, weight, date, comments, updatedAt: new Date().toISOString() }
        });
      } else {
        // Criar nova nota
        const newGrade = {
          id: uuidv4(),
          studentId,
          classSubjectId,
          type,
          title,
          grade,
          maxGrade: maxGrade || 10,
          weight: weight || 1,
          date,
          comments,
          createdBy: (req.user as any).id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await db.insert(grades).values(newGrade);

        res.status(201).json({
          message: "Nota criada com sucesso",
          grade: newGrade
        });
      }
    } catch (error) {
      console.error('Erro ao criar/atualizar nota:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // ===== ROTAS DE FREQUA�NCIA =====
  
  // Buscar frequencia do aluno
  app.get('/api/attendance/student/:studentId', isAuthenticated, async (req, res) => {
    try {
      const { studentId } = req.params;
      const { academicYear, subjectId } = req.query;
      const user = req.user as any;
      
      // Verificar permissA�es
      if (user.role === 'student' && user.id !== studentId) {
        return res.status(403).json({ message: "Acesso negado" });
      }
      
      let whereConditions = [eq(attendance.studentId, studentId)];
      
      // Buscar frequencia atraves de classSubjects para obter o ano academico e disciplina
      const studentAttendance = await db
        .select({
          id: attendance.id,
          date: attendance.date,
          status: attendance.status,
          justification: attendance.justification,
          subjectName: subjects.name,
          subjectCode: subjects.code,
          academicYear: classSubjects.academicYear,
          createdAt: attendance.createdAt
        })
        .from(attendance)
        .innerJoin(classSubjects, eq(attendance.classSubjectId, classSubjects.id))
        .innerJoin(subjects, eq(classSubjects.subjectId, subjects.id))
        .where(
          and(
            ...whereConditions,
            ...(academicYear && academicYear !== 'all' 
              ? [eq(classSubjects.academicYear, academicYear as string)]
              : []),
            ...(subjectId && subjectId !== 'all'
              ? [eq(classSubjects.subjectId, subjectId as string)]
              : [])
          )
        )
        .orderBy(desc(attendance.date));
      
      // Calcular estatisticas por disciplina
      const statsBySubject = await db
        .select({
          subjectId: subjects.id,
          subjectName: subjects.name,
          totalClasses: count(attendance.id),
          presentClasses: count(),
          absentClasses: count()
        })
        .from(attendance)
        .innerJoin(classSubjects, eq(attendance.classSubjectId, classSubjects.id))
        .innerJoin(subjects, eq(classSubjects.subjectId, subjects.id))
        .where(
          and(
            ...whereConditions,
            ...(academicYear && academicYear !== 'all' 
              ? [eq(classSubjects.academicYear, academicYear as string)]
              : [])
          )
        )
        .groupBy(subjects.id, subjects.name);
      
      res.json({
        attendance: studentAttendance,
        statsBySubject
      });
    } catch (error) {
      console.error('Erro ao buscar frequencia:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Registrar frequencia
  app.post('/api/attendance', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const {
        studentId,
        classSubjectId,
        date,
        status,
        justification
      } = req.body;

      if (!studentId || !classSubjectId || !date || !status) {
        return res.status(400).json({ message: "Campos obrigatorios nao preenchidos" });
      }

      // Verificar se ja existe registro para esta data/classSubject/aluno
      const existingAttendance = await db
        .select()
        .from(attendance)
        .where(
          and(
            eq(attendance.studentId, studentId),
            eq(attendance.classSubjectId, classSubjectId),
            eq(attendance.date, date)
          )
        )
        .limit(1);

      if (existingAttendance.length > 0) {
        // Atualizar frequencia existente
        await db
          .update(attendance)
          .set({
            status,
            justification,
            updatedAt: new Date().toISOString()
          })
          .where(eq(attendance.id, existingAttendance[0].id));

        res.json({
          message: "Frequencia atualizada com sucesso",
          attendance: { ...existingAttendance[0], status, justification, updatedAt: new Date().toISOString() }
        });
      } else {
        // Criar novo registro
        const newAttendance = {
          id: uuidv4(),
          studentId,
          classSubjectId,
          date,
          status,
          justification,
          recordedBy: (req.user as any).id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        await db.insert(attendance).values(newAttendance);

        res.status(201).json({
          message: "Frequencia registrada com sucesso",
          attendance: newAttendance
        });
      }
    } catch (error) {
      console.error('Erro ao registrar frequencia:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // ===== ROTAS DE EVENTOS =====
  
  // Buscar eventos
  app.get('/api/events', isAuthenticated, async (req, res) => {
    try {
      const { type, startDate, endDate } = req.query;
      const user = req.user as any;
      
      let whereConditions = [];
      
      if (type && type !== 'all') {
        whereConditions.push(eq(events.type, type as any));
      }
      
      if (startDate && endDate) {
        whereConditions.push(
          and(
            or(
              eq(events.startDate, startDate as string),
              eq(events.endDate, endDate as string)
            )
          )
        );
      }
      
      const allEvents = await db
        .select()
        .from(events)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .orderBy(asc(events.startDate));
      
      res.json(allEvents);
    } catch (error) {
      console.error('Erro ao buscar eventos:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Criar evento
  app.post('/api/events', isAuthenticated, hasRole(['admin', 'coordinator', 'teacher']), async (req, res) => {
    try {
      const {
        title,
        description,
        type,
        startDate,
        endDate,
        location,
        color,
        classId,
        subjectId
      } = req.body;

      if (!title || !type || !startDate) {
        return res.status(400).json({ message: "Campos obrigatorios nao preenchidos" });
      }

      const newEvent = {
        id: uuidv4(),
        title,
        description: description || null,
        type,
        startDate,
        endDate: endDate || null,
        location: location || null,
        color: color || "#3B82F6",
        classId: classId || null,
        subjectId: subjectId || null,
        createdBy: (req.user as any).id,
        status: 'active' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await db.insert(events).values(newEvent);

      res.status(201).json({
        message: "Evento criado com sucesso",
        event: newEvent
      });
    } catch (error) {
      console.error('Erro ao criar evento:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // ===== ROTAS DE STATUS DOS USUA�RIOS =====
  
  // Atualizar status do usuario (online/offline/ausente)
  app.post('/api/users/status', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const { status } = req.body;
      
      // So atualizar se o status mudou ou se passou mais de 5 minutos
      const currentUser = await db.select({ lastSeen: users.lastSeen }).from(users).where(eq(users.id, user.id)).limit(1);
      
      if (currentUser.length > 0) {
        const lastUpdate = currentUser[0].lastSeen ? new Date(currentUser[0].lastSeen) : null;
        const now = new Date();
        
        // So atualiza se passou mais de 5 minutos desde a ultima atualizacao
        if (!lastUpdate || (now.getTime() - lastUpdate.getTime()) > 300000) {
          await db
            .update(users)
            .set({ 
              lastSeen: now.toISOString(),
              status: status || 'online'
            })
            .where(eq(users.id, user.id));
          
          // Log apenas mudancas de status importantes (para terminal virtual)
          logger.statusTerminal(`Status atualizado para usuario ${user.id}: ${status}`, {
            userId: user.id,
            status,
            timestamp: now.toISOString()
          });
        }
      }
      
      res.json({ message: "Status atualizado com sucesso" });
    } catch (error) {
      logger.error('Erro ao atualizar status do usuario', { userId: (req.user as any)?.id, error: (error as Error).message });
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  
  // Buscar status dos usuarios
  app.get('/api/users/status', isAuthenticated, async (req, res) => {
    try {
      const { userIds } = req.query;
      
      // Corrigir validacao para aceitar string separada por virgula
      let userIdsArray: string[] = [];
      
      if (typeof userIds === 'string') {
        userIdsArray = userIds.split(',').filter(id => id.trim());
      } else if (Array.isArray(userIds)) {
        userIdsArray = userIds.filter(id => id && typeof id === 'string').map(id => String(id));
      }
      
      if (userIdsArray.length === 0) {
        return res.status(400).json({ message: "IDs dos usuarios sao obrigatorios" });
      }
      
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutos
      const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000); // 30 minutos
      
      const usersStatus = await db
        .select({
          id: users.id,
          status: users.status,
          lastSeen: users.lastSeen
        })
        .from(users)
        .where(inArray(users.id, userIdsArray));
      
      // Determinar status baseado na atividade
      const processedStatus = usersStatus.map(user => {
        if (!user.lastSeen) return { ...user, currentStatus: 'offline' };
        
        const lastSeen = new Date(user.lastSeen);
        
        if (lastSeen > fiveMinutesAgo) {
          return { ...user, currentStatus: 'online' };
        } else if (lastSeen > thirtyMinutesAgo) {
          return { ...user, currentStatus: 'ausente' };
        } else {
          return { ...user, currentStatus: 'offline' };
        }
      });
      
      res.json({ data: processedStatus });
    } catch (error) {
      logger.error('Erro ao buscar status dos usuarios', { error: (error as Error).message });
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // ===== ROTAS DE ATIVIDADES =====
  
  // Buscar atividades do aluno
  app.get('/api/activities/student/:studentId', isAuthenticated, async (req, res) => {
    try {
      const { studentId } = req.params;
      const user = req.user as any;
      
      console.log('=== BUSCANDO ATIVIDADES DO ALUNO ===');
      console.log('Student ID:', studentId);
      console.log('User requesting:', user.id, user.role);
      
      // Verificar se o usuario e o proprio aluno ou um professor/coordinator
      if (user.role === 'student' && user.id !== studentId) {
        return res.status(403).json({ message: "Acesso negado" });
      }
      
      // Buscar apenas atividades das turmas em que o aluno esta matriculado
      const studentActivities = await db
        .select({
          id: activities.id,
          title: activities.title,
          description: activities.description,
          subjectId: activities.subjectId,
          subjectName: subjects.name,
          subjectCode: subjects.code,
          teacherId: activities.teacherId,
          teacherName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`.as('teacherName'),
          classId: activities.classId,
          className: classes.name,
          dueDate: activities.dueDate,
          maxGrade: activities.maxGrade,
          instructions: activities.instructions,
          requirements: activities.requirements,
          status: activities.status,
          allowLateSubmission: activities.allowLateSubmission,
          latePenalty: activities.latePenalty,
          createdAt: activities.createdAt,
          updatedAt: activities.updatedAt,
          // Dados da submissao do aluno
          submissionId: activitySubmissions.id,
          submissionStatus: activitySubmissions.status,
          submittedAt: activitySubmissions.submittedAt,
          submissionComment: activitySubmissions.comment,
          grade: activitySubmissions.grade,
          feedback: activitySubmissions.feedback,
          isLate: activitySubmissions.isLate,
          finalGrade: activitySubmissions.finalGrade,
          latePenaltyApplied: activitySubmissions.latePenaltyApplied
        })
        .from(activities)
        .innerJoin(subjects, eq(activities.subjectId, subjects.id))
        .innerJoin(users, eq(activities.teacherId, users.id))
        .innerJoin(classes, eq(activities.classId, classes.id))
        .innerJoin(studentClass, and(
          eq(studentClass.classId, activities.classId),
          eq(studentClass.studentId, studentId),
          eq(studentClass.status, 'active')
        ))
        .leftJoin(activitySubmissions, and(
          eq(activities.id, activitySubmissions.activityId),
          eq(activitySubmissions.studentId, studentId)
        ))
        .where(eq(activities.status, 'active'))
        .orderBy(asc(activities.dueDate));
      
      console.log(`✅ Encontradas ${studentActivities.length} atividades para o aluno matriculado`);
      
      res.json({ data: studentActivities });
    } catch (error) {
      console.error('Erro ao buscar atividades do aluno:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  
  // ===== ROTAS PARA PROFESSORES =====
  
  
  // Buscar atividades criadas pelo professor
  app.get('/api/activities/teacher/:teacherId', isAuthenticated, async (req, res) => {
    try {
      const { teacherId } = req.params;
      const user = req.user as any;
      
      console.log('=== BUSCANDO ATIVIDADES DO PROFESSOR ===');
      console.log('Teacher ID:', teacherId);
      console.log('User requesting:', user.id, user.role);
      
      // Verificar se o usuario e o proprio professor ou admin/coordinator
      if (user.role === 'teacher' && user.id !== teacherId) {
        return res.status(403).json({ message: "Acesso negado" });
      }
      
      // Primeiro, verificar se existem atividades para este professor
      const allActivitiesForTeacher = await db
        .select()
        .from(activities)
        .where(eq(activities.teacherId, teacherId));
      
      console.log(`📚 Total de atividades diretas do professor: ${allActivitiesForTeacher.length}`);
      
      if (allActivitiesForTeacher.length > 0) {
        console.log('📋 Atividades encontradas:');
        allActivitiesForTeacher.forEach((activity, index) => {
          console.log(`${index + 1}. ${activity.title}`);
          console.log(`   Subject ID: ${activity.subjectId}`);
          console.log(`   Class ID: ${activity.classId}`);
          console.log(`   Status: ${activity.status}`);
        });
      }
      
      // Buscar atividades do professor diretamente pelo teacherId
      const teacherActivities = await db
        .select({
          id: activities.id,
          title: activities.title,
          description: activities.description,
          subjectId: activities.subjectId,
          subjectName: subjects.name,
          subjectCode: subjects.code,
          classId: activities.classId,
          className: classes.name,
          dueDate: activities.dueDate,
          maxGrade: activities.maxGrade,
          instructions: activities.instructions,
          requirements: activities.requirements,
          status: activities.status,
          allowLateSubmission: activities.allowLateSubmission,
          latePenalty: activities.latePenalty,
          maxFileSize: activities.maxFileSize,
          allowedFileTypes: activities.allowedFileTypes,
          createdAt: activities.createdAt,
          updatedAt: activities.updatedAt,
          // Contagem de submissA�es
          submissionCount: sql<number>`COUNT(${activitySubmissions.id})`.as('submissionCount'),
          gradedCount: sql<number>`COUNT(CASE WHEN ${activitySubmissions.status} = 'graded' THEN 1 END)`.as('gradedCount'),
          pendingCount: sql<number>`COUNT(CASE WHEN ${activitySubmissions.status} = 'submitted' THEN 1 END)`.as('pendingCount')
        })
        .from(activities)
        .innerJoin(subjects, eq(activities.subjectId, subjects.id))
        .innerJoin(classes, eq(activities.classId, classes.id))
        .leftJoin(activitySubmissions, eq(activities.id, activitySubmissions.activityId))
        .where(eq(activities.teacherId, teacherId))
        .groupBy(activities.id)
        .orderBy(desc(activities.createdAt));
      
      console.log(`✅ Encontradas ${teacherActivities.length} atividades das disciplinas do professor`);
      
      // Debug: verificar se os JOINs estao funcionando
      if (allActivitiesForTeacher.length > 0 && teacherActivities.length === 0) {
        console.log('❌ PROBLEMA: Atividades existem mas JOINs falharam!');
        
        // Verificar se subjects e classes existem
        const allSubjects = await db.select().from(subjects);
        const allClasses = await db.select().from(classes);
        
        console.log(`📖 Total de subjects: ${allSubjects.length}`);
        console.log(`🏫 Total de classes: ${allClasses.length}`);
        
        // Verificar IDs especificos
        const firstActivity = allActivitiesForTeacher[0];
        const subjectExists = allSubjects.find(s => s.id === firstActivity.subjectId);
        const classExists = allClasses.find(c => c.id === firstActivity.classId);
        
        console.log(`🔍 Verificando IDs da primeira atividade:`);
        console.log(`   Subject ID: ${firstActivity.subjectId} - Existe: ${subjectExists ? 'SIM' : 'NA�O'}`);
        console.log(`   Class ID: ${firstActivity.classId} - Existe: ${classExists ? 'SIM' : 'NA�O'}`);
        
        if (subjectExists) {
          console.log(`   Subject name: ${subjectExists.name}`);
        }
        if (classExists) {
          console.log(`   Class name: ${classExists.name}`);
        }
      }
      
      res.json({ data: teacherActivities });
    } catch (error) {
      console.error('Erro ao buscar atividades do professor:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  


  // ===== ROTAS PARA GESTA�O DE TURMAS =====
  
  // Buscar turmas do professor com detalhes completos
  app.get('/api/teacher/:teacherId/classes-detailed', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const { teacherId } = req.params;
      const user = req.user as any;
      
      console.log('=== API CLASSES-DETAILED ===');
      console.log('Teacher ID:', teacherId);
      console.log('User ID:', user.id);
      console.log('User Role:', user.role);
      
      // Verificar se o professor pode acessar os dados
      if (user.id !== teacherId && user.role !== 'admin') {
        return res.status(403).json({ message: "Acesso negado" });
      }
      
      // Buscar turmas com disciplinas e contagem de alunos
      const classesWithDetails = await db
          .select({
          classId: classes.id,
          className: classes.name,
          grade: classes.grade,
          section: classes.section,
          academicYear: classes.academicYear,
          subjectId: subjects.id,
          subjectName: subjects.name,
          subjectCode: subjects.code,
          schedule: classSubjects.schedule,
          room: classSubjects.room,
        })
        .from(classes)
          .innerJoin(classSubjects, and(
          eq(classSubjects.classId, classes.id),
          eq(classSubjects.teacherId, teacherId),
            eq(classSubjects.status, 'active')
          ))
        .innerJoin(subjects, eq(subjects.id, classSubjects.subjectId))
        .where(eq(classes.status, 'active'))
        .orderBy(classes.grade, classes.section);
      
      // Agrupar por turma
      const classesMap = new Map();
      
      for (const item of classesWithDetails) {
        if (!classesMap.has(item.classId)) {
          // Contar alunos da turma
          const studentCount = await db
            .select({ count: sql`count(*)` })
            .from(studentClass)
            .where(and(
              eq(studentClass.classId, item.classId),
              eq(studentClass.status, 'active')
            ));

          // Buscar alunos da turma
          const students = await db
          .select({
              id: users.id,
              firstName: users.firstName,
              lastName: users.lastName,
              email: users.email,
              registrationNumber: users.registrationNumber,
              profileImageUrl: users.profileImageUrl
            })
            .from(users)
            .innerJoin(studentClass, and(
              eq(studentClass.studentId, users.id),
              eq(studentClass.classId, item.classId),
              eq(studentClass.status, 'active')
            ))
            .where(eq(users.status, 'active'))
            .orderBy(users.firstName, users.lastName);
          
          classesMap.set(item.classId, {
            id: item.classId,
            name: item.className,
            grade: item.grade,
            section: item.section,
            academicYear: item.academicYear,
            subjects: [],
            studentCount: studentCount[0]?.count || 0,
            students: students
          });
        }
        
        const classData = classesMap.get(item.classId);
        classData.subjects.push({
          id: item.subjectId,
          name: item.subjectName,
          code: item.subjectCode,
          schedule: item.schedule,
          room: item.room
        });
      }
      
      const result = Array.from(classesMap.values());
      
      console.log('✅ Resultado final:', result.length, 'turmas');
      result.forEach(r => {
        console.log(`  - ${r.name}: ${r.students.length} alunos`);
        if (r.students.length > 0) {
          r.students.forEach(s => console.log(`    * ${s.firstName} ${s.lastName} (${s.id})`));
        }
      });
      
      res.json({ data: result });
    } catch (error) {
      console.error('Erro ao buscar turmas detalhadas:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  
  // Buscar detalhes de uma turma especifica
  app.get('/api/classes/:classId/detail', isAuthenticated, async (req, res) => {
    try {
      const { classId } = req.params;
      const user = req.user as any;
      
      // Buscar dados da turma
      const classData = await db
          .select({
            id: classes.id,
            name: classes.name,
            grade: classes.grade,
            section: classes.section,
          academicYear: classes.academicYear,
          capacity: classes.capacity,
          currentStudents: classes.currentStudents
          })
          .from(classes)
        .where(eq(classes.id, classId))
        .limit(1);
      
      if (classData.length === 0) {
        return res.status(404).json({ message: "Turma nao encontrada" });
      }
      
      // Verificar se o usuario tem acesso A� turma
      if (user.role === 'teacher') {
        const hasAccess = await db
          .select({ count: sql`count(*)` })
          .from(classSubjects)
          .where(and(
            eq(classSubjects.classId, classId),
            eq(classSubjects.teacherId, user.id),
            eq(classSubjects.status, 'active')
          ));
        
        if (hasAccess[0]?.count === 0) {
          return res.status(403).json({ message: "Acesso negado" });
        }
      }
      
      res.json({ data: classData[0] });
    } catch (error) {
      console.error('Erro ao buscar detalhes da turma:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Buscar alunos de uma turma
  app.get('/api/classes/:classId/students', isAuthenticated, async (req, res) => {
    try {
      const { classId } = req.params;
      const user = req.user as any;
      
      // Verificar acesso A� turma
      if (user.role === 'teacher') {
        const hasAccess = await db
          .select({ count: sql`count(*)` })
          .from(classSubjects)
          .where(and(
            eq(classSubjects.classId, classId),
            eq(classSubjects.teacherId, user.id),
            eq(classSubjects.status, 'active')
          ));
        
        if (hasAccess[0]?.count === 0) {
          return res.status(403).json({ message: "Acesso negado" });
        }
      }
      
      // Buscar alunos matriculados
      const students = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          registrationNumber: users.registrationNumber,
          profileImageUrl: users.profileImageUrl
        })
        .from(users)
        .innerJoin(studentClass, and(
          eq(studentClass.studentId, users.id),
          eq(studentClass.classId, classId),
          eq(studentClass.status, 'active')
        ))
        .where(eq(users.status, 'active'))
        .orderBy(users.firstName, users.lastName);
      
      res.json({ data: students });
    } catch (error) {
      console.error('Erro ao buscar alunos da turma:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Buscar presenca de uma turma para um dia especifico
  app.get('/api/classes/:classId/attendance/:date', isAuthenticated, async (req, res) => {
    try {
      const { classId, date } = req.params;
      const user = req.user as any;
      
      // Verificar acesso A� turma
      if (user.role === 'teacher') {
        const hasAccess = await db
          .select({ count: sql`count(*)` })
          .from(classSubjects)
          .where(and(
            eq(classSubjects.classId, classId),
            eq(classSubjects.teacherId, user.id),
            eq(classSubjects.status, 'active')
          ));
        
        if (hasAccess[0]?.count === 0) {
          return res.status(403).json({ message: "Acesso negado" });
        }
      }
      
      // Buscar registros de presenca para a data
      const attendanceRecords = await db
        .select({
          studentId: attendance.studentId,
          status: attendance.status,
          justification: attendance.justification,
          studentName: sql`${users.firstName} || ' ' || ${users.lastName}`.as('studentName')
        })
        .from(attendance)
        .innerJoin(users, eq(users.id, attendance.studentId))
        .innerJoin(classSubjects, eq(classSubjects.id, attendance.classSubjectId))
        .where(and(
          eq(classSubjects.classId, classId),
          eq(attendance.date, date)
        ));
      
      res.json({ data: attendanceRecords });
    } catch (error) {
      console.error('Erro ao buscar presenca:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Salvar presenca de uma turma para um dia especifico
  app.post('/api/classes/:classId/attendance/:date', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const { classId, date } = req.params;
      const { records } = req.body;
      const user = req.user as any;
      
      // Verificar acesso A� turma
      const hasAccess = await db
        .select({ 
          count: sql`count(*)`,
          classSubjectId: classSubjects.id 
        })
        .from(classSubjects)
        .where(and(
          eq(classSubjects.classId, classId),
          eq(classSubjects.teacherId, user.id),
          eq(classSubjects.status, 'active')
        ));
      
      if (hasAccess[0]?.count === 0) {
        return res.status(403).json({ message: "Acesso negado" });
      }
      
      const classSubjectId = hasAccess[0].classSubjectId;
      
      // Deletar registros existentes para a data
      await db
        .delete(attendance)
        .where(and(
          eq(attendance.classSubjectId, classSubjectId),
          eq(attendance.date, date)
        ));
      
      // Inserir novos registros
      const attendanceRecords = records.map((record: any) => ({
        id: `att_${Date.now()}_${record.studentId}`,
        studentId: record.studentId,
        classSubjectId: classSubjectId,
        date: date,
        status: record.status,
        justification: record.justification || null,
        recordedBy: user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));
      
      if (attendanceRecords.length > 0) {
        await db.insert(attendance).values(attendanceRecords);
      }
      
      res.json({ 
        message: "Presenca salva com sucesso",
        recordsCount: attendanceRecords.length 
      });
    } catch (error) {
      console.error('Erro ao salvar presenca:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // ===== ROTAS PARA SISTEMA DE NOTAS =====
  
  // Buscar notas de uma turma por bimestre
  app.get('/api/classes/:classId/grades/:quarter', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const { classId, quarter } = req.params;
      const user = req.user as any;
      
      // Verificar acesso A� turma
      const hasAccess = await db
        .select({ count: sql`count(*)` })
        .from(classSubjects)
        .where(and(
          eq(classSubjects.classId, classId),
          eq(classSubjects.teacherId, user.id),
          eq(classSubjects.status, 'active')
        ));
      
      if (hasAccess[0]?.count === 0) {
        return res.status(403).json({ message: "Acesso negado" });
      }
      
      // Buscar notas dos alunos para o bimestre
      console.log('🔍 ===== BUSCANDO NOTAS =====');
      console.log('🔍 Quarter:', quarter);
      console.log('🔍 Class ID:', classId);
      console.log('🔍 Filtro de data:', `strftime('%m', date) = ${quarter.toString().padStart(2, '0')}`);
      
      // Primeiro, buscar todas as notas para debug
      const allGrades = await db
        .select({
          studentId: grades.studentId,
          type: grades.type,
          grade: grades.grade,
          title: grades.title,
          date: grades.date,
          studentName: sql`${users.firstName} || ' ' || ${users.lastName}`.as('studentName')
        })
        .from(grades)
        .innerJoin(users, eq(users.id, grades.studentId))
        .innerJoin(classSubjects, eq(classSubjects.id, grades.classSubjectId))
        .where(eq(classSubjects.classId, classId));
      
      console.log('📊 Todas as notas da turma:', allGrades.length);
      allGrades.forEach(grade => {
        console.log(`  - ${grade.studentName}: ${grade.type} = ${grade.grade} (${grade.date})`);
      });
      
      console.log('🔍 Executando consulta filtrada...');
      const gradesData = await db
        .select({
          studentId: grades.studentId,
          type: grades.type,
          grade: grades.grade,
          title: grades.title,
          date: grades.date,
          studentName: sql`${users.firstName} || ' ' || ${users.lastName}`.as('studentName')
        })
        .from(grades)
        .innerJoin(users, eq(users.id, grades.studentId))
        .innerJoin(classSubjects, eq(classSubjects.id, grades.classSubjectId))
        .where(and(
          eq(classSubjects.classId, classId),
          sql`strftime('%m', ${grades.date}) = ${quarter.toString().padStart(2, '0')}` // Filtrar por bimestre (MM)
        ));
      
      console.log('📊 ===== RESULTADO DA CONSULTA FILTRADA =====');
      console.log('📊 Notas encontradas para quarter', quarter, ':', gradesData.length);
      gradesData.forEach(grade => {
        console.log(`  ✅ ${grade.studentName}: ${grade.type} = ${grade.grade} (${grade.date})`);
      });
      
      res.json({ data: gradesData });
    } catch (error) {
      console.error('Erro ao buscar notas:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Salvar/atualizar nota de um aluno
  app.post('/api/classes/:classId/grades', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const { classId } = req.params;
      const { studentId, quarter, type, grade, title } = req.body;
      const user = req.user as any;
      
      console.log('=== SALVANDO NOTA BACKEND ===');
      console.log('Class ID:', classId);
      console.log('Student ID:', studentId);
      console.log('Quarter:', quarter);
      console.log('Type:', type);
      console.log('Grade:', grade);
      console.log('Title:', title);
      console.log('User:', user.id);
      
      // Verificar acesso A� turma e pegar classSubjectId
      console.log('🔍 Buscando classSubject...');
      console.log('Class ID:', classId);
      console.log('Teacher ID:', user.id);
      
      const classSubjectData = await db
        .select({ id: classSubjects.id })
        .from(classSubjects)
        .where(and(
          eq(classSubjects.classId, classId),
          eq(classSubjects.teacherId, user.id),
          eq(classSubjects.status, 'active')
        ))
        .limit(1);
      
      console.log('📋 ClassSubject encontrados:', classSubjectData.length);
      
      if (classSubjectData.length === 0) {
        console.log('❌ Nenhum classSubject encontrado - acesso negado');
        return res.status(403).json({ message: "Acesso negado - turma nao encontrada para este professor" });
      }
      
      const classSubjectId = classSubjectData[0].id;
      console.log('✅ ClassSubject ID encontrado:', classSubjectId);
      
      // Verificar se ja existe uma nota deste tipo para este aluno no bimestre
      const existingGrade = await db
        .select({ id: grades.id })
        .from(grades)
        .where(and(
          eq(grades.studentId, studentId),
          eq(grades.classSubjectId, classSubjectId),
          eq(grades.type, type),
          sql`strftime('%m', ${grades.date}) = ${quarter.toString().padStart(2, '0')}` // Filtrar por mes
        ))
        .limit(1);
      
      const currentDate = new Date().toISOString();
      const gradeDate = `2024-${quarter.toString().padStart(2, '0')}-15`; // 15 do mes do bimestre
      console.log('📅 Data da nota:', gradeDate);
      console.log('📅 Quarter:', quarter);
      
      if (existingGrade.length > 0) {
        console.log('🔄 Atualizando nota existente...');
        // Atualizar nota existente
        await db
          .update(grades)
          .set({
            grade: parseFloat(grade),
            title: title,
            updatedAt: currentDate
          })
          .where(eq(grades.id, existingGrade[0].id));
        
        console.log('✅ Nota atualizada com sucesso');
      } else {
        console.log('➕ Criando nova nota...');
        // Criar nova nota
        const newGrade = {
          id: `grade_${Date.now()}_${studentId}`,
          studentId: studentId,
          classSubjectId: classSubjectId,
          type: type,
          title: title,
          grade: parseFloat(grade),
          maxGrade: 10,
          weight: 1,
          date: gradeDate,
          createdBy: user.id,
          createdAt: currentDate,
          updatedAt: currentDate
        };
        
        await db.insert(grades).values(newGrade);
        console.log('✅ Nova nota criada com sucesso');
      }
      
      console.log('🎉 Nota salva com sucesso - enviando resposta');
      res.json({ message: "Nota salva com sucesso" });
    } catch (error) {
      console.error('Erro ao salvar nota:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Buscar medias dos alunos por bimestre
  app.get('/api/classes/:classId/averages/:quarter', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const { classId, quarter } = req.params;
      const user = req.user as any;
      
      // Verificar acesso A� turma
      const hasAccess = await db
        .select({ count: sql`count(*)` })
        .from(classSubjects)
        .where(and(
          eq(classSubjects.classId, classId),
          eq(classSubjects.teacherId, user.id),
          eq(classSubjects.status, 'active')
        ));
      
      if (hasAccess[0]?.count === 0) {
        return res.status(403).json({ message: "Acesso negado" });
      }
      
      // Buscar medias calculadas dos alunos
      const averagesData = await db
          .select({
          studentId: grades.studentId,
          studentName: sql`${users.firstName} || ' ' || ${users.lastName}`.as('studentName'),
          examGrade: sql`MAX(CASE WHEN ${grades.type} = 'exam' THEN ${grades.grade} END)`.as('examGrade'),
          homeworkGrade: sql`MAX(CASE WHEN ${grades.type} = 'homework' THEN ${grades.grade} END)`.as('homeworkGrade'),
          average: sql`
            CASE 
              WHEN MAX(CASE WHEN ${grades.type} = 'exam' THEN ${grades.grade} END) IS NOT NULL 
                   AND MAX(CASE WHEN ${grades.type} = 'homework' THEN ${grades.grade} END) IS NOT NULL
              THEN (MAX(CASE WHEN ${grades.type} = 'exam' THEN ${grades.grade} END) + 
                    MAX(CASE WHEN ${grades.type} = 'homework' THEN ${grades.grade} END)) / 2.0
              ELSE NULL
            END
          `.as('average')
        })
        .from(grades)
        .innerJoin(users, eq(users.id, grades.studentId))
        .innerJoin(classSubjects, eq(classSubjects.id, grades.classSubjectId))
        .where(and(
          eq(classSubjects.classId, classId),
          sql`substr(${grades.date}, 6, 2) = ${quarter.toString().padStart(2, '0')}`
        ))
        .groupBy(grades.studentId, users.firstName, users.lastName);
      
      res.json({ data: averagesData });
    } catch (error) {
      console.error('Erro ao buscar medias:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Endpoint para calcular media geral de todos os bimestres
  app.get('/api/classes/:classId/general-averages', async (req, res) => {
    try {
      const { classId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: "Nao autorizado" });
      }

      // Verificar se o usuario tem acesso A� turma
      const hasAccess = await db
        .select({ count: sql<number>`count(*)` })
        .from(classSubjects)
        .where(and(
          eq(classSubjects.classId, classId),
          eq(classSubjects.teacherId, userId)
        ));

      if (hasAccess[0]?.count === 0) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      console.log('🔍 Calculando medias gerais para turma:', classId);

      // Buscar todas as notas de todos os bimestres
      const allGrades = await db
        .select({
          studentId: grades.studentId,
          grade: grades.grade,
          date: grades.date,
          studentName: sql`${users.firstName} || ' ' || ${users.lastName}`.as('studentName')
        })
        .from(grades)
        .innerJoin(users, eq(users.id, grades.studentId))
        .innerJoin(classSubjects, eq(classSubjects.id, grades.classSubjectId))
        .where(eq(classSubjects.classId, classId));

      console.log('📊 Total de notas encontradas:', allGrades.length);

      // Agrupar por estudante e calcular media geral
      const studentAverages: any = {};
      
      allGrades.forEach(grade => {
        if (!studentAverages[grade.studentId]) {
          studentAverages[grade.studentId] = {
            studentId: grade.studentId,
            studentName: grade.studentName,
            grades: [],
            quarterAverages: {}
          };
        }
        studentAverages[grade.studentId].grades.push(grade.grade);
        
        // Calcular media por bimestre
        const month = new Date(grade.date).getMonth() + 1;
        const quarter = Math.ceil(month / 3); // 1-3 = 1º bimestre, 4-6 = 2º bimestre, etc.
        
        if (!studentAverages[grade.studentId].quarterAverages[quarter]) {
          studentAverages[grade.studentId].quarterAverages[quarter] = [];
        }
        studentAverages[grade.studentId].quarterAverages[quarter].push(grade.grade);
      });

      // Calcular medias finais
      const finalAverages = Object.values(studentAverages).map((student: any) => {
        // Media geral (todos os bimestres)
        const generalAverage = student.grades.length > 0 
          ? Math.round((student.grades.reduce((sum: number, grade: number) => sum + grade, 0) / student.grades.length) * 100) / 100
          : 0;

        // Medias por bimestre
        const quarterAverages = {};
        for (let q = 1; q <= 4; q++) {
          if (student.quarterAverages[q] && student.quarterAverages[q].length > 0) {
            quarterAverages[q] = Math.round((student.quarterAverages[q].reduce((sum: number, grade: number) => sum + grade, 0) / student.quarterAverages[q].length) * 100) / 100;
          } else {
            quarterAverages[q] = 0;
          }
        }

        // Status baseado na media geral (6.0 para aprovacao)
        let status = 'Pendente';
        if (generalAverage >= 6.0) {
          status = 'Aprovado';
        } else if (generalAverage >= 4.0) {
          status = 'Recuperacao';
        } else if (generalAverage > 0) {
          status = 'Reprovado';
        }

        return {
          studentId: student.studentId,
          studentName: student.studentName,
          generalAverage,
          quarterAverages,
          status,
          totalGrades: student.grades.length
        };
      });

      console.log('📊 Medias gerais calculadas:', finalAverages.length);
      res.json({ data: finalAverages });

    } catch (error) {
      console.error('Erro ao calcular medias gerais:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  
  // Buscar submissA�es de uma atividade
  app.get('/api/activities/:id/submissions', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user as any;
      
      console.log('=== BUSCANDO SUBMISSA�ES DA ATIVIDADE ===');
      console.log('Activity ID:', id);
      console.log('User:', user.id, user.role);
      
      // Verificar se a atividade existe e se o professor tem permissao
      const activityPermission = await db
        .select({
          activity: activities,
          classSubject: classSubjects
        })
        .from(activities)
        .innerJoin(classSubjects, and(
          eq(classSubjects.classId, activities.classId),
          eq(classSubjects.subjectId, activities.subjectId)
        ))
        .where(eq(activities.id, id))
        .limit(1);
      
      if (activityPermission.length === 0) {
        return res.status(404).json({ message: "Atividade nao encontrada" });
      }
      
      const { activity, classSubject } = activityPermission[0];
      
      // Se for professor, verificar se leciona esta disciplina
      if (user.role === 'teacher') {
        if (activity.teacherId !== user.id || classSubject.teacherId !== user.id) {
          return res.status(403).json({ 
            message: "Voce so pode ver submissA�es de atividades das disciplinas que leciona" 
          });
        }
      }
      
      // Buscar submissA�es apenas de alunos matriculados na turma
      const submissions = await db
        .select({
          id: activitySubmissions.id,
          studentId: activitySubmissions.studentId,
          submittedAt: activitySubmissions.submittedAt,
          comment: activitySubmissions.comment,
          status: activitySubmissions.status,
          grade: activitySubmissions.grade,
          feedback: activitySubmissions.feedback,
          isLate: activitySubmissions.isLate,
          finalGrade: activitySubmissions.finalGrade,
          latePenaltyApplied: activitySubmissions.latePenaltyApplied,
          // Dados do aluno
          studentName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`.as('studentName'),
          studentEmail: users.email,
          studentRegistration: users.registrationNumber
        })
        .from(activitySubmissions)
        .innerJoin(users, eq(activitySubmissions.studentId, users.id))
        .innerJoin(studentClass, and(
          eq(studentClass.studentId, activitySubmissions.studentId),
          eq(studentClass.classId, activity.classId),
          eq(studentClass.status, 'active')
        ))
        .where(eq(activitySubmissions.activityId, id))
        .orderBy(desc(activitySubmissions.submittedAt));
      
      console.log(`✅ Encontradas ${submissions.length} submissA�es de alunos matriculados`);
      
      res.json({ data: submissions });
    } catch (error) {
      console.error('Erro ao buscar submissA�es:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  
  // Buscar todas as submissA�es pendentes do professor
  app.get('/api/teacher/:teacherId/pending-submissions', isAuthenticated, async (req, res) => {
    try {
      const { teacherId } = req.params;
      const user = req.user as any;
      
      console.log('=== BUSCANDO SUBMISSA�ES PENDENTES DO PROFESSOR ===');
      console.log('Teacher ID:', teacherId);
      console.log('User requesting:', user.id, user.role);
      
      // Verificar se o usuario e o proprio professor
      if (user.role === 'teacher' && user.id !== teacherId) {
        return res.status(403).json({ message: "Acesso negado" });
      }
      
      // Buscar submissA�es pendentes apenas das disciplinas que o professor leciona
      const pendingSubmissions = await db
        .select({
          submissionId: activitySubmissions.id,
          activityId: activities.id,
          activityTitle: activities.title,
          subjectName: subjects.name,
          subjectCode: subjects.code,
          className: classes.name,
          studentId: activitySubmissions.studentId,
          studentName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`.as('studentName'),
          studentEmail: users.email,
          submittedAt: activitySubmissions.submittedAt,
          comment: activitySubmissions.comment,
          isLate: activitySubmissions.isLate,
          latePenaltyApplied: activitySubmissions.latePenaltyApplied,
          maxGrade: activities.maxGrade,
          dueDate: activities.dueDate
        })
        .from(activitySubmissions)
        .innerJoin(activities, eq(activitySubmissions.activityId, activities.id))
        .innerJoin(subjects, eq(activities.subjectId, subjects.id))
        .innerJoin(classes, eq(activities.classId, classes.id))
        .innerJoin(users, eq(activitySubmissions.studentId, users.id))
        .innerJoin(classSubjects, and(
          eq(classSubjects.classId, activities.classId),
          eq(classSubjects.subjectId, activities.subjectId),
          eq(classSubjects.teacherId, teacherId)
        ))
        .where(and(
          eq(activities.teacherId, teacherId),
          eq(activitySubmissions.status, 'submitted'),
          eq(classSubjects.status, 'active'),
          eq(activities.classId, '3e281468-7ade-440c-949a-a132787eb1bb') // Filtrar apenas turma 7º C
        ))
        .orderBy(desc(activitySubmissions.submittedAt));
      
      console.log(`✅ Encontradas ${pendingSubmissions.length} submissA�es pendentes`);
      
      res.json({ data: pendingSubmissions });
    } catch (error) {
      console.error('Erro ao buscar submissA�es pendentes:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Avaliar submissao especifica de atividade
  app.post('/api/submissions/:submissionId/grade', isAuthenticated, async (req, res) => {
    try {
      const { submissionId } = req.params;
      const { grade, feedback } = req.body;
      const user = req.user as any;
      
      console.log('=== AVALIANDO SUBMISSA�O ===');
      console.log('Submission ID:', submissionId);
      console.log('Grade:', grade);
      console.log('Teacher:', user.id);
      
      if (user.role !== 'teacher') {
        return res.status(403).json({ message: "Apenas professores podem avaliar atividades" });
      }
      
      if (grade === undefined || grade === null) {
        return res.status(400).json({ message: "Nota e obrigatoria" });
      }
      
      // Buscar a submissao e verificar permissA�es completas
      const submissionData = await db
        .select({
          submission: activitySubmissions,
          activity: activities,
          classSubject: classSubjects
        })
        .from(activitySubmissions)
        .innerJoin(activities, eq(activitySubmissions.activityId, activities.id))
        .innerJoin(classSubjects, and(
          eq(classSubjects.classId, activities.classId),
          eq(classSubjects.subjectId, activities.subjectId),
          eq(classSubjects.teacherId, user.id)
        ))
        .where(eq(activitySubmissions.id, submissionId))
        .limit(1);
      
      if (submissionData.length === 0) {
        return res.status(404).json({ 
          message: "Submissao nao encontrada ou voce nao tem permissao para avalia-la" 
        });
      }
      
      const { submission: sub, activity, classSubject } = submissionData[0];
      
      // Verificacao dupla de seguranca
      if (activity.teacherId !== user.id || classSubject.teacherId !== user.id) {
        return res.status(403).json({ 
          message: "Voce so pode avaliar submissA�es de atividades das disciplinas que leciona" 
        });
      }
      
      // Validar nota
      const gradeValue = Number(grade);
      if (gradeValue < 0 || gradeValue > activity.maxGrade) {
        return res.status(400).json({ 
          message: `A nota deve estar entre 0 e ${activity.maxGrade}` 
        });
      }
      
      // Calcular nota final considerando penalidades
      let finalGrade = gradeValue;
      if (sub.isLate && sub.latePenaltyApplied > 0) {
        finalGrade = Math.max(0, finalGrade - sub.latePenaltyApplied);
      }
      
      // Atualizar a submissao
      await db
        .update(activitySubmissions)
        .set({
          grade: gradeValue,
          finalGrade: finalGrade,
          feedback: feedback || '',
          status: 'graded',
          gradedBy: user.id,
          gradedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        .where(eq(activitySubmissions.id, submissionId));
      
      console.log('✅ Submissao avaliada com sucesso pelo professor autorizado!');
      
      res.json({ 
        message: "Submissao avaliada com sucesso",
        grade: gradeValue,
        finalGrade: finalGrade,
        latePenaltyApplied: sub.latePenaltyApplied,
        maxGrade: activity.maxGrade
      });
    } catch (error) {
      console.error('Erro ao avaliar submissao:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Submeter atividade (com suporte a arquivos)
  app.post('/api/activities/:id/submit', isAuthenticated, upload.array('files', 5), async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user as any;
      
      console.log('=== SUBMISSA�O DE ATIVIDADE ===');
      console.log('Activity ID:', id);
      console.log('User ID:', user.id);
      
      // Apenas alunos podem submeter atividades
      if (user.role !== 'student') {
        return res.status(403).json({ message: "Apenas alunos podem submeter atividades" });
      }
      
      // Verificar se a atividade existe e esta ativa
      const activityResult = await db
        .select()
        .from(activities)
        .where(eq(activities.id, id))
        .limit(1);
      
      if (activityResult.length === 0) {
        return res.status(404).json({ message: "Atividade nao encontrada" });
      }
      
      const activity = activityResult[0];
      
      if (activity.status !== 'active') {
        return res.status(400).json({ message: "Atividade nao esta disponivel para submissao" });
      }
      
      // Verificar se ja existe uma submissao
      const existingSubmission = await db
        .select()
        .from(activitySubmissions)
        .where(and(eq(activitySubmissions.activityId, id), eq(activitySubmissions.studentId, user.id)))
        .limit(1);
      
      if (existingSubmission.length > 0) {
        // Se existe, primeiro remover a submissao anterior
        await db
          .delete(submissionFiles)
          .where(eq(submissionFiles.submissionId, existingSubmission[0].id));
        
        await db
          .delete(activitySubmissions)
          .where(eq(activitySubmissions.id, existingSubmission[0].id));
      }
      
      // Verificar se esta atrasado
      const now = new Date();
      const dueDate = new Date(activity.dueDate);
      const isLate = now > dueDate;
      
      if (isLate && !activity.allowLateSubmission) {
        return res.status(400).json({ message: "Prazo de entrega expirado e submissA�es em atraso nao sao permitidas" });
      }
      
      // Calcular penalidade por atraso
      let latePenaltyApplied = 0;
      if (isLate && activity.allowLateSubmission) {
        latePenaltyApplied = activity.latePenalty || 0;
      }
      
      // Extrair conteudo do formulario
      const content = req.body.content || '';
      
      // Criar nova submissao
      const newSubmission = {
        id: uuidv4(),
        activityId: id,
        studentId: user.id,
        submittedAt: now.toISOString(),
        comment: content,
        status: isLate ? 'late' as const : 'submitted' as const,
        maxGrade: activity.maxGrade,
        isLate: isLate,
        latePenaltyApplied: latePenaltyApplied,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      };
      
      await db.insert(activitySubmissions).values(newSubmission);
      
      // Processar arquivos enviados
      const files = req.files as Express.Multer.File[] || [];
      
      for (const file of files) {
        const fileId = uuidv4();
        
        // O arquivo ja foi salvo pelo multer, vamos apenas registrar no banco
        // O multer ja salvou com um nome unico, vamos usar o path do arquivo
        const filePath = file.path; // Caminho onde o multer salvou o arquivo
        
        // Salvar informacA�es do arquivo no banco
        await db.insert(submissionFiles).values({
          id: fileId,
          submissionId: newSubmission.id,
          fileName: file.filename, // Nome unico gerado pelo multer
          originalFileName: file.originalname,
          filePath: filePath,
          fileSize: file.size,
          fileType: file.mimetype,
          uploadedAt: now.toISOString()
        });
      }
      
      console.log('✅ Submissao criada com sucesso!');
      console.log(`📁 ${files.length} arquivo(s) processado(s)`);
      
      res.json({ 
        message: "Atividade submetida com sucesso",
        submission: {
          id: newSubmission.id,
          isLate: isLate,
          latePenaltyApplied: latePenaltyApplied,
          filesCount: files.length
        }
      });
    } catch (error) {
      console.error('Erro ao submeter atividade:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Desfazer entrega de atividade (apenas se nao foi avaliada)
  app.post('/api/activities/:id/undo-submit', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user as any;
      
      console.log('=== DESFAZENDO ENTREGA DE ATIVIDADE ===');
      console.log('Activity ID:', id);
      console.log('User ID:', user.id);
      
      if (user.role !== 'student') {
        return res.status(403).json({ message: "Apenas alunos podem desfazer entregas" });
      }
      
      // Buscar a submissao do aluno
      const submission = await db
        .select()
        .from(activitySubmissions)
        .where(and(
          eq(activitySubmissions.activityId, id),
          eq(activitySubmissions.studentId, user.id)
        ))
        .limit(1);
      
      if (submission.length === 0) {
        return res.status(404).json({ message: "Submissao nao encontrada" });
      }
      
      const sub = submission[0];
      
      // Verificar se ja foi avaliada
      if (sub.status === 'graded') {
        return res.status(400).json({ 
          message: "Nao e possivel desfazer a entrega de uma atividade ja avaliada" 
        });
      }
      
      // Remover a submissao
      await db
        .delete(activitySubmissions)
        .where(eq(activitySubmissions.id, sub.id));
      
      console.log('✅ Entrega desfeita com sucesso!');
      
      res.json({ 
        message: "Entrega desfeita com sucesso. Voce pode enviar novamente."
      });
    } catch (error) {
      console.error('Erro ao desfazer entrega:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // ===== ROTAS DE MENSAGENS (CHAT) =====
  
  // Buscar conversas do usuario
  app.get('/api/messages/conversations', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      
      // REGRA: Buscar todas as conversas com a A�LTIMA mensagem de cada uma
      // Primeiro, encontrar todos os usuarios com quem o usuario atual teve conversas
      const conversationUsers = await db
        .selectDistinct({
          otherUserId: sql<string>`CASE 
            WHEN ${messages.senderId} = ${user.id} THEN ${messages.recipientId}
            ELSE ${messages.senderId}
          END`.as('otherUserId')
        })
        .from(messages)
        .where(
          or(
            eq(messages.senderId, user.id),
            eq(messages.recipientId, user.id)
          )
        );
      
      // Para cada conversa, buscar a ultima mensagem e dados do usuario
      const conversations = [];
      
      for (const conv of conversationUsers) {
        // Buscar a ultima mensagem da conversa
        const lastMessageData = await db
          .select({
            content: messages.content,
            createdAt: messages.createdAt,
            senderId: messages.senderId
          })
          .from(messages)
          .where(
            and(
              or(
                and(eq(messages.senderId, user.id), eq(messages.recipientId, conv.otherUserId)),
                and(eq(messages.senderId, conv.otherUserId), eq(messages.recipientId, user.id))
              )
            )
          )
          .orderBy(desc(messages.createdAt))
          .limit(1);
        
        // Buscar dados do outro usuario
        const otherUserData = await db
          .select({
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
            role: users.role
          })
          .from(users)
          .where(eq(users.id, conv.otherUserId))
          .limit(1);
        
        // Contar mensagens nao lidas
        const unreadResult = await db
          .select({ count: count() })
          .from(messages)
          .where(
            and(
              eq(messages.recipientId, user.id),
              eq(messages.senderId, conv.otherUserId),
              eq(messages.read, false)
            )
          );
        
        if (lastMessageData.length > 0 && otherUserData.length > 0) {
          conversations.push({
            conversationId: conv.otherUserId,
            otherUserId: conv.otherUserId,
            otherUserFirstName: otherUserData[0].firstName,
            otherUserLastName: otherUserData[0].lastName,
            otherUserRole: otherUserData[0].role,
            recipientEmail: otherUserData[0].email,
            lastMessage: lastMessageData[0].content,
            lastMessageTime: lastMessageData[0].createdAt,
            unreadCount: unreadResult[0]?.count || 0
          });
        }
      }
      
      // Ordenar por ultima mensagem (mais recente primeiro)
      conversations.sort((a, b) => {
        const timeA = new Date(a.lastMessageTime).getTime();
        const timeB = new Date(b.lastMessageTime).getTime();
        return timeB - timeA;
      });
      
      res.json(conversations);
    } catch (error) {
      console.error('Erro ao buscar conversas:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Buscar mensagens de uma conversa (usando ID do usuario)
  app.get('/api/messages/conversation/:userId', isAuthenticated, async (req, res) => {
    try {
      const { userId } = req.params;
      const user = req.user as any;
      
      // Buscar mensagens entre os dois usuarios
      const messagesList = await db
        .select({
          id: messages.id,
          content: messages.content,
          senderId: messages.senderId,
          senderName: users.firstName,
          senderLastName: users.lastName,
          recipientId: messages.recipientId,
          read: messages.read,
          createdAt: messages.createdAt,
          updatedAt: messages.updatedAt
        })
        .from(messages)
        .innerJoin(users, eq(messages.senderId, users.id))
        .where(
          and(
            or(
              and(eq(messages.senderId, user.id), eq(messages.recipientId, userId)),
              and(eq(messages.senderId, userId), eq(messages.recipientId, user.id))
            )
          )
        )
        .orderBy(asc(messages.createdAt));
      
      // Marcar mensagens como lidas
      await db
        .update(messages)
        .set({ read: true })
        .where(
          and(
            eq(messages.recipientId, user.id),
            eq(messages.senderId, userId),
            eq(messages.read, false)
          )
        );
      
      res.json({ data: messagesList });
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Enviar mensagem
  app.post('/api/messages', isAuthenticated, async (req, res) => {
    try {
      const {
        recipientEmail,
        content,
        conversationId
      } = req.body;

      if (!recipientEmail || !content) {
        return res.status(400).json({ message: "Email do destinatario e conteudo sao obrigatorios" });
      }

      // Buscar usuario destinatario
      const recipient = await db
        .select()
        .from(users)
        .where(eq(users.email, recipientEmail))
        .limit(1);

      if (recipient.length === 0) {
        return res.status(404).json({ message: "Usuario nao encontrado" });
      }

      const sender = req.user as any;

      const newMessage = {
        id: uuidv4(),
        senderId: sender.id,
        recipientId: recipient[0].id,
        subject: null,
        content,
        type: 'private' as const,
        read: false,
        priority: 'medium' as const,
        parentMessageId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await db.insert(messages).values(newMessage);

      // Criar conversa automatica para o destinatario se nao existir
      try {
        // Verificar se ja existe uma conversa entre os usuarios
        const existingConversation = await db
          .select()
          .from(messages)
          .where(
            or(
              and(eq(messages.senderId, sender.id), eq(messages.recipientId, recipient[0].id)),
              and(eq(messages.senderId, recipient[0].id), eq(messages.recipientId, sender.id))
            )
          )
          .limit(1);

        if (existingConversation.length === 0) {
          // Criar primeira conversa - inserir uma mensagem "virtual" para o destinatario
          const virtualMessage = {
            id: uuidv4(),
            senderId: recipient[0].id,
            recipientId: sender.id,
            subject: null,
            content: "Conversa iniciada",
            type: 'private' as const,
            read: false,
            priority: 'medium' as const,
            parentMessageId: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          await db.insert(messages).values(virtualMessage);
        }
      } catch (conversationError) {
        console.error('Erro ao criar conversa automatica:', conversationError);
        // Nao falhar o envio da mensagem por causa disso
      }

      res.status(201).json({
        message: "Mensagem enviada com sucesso",
        messageData: newMessage
      });
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Editar mensagem (apenas ate 5 minutos apos envio)
  app.put('/api/messages/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { content } = req.body;
      const user = req.user as any;

      if (!content) {
        return res.status(400).json({ message: "Conteudo e obrigatorio" });
      }

      // Buscar mensagem
      const message = await db
        .select()
        .from(messages)
        .where(eq(messages.id, id))
        .limit(1);

      if (message.length === 0) {
        return res.status(404).json({ message: "Mensagem nao encontrada" });
      }

      // Verificar se o usuario e o remetente
      if (message[0].senderId !== user.id) {
        return res.status(403).json({ message: "Apenas o remetente pode editar a mensagem" });
      }

      // Verificar se passou de 5 minutos
      const messageTime = new Date(message[0].createdAt);
      const currentTime = new Date();
      const timeDiff = (currentTime.getTime() - messageTime.getTime()) / (1000 * 60);

      if (timeDiff > 5) {
        return res.status(400).json({ message: "Nao e possivel editar mensagens apos 5 minutos" });
      }

      await db
        .update(messages)
        .set({
          content,
          updatedAt: new Date().toISOString()
        })
        .where(eq(messages.id, id));

      res.json({
        message: "Mensagem editada com sucesso",
        messageData: { ...message[0], content, updatedAt: new Date().toISOString() }
      });
    } catch (error) {
      console.error('Erro ao editar mensagem:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Excluir mensagem (apenas ate 5 minutos apos envio)
  app.delete('/api/messages/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user as any;

      // Buscar mensagem
      const message = await db
        .select()
        .from(messages)
        .where(eq(messages.id, id))
        .limit(1);

      if (message.length === 0) {
        return res.status(404).json({ message: "Mensagem nao encontrada" });
      }

      // Verificar se o usuario e o remetente
      if (message[0].senderId !== user.id) {
        return res.status(403).json({ message: "Apenas o remetente pode excluir a mensagem" });
      }

      // Verificar se passou de 5 minutos
      const messageTime = new Date(message[0].createdAt);
      const currentTime = new Date();
      const timeDiff = (currentTime.getTime() - messageTime.getTime()) / (1000 * 60);

      if (timeDiff > 5) {
        return res.status(400).json({ message: "Nao e possivel excluir mensagens apos 5 minutos" });
      }

      await db.delete(messages).where(eq(messages.id, id));

      res.json({ message: "Mensagem excluida com sucesso" });
    } catch (error) {
      console.error('Erro ao excluir mensagem:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Download de arquivo de submissao (professores e alunos)
  app.get('/api/submissions/files/:fileId/download', isAuthenticated, async (req, res) => {
    try {
      const { fileId } = req.params;
      const user = req.user as any;

      // Buscar arquivo
      const file = await db
        .select()
        .from(submissionFiles)
        .where(eq(submissionFiles.id, fileId))
        .limit(1);

      if (file.length === 0) {
        return res.status(404).json({ message: "Arquivo nao encontrado" });
      }

      // Verificar se o usuario pode acessar este arquivo
      const submission = await db
        .select({ 
          activityId: activitySubmissions.activityId,
          studentId: activitySubmissions.studentId
        })
        .from(activitySubmissions)
        .where(eq(activitySubmissions.id, file[0].submissionId))
        .limit(1);

      if (submission.length === 0) {
        return res.status(404).json({ message: "Submissao nao encontrada" });
      }

      const activity = await db
        .select()
        .from(activities)
        .where(eq(activities.id, submission[0].activityId))
        .limit(1);

      if (activity.length === 0) {
        return res.status(404).json({ message: "Atividade nao encontrada" });
      }

      // Verificar permissA�es: professor da atividade ou aluno que fez a submissao
      const isTeacher = user.role === 'teacher' && activity[0].teacherId === user.id;
      const isStudent = user.role === 'student' && submission[0].studentId === user.id;

      if (!isTeacher && !isStudent) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      // Enviar arquivo
      const filePath = path.resolve(file[0].filePath);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "Arquivo nao encontrado no servidor" });
      }

      res.setHeader('Content-Disposition', `attachment; filename="${file[0].originalFileName}"`);
      res.setHeader('Content-Type', file[0].fileType);
      res.sendFile(filePath);
    } catch (error) {
      console.error('Erro ao baixar arquivo:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Visualizar arquivo de submissao (professores e alunos)
  app.get('/api/submissions/files/:fileId/view', isAuthenticated, async (req, res) => {
    try {
      const { fileId } = req.params;
      const user = req.user as any;

      // Buscar arquivo
      const file = await db
        .select()
        .from(submissionFiles)
        .where(eq(submissionFiles.id, fileId))
        .limit(1);

      if (file.length === 0) {
        return res.status(404).json({ message: "Arquivo nao encontrado" });
      }

      // Verificar se o usuario pode acessar este arquivo
      const submission = await db
        .select({ 
          activityId: activitySubmissions.activityId,
          studentId: activitySubmissions.studentId
        })
        .from(activitySubmissions)
        .where(eq(activitySubmissions.id, file[0].submissionId))
        .limit(1);

      if (submission.length === 0) {
        return res.status(404).json({ message: "Submissao nao encontrada" });
      }

      const activity = await db
        .select()
        .from(activities)
        .where(eq(activities.id, submission[0].activityId))
        .limit(1);

      if (activity.length === 0) {
        return res.status(404).json({ message: "Atividade nao encontrada" });
      }

      // Verificar permissA�es: professor da atividade ou aluno que fez a submissao
      const isTeacher = user.role === 'teacher' && activity[0].teacherId === user.id;
      const isStudent = user.role === 'student' && submission[0].studentId === user.id;

      if (!isTeacher && !isStudent) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      // Permitir visualizacao de todos os tipos de arquivo

      // Enviar arquivo para visualizacao
      const filePath = path.resolve(file[0].filePath);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "Arquivo nao encontrado no servidor" });
      }

      // Definir Content-Type baseado na extensao do arquivo
      const fileExtension = path.extname(file[0].originalFileName).toLowerCase();
      let contentType = file[0].fileType;
      
      // Mapear extensA�es para Content-Types corretos
      const mimeTypes = {
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.txt': 'text/plain',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif'
      };
      
      if (mimeTypes[fileExtension]) {
        contentType = mimeTypes[fileExtension];
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `inline; filename="${file[0].originalFileName}"`);
      res.sendFile(filePath);
    } catch (error) {
      console.error('Erro ao visualizar arquivo:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });


  // Download de todas as submissA�es como ZIP
  app.get('/api/activities/:id/submissions/download-all', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const { id: activityId } = req.params;
      const user = req.user as any;

      // Verificar se o professor pode acessar esta atividade
      const activity = await db
        .select()
        .from(activities)
        .where(eq(activities.id, activityId))
        .limit(1);

      if (activity.length === 0 || activity[0].teacherId !== user.id) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      // Buscar submissA�es
      const submissions = await db
        .select({
          submission: activitySubmissions,
          student: {
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email
          }
        })
        .from(activitySubmissions)
        .innerJoin(users, eq(activitySubmissions.studentId, users.id))
        .where(eq(activitySubmissions.activityId, activityId));

      if (submissions.length === 0) {
        return res.status(404).json({ message: "Nenhuma submissao encontrada" });
      }

      const archiver = require('archiver');
      const path = require('path');
      const fs = require('fs');

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${activity[0].title}_submissoes.zip"`);

      const archive = archiver('zip', { zlib: { level: 9 } });
      
      archive.on('error', (err) => {
        console.error('Erro ao criar ZIP:', err);
        res.status(500).json({ message: "Erro ao criar arquivo ZIP" });
      });

      archive.pipe(res);

      // Adicionar submissA�es ao ZIP
      for (const item of submissions) {
        const studentName = `${item.student.firstName}_${item.student.lastName}`;
        const submissionFolder = `${studentName}/`;
        
        // Adicionar resposta em texto
        if (item.submission.comment) {
          archive.append(item.submission.comment, { 
            name: `${submissionFolder}resposta.txt` 
          });
        }

        // Buscar arquivos da submissao
        const files = await db
          .select()
          .from(submissionFiles)
          .where(eq(submissionFiles.submissionId, item.submission.id));

        // Adicionar arquivos
        for (const file of files) {
          const filePath = path.resolve(file.filePath);
          if (fs.existsSync(filePath)) {
            archive.file(filePath, { 
              name: `${submissionFolder}${file.originalFileName}` 
            });
          }
        }
      }

      archive.finalize();
    } catch (error) {
      console.error('Erro ao baixar submissA�es:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Exportar notas como CSV
  app.get('/api/activities/:id/submissions/export-grades', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const { id: activityId } = req.params;
      const user = req.user as any;

      // Verificar se o professor pode acessar esta atividade
      const activity = await db
        .select()
        .from(activities)
        .where(eq(activities.id, activityId))
        .limit(1);

      if (activity.length === 0 || activity[0].teacherId !== user.id) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      // Buscar submissA�es com notas
      const submissions = await db
        .select({
          submission: activitySubmissions,
          student: {
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email
          }
        })
        .from(activitySubmissions)
        .innerJoin(users, eq(activitySubmissions.studentId, users.id))
        .where(and(
          eq(activitySubmissions.activityId, activityId),
          eq(activitySubmissions.status, 'graded')
        ))
        .orderBy(asc(users.firstName), asc(users.lastName));

      if (submissions.length === 0) {
        return res.status(404).json({ message: "Nenhuma submissao avaliada encontrada" });
      }

      // Criar CSV
      let csv = 'Nome,Email,Nota Original,Penalidade por Atraso,Nota Final,Data de Submissao,Feedback\n';
      
      submissions.forEach(item => {
        const studentName = `${item.student.firstName} ${item.student.lastName}`;
        const email = item.student.email;
        const originalGrade = item.submission.grade || 0;
        const penalty = item.submission.latePenaltyApplied || 0;
        const finalGrade = item.submission.finalGrade || originalGrade;
        const submittedAt = new Date(item.submission.submittedAt).toLocaleDateString('pt-BR');
        const feedback = (item.submission.feedback || '').replace(/"/g, '""');
        
        csv += `"${studentName}","${email}",${originalGrade},${penalty},${finalGrade},"${submittedAt}","${feedback}"\n`;
      });

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${activity[0].title}_notas.csv"`);
      res.send('\ufeff' + csv); // BOM para UTF-8
    } catch (error) {
      console.error('Erro ao exportar notas:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Buscar minha submissao (para alunos)
  app.get('/api/activities/:id/my-submission', isAuthenticated, hasRole(['student']), async (req, res) => {
    try {
      const { id: activityId } = req.params;
      const user = req.user as any;

      // Buscar submissao do aluno
      const submission = await db
        .select()
        .from(activitySubmissions)
        .where(and(
          eq(activitySubmissions.activityId, activityId),
          eq(activitySubmissions.studentId, user.id)
        ))
        .limit(1);

      if (submission.length === 0) {
        return res.status(404).json({ message: "Submissao nao encontrada" });
      }

      // Buscar arquivos da submissao
      const files = await db
        .select()
        .from(submissionFiles)
        .where(eq(submissionFiles.submissionId, submission[0].id));

      res.json({
        ...submission[0],
        files
      });
    } catch (error) {
      console.error('Erro ao buscar submissao:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Buscar historico de submissao
  app.get('/api/submissions/:id/history', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const { id: submissionId } = req.params;
      const user = req.user as any;

      // Verificar se a submissao existe e se o professor pode acessa-la
      const submission = await db
        .select({ activityId: activitySubmissions.activityId })
        .from(activitySubmissions)
        .where(eq(activitySubmissions.id, submissionId))
        .limit(1);

      if (submission.length === 0) {
        return res.status(404).json({ message: "Submissao nao encontrada" });
      }

      const activity = await db
        .select()
        .from(activities)
        .where(eq(activities.id, submission[0].activityId))
        .limit(1);

      if (activity.length === 0 || activity[0].teacherId !== user.id) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      // Por enquanto, retornar historico basico (pode ser expandido no futuro)
      // Em uma implementacao real, voce teria uma tabela submission_history
      const history = [
        {
          id: 'initial',
          submissionId: submissionId,
          action: 'submitted',
          performedBy: 'student',
          performedAt: new Date().toISOString(),
          details: 'Submissao inicial da atividade'
        }
      ];

      res.json(history);
    } catch (error) {
      console.error('Erro ao buscar historico:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // ROTA DE TESTE PARA SUBMISSA�O - COMPLETAMENTE SEPARADA
  app.post('/api/test-submit', async (req, res) => {
    try {
      console.log('=== TESTE DE SUBMISSA�O ===');
      console.log('Body:', req.body);
      console.log('Content-Type:', req.get('Content-Type'));
      console.log('Method:', req.method);
      
      res.json({ 
        message: "Teste funcionando!", 
        body: req.body,
        contentType: req.get('Content-Type')
      });
    } catch (error) {
      console.error('Erro no teste:', error);
      res.status(500).json({ message: "Erro no teste" });
    }
  });

  // Buscar turmas do professor para criacao de atividades
  app.get('/api/classes', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const user = req.user as any;
      console.log('=== BUSCANDO TURMAS DO PROFESSOR ===');
      console.log('Teacher ID:', user.id);
      
      // Primeiro, verificar se existem vinculos
      const teacherLinks = await db
        .select()
        .from(classSubjects)
        .where(and(
          eq(classSubjects.teacherId, user.id),
          eq(classSubjects.status, 'active')
        ));
      
      console.log(`📊 Vinculos encontrados para professor: ${teacherLinks.length}`);
      teacherLinks.forEach(link => {
        console.log(`  - ClassId: ${link.classId}, SubjectId: ${link.subjectId}, Status: ${link.status}`);
      });
      
      const classesList = await db
        .select({
          id: classes.id,
          name: classes.name,
          grade: classes.grade,
          section: classes.section,
          academicYear: classes.academicYear
        })
        .from(classes)
        .innerJoin(classSubjects, and(
          eq(classSubjects.classId, classes.id),
          eq(classSubjects.teacherId, user.id),
          eq(classSubjects.status, 'active')
        ))
        .where(eq(classes.status, 'active'))
        .groupBy(classes.id)
        .orderBy(classes.name);
      
      console.log(`✅ Turmas encontradas para professor: ${classesList.length}`);
      classesList.forEach(cls => {
        console.log(`  - ${cls.name} (${cls.id})`);
      });
      
      console.log(`✅ Encontradas ${classesList.length} turmas para o professor`);
      classesList.forEach((c, index) => {
        console.log(`  ${index + 1}. ${c.name} (${c.id})`);
      });
      
      res.json({ data: classesList });
    } catch (error) {
      console.error('Erro ao buscar turmas:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // ===== ENDPOINTS ADMINISTRATIVOS =====
  
  // Dashboard administrativo - estatisticas gerais
  app.get('/api/admin/dashboard', isAuthenticated, hasRole(['admin']), async (req, res) => {
    try {
      const user = req.user;
      console.log(`📊 Dashboard administrativo solicitado por: ${user.firstName} ${user.lastName}`);

      // Contar usuarios por funcao
      const usersByRole = await db
        .select({
          role: users.role,
          count: count()
        })
        .from(users)
        .where(eq(users.status, 'active'))
        .groupBy(users.role);

      // Contar turmas ativas
      const activeClasses = await db
        .select({ count: count() })
        .from(classes)
        .where(eq(classes.status, 'active'));

      // Contar disciplinas ativas
      const activeSubjects = await db
        .select({ count: count() })
        .from(subjects)
        .where(eq(subjects.status, 'active'));

      // Usuarios recentes (ultimos 5)
      const recentUsers = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          role: users.role,
          status: users.status,
          createdAt: users.createdAt
        })
        .from(users)
        .orderBy(desc(users.createdAt))
        .limit(5);

      const stats = {
        totalUsers: usersByRole.reduce((sum, item) => sum + item.count, 0),
        totalClasses: activeClasses[0]?.count || 0,
        totalSubjects: activeSubjects[0]?.count || 0,
        usersByRole: usersByRole.reduce((acc, item) => {
          acc[item.role] = item.count;
          return acc;
        }, {} as Record<string, number>),
        recentUsers
      };

      console.log('📊 Estatisticas do dashboard:', stats);
      res.json({ data: stats });
    } catch (error) {
      console.error('Erro ao buscar estatisticas do dashboard:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Listar todos os usuarios (admin)
  app.get('/api/admin/users', isAuthenticated, hasRole(['admin']), async (req, res) => {
    try {
      const user = req.user;
      console.log(`👥 Listagem de usuarios solicitada por: ${user.firstName} ${user.lastName}`);

      const allUsers = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          role: users.role,
          status: users.status,
          phone: users.phone,
          address: users.address,
          registrationNumber: users.registrationNumber,
          createdAt: users.createdAt
        })
        .from(users)
        .where(ne(users.status, 'inactive'))
        .orderBy(desc(users.createdAt));

      console.log(`✅ Encontrados ${allUsers.length} usuarios`);
      res.json({ data: allUsers });
    } catch (error) {
      console.error('Erro ao buscar usuarios:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Criar novo usuario (admin)
  app.post('/api/admin/users', isAuthenticated, hasRole(['admin']), async (req, res) => {
    try {
      const user = req.user;
      const { firstName, lastName, email, role, phone, address, registrationNumber } = req.body;

      console.log(`➕ Criacao de usuario solicitada por: ${user.firstName} ${user.lastName}`);
      console.log('📝 Dados do novo usuario:', { firstName, lastName, email, role });

      // ValidacA�es basicas
      if (!firstName || firstName.trim() === '') {
        return res.status(400).json({ message: "Nome e obrigatorio" });
      }
      
      if (!lastName || lastName.trim() === '') {
        return res.status(400).json({ message: "Sobrenome e obrigatorio" });
      }
      
      if (!role || !['student', 'teacher', 'coordinator', 'admin'].includes(role)) {
        return res.status(400).json({ message: "Funcao invalida. Use: student, teacher, coordinator ou admin" });
      }

      // Gerar email padrao sempre com @escola.com
      let finalEmail;
      if (email && email !== '' && email.endsWith('@escola.com')) {
        // Email completo ja fornecido
        finalEmail = email;
      } else if (email && email !== '') {
        // Email parcial fornecido - usar apenas a parte antes do @ (se houver)
        const emailPart = email.split('@')[0];
        // Limpar caracteres especiais e espacos
        const cleanEmailPart = emailPart.replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase();
        finalEmail = `${cleanEmailPart}@escola.com`;
      } else {
        // Gerar email automatico
        const cleanFirstName = firstName.toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
        const cleanLastName = lastName.toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
        finalEmail = `${cleanFirstName}.${cleanLastName}@escola.com`;
      }
      
      // Verificar se email ja existe
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, finalEmail))
        .limit(1);

      if (existingUser.length > 0) {
        return res.status(400).json({ message: "Email ja esta em uso" });
      }

      // Gerar numero de matricula aleatorio e unico
      let finalRegistrationNumber;
      let attempts = 0;
      const maxAttempts = 10;
      
      do {
        // Gerar matricula aleatoria com 6 digitos
        const randomNumber = Math.floor(Math.random() * 900000) + 100000; // 100000 a 999999
        finalRegistrationNumber = randomNumber.toString();
        
        // Verificar se ja existe
        const existingRegistration = await db
          .select()
          .from(users)
          .where(eq(users.registrationNumber, finalRegistrationNumber))
          .limit(1);
        
        if (existingRegistration.length === 0) {
          break; // Matricula unica encontrada
        }
        
        attempts++;
      } while (attempts < maxAttempts);
      
      if (attempts >= maxAttempts) {
        return res.status(500).json({ message: "Erro ao gerar matricula unica. Tente novamente." });
      }

      // Hash da senha padrao
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.hash('123', 10);

      // Criar usuario
      const newUser = {
        id: uuidv4(),
        firstName,
        lastName,
        email: finalEmail,
        password: hashedPassword,
        role,
        status: 'active',
        phone: phone || null,
        address: address || null,
        registrationNumber: finalRegistrationNumber,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await db.insert(users).values(newUser);

      // Se for aluno, matricular automaticamente na primeira turma disponivel
      if (role === 'student') {
        try {
          const availableClass = await db
            .select({ id: classes.id })
            .from(classes)
            .where(eq(classes.status, 'active'))
            .limit(1);

          if (availableClass.length > 0) {
            const enrollment = {
              id: uuidv4(),
              studentId: newUser.id,
              classId: availableClass[0].id,
              enrollmentDate: new Date().toISOString(),
              status: 'active',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };

            await db.insert(studentClass).values(enrollment);
            console.log(`🎓 Aluno matriculado automaticamente na turma: ${availableClass[0].id}`);
          }
        } catch (enrollmentError) {
          console.error('Erro ao matricular aluno automaticamente:', enrollmentError);
          // Nao falha a criacao do usuario se a matricula falhar
        }
      }

      console.log(`✅ Usuario criado com sucesso: ${newUser.id}`);
      console.log(`📧 Email: ${finalEmail}`);
      console.log(`🔑 Senha padrao: 123`);
      console.log(`🆔 Matricula: ${finalRegistrationNumber}`);
      
      res.status(201).json({ 
        message: "Usuario criado com sucesso",
        data: { 
          id: newUser.id,
          email: finalEmail,
          registrationNumber: finalRegistrationNumber,
          defaultPassword: '123'
        }
      });
    } catch (error) {
      console.error('Erro ao criar usuario:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Atualizar usuario (admin)
  app.put('/api/admin/users/:userId', isAuthenticated, hasRole(['admin']), async (req, res) => {
    try {
      const user = req.user;
      const { userId } = req.params;
      const { firstName, lastName, email, role, phone, address, registrationNumber, status, password } = req.body;

      console.log(`✏️ Atualizacao de usuario ${userId} solicitada por: ${user.firstName} ${user.lastName}`);
      console.log('📝 Dados recebidos:', { firstName, lastName, email, role, phone, address, registrationNumber, status, password: password ? '[FORNECIDA]' : '[NA�O FORNECIDA]' });

      // Verificar se usuario existe
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (existingUser.length === 0) {
        return res.status(404).json({ message: "Usuario nao encontrado" });
      }

      console.log('👤 Usuario existente:', {
        id: existingUser[0].id,
        email: existingUser[0].email,
        firstName: existingUser[0].firstName,
        lastName: existingUser[0].lastName,
        registrationNumber: existingUser[0].registrationNumber,
        role: existingUser[0].role,
        status: existingUser[0].status
      });

      // Verificar se email ja existe em outro usuario
      if (email && email !== existingUser[0].email) {
        const emailExists = await db
          .select()
          .from(users)
          .where(and(eq(users.email, email), ne(users.id, userId)))
          .limit(1);

        if (emailExists.length > 0) {
          return res.status(400).json({ message: "Email ja esta em uso" });
        }
      }

      // Verificar se matricula ja existe em outro usuario
      if (registrationNumber && registrationNumber !== '' && registrationNumber !== existingUser[0].registrationNumber) {
        const registrationExists = await db
          .select()
          .from(users)
          .where(and(eq(users.registrationNumber, registrationNumber), ne(users.id, userId)))
          .limit(1);

        if (registrationExists.length > 0) {
          return res.status(400).json({ message: "Numero de matricula ja esta em uso" });
        }
      }

      // Preparar dados para atualizacao - NUNCA incluir campos obrigatorios que nao foram fornecidos
      const updateData: any = {
        updatedAt: new Date().toISOString()
      };

      // Adicionar apenas campos fornecidos e que nao sao obrigatorios ou que foram explicitamente fornecidos
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (email !== undefined) updateData.email = email;
      if (role !== undefined) updateData.role = role;
      if (phone !== undefined) updateData.phone = phone || null;
      if (address !== undefined) updateData.address = address || null;
      if (status !== undefined) updateData.status = status;
      
      // Para registrationNumber (campo obrigatorio), so incluir se foi explicitamente fornecido
      if (registrationNumber !== undefined && registrationNumber !== null && registrationNumber !== '') {
        updateData.registrationNumber = registrationNumber;
      }
      // IMPORTANTE: Se registrationNumber nao foi fornecido, NA�O incluir no updateData

      // Atualizar senha se fornecida
      if (password) {
        const bcrypt = await import('bcryptjs');
        updateData.password = await bcrypt.hash(password, 10);
      }

      console.log('🔄 Dados que serao atualizados:', updateData);

      // Usar o metodo correto do Drizzle ORM para atualizacao
      await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, userId));

      console.log(`✅ Usuario ${userId} atualizado com sucesso`);
      res.json({ message: "Usuario atualizado com sucesso" });
    } catch (error) {
      console.error('❌ Erro detalhado ao atualizar usuario:', error);
      console.error('❌ Stack trace:', error.stack);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Excluir usuario (admin)
  app.delete('/api/admin/users/:userId', isAuthenticated, hasRole(['admin']), async (req, res) => {
    try {
      const user = req.user;
      const { userId } = req.params;
      const { password } = req.body;

      console.log(`🗑️ Exclusao de usuario ${userId} solicitada por: ${user.firstName} ${user.lastName}`);

      // Verificar senha de confirmacao
      if (!password || password !== '123') {
        return res.status(400).json({ message: "Senha de confirmacao incorreta" });
      }

      // Verificar se usuario existe
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (existingUser.length === 0) {
        return res.status(404).json({ message: "Usuario nao encontrado" });
      }

      // Nao permitir exclusao do proprio usuario
      if (userId === user.id) {
        return res.status(400).json({ message: "Nao e possivel excluir seu proprio usuario" });
      }

      const userToDelete = existingUser[0];
      console.log("Usu�rio a ser deletado: " + userToDelete.firstName + " " + userToDelete.lastName + " (" + userToDelete.role + ")");

      // DESABILITAR FOREIGN KEY CONSTRAINTS TEMPORARIAMENTE
      await db.run(sql`PRAGMA foreign_keys = OFF`);
      console.log(`[UNLOCK] Foreign key constraints desabilitadas`);

      try {
        // Deletar v�nculos primeiro (em ordem de depend�ncia)
        console.log(`?? Removendo v�nculos do usu�rio ${userId}...`);
      
        // 1. Remover disciplinas onde o usu�rio � professor
        await db.update(subjects).set({ teacherId: null }).where(eq(subjects.teacherId, userId));
        console.log(`[OK] Professor removido das disciplinas`);
      
        // 2. Remover coordena��o de turmas
        await db.update(classes).set({ coordinatorId: null }).where(eq(classes.coordinatorId, userId));
        console.log(`[OK] Coordena��o de turmas removida`);
      
      // 3. Remover v�nculos de disciplinas com professores
      await db.delete(classSubjects).where(eq(classSubjects.teacherId, userId));
      console.log(`[OK] V�nculos classSubjects removidos`);
      
      // 4. Remover matr�culas de alunos
      await db.delete(studentClass).where(eq(studentClass.studentId, userId));
      console.log(`[OK] Matr�culas de alunos removidas`);
      
      // 5. Remover notas onde o usu�rio � aluno
      await db.delete(grades).where(eq(grades.studentId, userId));
      console.log(`[OK] Notas do aluno removidas`);
      
      // 6. Remover notas atribu�das pelo usu�rio
      await db.delete(grades).where(eq(grades.createdBy, userId));
      console.log(`[OK] Notas atribu�das pelo usu�rio removidas`);
      
      // 7. Remover presen�as do aluno
      await db.delete(attendance).where(eq(attendance.studentId, userId));
      console.log(`[OK] Presen�as do aluno removidas`);
      
      // 8. Remover presen�as registradas pelo usu�rio
      await db.delete(attendance).where(eq(attendance.recordedBy, userId));
      console.log(`[OK] Presen�as registradas pelo usu�rio removidas`);
      
      // 9. Remover eventos criados pelo usu�rio
      await db.delete(events).where(eq(events.createdBy, userId));
      console.log(`[OK] Eventos criados pelo usu�rio removidos`);
      
      // 10. Remover notifica��es enviadas pelo usu�rio
      await db.delete(notifications).where(eq(notifications.senderId, userId));
      console.log(`[OK] Notifica��es enviadas pelo usu�rio removidas`);
      
      // 11. Remover notifica��es recebidas pelo usu�rio
      await db.delete(notifications).where(eq(notifications.recipientId, userId));
      console.log(`[OK] Notifica��es recebidas pelo usu�rio removidas`);
      
      // 12. Remover configura��es atualizadas pelo usu�rio
      await db.update(settings).set({ updatedBy: null }).where(eq(settings.updatedBy, userId));
      console.log(`[OK] Refer�ncias de configura��es removidas`);
      
      // 13. Remover atividades criadas pelo usu�rio
      await db.delete(activities).where(eq(activities.teacherId, userId));
      console.log(`[OK] Atividades do usu�rio removidas`);
      
      // 14. Remover arquivos de atividades enviados pelo usu�rio
      await db.delete(activityFiles).where(eq(activityFiles.uploadedBy, userId));
      console.log(`[OK] Arquivos de atividades do usu�rio removidos`);
      
      // 15. Remover submiss�es do aluno
      await db.delete(activitySubmissions).where(eq(activitySubmissions.studentId, userId));
      console.log(`[OK] Submiss�es do aluno removidas`);
      
      // 16. Remover submiss�es avaliadas pelo usu�rio
      await db.update(activitySubmissions).set({ gradedBy: null }).where(eq(activitySubmissions.gradedBy, userId));
      console.log(`[OK] Refer�ncias de avalia��o removidas`);
      
      // 17. Remover hist�rico de submiss�es do usu�rio
      await db.delete(submissionHistory).where(eq(submissionHistory.performedBy, userId));
      console.log(`[OK] Hist�rico de submiss�es removido`);
      
      // 18. Remover avalia��es de rubricas do usu�rio
      await db.delete(rubricEvaluations).where(eq(rubricEvaluations.evaluatorId, userId));
      console.log(`[OK] Avalia��es de rubricas removidas`);
      
      // 19. Remover mensagens enviadas pelo usu�rio
      await db.delete(messages).where(eq(messages.senderId, userId));
      console.log(`[OK] Mensagens enviadas pelo usu�rio removidas`);
      
      // 20. Remover mensagens recebidas pelo usu�rio
      await db.delete(messages).where(eq(messages.recipientId, userId));
      console.log(`[OK] Mensagens recebidas pelo usu�rio removidas`);
      
      // 21. Remover relat�rios gerados pelo usu�rio
      await db.delete(reports).where(eq(reports.generatedBy, userId));
      console.log(`[OK] Relat�rios do usu�rio removidos`);
      
        // 22. Remover materiais criados pelo usu�rio (se a tabela existir)
        try {
          await db.delete(materials).where(eq(materials.teacherId, userId));
          console.log(`[OK] Materiais do usu�rio removidos`);
        } catch (e) {
          console.log(`[INFO] Tabela materials n�o existe, pulando...`);
        }
        
        // 23. Remover arquivos de materiais enviados pelo usu�rio (se a tabela existir)
        try {
          await db.delete(materialFiles).where(eq(materialFiles.uploadedBy, userId));
          console.log(`[OK] Arquivos de materiais do usu�rio removidos`);
        } catch (e) {
          console.log(`[INFO] Tabela materialFiles n�o existe, pulando...`);
        }
      
      // 24. Remover logs do sistema do usu�rio
      await db.delete(systemLogs).where(eq(systemLogs.userId, userId));
      console.log(`[OK] Logs do sistema do usu�rio removidos`);

      // 25. Deletar usu�rio permanentemente
      await db.delete(users).where(eq(users.id, userId));

      console.log(`[OK] Usuario ${userId} deletado permanentemente`);
      
      // REABILITAR FOREIGN KEY CONSTRAINTS
      await db.run(sql`PRAGMA foreign_keys = ON`);
      console.log(`?? Foreign key constraints reabilitadas`);
      
      res.json({ message: "Usuario excluido com sucesso" });
      } catch (deleteError) {
        // REABILITAR FOREIGN KEY CONSTRAINTS EM CASO DE ERRO
        await db.run(sql`PRAGMA foreign_keys = ON`);
        console.log(`?? Foreign key constraints reabilitadas ap�s erro`);
        throw deleteError;
      }
    } catch (error) {
      console.error('Erro ao excluir usuario:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Excluir professor (admin)
  app.delete('/api/admin/teachers/:teacherId', isAuthenticated, hasRole(['admin']), async (req, res) => {
    try {
      const user = req.user;
      const { teacherId } = req.params;
      const { password } = req.body;

      console.log(`🗑️ Exclusao de professor ${teacherId} solicitada por: ${user.firstName} ${user.lastName}`);

      // Verificar senha de confirmacao
      if (!password || password !== '123') {
        return res.status(400).json({ message: "Senha de confirmacao incorreta" });
      }

      // Verificar se professor existe
      const existingTeacher = await db
        .select()
        .from(users)
        .where(and(
          eq(users.id, teacherId),
          eq(users.role, 'teacher')
        ))
        .limit(1);

      if (existingTeacher.length === 0) {
        return res.status(404).json({ message: "Professor nao encontrado" });
      }

      const teacherToDelete = existingTeacher[0];
      console.log("Professor a ser deletado: " + teacherToDelete.firstName + " " + teacherToDelete.lastName);

      // DESABILITAR FOREIGN KEY CONSTRAINTS TEMPORARIAMENTE
      await db.run(sql`PRAGMA foreign_keys = OFF`);
      console.log(`[UNLOCK] Foreign key constraints desabilitadas`);

      try {
        // Deletar v�nculos primeiro (em ordem de depend�ncia)
      console.log(`?? Removendo v�nculos do professor ${teacherId}...`);
      
      // 1. Remover disciplinas onde o professor � respons�vel
      await db.update(subjects).set({ teacherId: null }).where(eq(subjects.teacherId, teacherId));
      console.log(`[OK] Professor removido das disciplinas`);
      
      // 2. Remover v�nculos de disciplinas com professores
      await db.delete(classSubjects).where(eq(classSubjects.teacherId, teacherId));
      console.log(`[OK] V�nculos classSubjects removidos`);
      
      // 3. Remover atividades criadas pelo professor
      await db.delete(activities).where(eq(activities.teacherId, teacherId));
      console.log(`[OK] Atividades do professor removidas`);
      
      // 4. Remover arquivos de atividades enviados pelo professor
      await db.delete(activityFiles).where(eq(activityFiles.uploadedBy, teacherId));
      console.log(`[OK] Arquivos de atividades do professor removidos`);
      
      // 5. Remover submiss�es avaliadas pelo professor
      await db.update(activitySubmissions).set({ gradedBy: null }).where(eq(activitySubmissions.gradedBy, teacherId));
      console.log(`[OK] Refer�ncias de avalia��o removidas`);
      
      // 6. Remover hist�rico de submiss�es do professor
      await db.delete(submissionHistory).where(eq(submissionHistory.performedBy, teacherId));
      console.log(`[OK] Hist�rico de submiss�es removido`);
      
      // 7. Remover avalia��es de rubricas do professor
      await db.delete(rubricEvaluations).where(eq(rubricEvaluations.evaluatorId, teacherId));
      console.log(`[OK] Avalia��es de rubricas removidas`);
      
      // 8. Remover notas atribu�das pelo professor
      await db.delete(grades).where(eq(grades.createdBy, teacherId));
      console.log(`[OK] Notas atribu�das pelo professor removidas`);
      
      // 9. Remover presen�as registradas pelo professor
      await db.delete(attendance).where(eq(attendance.recordedBy, teacherId));
      console.log(`[OK] Presen�as registradas pelo professor removidas`);
      
      // 10. Remover eventos criados pelo professor
      await db.delete(events).where(eq(events.createdBy, teacherId));
      console.log(`[OK] Eventos criados pelo professor removidos`);
      
      // 11. Remover notifica��es enviadas pelo professor
      await db.delete(notifications).where(eq(notifications.senderId, teacherId));
      console.log(`[OK] Notifica��es enviadas pelo professor removidas`);
      
      // 12. Remover notifica��es recebidas pelo professor
      await db.delete(notifications).where(eq(notifications.recipientId, teacherId));
      console.log(`[OK] Notifica��es recebidas pelo professor removidas`);
      
      // 13. Remover mensagens enviadas pelo professor
      await db.delete(messages).where(eq(messages.senderId, teacherId));
      console.log(`[OK] Mensagens enviadas pelo professor removidas`);
      
      // 14. Remover mensagens recebidas pelo professor
      await db.delete(messages).where(eq(messages.recipientId, teacherId));
      console.log(`[OK] Mensagens recebidas pelo professor removidas`);
      
      // 15. Remover relat�rios gerados pelo professor
      await db.delete(reports).where(eq(reports.generatedBy, teacherId));
      console.log(`[OK] Relat�rios do professor removidos`);
      
        // 16. Remover materiais criados pelo professor (se a tabela existir)
        try {
          await db.delete(materials).where(eq(materials.teacherId, teacherId));
          console.log(`[OK] Materiais do professor removidos`);
        } catch (e) {
          console.log(`[INFO] Tabela materials n�o existe, pulando...`);
        }
        
        // 17. Remover arquivos de materiais enviados pelo professor (se a tabela existir)
        try {
          await db.delete(materialFiles).where(eq(materialFiles.uploadedBy, teacherId));
          console.log(`[OK] Arquivos de materiais do professor removidos`);
        } catch (e) {
          console.log(`[INFO] Tabela materialFiles n�o existe, pulando...`);
        }
      
      // 18. Remover logs do sistema do professor
      await db.delete(systemLogs).where(eq(systemLogs.userId, teacherId));
      console.log(`[OK] Logs do sistema do professor removidos`);

      // 19. Deletar professor do banco
      await db.delete(users).where(eq(users.id, teacherId));

      console.log(`[OK] Professor ${teacherId} deletado permanentemente`);
      
      // REABILITAR FOREIGN KEY CONSTRAINTS
      await db.run(sql`PRAGMA foreign_keys = ON`);
      console.log(`?? Foreign key constraints reabilitadas`);
      
      res.json({ message: "Professor excluido com sucesso" });
      } catch (deleteError) {
        // REABILITAR FOREIGN KEY CONSTRAINTS EM CASO DE ERRO
        await db.run(sql`PRAGMA foreign_keys = ON`);
        console.log(`?? Foreign key constraints reabilitadas ap�s erro`);
        throw deleteError;
      }
    } catch (error) {
      console.error('Erro ao excluir professor:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // ===== ENDPOINTS PARA TURMAS =====
  
  // Deletar turma (admin)
  app.delete('/api/classes/:id', isAuthenticated, hasRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user;
      const { password } = req.body;
      
      console.log(`🗑️ Exclusao de turma ${id} solicitada por: ${user.firstName} ${user.lastName}`);

      // Verificar senha de confirmacao
      if (!password || password !== '123') {
        return res.status(400).json({ message: "Senha de confirmacao incorreta" });
      }

      // Verificar se a turma existe
      const existingClass = await db
        .select()
        .from(classes)
        .where(eq(classes.id, id))
        .limit(1);

      if (existingClass.length === 0) {
        return res.status(404).json({ message: "Turma nao encontrada" });
      }

      // Deletar vinculos primeiro (em ordem de depend�ncia)
      console.log(`?? Removendo v�nculos da turma ${id}...`);
      
      // 1. Remover v�nculos de disciplinas com turmas
      await db.delete(classSubjects).where(eq(classSubjects.classId, id));
      console.log(`[OK] V�nculos classSubjects removidos`);
      
      // 2. Remover matr�culas de alunos
      await db.delete(studentClass).where(eq(studentClass.classId, id));
      console.log(`[OK] Matr�culas de alunos removidas`);
      
      // 3. Remover atividades relacionadas � turma (se existir)
      try {
        await db.delete(activities).where(eq(activities.classId, id));
        console.log(`[OK] Atividades da turma removidas`);
      } catch (e) {
        console.log(`[INFO] Nenhuma atividade encontrada para a turma`);
      }
      
      // 4. Remover notas relacionadas � turma (se existir)
      try {
        await db.delete(grades).where(eq(grades.classId, id));
        console.log(`[OK] Notas da turma removidas`);
      } catch (e) {
        console.log(`[INFO] Nenhuma nota encontrada para a turma`);
      }

      // 5. Deletar turma permanentemente
      await db.delete(classes).where(eq(classes.id, id));

      console.log(`✅ Turma ${id} deletada permanentemente`);
      res.json({ message: "Turma excluida com sucesso" });
    } catch (error) {
      console.error('Erro ao excluir turma:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // ===== ENDPOINTS PARA DISCIPLINAS =====
  
  // Deletar disciplina (admin)
  app.delete('/api/subjects/:id', isAuthenticated, hasRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user;
      const { password } = req.body;
      
      console.log(`🗑️ Exclusao de disciplina ${id} solicitada por: ${user.firstName} ${user.lastName}`);

      // Verificar senha de confirmacao
      if (!password || password !== '123') {
        return res.status(400).json({ message: "Senha de confirmacao incorreta" });
      }

      // Verificar se a disciplina existe
      const existingSubject = await db
        .select()
        .from(subjects)
        .where(eq(subjects.id, id))
        .limit(1);

      if (existingSubject.length === 0) {
        return res.status(404).json({ message: "Disciplina nao encontrada" });
      }

      // Deletar vinculos primeiro (em ordem de depend�ncia)
      console.log(`?? Removendo v�nculos da disciplina ${id}...`);
      
      // 1. Remover v�nculos de disciplinas com turmas
      await db.delete(classSubjects).where(eq(classSubjects.subjectId, id));
      console.log(`[OK] V�nculos classSubjects removidos`);
      
      // 2. Remover atividades relacionadas � disciplina (se existir)
      try {
        await db.delete(activities).where(eq(activities.subjectId, id));
        console.log(`[OK] Atividades da disciplina removidas`);
      } catch (e) {
        console.log(`[INFO] Nenhuma atividade encontrada para a disciplina`);
      }
      
      // 3. Remover notas relacionadas � disciplina (se existir)
      try {
        await db.delete(grades).where(eq(grades.subjectId, id));
        console.log(`[OK] Notas da disciplina removidas`);
      } catch (e) {
        console.log(`[INFO] Nenhuma nota encontrada para a disciplina`);
      }

      // 4. Deletar disciplina permanentemente
      await db.delete(subjects).where(eq(subjects.id, id));

      console.log(`✅ Disciplina ${id} deletada permanentemente`);
      res.json({ message: "Disciplina excluida com sucesso" });
    } catch (error) {
      console.error('Erro ao excluir disciplina:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // ===== ENDPOINTS PARA PROFESSORES =====
  
  // Listar professores (admin)
  app.get('/api/admin/teachers', isAuthenticated, hasRole(['admin']), async (req, res) => {
    try {
      const user = req.user;
      console.log(`👨‍🏫 Listagem de professores solicitada por: ${user.firstName} ${user.lastName}`);

      const teachers = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          role: users.role,
          status: users.status,
          phone: users.phone,
          address: users.address,
          registrationNumber: users.registrationNumber,
          createdAt: users.createdAt
        })
        .from(users)
        .where(and(eq(users.role, 'teacher'), ne(users.status, 'inactive')))
        .orderBy(desc(users.createdAt));

      console.log(`✅ Encontrados ${teachers.length} professores`);
      res.json({ data: teachers });
    } catch (error) {
      console.error('Erro ao buscar professores:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Admin - Get teacher details with subjects and classes
  app.get('/api/admin/teachers/:id/details', isAuthenticated, hasRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      
      const teacher = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      
      if (teacher.length === 0) {
        return res.status(404).json({ message: 'Professor nao encontrado' });
      }
      
      // Buscar disciplinas e turmas vinculadas ao professor
      const teacherDetails = await db
        .select({
          subjectId: classSubjects.subjectId,
          subjectName: subjects.name,
          subjectCode: subjects.code,
          subjectWorkload: subjects.workload,
          classId: classSubjects.classId,
          className: classes.name,
          classGrade: classes.grade,
          classSection: classes.section
        })
        .from(classSubjects)
        .innerJoin(subjects, eq(classSubjects.subjectId, subjects.id))
        .innerJoin(classes, eq(classSubjects.classId, classes.id))
        .where(and(
          eq(classSubjects.teacherId, id),
          eq(classSubjects.status, 'active')
        ));
      
      res.json({
        teacher: teacher[0],
        subjects: teacherDetails
      });
    } catch (error) {
      console.error('Erro ao buscar detalhes do professor:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  });

  // Listar disciplinas para selecao (admin)
  app.get('/api/admin/subjects', isAuthenticated, hasRole(['admin']), async (req, res) => {
    try {
      const user = req.user;
      console.log(`�"� Listagem de disciplinas solicitada por: ${user.firstName} ${user.lastName}`);

      // Buscar disciplinas com informa��es de professor e turmas
      const subjectsList = await db
        .select({
          id: subjects.id,
          name: subjects.name,
          code: subjects.code,
          workload: subjects.workload,
          description: subjects.description,
          status: subjects.status,
          createdAt: subjects.createdAt,
          teacherId: subjects.teacherId,
          teacherName: users.firstName,
          teacherLastName: users.lastName,
          teacherEmail: users.email
        })
        .from(subjects)
        .leftJoin(users, eq(subjects.teacherId, users.id))
        .where(eq(subjects.status, 'active'))
        .orderBy(subjects.name);

      // Para cada disciplina, buscar as turmas vinculadas
      const subjectsWithClasses = await Promise.all(
        subjectsList.map(async (subject) => {
          const linkedClasses = await db
            .select({
              classId: classSubjects.classId,
              className: classes.name,
              classGrade: classes.grade,
              classSection: classes.section
            })
            .from(classSubjects)
            .innerJoin(classes, eq(classSubjects.classId, classes.id))
            .where(
              and(
                eq(classSubjects.subjectId, subject.id),
                eq(classSubjects.status, 'active')
              )
            );

          return {
            ...subject,
            linkedClasses: linkedClasses
          };
        })
      );

      console.log(`✅ Encontradas ${subjectsWithClasses.length} disciplinas`);
      res.json({ data: subjectsWithClasses });
    } catch (error) {
      console.error('Erro ao buscar disciplinas:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Criar disciplina (admin)
  app.post('/api/admin/subjects', isAuthenticated, hasRole(['admin']), async (req, res) => {
    try {
      const user = req.user;
      const { name, code, description, credits, workload, selectedClasses } = req.body;

      console.log(`➕ Criacao de disciplina solicitada por: ${user.firstName} ${user.lastName}`);
      console.log('📝 Dados da nova disciplina:', { name, code, description });

      // ValidacA�es basicas
      if (!name || name.trim() === '') {
        return res.status(400).json({ message: "Nome da disciplina e obrigatorio" });
      }
      
      if (!code || code.trim() === '') {
        return res.status(400).json({ message: "Codigo da disciplina e obrigatorio" });
      }

      // Verificar se codigo ja existe
      const existingSubject = await db
        .select()
        .from(subjects)
        .where(eq(subjects.code, code))
        .limit(1);

      if (existingSubject.length > 0) {
        return res.status(400).json({ message: "Codigo da disciplina ja esta em uso" });
      }

      // Criar disciplina
      const newSubject = {
        id: uuidv4(),
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description?.trim() || null,
        credits: credits || 1,
        workload: workload || 60,
        teacherId: null,
        status: 'active' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await db.insert(subjects).values(newSubject);

      console.log(`✅ Disciplina criada com sucesso: ${newSubject.id}`);
      console.log(`�"� Nome: ${newSubject.name}`);
      console.log(`�"� Codigo: ${newSubject.code}`);

      // Vincular disciplina �s turmas selecionadas
      if (selectedClasses && selectedClasses.length > 0) {
        console.log(`?? Vinculando disciplina �s turmas: ${selectedClasses.join(', ')}`);
        
        for (const classId of selectedClasses) {
          const classSubjectId = uuidv4();
          await db.insert(classSubjects).values({
            id: classSubjectId,
            classId: classId,
            subjectId: newSubject.id,
            teacherId: null, // Ser� vinculado quando um professor for atribu�do
            status: 'active',
            academicYear: '2025',
            semester: '1',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
          console.log(`[OK] V�nculo criado: Turma ${classId} - Disciplina ${newSubject.id}`);
        }
      }
      
      res.status(201).json({ 
        message: "Disciplina criada com sucesso",
        data: newSubject
      });
    } catch (error) {
      console.error('Erro ao criar disciplina:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // PUT /api/admin/subjects/:id - Editar disciplina
  app.put('/api/admin/subjects/:id', isAuthenticated, hasRole(['admin']), async (req, res) => {
    try {
      const user = req.user;
      const { id } = req.params;
      const { name, code, description, workload, status } = req.body;

      console.log(`✏️ Edicao de disciplina ${id} solicitada por: ${user.firstName} ${user.lastName}`);
      console.log('📝 Dados atualizados:', { name, code, description, workload });

      // ValidacA�es basicas
      if (!name || name.trim() === '') {
        return res.status(400).json({ message: "Nome da disciplina e obrigatorio" });
      }
      
      if (!code || code.trim() === '') {
        return res.status(400).json({ message: "Codigo da disciplina e obrigatorio" });
      }

      // Verificar se disciplina existe
      const existingSubject = await db
        .select()
        .from(subjects)
        .where(eq(subjects.id, id))
        .limit(1);

      if (existingSubject.length === 0) {
        return res.status(404).json({ message: "Disciplina nao encontrada" });
      }

      // Verificar se codigo ja existe em outra disciplina
      const codeConflict = await db
        .select()
        .from(subjects)
        .where(and(eq(subjects.code, code), ne(subjects.id, id)))
        .limit(1);

      if (codeConflict.length > 0) {
        return res.status(400).json({ message: "Codigo da disciplina ja esta em uso" });
      }

      // Atualizar disciplina
      const updatedSubject = {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description?.trim() || null,
        workload: workload || 60,
        status: status || 'active',
        updatedAt: new Date().toISOString()
      };

      await db
        .update(subjects)
        .set(updatedSubject)
        .where(eq(subjects.id, id));

      console.log(`✅ Disciplina ${id} atualizada com sucesso`);
      console.log(`📚 Nome: ${updatedSubject.name}`);
      console.log(`🔤 Codigo: ${updatedSubject.code}`);
      
      res.json({ 
        message: "Disciplina atualizada com sucesso",
        data: { id, ...updatedSubject }
      });
    } catch (error) {
      console.error('Erro ao atualizar disciplina:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Listar turmas para selecao (admin)
  app.get('/api/admin/classes', isAuthenticated, hasRole(['admin']), async (req, res) => {
    try {
      const user = req.user;
      console.log(`🏫 Listagem de turmas solicitada por: ${user.firstName} ${user.lastName}`);

      const classesList = await db
        .select({
          id: classes.id,
          name: classes.name,
          grade: classes.grade,
          section: classes.section,
          academicYear: classes.academicYear,
          status: classes.status,
          capacity: classes.capacity,
          currentStudents: classes.currentStudents,
          coordinatorId: classes.coordinatorId,
          createdAt: classes.createdAt,
          updatedAt: classes.updatedAt
        })
        .from(classes)
        .orderBy(classes.name);

      console.log(`✅ Encontradas ${classesList.length} turmas`);
      res.json({ data: classesList });
    } catch (error) {
      console.error('Erro ao buscar turmas:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Criar turma (admin)
  app.post('/api/admin/classes', isAuthenticated, hasRole(['admin']), async (req, res) => {
    try {
      const user = req.user;
      const { name, grade, section, academicYear, capacity, coordinatorId } = req.body;

      console.log(`➕ Criacao de turma solicitada por: ${user.firstName} ${user.lastName}`);
      console.log('📝 Dados da nova turma:', { name, grade, section, academicYear });

      // ValidacA�es basicas
      if (!name || name.trim() === '') {
        return res.status(400).json({ message: "Nome da turma e obrigatorio" });
      }
      
      if (!grade || grade.trim() === '') {
        return res.status(400).json({ message: "Serie/Ano e obrigatorio" });
      }
      
      if (!section || section.trim() === '') {
        return res.status(400).json({ message: "Secao e obrigatoria" });
      }
      
      if (!academicYear || academicYear.trim() === '') {
        return res.status(400).json({ message: "Ano letivo e obrigatorio" });
      }

      // Verificar se ja existe uma turma com o mesmo nome
      const existingClass = await db
        .select()
        .from(classes)
        .where(eq(classes.name, name.trim()))
        .limit(1);

      if (existingClass.length > 0) {
        return res.status(400).json({ message: "Ja existe uma turma com este nome" });
      }

      // Criar turma
      const newClass = {
        id: uuidv4(),
        name: name.trim(),
        grade: grade.trim(),
        section: section.trim(),
        academicYear: academicYear.trim(),
        capacity: capacity || 30,
        currentStudents: 0,
        coordinatorId: coordinatorId || null,
        status: 'active' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await db.insert(classes).values(newClass);

      console.log(`✅ Turma criada com sucesso: ${newClass.id}`);
      console.log(`🏫 Nome: ${newClass.name}`);
      console.log(`📚 Serie: ${newClass.grade} - Secao: ${newClass.section}`);
      console.log(`📅 Ano letivo: ${newClass.academicYear}`);
      
      res.status(201).json({ 
        message: "Turma criada com sucesso",
        data: newClass
      });
    } catch (error) {
      console.error('Erro ao criar turma:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // PUT /api/admin/classes/:id - Editar turma
  app.put('/api/admin/classes/:id', isAuthenticated, hasRole(['admin']), async (req, res) => {
    try {
      const user = req.user;
      const { id } = req.params;
      const { name, grade, section, academicYear, capacity, status } = req.body;

      console.log(`✏️ Edicao de turma ${id} solicitada por: ${user.firstName} ${user.lastName}`);
      console.log('📝 Dados atualizados:', { name, grade, section, academicYear, capacity });

      // ValidacA�es basicas
      if (!name || name.trim() === '') {
        return res.status(400).json({ message: "Nome da turma e obrigatorio" });
      }
      
      if (!grade || grade.trim() === '') {
        return res.status(400).json({ message: "Serie/Ano e obrigatorio" });
      }

      if (!section || section.trim() === '') {
        return res.status(400).json({ message: "Secao e obrigatoria" });
      }

      // Verificar se turma existe
      const existingClass = await db
        .select()
        .from(classes)
        .where(eq(classes.id, id))
        .limit(1);

      if (existingClass.length === 0) {
        return res.status(404).json({ message: "Turma nao encontrada" });
      }

      // Verificar se nome ja existe em outra turma
      const nameConflict = await db
        .select()
        .from(classes)
        .where(and(eq(classes.name, name), ne(classes.id, id)))
        .limit(1);

      if (nameConflict.length > 0) {
        return res.status(400).json({ message: "Nome da turma ja esta em uso" });
      }

      // Atualizar turma
      const updatedClass = {
        name: name.trim(),
        grade: grade.trim(),
        section: section.trim().toUpperCase(),
        academicYear: academicYear || '2024',
        capacity: capacity || 30,
        status: status || 'active',
        updatedAt: new Date().toISOString()
      };

      await db
        .update(classes)
        .set(updatedClass)
        .where(eq(classes.id, id));

      console.log(`✅ Turma ${id} atualizada com sucesso`);
      console.log(`🏫 Nome: ${updatedClass.name}`);
      console.log(`📚 Serie: ${updatedClass.grade} - Secao: ${updatedClass.section}`);
      
      res.json({ 
        message: "Turma atualizada com sucesso",
        data: { id, ...updatedClass }
      });
    } catch (error) {
      console.error('Erro ao atualizar turma:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Criar professor (admin)
  app.post('/api/admin/teachers', isAuthenticated, hasRole(['admin']), async (req, res) => {
    try {
      const user = req.user;
      const { firstName, lastName, email, phone, address, cpf, subjects: selectedSubjects, classes: selectedClasses } = req.body;

      console.log(`➕ Criacao de professor solicitada por: ${user.firstName} ${user.lastName}`);
      console.log('📝 Dados do novo professor:', { firstName, lastName, email });
      console.log('🔗 Disciplinas selecionadas:', selectedSubjects);
      console.log('🏫 Turmas selecionadas:', selectedClasses);

      // Gerar email padrao sempre com @escola.com
      let finalEmail;
      if (email && email !== '' && email.endsWith('@escola.com')) {
        // Email completo ja fornecido
        finalEmail = email;
      } else if (email && email !== '') {
        // Email parcial fornecido - usar apenas a parte antes do @ (se houver)
        const emailPart = email.split('@')[0];
        // Limpar caracteres especiais e espacos
        const cleanEmailPart = emailPart.replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase();
        finalEmail = `${cleanEmailPart}@escola.com`;
      } else {
        // Gerar email automatico
        const cleanFirstName = firstName.toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
        const cleanLastName = lastName.toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
        finalEmail = `${cleanFirstName}.${cleanLastName}@escola.com`;
      }
      
      // Verificar se email ja existe
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, finalEmail))
        .limit(1);

      if (existingUser.length > 0) {
        return res.status(400).json({ message: "Email ja esta em uso" });
      }

      // Gerar numero de matricula aleatorio e unico
      let finalRegistrationNumber;
      let attempts = 0;
      const maxAttempts = 10;
      
      do {
        const randomNumber = Math.floor(Math.random() * 900000) + 100000;
        finalRegistrationNumber = randomNumber.toString();
        
        const existingRegistration = await db
          .select()
          .from(users)
          .where(eq(users.registrationNumber, finalRegistrationNumber))
          .limit(1);
        
        if (existingRegistration.length === 0) {
          break;
        }
        
        attempts++;
      } while (attempts < maxAttempts);
      
      if (attempts >= maxAttempts) {
        return res.status(500).json({ message: "Erro ao gerar matricula unica. Tente novamente." });
      }

      // Hash da senha padrao
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.hash('123', 10);

      // Criar professor
      const newTeacher = {
        id: uuidv4(),
        firstName,
        lastName,
        email: finalEmail,
        password: hashedPassword,
        role: 'teacher',
        status: 'active',
        phone: phone || null,
        address: address || null,
        cpf: cpf || null,
        registrationNumber: finalRegistrationNumber,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await db.insert(users).values(newTeacher);

      // Vincular disciplinas e turmas automaticamente
      console.log(`🔍 Dados recebidos - subjects: ${JSON.stringify(selectedSubjects)}, classes: ${JSON.stringify(selectedClasses)}`);
      
      try {
        // Buscar todas as disciplinas e turmas disponiveis
        const allSubjectsData = await db.select().from(subjects);
        const allClassesData = await db.select().from(classes);
        
        console.log(`📚 Disciplinas disponiveis: ${allSubjectsData.length}`);
        console.log(`🏫 Turmas disponiveis: ${allClassesData.length}`);
        
        // Vincular A�s disciplinas e turmas selecionadas, ou usar as primeiras disponiveis
        const subjectsToLink = selectedSubjects && selectedSubjects.length > 0 ? selectedSubjects : [allSubjectsData[0]?.id].filter(Boolean);
        const classesToLink = selectedClasses && selectedClasses.length > 0 ? selectedClasses : [allClassesData[0]?.id].filter(Boolean);
        
        if (subjectsToLink.length > 0 && classesToLink.length > 0) {
          const firstSubject = allSubjectsData.find(s => s.id === subjectsToLink[0]) || allSubjectsData[0];
          const firstClass = allClassesData.find(c => c.id === classesToLink[0]) || allClassesData[0];
          
          console.log(`�"� Vinculando professor ${newTeacher.id} A  disciplina ${firstSubject.name} e turma ${firstClass.name}`);
          
          // Verificar se j� existe um v�nculo entre a turma e a disciplina
          const existingLink = await db
            .select()
            .from(classSubjects)
            .where(
              and(
                eq(classSubjects.classId, firstClass.id),
                eq(classSubjects.subjectId, firstSubject.id)
              )
            )
            .limit(1);

          if (existingLink.length > 0) {
            // Atualizar o v�nculo existente com o professor
            await db
              .update(classSubjects)
              .set({
                teacherId: newTeacher.id,
                updatedAt: new Date().toISOString()
              })
              .where(eq(classSubjects.id, existingLink[0].id));
            
            console.log(`✅ V�nculo existente atualizado com professor! ID: ${existingLink[0].id}`);
          } else {
            // Criar novo v�nculo
            const classSubjectId = uuidv4();
            await db.insert(classSubjects).values({
              id: classSubjectId,
              classId: firstClass.id,
              subjectId: firstSubject.id,
              teacherId: newTeacher.id,
              status: 'active',
              academicYear: '2025',
              semester: '1',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
            
            console.log(`✅ Novo v�nculo criado com sucesso! ID: ${classSubjectId}`);
          }
        } else {
          console.log(`⚠️ Nao ha disciplinas ou turmas disponiveis para vincular`);
        }
      } catch (linkError) {
        console.error(`❌ Erro ao criar vinculos:`, linkError);
        // Nao falhar a criacao do professor por causa dos vinculos
      }

      console.log(`✅ Professor criado com sucesso: ${newTeacher.id}`);
      console.log(`📧 Email: ${finalEmail}`);
      console.log(`🔑 Senha padrao: 123`);
      console.log(`🆔 Matricula: ${finalRegistrationNumber}`);
      
      res.status(201).json({ 
        message: "Professor criado com sucesso",
        data: { 
          id: newTeacher.id,
          email: finalEmail,
          registrationNumber: finalRegistrationNumber,
          defaultPassword: '123'
        }
      });
    } catch (error) {
      console.error('Erro ao criar professor:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // PUT /api/admin/teachers/:id - Editar professor
  app.put('/api/admin/teachers/:id', isAuthenticated, hasRole(['admin']), async (req, res) => {
    try {
      const user = req.user;
      const { id } = req.params;
      const { firstName, lastName, email, phone, address, status } = req.body;

      console.log(`✏️ Edicao de professor ${id} solicitada por: ${user.firstName} ${user.lastName}`);
      console.log('📝 Dados atualizados:', { firstName, lastName, email, phone });

      // ValidacA�es basicas
      if (!firstName || firstName.trim() === '') {
        return res.status(400).json({ message: "Nome e obrigatorio" });
      }
      
      if (!lastName || lastName.trim() === '') {
        return res.status(400).json({ message: "Sobrenome e obrigatorio" });
      }

      if (!email || email.trim() === '') {
        return res.status(400).json({ message: "Email e obrigatorio" });
      }

      // Verificar se professor existe
      const existingTeacher = await db
        .select()
        .from(teachers)
        .where(eq(teachers.id, id))
        .limit(1);

      if (existingTeacher.length === 0) {
        return res.status(404).json({ message: "Professor nao encontrado" });
      }

      // Processar email (mesma logica da criacao)
      let finalEmail;
      if (email && email !== '' && email.endsWith('@escola.com')) {
        finalEmail = email;
      } else if (email && email !== '') {
        const emailPart = email.split('@')[0];
        const cleanEmailPart = emailPart.replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase();
        finalEmail = `${cleanEmailPart}@escola.com`;
      } else {
        const cleanFirstName = firstName.toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
        const cleanLastName = lastName.toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
        finalEmail = `${cleanFirstName}.${cleanLastName}@escola.com`;
      }

      // Verificar se email ja existe em outro professor
      const emailConflict = await db
        .select()
        .from(teachers)
        .where(and(eq(teachers.email, finalEmail), ne(teachers.id, id)))
        .limit(1);

      if (emailConflict.length > 0) {
        return res.status(400).json({ message: "Email ja esta em uso" });
      }

      // Atualizar professor
      const updatedTeacher = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: finalEmail,
        phone: phone?.trim() || null,
        address: address?.trim() || null,
        status: status || 'active',
        updatedAt: new Date().toISOString()
      };

      await db
        .update(teachers)
        .set(updatedTeacher)
        .where(eq(teachers.id, id));

      console.log(`✅ Professor ${id} atualizado com sucesso`);
      console.log(`📧 Email: ${finalEmail}`);
      
      res.json({ 
        message: "Professor atualizado com sucesso",
        data: { id, ...updatedTeacher }
      });
    } catch (error) {
      console.error('Erro ao atualizar professor:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // === ROTAS DE MATERIAIS DIDATICOS === (TEMPORARIAMENTE COMENTADAS)
  // Listar materiais do professor
  app.get('/api/materials/teacher/:teacherId', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const { teacherId } = req.params;
      const user = req.user as any;

      // Verificar se o professor pode acessar
      if (user.role !== 'teacher' || user.id !== teacherId) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      console.log(`Buscando materiais do professor: ${teacherId}`);

      const materialsData = await db
        .select({
          id: materials.id,
          title: materials.title,
          description: materials.description,
          materialType: materials.materialType,
          content: materials.content,
          isPublic: materials.isPublic,
          status: materials.status,
          createdAt: materials.createdAt,
          updatedAt: materials.updatedAt,
          subjectName: subjects.name,
          className: classes.name,
          filesCount: count(materialFiles.id)
        })
        .from(materials)
        .leftJoin(subjects, eq(materials.subjectId, subjects.id))
        .leftJoin(classes, eq(materials.classId, classes.id))
        .leftJoin(materialFiles, eq(materials.id, materialFiles.materialId))
        .where(eq(materials.teacherId, teacherId))
        .groupBy(materials.id)
        .orderBy(desc(materials.createdAt));

      console.log(`Encontrados ${materialsData.length} materiais do professor`);

      res.json(materialsData);
    } catch (error) {
      console.error('Erro ao buscar materiais do professor:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Listar materiais para aluno (por disciplina)
  app.get('/api/materials/student', isAuthenticated, hasRole(['student']), async (req, res) => {
    try {
      const user = req.user as any;
      const { subjectId } = req.query;

      console.log(`Buscando materiais para aluno: ${user.firstName} ${user.lastName}`);

      // Buscar disciplinas do aluno
      const studentSubjects = await db
        .select({
          subjectId: subjects.id,
          subjectName: subjects.name,
          className: classes.name
        })
        .from(studentClass)
        .innerJoin(classes, eq(studentClass.classId, classes.id))
        .innerJoin(classSubjects, eq(classes.id, classSubjects.classId))
        .innerJoin(subjects, eq(classSubjects.subjectId, subjects.id))
        .where(eq(studentClass.studentId, user.id));

      if (studentSubjects.length === 0) {
        return res.json([]);
      }

      const subjectIds = studentSubjects.map(s => s.subjectId);

      // Buscar materiais das disciplinas do aluno
      let query = db
        .select({
          id: materials.id,
          title: materials.title,
          description: materials.description,
          materialType: materials.materialType,
          content: materials.content,
          isPublic: materials.isPublic,
          createdAt: materials.createdAt,
          subjectName: subjects.name,
          className: classes.name,
          filesCount: count(materialFiles.id)
        })
        .from(materials)
        .leftJoin(subjects, eq(materials.subjectId, subjects.id))
        .leftJoin(classes, eq(materials.classId, classes.id))
        .leftJoin(materialFiles, eq(materials.id, materialFiles.materialId))
        .where(
          and(
            inArray(materials.subjectId, subjectIds),
            eq(materials.isPublic, true),
            eq(materials.status, 'active')
          )
        )
        .groupBy(materials.id)
        .orderBy(desc(materials.createdAt));

      // Filtrar por disciplina especifica se fornecida
      if (subjectId) {
        query = query.where(
          and(
            eq(materials.subjectId, subjectId as string),
            eq(materials.isPublic, true),
            eq(materials.status, 'active')
          )
        );
      }

      const materialsData = await query;

      console.log(`Encontrados ${materialsData.length} materiais para o aluno`);

      res.json(materialsData);
    } catch (error) {
      console.error('Erro ao buscar materiais do aluno:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Criar novo material
  app.post('/api/materials', isAuthenticated, hasRole(['teacher']), upload.array('files', 5), async (req, res) => {
    try {
      const user = req.user as any;
      const { title, description, subjectId, classId, materialType, content, isPublic } = req.body;
      const files = req.files as Express.Multer.File[];

      console.log(`Criando novo material: ${title}`);

      const materialId = uuidv4();
      const now = new Date().toISOString();

      // Criar material
      const newMaterial = {
        id: materialId,
        title: title.trim(),
        description: description?.trim() || null,
        subjectId,
        classId,
        teacherId: user.id,
        materialType,
        content: content?.trim() || null,
        isPublic: isPublic === 'true' || isPublic === true,
        status: 'active',
        createdAt: now,
        updatedAt: now
      };

      await db.insert(materials).values(newMaterial);

      // Processar arquivos se houver
      if (files && files.length > 0) {
        const fileRecords = files.map(file => ({
          id: uuidv4(),
          materialId,
          fileName: file.filename,
          originalFileName: file.originalname,
          filePath: file.path,
          fileSize: file.size,
          fileType: file.mimetype,
          fileCategory: 'main',
          uploadedBy: user.id,
          createdAt: now
        }));

        await db.insert(materialFiles).values(fileRecords);
        console.log(`${files.length} arquivo(s) processado(s) para o material`);
      }

      console.log(`Material criado com sucesso: ${title}`);

      res.status(201).json({
        message: "Material criado com sucesso",
        data: newMaterial
      });
    } catch (error) {
      console.error('Erro ao criar material:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Buscar material especifico
  app.get('/api/materials/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user as any;

      console.log(`Buscando material: ${id}`);

      const materialData = await db
        .select({
          id: materials.id,
          title: materials.title,
          description: materials.description,
          materialType: materials.materialType,
          content: materials.content,
          isPublic: materials.isPublic,
          status: materials.status,
          createdAt: materials.createdAt,
          updatedAt: materials.updatedAt,
          subjectName: subjects.name,
          className: classes.name,
          teacherName: sql`${users.firstName} || ' ' || ${users.lastName}`.as('teacherName')
        })
        .from(materials)
        .leftJoin(subjects, eq(materials.subjectId, subjects.id))
        .leftJoin(classes, eq(materials.classId, classes.id))
        .leftJoin(users, eq(materials.teacherId, users.id))
        .where(eq(materials.id, id))
        .limit(1);

      if (materialData.length === 0) {
        return res.status(404).json({ message: "Material nao encontrado" });
      }

      const material = materialData[0];

      // Verificar permissA�es
      if (user.role === 'student') {
        if (!material.isPublic || material.status !== 'active') {
          return res.status(403).json({ message: "Acesso negado" });
        }
      } else if (user.role === 'teacher' && material.teacherId !== user.id) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      // Buscar arquivos do material
      const materialFilesData = await db
        .select()
        .from(materialFiles)
        .where(eq(materialFiles.materialId, id));

      console.log(`Material encontrado: ${material.title}`);
      console.log(`${materialFilesData.length} arquivo(s) encontrado(s)`);

      res.json({
        ...material,
        files: materialFilesData
      });
    } catch (error) {
      console.error('Erro ao buscar material:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Download de arquivo de material
  app.get('/api/materials/files/:fileId/download', isAuthenticated, async (req, res) => {
    try {
      const { fileId } = req.params;
      const user = req.user as any;

      console.log(`BAIXANDO ARQUIVO DE MATERIAL`);
      console.log(`File ID: ${fileId}`);

      const file = await db
        .select()
        .from(materialFiles)
        .where(eq(materialFiles.id, fileId))
        .limit(1);

      if (file.length === 0) {
        console.log('❌ Arquivo nao encontrado');
        return res.status(404).json({ message: "Arquivo nao encontrado" });
      }

      const materialFile = file[0];
      console.log('✅ Arquivo encontrado:', materialFile.originalFileName);

      // Verificar se o arquivo existe no disco
      const filePath = path.resolve(materialFile.filePath);
      if (!fs.existsSync(filePath)) {
        console.log('❌ Arquivo nao encontrado no disco:', filePath);
        return res.status(404).json({ message: "Arquivo nao encontrado no servidor" });
      }

      // Enviar arquivo para download
      res.setHeader('Content-Disposition', `attachment; filename="${materialFile.originalFileName}"`);
      res.setHeader('Content-Type', materialFile.fileType);

      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);

    } catch (error) {
      console.error('❌ Erro ao baixar arquivo de material:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Visualizar arquivo de material
  app.get('/api/materials/files/:fileId/view', isAuthenticated, async (req, res) => {
    try {
      const { fileId } = req.params;
      const user = req.user as any;

      console.log(`VISUALIZANDO ARQUIVO DE MATERIAL`);
      console.log(`File ID: ${fileId}`);

      const file = await db
        .select()
        .from(materialFiles)
        .where(eq(materialFiles.id, fileId))
        .limit(1);

      if (file.length === 0) {
        console.log('❌ Arquivo nao encontrado');
        return res.status(404).json({ message: "Arquivo nao encontrado" });
      }

      const materialFile = file[0];
      console.log('✅ Arquivo encontrado:', materialFile.originalFileName);

      // Verificar se o arquivo existe no disco
      const filePath = path.resolve(materialFile.filePath);
      if (!fs.existsSync(filePath)) {
        console.log('❌ Arquivo nao encontrado no disco:', filePath);
        return res.status(404).json({ message: "Arquivo nao encontrado no servidor" });
      }

      // Definir Content-Type baseado na extensao do arquivo
      const fileExtension = path.extname(materialFile.originalFileName).toLowerCase();
      let contentType = materialFile.fileType;

      // Mapear extensA�es para Content-Types corretos
      const mimeTypes = {
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.txt': 'text/plain',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif'
      };

      if (mimeTypes[fileExtension]) {
        contentType = mimeTypes[fileExtension];
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `inline; filename="${materialFile.originalFileName}"');

      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);

    } catch (error) {
      console.error('Erro ao visualizar arquivo de material:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Deletar material
  app.delete('/api/materials/:id', isAuthenticated, hasRole(['teacher']), async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user as any;

      console.log('Deletando material:', id);

      // Verificar se o material existe e pertence ao professor
      const material = await db
        .select()
        .from(materials)
        .where(and(eq(materials.id, id), eq(materials.teacherId, user.id)))
        .limit(1);

      if (material.length === 0) {
        return res.status(404).json({ message: "Material nao encontrado" });
      }

      // Buscar arquivos do material
      const materialFilesData = await db
        .select()
        .from(materialFiles)
        .where(eq(materialFiles.materialId, id));

      // Deletar arquivos fisicos
      for (const file of materialFilesData) {
        try {
          const filePath = path.resolve(file.filePath);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log('Arquivo fisico deletado:', file.originalFileName);
          }
        } catch (error) {
          console.log('Erro ao deletar arquivo fisico:', file.originalFileName);
        }
      }

      // Deletar registros do banco
      await db.delete(materialFiles).where(eq(materialFiles.materialId, id));
      await db.delete(materials).where(eq(materials.id, id));

      console.log('Material deletado com sucesso:', material[0].title);

      res.json({ message: "Material deletado com sucesso" });
    } catch (error) {
      console.error('Erro ao deletar material:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  console.log("Rotas de materiais didaticos registradas!");

  // GET /api/admin/classes/:id/details - Buscar detalhes completos de uma turma
  app.get('/api/admin/classes/:id/details', isAuthenticated, hasRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user;
      console.log("Detalhes da turma " + id + " solicitados por: " + user.firstName + " " + user.lastName);

      // Buscar informa��es b�sicas da turma
      const classInfo = await db
        .select()
        .from(classes)
        .where(eq(classes.id, id))
        .limit(1);

      if (classInfo.length === 0) {
        return res.status(404).json({ message: "Turma n�o encontrada" });
      }

      const turma = classInfo[0];

      // Buscar disciplinas vinculadas � turma
      console.log("Buscando disciplinas para turma " + id + "...");
      
      const subjectsLinked = await db
        .select({
          id: subjects.id,
          name: subjects.name,
          code: subjects.code,
          description: subjects.description,
          workload: subjects.workload,
          teacherId: classSubjects.teacherId,
          teacherName: users.firstName,
          teacherLastName: users.lastName,
          teacherEmail: users.email,
          status: classSubjects.status,
          academicYear: classSubjects.academicYear,
          semester: classSubjects.semester
        })
        .from(classSubjects)
        .innerJoin(subjects, eq(classSubjects.subjectId, subjects.id))
        .leftJoin(users, eq(classSubjects.teacherId, users.id))
        .where(
          and(
            eq(classSubjects.classId, id),
            eq(classSubjects.status, 'active')
          )
        );

      console.log("Disciplinas encontradas: " + subjectsLinked.length);
      subjectsLinked.forEach((subject, index) => {
        console.log("  " + (index + 1) + ". " + subject.name + " (" + subject.code + ") - Prof: " + (subject.teacherName || 'N/A'));
      });

      // Buscar alunos da turma
      const students = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          enrollmentDate: studentClass.enrollmentDate,
          status: studentClass.status
        })
        .from(studentClass)
        .innerJoin(users, eq(studentClass.studentId, users.id))
        .where(
          and(
            eq(studentClass.classId, id),
            eq(studentClass.status, 'active')
          )
        );

      // Calcular estat�sticas
      const totalWorkload = subjectsLinked.reduce((sum, subject) => sum + (subject.workload || 0), 0);
      const uniqueTeachers = new Set(subjectsLinked.filter(s => s.teacherId).map(s => s.teacherId));

      const details = {
        class: turma,
        subjects: subjectsLinked,
        students: students,
        statistics: {
          totalSubjects: subjectsLinked.length,
          totalTeachers: uniqueTeachers.size,
          totalStudents: students.length,
          totalWorkload: totalWorkload
        }
      };

      console.log("[OK] Detalhes encontrados: " + subjectsLinked.length + " disciplinas, " + uniqueTeachers.size + " professores, " + students.length + " alunos");
      res.json({ data: details });
    } catch (error) {
      console.error('Erro ao buscar detalhes da turma:', error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
