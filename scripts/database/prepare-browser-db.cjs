const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt");
const Database = require("better-sqlite3");

const projectRoot = path.resolve(__dirname, "..", "..");
const sourceDbPath = process.env.SCHOOLMANAGER_SOURCE_DB_PATH
  ? path.resolve(projectRoot, process.env.SCHOOLMANAGER_SOURCE_DB_PATH)
  : path.resolve(projectRoot, "..", "SchoolManager", "school.db");
const targetDbPath = process.env.SCHOOLMANAGER_TARGET_DB_PATH
  ? path.resolve(projectRoot, process.env.SCHOOLMANAGER_TARGET_DB_PATH)
  : path.resolve(projectRoot, "server", "school.db");
const overwriteTarget =
  String(process.env.SCHOOLMANAGER_OVERWRITE_TARGET_DB || "").toLowerCase() === "true";
const resetToDemo =
  String(process.env.SCHOOLMANAGER_RESET_TO_DEMO || "").toLowerCase() === "true";

function checkpointIfPossible(dbPath) {
  let sourceDb;

  try {
    sourceDb = new Database(dbPath);
    sourceDb.pragma("wal_checkpoint(TRUNCATE)");
  } catch (error) {
    console.warn(`NÃ£o foi possÃ­vel consolidar WAL do banco ${dbPath}: ${error.message}`);
  } finally {
    if (sourceDb) {
      sourceDb.close();
    }
  }
}

if (!fs.existsSync(sourceDbPath)) {
  throw new Error(`Banco base não encontrado em ${sourceDbPath}`);
}

if (!fs.existsSync(path.dirname(targetDbPath))) {
  fs.mkdirSync(path.dirname(targetDbPath), { recursive: true });
}

if (overwriteTarget && fs.existsSync(targetDbPath)) {
  fs.rmSync(targetDbPath, { force: true });
}

if (!fs.existsSync(targetDbPath)) {
  checkpointIfPossible(sourceDbPath);
  fs.copyFileSync(sourceDbPath, targetDbPath);
  console.log(`Banco base copiado para ${targetDbPath}`);
} else {
  console.log(`Banco local existente mantido em ${targetDbPath}`);
}

const db = new Database(targetDbPath);
const now = new Date().toISOString();
const passwordHash = bcrypt.hashSync("123", 10);

function hasColumn(tableName, columnName) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  return columns.some((column) => String(column.name).toLowerCase() === columnName.toLowerCase());
}

function ensureColumn(tableName, columnName, sqlType) {
  if (!hasColumn(tableName, columnName)) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${sqlType}`);
  }
}

function clearAllAppData() {
  const tables = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    )
    .all()
    .map((row) => row.name)
    .filter((tableName) => tableName !== "sqlite_sequence");

  db.exec("PRAGMA foreign_keys = OFF");

  const clearTransaction = db.transaction(() => {
    for (const tableName of tables) {
      db.prepare(`DELETE FROM \"${tableName}\"`).run();
    }
  });

  clearTransaction();
  db.exec("PRAGMA foreign_keys = ON");
}

db.exec(`
  CREATE TABLE IF NOT EXISTS classSchedule (
    id TEXT PRIMARY KEY NOT NULL,
    classId TEXT NOT NULL,
    day TEXT NOT NULL,
    startTime TEXT NOT NULL,
    endTime TEXT NOT NULL,
    subjectId TEXT,
    teacherId TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );
`);

ensureColumn("users", "birthDate", "TEXT");
ensureColumn("events", "isGlobal", "INTEGER DEFAULT 0");
ensureColumn("notifications", "userId", "TEXT");
ensureColumn("notifications", "data", "TEXT");
ensureColumn("systemLogs", "locationCity", "TEXT");
ensureColumn("systemLogs", "locationRegion", "TEXT");
ensureColumn("systemLogs", "locationCountry", "TEXT");
ensureColumn("systemLogs", "latitude", "REAL");
ensureColumn("systemLogs", "longitude", "REAL");
ensureColumn("systemLogs", "timezone", "TEXT");
ensureColumn("systemLogs", "deviceType", "TEXT");
ensureColumn("systemLogs", "os", "TEXT");
ensureColumn("systemLogs", "osVersion", "TEXT");
ensureColumn("systemLogs", "browser", "TEXT");
ensureColumn("systemLogs", "browserVersion", "TEXT");

const getUserByEmail = db.prepare(
  "SELECT id, email, role, status FROM users WHERE email = ? LIMIT 1",
);

const updateUser = db.prepare(`
  UPDATE users
  SET password = @password,
      role = @role,
      status = @status,
      firstName = @firstName,
      lastName = @lastName,
      updatedAt = @updatedAt
  WHERE email = @email
`);

const insertUser = db.prepare(`
  INSERT INTO users (
    id, email, password, firstName, lastName, role, status,
    registrationNumber, createdAt, updatedAt
  ) VALUES (
    @id, @email, @password, @firstName, @lastName, @role, @status,
    @registrationNumber, @createdAt, @updatedAt
  )
`);

function ensureUser(user) {
  const existing = getUserByEmail.get(user.email);

  if (existing) {
    updateUser.run({
      email: user.email,
      password: passwordHash,
      role: user.role,
      status: user.status,
      firstName: user.firstName,
      lastName: user.lastName,
      updatedAt: now,
    });
    return { ...existing, id: existing.id };
  }

  insertUser.run({
    id: user.id,
    email: user.email,
    password: passwordHash,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    status: user.status,
    registrationNumber: user.registrationNumber,
    createdAt: now,
    updatedAt: now,
  });

  return { id: user.id, email: user.email, role: user.role, status: user.status };
}

const upsertSetting = db.prepare(`
  INSERT INTO settings (id, key, value, description, category, updatedBy, createdAt, updatedAt)
  VALUES (@id, @key, @value, @description, @category, @updatedBy, @createdAt, @updatedAt)
  ON CONFLICT(key) DO UPDATE SET
    value = excluded.value,
    description = excluded.description,
    category = excluded.category,
    updatedBy = excluded.updatedBy,
    updatedAt = excluded.updatedAt
`);

const upsertClass = db.prepare(`
  INSERT INTO classes (
    id, name, grade, section, academicYear, capacity, currentStudents,
    coordinatorId, status, createdAt, updatedAt
  ) VALUES (
    @id, @name, @grade, @section, @academicYear, @capacity, @currentStudents,
    @coordinatorId, @status, @createdAt, @updatedAt
  )
  ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    grade = excluded.grade,
    section = excluded.section,
    academicYear = excluded.academicYear,
    capacity = excluded.capacity,
    currentStudents = excluded.currentStudents,
    coordinatorId = excluded.coordinatorId,
    status = excluded.status,
    updatedAt = excluded.updatedAt
`);

const upsertSubject = db.prepare(`
  INSERT INTO subjects (
    id, name, code, description, credits, workload, teacherId, status, createdAt, updatedAt
  ) VALUES (
    @id, @name, @code, @description, @credits, @workload, @teacherId, @status, @createdAt, @updatedAt
  )
  ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    code = excluded.code,
    description = excluded.description,
    credits = excluded.credits,
    workload = excluded.workload,
    teacherId = excluded.teacherId,
    status = excluded.status,
    updatedAt = excluded.updatedAt
`);

const upsertClassSubject = db.prepare(`
  INSERT INTO classSubjects (
    id, classId, subjectId, teacherId, schedule, room, semester, academicYear, status, createdAt, updatedAt
  ) VALUES (
    @id, @classId, @subjectId, @teacherId, @schedule, @room, @semester, @academicYear, @status, @createdAt, @updatedAt
  )
  ON CONFLICT(id) DO UPDATE SET
    classId = excluded.classId,
    subjectId = excluded.subjectId,
    teacherId = excluded.teacherId,
    schedule = excluded.schedule,
    room = excluded.room,
    semester = excluded.semester,
    academicYear = excluded.academicYear,
    status = excluded.status,
    updatedAt = excluded.updatedAt
`);

const upsertEnrollment = db.prepare(`
  INSERT INTO studentClass (
    id, studentId, classId, enrollmentDate, status, createdAt, updatedAt
  ) VALUES (
    @id, @studentId, @classId, @enrollmentDate, @status, @createdAt, @updatedAt
  )
  ON CONFLICT(id) DO UPDATE SET
    studentId = excluded.studentId,
    classId = excluded.classId,
    enrollmentDate = excluded.enrollmentDate,
    status = excluded.status,
    updatedAt = excluded.updatedAt
`);

const upsertGrade = db.prepare(`
  INSERT INTO grades (
    id, studentId, classSubjectId, type, title, grade, maxGrade, weight,
    date, comments, createdBy, createdAt, updatedAt
  ) VALUES (
    @id, @studentId, @classSubjectId, @type, @title, @grade, @maxGrade, @weight,
    @date, @comments, @createdBy, @createdAt, @updatedAt
  )
  ON CONFLICT(id) DO UPDATE SET
    studentId = excluded.studentId,
    classSubjectId = excluded.classSubjectId,
    type = excluded.type,
    title = excluded.title,
    grade = excluded.grade,
    maxGrade = excluded.maxGrade,
    weight = excluded.weight,
    date = excluded.date,
    comments = excluded.comments,
    createdBy = excluded.createdBy,
    updatedAt = excluded.updatedAt
`);

const upsertAttendance = db.prepare(`
  INSERT INTO attendance (
    id, studentId, classId, subjectId, teacherId, date, status, notes, createdAt, updatedAt
  ) VALUES (
    @id, @studentId, @classId, @subjectId, @teacherId, @date, @status, @notes, @createdAt, @updatedAt
  )
  ON CONFLICT(id) DO UPDATE SET
    studentId = excluded.studentId,
    classId = excluded.classId,
    subjectId = excluded.subjectId,
    teacherId = excluded.teacherId,
    date = excluded.date,
    status = excluded.status,
    notes = excluded.notes,
    updatedAt = excluded.updatedAt
`);

const upsertActivity = db.prepare(`
  INSERT INTO activities (
    id, title, description, subjectId, teacherId, classId, dueDate, maxGrade,
    instructions, requirements, status, allowLateSubmission, latePenalty,
    maxFileSize, allowedFileTypes, approvedByCoordinator, coordinatorApprovalDate,
    coordinatorId, createdAt, updatedAt
  ) VALUES (
    @id, @title, @description, @subjectId, @teacherId, @classId, @dueDate, @maxGrade,
    @instructions, @requirements, @status, @allowLateSubmission, @latePenalty,
    @maxFileSize, @allowedFileTypes, @approvedByCoordinator, @coordinatorApprovalDate,
    @coordinatorId, @createdAt, @updatedAt
  )
  ON CONFLICT(id) DO UPDATE SET
    title = excluded.title,
    description = excluded.description,
    subjectId = excluded.subjectId,
    teacherId = excluded.teacherId,
    classId = excluded.classId,
    dueDate = excluded.dueDate,
    maxGrade = excluded.maxGrade,
    instructions = excluded.instructions,
    requirements = excluded.requirements,
    status = excluded.status,
    allowLateSubmission = excluded.allowLateSubmission,
    latePenalty = excluded.latePenalty,
    maxFileSize = excluded.maxFileSize,
    allowedFileTypes = excluded.allowedFileTypes,
    approvedByCoordinator = excluded.approvedByCoordinator,
    coordinatorApprovalDate = excluded.coordinatorApprovalDate,
    coordinatorId = excluded.coordinatorId,
    updatedAt = excluded.updatedAt
`);

const upsertSubmission = db.prepare(`
  INSERT INTO activitySubmissions (
    id, activityId, studentId, submittedAt, comment, status, grade, maxGrade,
    feedback, gradedBy, gradedAt, isLate, latePenaltyApplied, finalGrade, createdAt, updatedAt
  ) VALUES (
    @id, @activityId, @studentId, @submittedAt, @comment, @status, @grade, @maxGrade,
    @feedback, @gradedBy, @gradedAt, @isLate, @latePenaltyApplied, @finalGrade, @createdAt, @updatedAt
  )
  ON CONFLICT(id) DO UPDATE SET
    activityId = excluded.activityId,
    studentId = excluded.studentId,
    submittedAt = excluded.submittedAt,
    comment = excluded.comment,
    status = excluded.status,
    grade = excluded.grade,
    maxGrade = excluded.maxGrade,
    feedback = excluded.feedback,
    gradedBy = excluded.gradedBy,
    gradedAt = excluded.gradedAt,
    isLate = excluded.isLate,
    latePenaltyApplied = excluded.latePenaltyApplied,
    finalGrade = excluded.finalGrade,
    updatedAt = excluded.updatedAt
`);

const upsertEvent = db.prepare(`
  INSERT INTO events (
    id, title, description, type, startDate, endDate, location, color,
    classId, subjectId, createdBy, status, createdAt, updatedAt, startTime, endTime
  ) VALUES (
    @id, @title, @description, @type, @startDate, @endDate, @location, @color,
    @classId, @subjectId, @createdBy, @status, @createdAt, @updatedAt, @startTime, @endTime
  )
  ON CONFLICT(id) DO UPDATE SET
    title = excluded.title,
    description = excluded.description,
    type = excluded.type,
    startDate = excluded.startDate,
    endDate = excluded.endDate,
    location = excluded.location,
    color = excluded.color,
    classId = excluded.classId,
    subjectId = excluded.subjectId,
    createdBy = excluded.createdBy,
    status = excluded.status,
    startTime = excluded.startTime,
    endTime = excluded.endTime,
    updatedAt = excluded.updatedAt
`);

const upsertNotification = db.prepare(`
  INSERT INTO notifications (
    id, title, message, type, priority, senderId, recipientId, classId,
    subjectId, read, createdAt, updatedAt
  ) VALUES (
    @id, @title, @message, @type, @priority, @senderId, @recipientId, @classId,
    @subjectId, @read, @createdAt, @updatedAt
  )
  ON CONFLICT(id) DO UPDATE SET
    title = excluded.title,
    message = excluded.message,
    type = excluded.type,
    priority = excluded.priority,
    senderId = excluded.senderId,
    recipientId = excluded.recipientId,
    classId = excluded.classId,
    subjectId = excluded.subjectId,
    read = excluded.read,
    updatedAt = excluded.updatedAt
`);

const upsertPeriod = db.prepare(`
  INSERT INTO academicPeriods (
    id, name, description, period, academicYear, startDate, endDate, status,
    isCurrent, totalDays, remainingDays, createdBy, createdAt, updatedAt
  ) VALUES (
    @id, @name, @description, @period, @academicYear, @startDate, @endDate, @status,
    @isCurrent, @totalDays, @remainingDays, @createdBy, @createdAt, @updatedAt
  )
  ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    description = excluded.description,
    period = excluded.period,
    academicYear = excluded.academicYear,
    startDate = excluded.startDate,
    endDate = excluded.endDate,
    status = excluded.status,
    isCurrent = excluded.isCurrent,
    totalDays = excluded.totalDays,
    remainingDays = excluded.remainingDays,
    createdBy = excluded.createdBy,
    updatedAt = excluded.updatedAt
`);

const upsertSchedule = db.prepare(`
  INSERT INTO classSchedule (
    id, classId, day, startTime, endTime, subjectId, teacherId, createdAt, updatedAt
  ) VALUES (
    @id, @classId, @day, @startTime, @endTime, @subjectId, @teacherId, @createdAt, @updatedAt
  )
  ON CONFLICT(id) DO UPDATE SET
    classId = excluded.classId,
    day = excluded.day,
    startTime = excluded.startTime,
    endTime = excluded.endTime,
    subjectId = excluded.subjectId,
    teacherId = excluded.teacherId,
    updatedAt = excluded.updatedAt
`);

const upsertExam = db.prepare(`
  INSERT INTO exams (
    id, title, description, subjectId, classId, teacherId, examDate, duration,
    totalPoints, semester, bimonthly, status, createdAt, updatedAt
  ) VALUES (
    @id, @title, @description, @subjectId, @classId, @teacherId, @examDate, @duration,
    @totalPoints, @semester, @bimonthly, @status, @createdAt, @updatedAt
  )
  ON CONFLICT(id) DO UPDATE SET
    title = excluded.title,
    description = excluded.description,
    subjectId = excluded.subjectId,
    classId = excluded.classId,
    teacherId = excluded.teacherId,
    examDate = excluded.examDate,
    duration = excluded.duration,
    totalPoints = excluded.totalPoints,
    semester = excluded.semester,
    bimonthly = excluded.bimonthly,
    status = excluded.status,
    updatedAt = excluded.updatedAt
`);

const upsertExamGrade = db.prepare(`
  INSERT INTO examGrades (
    id, examId, studentId, grade, isPresent, observations, gradedBy, gradedAt, createdAt, updatedAt
  ) VALUES (
    @id, @examId, @studentId, @grade, @isPresent, @observations, @gradedBy, @gradedAt, @createdAt, @updatedAt
  )
  ON CONFLICT(id) DO UPDATE SET
    examId = excluded.examId,
    studentId = excluded.studentId,
    grade = excluded.grade,
    isPresent = excluded.isPresent,
    observations = excluded.observations,
    gradedBy = excluded.gradedBy,
    gradedAt = excluded.gradedAt,
    updatedAt = excluded.updatedAt
`);

const upsertMaterial = db.prepare(`
  INSERT INTO materials (
    id, title, description, subjectId, classId, teacherId, materialType,
    content, isPublic, status, createdAt, updatedAt, folder
  ) VALUES (
    @id, @title, @description, @subjectId, @classId, @teacherId, @materialType,
    @content, @isPublic, @status, @createdAt, @updatedAt, @folder
  )
  ON CONFLICT(id) DO UPDATE SET
    title = excluded.title,
    description = excluded.description,
    subjectId = excluded.subjectId,
    classId = excluded.classId,
    teacherId = excluded.teacherId,
    materialType = excluded.materialType,
    content = excluded.content,
    isPublic = excluded.isPublic,
    status = excluded.status,
    folder = excluded.folder,
    updatedAt = excluded.updatedAt
`);

const upsertMessage = db.prepare(`
  INSERT INTO messages (
    id, conversationId, senderId, recipientId, content, createdAt
  ) VALUES (
    @id, @conversationId, @senderId, @recipientId, @content, @createdAt
  )
  ON CONFLICT(id) DO UPDATE SET
    conversationId = excluded.conversationId,
    senderId = excluded.senderId,
    recipientId = excluded.recipientId,
    content = excluded.content,
    createdAt = excluded.createdAt
`);

if (resetToDemo) {
  clearAllAppData();
}

const ensureData = db.transaction(() => {
  const admin = ensureUser({
    id: "browser_demo_admin",
    email: "admin@escola.com",
    firstName: "Admin",
    lastName: "Sistema",
    role: "admin",
    status: "active",
    registrationNumber: "ADM001",
  });
  const director = ensureUser({
    id: "browser_demo_director",
    email: "diretor@escola.com",
    firstName: "Diretor",
    lastName: "Executivo",
    role: "director",
    status: "active",
    registrationNumber: "DIR001",
  });
  const coordinator = ensureUser({
    id: "browser_demo_coord",
    email: "coord@escola.com",
    firstName: "Coordenador",
    lastName: "Pedagógico",
    role: "coordinator",
    status: "active",
    registrationNumber: "COORD001",
  });
  const teacher = ensureUser({
    id: "browser_demo_teacher",
    email: "prof@escola.com",
    firstName: "Professor",
    lastName: "Titular",
    role: "teacher",
    status: "active",
    registrationNumber: "PROF001",
  });
  const student = ensureUser({
    id: "browser_demo_student",
    email: "aluno@escola.com",
    firstName: "Aluno",
    lastName: "Demo",
    role: "student",
    status: "active",
    registrationNumber: "ALU001",
  });

  upsertSetting.run({
    id: "browser_demo_setting_master_admin",
    key: "masterAdminId",
    value: admin.id,
    description: "Administrador mestre para ambiente local no navegador",
    category: "security",
    updatedBy: admin.id,
    createdAt: now,
    updatedAt: now,
  });

  upsertClass.run({
    id: "browser_demo_class_9a",
    name: "9º Ano A",
    grade: "9º Ano",
    section: "A",
    academicYear: "2026",
    capacity: 30,
    currentStudents: 1,
    coordinatorId: coordinator.id,
    status: "active",
    createdAt: now,
    updatedAt: now,
  });

  upsertSubject.run({
    id: "browser_demo_subject_math",
    name: "Matemática",
    code: "BRW-MAT",
    description: "Disciplina demo para navegação local",
    credits: 4,
    workload: 80,
    teacherId: teacher.id,
    status: "active",
    createdAt: now,
    updatedAt: now,
  });
  upsertSubject.run({
    id: "browser_demo_subject_port",
    name: "Português",
    code: "BRW-POR",
    description: "Disciplina demo para navegação local",
    credits: 4,
    workload: 80,
    teacherId: teacher.id,
    status: "active",
    createdAt: now,
    updatedAt: now,
  });

  upsertClassSubject.run({
    id: "browser_demo_cs_math",
    classId: "browser_demo_class_9a",
    subjectId: "browser_demo_subject_math",
    teacherId: teacher.id,
    schedule: "Segunda-feira 08:00-09:30",
    room: "Sala 101",
    semester: "1º Semestre",
    academicYear: "2026",
    status: "active",
    createdAt: now,
    updatedAt: now,
  });
  upsertClassSubject.run({
    id: "browser_demo_cs_port",
    classId: "browser_demo_class_9a",
    subjectId: "browser_demo_subject_port",
    teacherId: teacher.id,
    schedule: "Quarta-feira 10:00-11:30",
    room: "Sala 102",
    semester: "1º Semestre",
    academicYear: "2026",
    status: "active",
    createdAt: now,
    updatedAt: now,
  });

  upsertEnrollment.run({
    id: "browser_demo_enrollment_student",
    studentId: student.id,
    classId: "browser_demo_class_9a",
    enrollmentDate: now,
    status: "active",
    createdAt: now,
    updatedAt: now,
  });

  upsertGrade.run({
    id: "browser_demo_grade_math_1",
    studentId: student.id,
    classSubjectId: "browser_demo_cs_math",
    type: "exam",
    title: "Avaliação Diagnóstica",
    grade: 8.7,
    maxGrade: 10,
    weight: 1,
    date: "2026-03-15",
    comments: "Bom desempenho em operações e raciocínio lógico.",
    createdBy: teacher.id,
    createdAt: now,
    updatedAt: now,
  });
  upsertGrade.run({
    id: "browser_demo_grade_port_1",
    studentId: student.id,
    classSubjectId: "browser_demo_cs_port",
    type: "homework",
    title: "Produção de Texto",
    grade: 9.1,
    maxGrade: 10,
    weight: 1,
    date: "2026-03-20",
    comments: "Texto bem estruturado e com boa argumentação.",
    createdBy: teacher.id,
    createdAt: now,
    updatedAt: now,
  });

  upsertAttendance.run({
    id: "browser_demo_att_math_1",
    studentId: student.id,
    classId: "browser_demo_class_9a",
    subjectId: "browser_demo_subject_math",
    teacherId: teacher.id,
    date: "2026-04-07",
    status: "present",
    notes: "Participou ativamente da aula.",
    createdAt: now,
    updatedAt: now,
  });
  upsertAttendance.run({
    id: "browser_demo_att_port_1",
    studentId: student.id,
    classId: "browser_demo_class_9a",
    subjectId: "browser_demo_subject_port",
    teacherId: teacher.id,
    date: "2026-04-08",
    status: "present",
    notes: "Leitura em voz alta realizada.",
    createdAt: now,
    updatedAt: now,
  });

  upsertActivity.run({
    id: "browser_demo_activity_math",
    title: "Lista de Exercícios de Frações",
    description: "Resolver os exercícios da apostila e entregar pelo sistema.",
    subjectId: "browser_demo_subject_math",
    teacherId: teacher.id,
    classId: "browser_demo_class_9a",
    dueDate: "2026-04-15T23:59:59.000Z",
    maxGrade: 10,
    instructions: "Mostre o desenvolvimento completo de cada questão.",
    requirements: "Entrega em PDF.",
    status: "active",
    allowLateSubmission: 1,
    latePenalty: 0.5,
    maxFileSize: 10,
    allowedFileTypes: JSON.stringify(["pdf"]),
    approvedByCoordinator: 1,
    coordinatorApprovalDate: now,
    coordinatorId: coordinator.id,
    createdAt: now,
    updatedAt: now,
  });

  upsertSubmission.run({
    id: "browser_demo_submission_math",
    activityId: "browser_demo_activity_math",
    studentId: student.id,
    submittedAt: "2026-04-08T10:00:00.000Z",
    comment: "Atividade enviada para avaliação.",
    status: "graded",
    grade: 9.0,
    maxGrade: 10,
    feedback: "Ótimo trabalho, continue assim.",
    gradedBy: teacher.id,
    gradedAt: "2026-04-08T11:30:00.000Z",
    isLate: 0,
    latePenaltyApplied: 0,
    finalGrade: 9.0,
    createdAt: now,
    updatedAt: now,
  });

  upsertEvent.run({
    id: "browser_demo_event_meeting",
    title: "Reunião de Pais",
    description: "Encontro da coordenação com responsáveis da turma.",
    type: "meeting",
    startDate: "2026-04-12",
    endDate: "2026-04-12",
    location: "Auditório",
    color: "#2563EB",
    classId: "browser_demo_class_9a",
    subjectId: null,
    createdBy: coordinator.id,
    status: "active",
    createdAt: now,
    updatedAt: now,
    startTime: "19:00",
    endTime: "20:30",
  });

  upsertNotification.run({
    id: "browser_demo_notification_welcome",
    title: "Ambiente local preparado",
    message: "O sistema foi configurado para navegação no navegador com dados demo consistentes.",
    type: "info",
    priority: "medium",
    senderId: admin.id,
    recipientId: student.id,
    classId: "browser_demo_class_9a",
    subjectId: null,
    read: 0,
    createdAt: now,
    updatedAt: now,
  });

  upsertPeriod.run({
    id: "browser_demo_period_1",
    name: "1º Bimestre",
    description: "Período acadêmico demo para a versão web local.",
    period: "1",
    academicYear: "2026",
    startDate: "2026-02-01",
    endDate: "2026-04-30",
    status: "active",
    isCurrent: 1,
    totalDays: 89,
    remainingDays: 22,
    createdBy: director.id,
    createdAt: now,
    updatedAt: now,
  });

  upsertSchedule.run({
    id: "browser_demo_schedule_math",
    classId: "browser_demo_class_9a",
    day: "monday",
    startTime: "08:00",
    endTime: "09:30",
    subjectId: "browser_demo_subject_math",
    teacherId: teacher.id,
    createdAt: now,
    updatedAt: now,
  });
  upsertSchedule.run({
    id: "browser_demo_schedule_port",
    classId: "browser_demo_class_9a",
    day: "wednesday",
    startTime: "10:00",
    endTime: "11:30",
    subjectId: "browser_demo_subject_port",
    teacherId: teacher.id,
    createdAt: now,
    updatedAt: now,
  });

  upsertExam.run({
    id: "browser_demo_exam_math",
    title: "Prova de Matemática",
    description: "Avaliação do 1º bimestre.",
    subjectId: "browser_demo_subject_math",
    classId: "browser_demo_class_9a",
    teacherId: teacher.id,
    examDate: "2026-04-18",
    duration: 90,
    totalPoints: 10,
    semester: "1",
    bimonthly: "1",
    status: "scheduled",
    createdAt: now,
    updatedAt: now,
  });

  upsertExamGrade.run({
    id: "browser_demo_exam_grade_math",
    examId: "browser_demo_exam_math",
    studentId: student.id,
    grade: 8.8,
    isPresent: 1,
    observations: "Bom domínio dos conteúdos do bimestre.",
    gradedBy: teacher.id,
    gradedAt: now,
    createdAt: now,
    updatedAt: now,
  });

  upsertMaterial.run({
    id: "browser_demo_material_math",
    title: "Guia de Revisão de Frações",
    description: "Material de apoio para estudar antes da avaliação.",
    subjectId: "browser_demo_subject_math",
    classId: "browser_demo_class_9a",
    teacherId: teacher.id,
    materialType: "document",
    content: "Revisão com exemplos práticos, operações básicas e exercícios resolvidos.",
    isPublic: 1,
    status: "active",
    createdAt: now,
    updatedAt: now,
    folder: "Materiais de Matemática",
  });

  upsertMessage.run({
    id: "browser_demo_message_1",
    conversationId: `conv_${student.id}_${teacher.id}`,
    senderId: teacher.id,
    recipientId: student.id,
    content: "Confira a lista de exercícios antes da prova da próxima semana.",
    createdAt: Date.now() - 3600000,
  });
  upsertMessage.run({
    id: "browser_demo_message_2",
    conversationId: `conv_${student.id}_${teacher.id}`,
    senderId: student.id,
    recipientId: teacher.id,
    content: "Obrigado, professor. Vou revisar hoje ainda.",
    createdAt: Date.now() - 1800000,
  });
});

ensureData();

const usersSummary = db
  .prepare(
    "SELECT email, role, status FROM users WHERE email IN ('admin@escola.com','diretor@escola.com','coord@escola.com','prof@escola.com','aluno@escola.com') ORDER BY role, email",
  )
  .all();

console.log("Credenciais demo prontas para o navegador:");
for (const row of usersSummary) {
  console.log(`- ${row.role}: ${row.email} / 123 (${row.status})`);
}

console.log(`Banco local preparado em ${targetDbPath}`);
db.close();
