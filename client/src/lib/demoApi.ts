import { isStaticDemo } from "./runtime";

type DemoRole = "admin" | "director" | "coordinator" | "teacher" | "student";
type DemoStatus = "active" | "inactive" | "suspended" | "pendente";

interface DemoUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: DemoRole;
  status: DemoStatus;
  phone: string | null;
  address: string | null;
  birthDate: string | null;
  registrationNumber: string;
  profileImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DemoClass {
  id: string;
  name: string;
  grade: string;
  section: string;
  academicYear: string;
  capacity: number;
  status: DemoStatus | "active";
  coordinatorId: string;
  createdAt: string;
  updatedAt: string;
}

interface DemoSubject {
  id: string;
  name: string;
  code: string;
  description: string;
  status: DemoStatus | "active";
  teacherId: string;
  linkedClassIds: string[];
  createdAt: string;
}

interface DemoTeacherAssignments {
  subjectIds: string[];
  classIds: string[];
}

interface DemoActivity {
  id: string;
  title: string;
  description: string;
  subjectId: string;
  classId: string;
  teacherId: string;
  dueDate: string;
  maxGrade: number;
  instructions: string;
  requirements: string;
  status: "active" | "inactive";
  allowLateSubmission: boolean;
  latePenalty: number;
  maxFileSize: number;
  allowedFileTypes: string[];
  createdAt: string;
  updatedAt: string;
  studentSubmissionStatus: "graded" | "submitted" | null;
  studentSubmissionGrade: number | null;
  studentSubmissionFeedback: string | null;
  studentSubmissionDate: string | null;
}

interface DemoMaterial {
  id: string;
  title: string;
  description: string;
  materialType: string;
  content: string;
  folder: string;
  isPublic: boolean;
  status: "active" | "inactive";
  subjectId: string;
  classId: string;
  teacherId: string;
  createdAt: string;
  updatedAt: string;
}

interface DemoExam {
  id: string;
  title: string;
  description: string;
  subjectId: string;
  classId: string;
  teacherId: string;
  examDate: string;
  duration: number;
  totalPoints: number;
  semester: string;
  bimonthly: string;
  status: "scheduled" | "completed" | "cancelled";
  createdAt: string;
}

interface DemoEvent {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  location: string;
  type: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  color?: string;
  isGlobal?: boolean;
  classId?: string;
  className?: string;
  subjectName?: string;
  customType?: string;
  createdBy?: string;
  creatorName?: string;
  createdAt?: string;
  status?: "active" | "pending";
}

interface DemoCurrentPeriod {
  id: string;
  name: string;
  description: string;
  period: string;
  academicYear: string;
  startDate: string;
  endDate: string;
  status: "active" | "pending" | "completed";
  isCurrent: boolean;
  totalDays: number;
  remainingDays: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface DemoState {
  currentUserId: string | null;
  users: DemoUser[];
  classes: DemoClass[];
  subjects: DemoSubject[];
  teacherAssignments: Record<string, DemoTeacherAssignments>;
  activities: DemoActivity[];
  materials: DemoMaterial[];
  exams: DemoExam[];
  events: DemoEvent[];
  currentPeriod: DemoCurrentPeriod;
}

const DEMO_STORAGE_KEY = "schoolmanager-static-demo-v2";
const DEMO_PASSWORD = "123";

const seedState: DemoState = {
  currentUserId: null,
  users: [
    {
      id: "browser_demo_admin",
      email: "admin@escola.com",
      firstName: "Admin",
      lastName: "Sistema",
      role: "admin",
      status: "active",
      phone: null,
      address: null,
      birthDate: null,
      registrationNumber: "ADM001",
      profileImageUrl: null,
      createdAt: "2026-04-08T21:57:09.141Z",
      updatedAt: "2026-04-08T23:57:09.580Z",
    },
    {
      id: "browser_demo_director",
      email: "diretor@escola.com",
      firstName: "Diretor",
      lastName: "Executivo",
      role: "director",
      status: "active",
      phone: null,
      address: null,
      birthDate: null,
      registrationNumber: "DIR001",
      profileImageUrl: null,
      createdAt: "2026-04-08T21:57:09.141Z",
      updatedAt: "2026-04-08T23:57:09.580Z",
    },
    {
      id: "browser_demo_coord",
      email: "coord@escola.com",
      firstName: "Coordenador",
      lastName: "Pedagógico",
      role: "coordinator",
      status: "active",
      phone: null,
      address: null,
      birthDate: null,
      registrationNumber: "COORD001",
      profileImageUrl: null,
      createdAt: "2026-04-08T21:57:09.141Z",
      updatedAt: "2026-04-08T23:57:09.580Z",
    },
    {
      id: "browser_demo_teacher",
      email: "prof@escola.com",
      firstName: "Professor",
      lastName: "Titular",
      role: "teacher",
      status: "active",
      phone: null,
      address: null,
      birthDate: null,
      registrationNumber: "PROF001",
      profileImageUrl: null,
      createdAt: "2026-04-08T21:57:09.141Z",
      updatedAt: "2026-04-08T23:57:09.580Z",
    },
    {
      id: "browser_demo_student",
      email: "aluno@escola.com",
      firstName: "Aluno",
      lastName: "Demo",
      role: "student",
      status: "active",
      phone: null,
      address: null,
      birthDate: null,
      registrationNumber: "ALU001",
      profileImageUrl: null,
      createdAt: "2026-04-08T21:57:09.141Z",
      updatedAt: "2026-04-08T23:57:09.580Z",
    },
  ],
  classes: [
    {
      id: "browser_demo_class_9a",
      name: "9º Ano A",
      grade: "9º Ano",
      section: "A",
      academicYear: "2026",
      capacity: 30,
      status: "active",
      coordinatorId: "browser_demo_coord",
      createdAt: "2026-04-08T21:57:09.141Z",
      updatedAt: "2026-04-08T23:57:09.580Z",
    },
  ],
  subjects: [
    {
      id: "browser_demo_subject_math",
      name: "Matemática",
      code: "BRW-MAT",
      description: "Disciplina demo para navegação local",
      status: "active",
      teacherId: "browser_demo_teacher",
      linkedClassIds: ["browser_demo_class_9a"],
      createdAt: "2026-04-08T21:57:09.141Z",
    },
    {
      id: "browser_demo_subject_port",
      name: "Português",
      code: "BRW-POR",
      description: "Disciplina demo para navegação local",
      status: "active",
      teacherId: "browser_demo_teacher",
      linkedClassIds: ["browser_demo_class_9a"],
      createdAt: "2026-04-08T21:57:09.141Z",
    },
  ],
  teacherAssignments: {
    browser_demo_teacher: {
      subjectIds: ["browser_demo_subject_math", "browser_demo_subject_port"],
      classIds: ["browser_demo_class_9a"],
    },
  },
  activities: [
    {
      id: "browser_demo_activity_math",
      title: "Lista de Exercícios de Frações",
      description: "Resolver os exercícios da apostila e entregar pelo sistema.",
      subjectId: "browser_demo_subject_math",
      classId: "browser_demo_class_9a",
      teacherId: "browser_demo_teacher",
      dueDate: "2026-04-15T23:59:59.000Z",
      maxGrade: 10,
      instructions: "Mostre o desenvolvimento completo de cada questão.",
      requirements: "Entrega em PDF.",
      status: "active",
      allowLateSubmission: true,
      latePenalty: 0.5,
      maxFileSize: 10,
      allowedFileTypes: ["pdf"],
      createdAt: "2026-04-08T21:57:09.141Z",
      updatedAt: "2026-04-08T23:57:09.580Z",
      studentSubmissionStatus: "graded",
      studentSubmissionGrade: 9,
      studentSubmissionFeedback: "Ótimo trabalho, continue assim.",
      studentSubmissionDate: "2026-04-08T10:00:00.000Z",
    },
  ],
  materials: [
    {
      id: "browser_demo_material_math",
      title: "Guia de Revisão de Frações",
      description: "Material de apoio para estudar antes da avaliação.",
      materialType: "document",
      content: "Revisão com exemplos práticos, operações básicas e exercícios resolvidos.",
      folder: "Materiais de Matemática",
      isPublic: true,
      status: "active",
      subjectId: "browser_demo_subject_math",
      classId: "browser_demo_class_9a",
      teacherId: "browser_demo_teacher",
      createdAt: "2026-04-08T21:57:09.141Z",
      updatedAt: "2026-04-08T23:57:09.580Z",
    },
  ],
  exams: [
    {
      id: "browser_demo_exam_math",
      title: "Prova de Matemática",
      description: "Avaliação do 1º bimestre.",
      subjectId: "browser_demo_subject_math",
      classId: "browser_demo_class_9a",
      teacherId: "browser_demo_teacher",
      examDate: "2026-04-18",
      duration: 90,
      totalPoints: 10,
      semester: "1",
      bimonthly: "1",
      status: "scheduled",
      createdAt: "2026-04-08T21:57:09.141Z",
    },
  ],
  events: [
    {
      id: "browser_demo_event_meeting",
      title: "Reunião de Pais",
      startDate: "2026-04-12",
      endDate: "2026-04-12",
      location: "Auditório",
      type: "meeting",
    },
  ],
  currentPeriod: {
    id: "browser_demo_period_1",
    name: "1º Bimestre",
    description: "Período acadêmico demo para a versão web local.",
    period: "1",
    academicYear: "2026",
    startDate: "2026-02-01",
    endDate: "2026-04-30",
    status: "active",
    isCurrent: true,
    totalDays: 89,
    remainingDays: 21,
    createdBy: "browser_demo_director",
    createdAt: "2026-04-08T21:57:09.141Z",
    updatedAt: "2026-04-08T23:57:09.580Z",
  },
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function loadState(): DemoState {
  if (typeof window === "undefined") {
    return clone(seedState);
  }

  const raw = window.localStorage.getItem(DEMO_STORAGE_KEY);
  if (!raw) {
    return clone(seedState);
  }

  try {
    return { ...clone(seedState), ...JSON.parse(raw) } as DemoState;
  } catch {
    return clone(seedState);
  }
}

function saveState(state: DemoState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state));
}

function getState() {
  return loadState();
}

function updateState(mutator: (draft: DemoState) => void) {
  const next = loadState();
  mutator(next);
  saveState(next);
  return next;
}

function getNowIso() {
  return new Date().toISOString();
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/(^\.|\.$)/g, "");
}

function getRolePrefix(role: DemoRole) {
  switch (role) {
    case "admin":
      return "ADM";
    case "director":
      return "DIR";
    case "coordinator":
      return "COORD";
    case "teacher":
      return "PROF";
    case "student":
      return "ALU";
    default:
      return "USR";
  }
}

function getCurrentUser(state: DemoState) {
  return state.users.find((user) => user.id === state.currentUserId) ?? null;
}

function publicUser(user: DemoUser) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    profileImageUrl: user.profileImageUrl,
    role: user.role,
    status: user.status,
    phone: user.phone,
    address: user.address,
    birthDate: user.birthDate,
    registrationNumber: user.registrationNumber,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function buildAdminUsers(state: DemoState) {
  return state.users.map((user) => {
    if (user.role !== "student") {
      return publicUser(user);
    }

    const studentClass = state.classes[0];
    return {
      ...publicUser(user),
      classInfo: {
        classId: studentClass.id,
        className: studentClass.name,
        classGrade: studentClass.grade,
        classSection: studentClass.section,
        enrollmentDate: user.updatedAt,
      },
    };
  });
}

function buildAdminDashboard(state: DemoState) {
  const usersByRole = state.users.reduce<Record<string, number>>((acc, user) => {
    acc[user.role] = (acc[user.role] ?? 0) + 1;
    return acc;
  }, {});

  return {
    totalUsers: state.users.length,
    totalClasses: state.classes.length,
    totalSubjects: state.subjects.length,
    usersByRole,
    recentUsers: state.users.map((user) => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      status: user.status,
      phone: user.phone,
      address: user.address,
      registrationNumber: user.registrationNumber,
      createdAt: user.createdAt,
    })),
    systemStatus: "100%",
  };
}

function buildAdminTeachers(state: DemoState) {
  return state.users
    .filter((user) => user.role === "teacher")
    .map((teacher) => {
      const assignments = state.teacherAssignments[teacher.id] ?? {
        subjectIds: [],
        classIds: [],
      };

      const subjects = assignments.subjectIds
        .map((subjectId) => state.subjects.find((subject) => subject.id === subjectId))
        .filter(Boolean)
        .map((subject) => ({
          id: subject!.id,
          name: subject!.name,
          code: subject!.code,
          classes: subject!.linkedClassIds
            .map((classId) => state.classes.find((item) => item.id === classId))
            .filter(Boolean)
            .map((item) => ({
              id: item!.id,
              name: item!.name,
              grade: item!.grade,
              section: item!.section,
            })),
        }));

      return {
        ...publicUser(teacher),
        subjects,
        totalSubjects: subjects.length,
        totalClasses: subjects.reduce((total, subject) => total + subject.classes.length, 0),
      };
    });
}

function buildAdminSubjects(state: DemoState) {
  return state.subjects.map((subject) => {
    const teacher = state.users.find((user) => user.id === subject.teacherId);
    return {
      id: subject.id,
      name: subject.name,
      code: subject.code,
      description: subject.description,
      status: subject.status,
      createdAt: subject.createdAt,
      linkedClasses: subject.linkedClassIds
        .map((classId) => state.classes.find((item) => item.id === classId))
        .filter(Boolean)
        .map((item) => ({
          classId: item!.id,
          className: item!.name,
          classGrade: item!.grade,
          classSection: item!.section,
        })),
      teacher: teacher
        ? {
            id: teacher.id,
            name: `${teacher.firstName} ${teacher.lastName}`,
            email: teacher.email,
          }
        : null,
    };
  });
}

function buildAdminClasses(state: DemoState) {
  return state.classes.map((item) => {
    const studentCount = state.users.filter((user) => user.role === "student").length;
    const subjectsCount = state.subjects.filter((subject) => subject.linkedClassIds.includes(item.id)).length;

    return {
      id: item.id,
      name: item.name,
      grade: item.grade,
      section: item.section,
      academicYear: item.academicYear,
      status: item.status,
      capacity: item.capacity,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      studentCount,
      subjectsCount,
    };
  });
}

function buildClassDetails(state: DemoState, classId: string) {
  const targetClass = state.classes.find((item) => item.id === classId);
  if (!targetClass) return null;

  const students = state.users
    .filter((user) => user.role === "student")
    .map((student) => ({
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email,
      registrationNumber: student.registrationNumber,
      status: student.status,
      enrollmentDate: student.updatedAt,
    }));

  const subjects = state.subjects
    .filter((subject) => subject.linkedClassIds.includes(classId))
    .map((subject) => {
      const teacher = state.users.find((user) => user.id === subject.teacherId);
      return {
        subjectId: subject.id,
        subjectName: subject.name,
        subjectCode: subject.code,
        teacherId: teacher?.id ?? null,
        teacherFirstName: teacher?.firstName ?? "",
        teacherLastName: teacher?.lastName ?? "",
        teacherEmail: teacher?.email ?? "",
        teacherStatus: teacher?.status ?? "inactive",
      };
    });

  const teachers = state.users
    .filter((user) => user.role === "teacher")
    .map((teacher) => ({
      id: teacher.id,
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      email: teacher.email,
      status: teacher.status,
    }));

  return {
    class: targetClass,
    students,
    subjects,
    teachers,
    stats: {
      totalStudents: students.length,
      totalSubjects: subjects.length,
      totalTeachers: teachers.length,
    },
  };
}

function buildStudentDetails(state: DemoState, studentId: string) {
  const student = state.users.find((user) => user.id === studentId && user.role === "student");
  if (!student) return null;

  return {
    student: {
      ...publicUser(student),
      password: "demo-hidden",
      lastSeen: null,
    },
    class: {
      classId: state.classes[0]?.id ?? null,
      className: state.classes[0]?.name ?? "",
      classGrade: state.classes[0]?.grade ?? "",
      classSection: state.classes[0]?.section ?? "",
      enrollmentDate: student.updatedAt,
      status: student.status,
    },
  };
}

function buildTeacherDetails(state: DemoState, teacherId: string) {
  const teacher = state.users.find((user) => user.id === teacherId && user.role === "teacher");
  if (!teacher) return null;

  const subjects = state.subjects
    .filter((subject) => subject.teacherId === teacherId)
    .flatMap((subject) =>
      subject.linkedClassIds.map((classId) => {
        const item = state.classes.find((entry) => entry.id === classId);
        return {
          subjectId: subject.id,
          subjectName: subject.name,
          subjectCode: subject.code,
          subjectDescription: subject.description,
          classId,
          className: item?.name ?? "",
          classGrade: item?.grade ?? "",
          classSection: item?.section ?? "",
        };
      }),
    );

  return {
    teacher: {
      ...publicUser(teacher),
      password: "demo-hidden",
      lastSeen: null,
    },
    subjects,
  };
}

function buildTeacherAssignments(state: DemoState, teacherId: string) {
  const assignments = state.teacherAssignments[teacherId] ?? { subjectIds: [], classIds: [] };
  return {
    subjects: assignments.subjectIds
      .map((subjectId) => state.subjects.find((subject) => subject.id === subjectId))
      .filter(Boolean)
      .map((subject) => ({
        id: subject!.id,
        name: subject!.name,
        code: subject!.code,
      })),
    classes: assignments.classIds
      .map((classId) => state.classes.find((item) => item.id === classId))
      .filter(Boolean)
      .map((item) => ({
        id: item!.id,
        name: item!.name,
        grade: item!.grade,
        section: item!.section,
      })),
  };
}

function buildTeacherClasses(state: DemoState, teacherId: string) {
  const assignments = state.teacherAssignments[teacherId] ?? { subjectIds: [], classIds: [] };
  return assignments.subjectIds
    .map((subjectId) => {
      const subject = state.subjects.find((entry) => entry.id === subjectId);
      const classId = subject?.linkedClassIds[0];
      const item = state.classes.find((entry) => entry.id === classId);
      return subject && item
        ? {
            id: `${item.id}:${subject.id}`,
            classId: item.id,
            subjectId: subject.id,
            className: item.name,
            subjectName: subject.name,
            schedule: subject.id === "browser_demo_subject_math" ? "Segunda-feira 08:00-09:30" : "Quarta-feira 10:00-11:30",
            room: subject.id === "browser_demo_subject_math" ? "Sala 101" : "Sala 102",
            semester: "1º Semestre",
            academicYear: item.academicYear,
            status: "active",
            studentCount: state.users.filter((user) => user.role === "student").length,
          }
        : null;
    })
    .filter(Boolean);
}

function buildTeacherSubjects(state: DemoState) {
  return state.subjects.map((subject) => ({
    id: subject.id,
    name: subject.name,
    code: subject.code,
    description: subject.description,
    classId: subject.linkedClassIds[0],
    className: state.classes.find((item) => item.id === subject.linkedClassIds[0])?.name ?? "",
  }));
}

function buildTeacherActivities(state: DemoState, teacherId: string) {
  return state.activities
    .filter((activity) => activity.teacherId === teacherId)
    .map((activity) => ({
      id: activity.id,
      title: activity.title,
      description: activity.description,
      subjectId: activity.subjectId,
      subjectName: state.subjects.find((subject) => subject.id === activity.subjectId)?.name ?? "",
      subjectCode: state.subjects.find((subject) => subject.id === activity.subjectId)?.code ?? "",
      classId: activity.classId,
      className: state.classes.find((item) => item.id === activity.classId)?.name ?? "",
      dueDate: activity.dueDate,
      maxGrade: activity.maxGrade,
      instructions: activity.instructions,
      requirements: activity.requirements,
      status: activity.status,
      allowLateSubmission: activity.allowLateSubmission,
      latePenalty: activity.latePenalty,
      maxFileSize: activity.maxFileSize,
      allowedFileTypes: JSON.stringify(activity.allowedFileTypes),
      createdAt: activity.createdAt,
      updatedAt: activity.updatedAt,
      submissionCount: activity.studentSubmissionStatus ? 1 : 0,
      gradedCount: activity.studentSubmissionStatus === "graded" ? 1 : 0,
      pendingCount: activity.studentSubmissionStatus ? 0 : 1,
    }));
}

function buildTeacherMaterials(state: DemoState, teacherId: string) {
  return state.materials
    .filter((material) => material.teacherId === teacherId)
    .map((material) => ({
      id: material.id,
      title: material.title,
      description: material.description,
      materialType: material.materialType,
      content: material.content,
      folder: material.folder,
      isPublic: material.isPublic,
      status: material.status,
      createdAt: material.createdAt,
      updatedAt: material.updatedAt,
      subjectName: state.subjects.find((subject) => subject.id === material.subjectId)?.name ?? "",
      className: state.classes.find((item) => item.id === material.classId)?.name ?? "",
      filesCount: 0,
      totalSize: null,
    }));
}

function buildTeacherExams(state: DemoState, teacherId: string) {
  return state.exams
    .filter((exam) => exam.teacherId === teacherId)
    .map((exam) => ({
      id: exam.id,
      title: exam.title,
      description: exam.description,
      examDate: exam.examDate,
      duration: exam.duration,
      totalPoints: exam.totalPoints,
      semester: exam.semester,
      bimonthly: exam.bimonthly,
      status: exam.status,
      createdAt: exam.createdAt,
      subjectName: state.subjects.find((subject) => subject.id === exam.subjectId)?.name ?? "",
      className: state.classes.find((item) => item.id === exam.classId)?.name ?? "",
    }));
}

function buildStudentClassInfo(state: DemoState) {
  const studentClass = state.classes[0];
  return {
    data: {
      class: {
        id: studentClass.id,
        name: studentClass.name,
        grade: studentClass.grade,
        section: studentClass.section,
        academicYear: studentClass.academicYear,
        capacity: studentClass.capacity,
      },
      teachers: state.subjects.map((subject) => {
        const teacher = state.users.find((user) => user.id === subject.teacherId)!;
        return {
          id: teacher.id,
          firstName: teacher.firstName,
          lastName: teacher.lastName,
          email: teacher.email,
          phone: teacher.phone,
          subjectName: subject.name,
          subjectCode: subject.code,
        };
      }),
      classmates: [],
      totalStudents: state.users.filter((user) => user.role === "student").length,
      enrollmentDate: state.users.find((user) => user.role === "student")?.updatedAt,
    },
  };
}

function buildStudentActivities(state: DemoState) {
  return {
    data: state.activities.map((activity) => ({
      id: activity.id,
      title: activity.title,
      description: activity.description,
      subjectId: activity.subjectId,
      subjectName: state.subjects.find((subject) => subject.id === activity.subjectId)?.name ?? "",
      subjectCode: state.subjects.find((subject) => subject.id === activity.subjectId)?.code ?? "",
      classId: activity.classId,
      className: state.classes.find((item) => item.id === activity.classId)?.name ?? "",
      dueDate: activity.dueDate,
      maxGrade: activity.maxGrade,
      instructions: activity.instructions,
      requirements: activity.requirements,
      status: activity.status,
      allowLateSubmission: activity.allowLateSubmission,
      latePenalty: activity.latePenalty,
      maxFileSize: activity.maxFileSize,
      allowedFileTypes: JSON.stringify(activity.allowedFileTypes),
      createdAt: activity.createdAt,
      updatedAt: activity.updatedAt,
      submissionStatus: activity.studentSubmissionStatus,
      submissionGrade: activity.studentSubmissionGrade,
      submissionFeedback: activity.studentSubmissionFeedback,
      submissionDate: activity.studentSubmissionDate,
    })),
  };
}

function buildCoordinatorDashboard(state: DemoState) {
  return {
    totals: {
      teachers: state.users.filter((user) => user.role === "teacher").length,
      students: state.users.filter((user) => user.role === "student").length,
      classes: state.classes.length,
      pendingActivities: state.activities.filter((activity) => activity.status === "inactive").length,
      exams: state.exams.length,
    },
  };
}

function buildCoordinatorClasses(state: DemoState) {
  return {
    success: true,
    data: state.classes.map((item) => ({
      id: item.id,
      name: item.name,
      grade: item.grade,
      section: item.section,
      status: item.status,
      createdAt: item.createdAt,
      academicYear: item.academicYear,
      capacity: item.capacity,
      studentsCount: state.users.filter((user) => user.role === "student").length,
      activitiesCount: state.activities.filter((activity) => activity.classId === item.id).length,
      examsCount: state.exams.filter((exam) => exam.classId === item.id).length,
      teachers: state.subjects
        .filter((subject) => subject.linkedClassIds.includes(item.id))
        .map((subject) => {
          const teacher = state.users.find((user) => user.id === subject.teacherId)!;
          return {
            id: teacher.id,
            name: `${teacher.firstName} ${teacher.lastName}`,
            subject: subject.name,
          };
        }),
      lastActivity: state.activities.find((activity) => activity.classId === item.id)
        ? {
            title: state.activities.find((activity) => activity.classId === item.id)!.title,
            createdAt: state.activities.find((activity) => activity.classId === item.id)!.createdAt,
            status: state.activities.find((activity) => activity.classId === item.id)!.status,
          }
        : null,
      attendanceRate: 100,
      avgGrade: 8.8,
      totalGrades: 1,
      totalAttendanceRecords: 2,
    })),
  };
}

function buildSystemStatus() {
  return {
    serverOnline: true,
    databaseConnected: true,
    apiWorking: true,
    lastUpdated: getNowIso(),
  };
}

function buildDirectorDashboard(state: DemoState) {
  return {
    totals: {
      students: state.users.filter((user) => user.role === "student").length,
      teachers: state.users.filter((user) => user.role === "teacher").length,
      classes: state.classes.length,
      subjects: state.subjects.length,
    },
    upcomingEvents: {
      count: state.events.length,
      next: state.events.slice(0, 1).map((event) => ({
        id: event.id,
        title: event.title,
        startDate: event.startDate,
      })),
    },
    pendingApprovals: {
      total: 0,
      breakdown: {
        users: 0,
        classes: 0,
        subjects: 0,
      },
    },
  };
}

function buildCalendarEvents(state: DemoState) {
  const activityEvents = state.activities.map((activity) => ({
    id: `calendar-activity-${activity.id}`,
    title: activity.title,
    description: activity.description,
    date: activity.dueDate,
    classId: activity.classId,
    className: state.classes.find((item) => item.id === activity.classId)?.name ?? "",
    subjectName: state.subjects.find((subject) => subject.id === activity.subjectId)?.name ?? "",
    type: "activity",
  }));

  const examEvents = state.exams.map((exam) => ({
    id: `calendar-exam-${exam.id}`,
    title: exam.title,
    description: exam.description,
    date: exam.examDate,
    classId: exam.classId,
    className: state.classes.find((item) => item.id === exam.classId)?.name ?? "",
    subjectName: state.subjects.find((subject) => subject.id === exam.subjectId)?.name ?? "",
    type: "exam",
  }));

  return [...activityEvents, ...examEvents];
}

function getPrimaryClass(state: DemoState) {
  return state.classes[0];
}

function getStudentUser(state: DemoState) {
  return state.users.find((user) => user.role === "student");
}

function getTeacherUser(state: DemoState) {
  return state.users.find((user) => user.role === "teacher");
}

function getCoordinatorUser(state: DemoState) {
  return state.users.find((user) => user.role === "coordinator");
}

function buildClassStudents(state: DemoState, classId: string) {
  const targetClass = state.classes.find((item) => item.id === classId) ?? getPrimaryClass(state);

  return state.users
    .filter((user) => user.role === "student")
    .map((student) => ({
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email,
      phone: student.phone ?? "",
      registrationNumber: student.registrationNumber,
      enrollmentDate: student.updatedAt,
      status: student.status,
      classId: targetClass?.id ?? "",
      className: targetClass?.name ?? "",
    }));
}

function buildTeacherFolders(state: DemoState, teacherId: string) {
  const grouped = new Map<string, { folder: string; count: number; totalSize: number }>();

  state.materials
    .filter((material) => material.teacherId === teacherId && material.folder)
    .forEach((material) => {
      const folderName = material.folder as string;
      const current = grouped.get(folderName) ?? { folder: folderName, count: 0, totalSize: 0 };
      current.count += 1;
      current.totalSize += 1024 * 256;
      grouped.set(folderName, current);
    });

  return Array.from(grouped.values());
}

function buildStudentSubjects(state: DemoState) {
  return {
    data: state.subjects.map((subject) => ({
      id: subject.id,
      name: subject.name,
      code: subject.code,
      description: subject.description,
    })),
  };
}

function buildStudentMaterials(state: DemoState, subjectId?: string | null) {
  return state.materials
    .filter((material) => !subjectId || material.subjectId === subjectId)
    .map((material) => ({
      id: material.id,
      title: material.title,
      description: material.description,
      materialType: material.materialType,
      content: material.content,
      folder: material.folder,
      isPublic: material.isPublic,
      createdAt: material.createdAt,
      updatedAt: material.updatedAt,
      subjectName: state.subjects.find((subject) => subject.id === material.subjectId)?.name ?? "",
      className: state.classes.find((item) => item.id === material.classId)?.name ?? "",
      filesCount: 1,
      totalSize: 1024 * 256,
    }));
}

function buildStudentExams(state: DemoState) {
  return state.exams.map((exam, index) => ({
    id: exam.id,
    title: exam.title,
    description: exam.description,
    examDate: exam.examDate,
    subjectId: exam.subjectId,
    subjectName: state.subjects.find((subject) => subject.id === exam.subjectId)?.name ?? "",
    bimonthly: Number(exam.bimonthly),
    semester: Number(exam.semester),
    totalPoints: exam.totalPoints,
    createdAt: exam.createdAt,
    grade:
      index === 0
        ? {
            id: `grade-${exam.id}`,
            grade: 8.5,
            isPresent: true,
            observations: "Bom desempenho na avaliação.",
            gradedAt: state.currentPeriod.updatedAt,
          }
        : null,
  }));
}

function buildStudentAttendance(state: DemoState, subjectId?: string | null) {
  const primaryClass = getPrimaryClass(state);
  const allRecords = state.subjects.flatMap((subject, index) => [
    {
      id: `attendance-${subject.id}-1`,
      date: `2026-04-0${index + 2}`,
      status: "present",
      notes: "Registro demo",
      subjectId: subject.id,
      subjectName: subject.name,
      subjectCode: subject.code,
      className: primaryClass?.name ?? "",
      academicYear: primaryClass?.academicYear ?? state.currentPeriod.academicYear,
      createdAt: getNowIso(),
    },
    {
      id: `attendance-${subject.id}-2`,
      date: `2026-04-1${index + 1}`,
      status: index % 2 === 0 ? "late" : "absent",
      notes: index % 2 === 0 ? "Chegada após o início da aula" : "Falta sem justificativa",
      subjectId: subject.id,
      subjectName: subject.name,
      subjectCode: subject.code,
      className: primaryClass?.name ?? "",
      academicYear: primaryClass?.academicYear ?? state.currentPeriod.academicYear,
      createdAt: getNowIso(),
    },
  ]);

  const attendance = allRecords.filter((record) => !subjectId || record.subjectId === subjectId);

  const statsBySubject = state.subjects
    .filter((subject) => !subjectId || subject.id === subjectId)
    .map((subject) => {
      const records = attendance.filter((record) => record.subjectId === subject.id);
      const presentClasses = records.filter((record) => record.status === "present").length;
      const absentClasses = records.filter((record) => record.status === "absent").length;
      const lateClasses = records.filter((record) => record.status === "late").length;
      const excusedClasses = records.filter((record) => record.status === "excused").length;

      return {
        subjectId: subject.id,
        subjectName: subject.name,
        totalClasses: records.length,
        presentClasses,
        absentClasses,
        lateClasses,
        excusedClasses,
      };
    });

  const totalClasses = attendance.length;
  const presentCount = attendance.filter((record) => record.status === "present").length;
  const absentCount = attendance.filter((record) => record.status === "absent").length;
  const lateCount = attendance.filter((record) => record.status === "late").length;
  const excusedCount = attendance.filter((record) => record.status === "excused").length;

  return {
    attendance,
    statsBySubject,
    generalStats: {
      totalClasses,
      presentCount,
      absentCount,
      lateCount,
      excusedCount,
      attendanceRate: totalClasses > 0 ? Number(((presentCount / totalClasses) * 100).toFixed(1)) : 0,
    },
  };
}

function buildTeacherEvents(state: DemoState, teacherId: string) {
  const teacherActivities = state.activities
    .filter((activity) => activity.teacherId === teacherId)
    .map((activity) => ({
      id: `teacher-activity-${activity.id}`,
      title: activity.title,
      description: activity.description,
      date: activity.dueDate,
      classId: activity.classId,
      className: state.classes.find((item) => item.id === activity.classId)?.name ?? "",
      subjectName: state.subjects.find((subject) => subject.id === activity.subjectId)?.name ?? "",
      type: "activity",
    }));

  const teacherExams = state.exams
    .filter((exam) => exam.teacherId === teacherId)
    .map((exam) => ({
      id: `teacher-exam-${exam.id}`,
      title: exam.title,
      description: exam.description,
      date: exam.examDate,
      classId: exam.classId,
      className: state.classes.find((item) => item.id === exam.classId)?.name ?? "",
      subjectName: state.subjects.find((subject) => subject.id === exam.subjectId)?.name ?? "",
      type: "exam",
    }));

  const globalEvents = state.events.map((event) => ({
    id: event.id,
    title: event.title,
    description: event.description ?? "",
    startDate: event.startDate,
    endDate: event.endDate,
    startTime: event.startTime,
    endTime: event.endTime,
    location: event.location,
    type: event.type || "meeting",
    isGlobal: true,
    className: event.className ?? "Evento Global",
    subjectName: event.subjectName ?? "Coordenação",
  }));

  return { data: [...teacherActivities, ...teacherExams, ...globalEvents] };
}

function buildStudentEvents(state: DemoState) {
  return {
    data: state.events.map((event) => ({
      id: event.id,
      title: event.title,
      description: event.description ?? "",
      startDate: event.startDate,
      endDate: event.endDate,
      startTime: event.startTime,
      endTime: event.endTime,
      location: event.location,
      type: event.type || "meeting",
      isGlobal: true,
      className: event.className ?? "Evento Global",
      subjectName: event.subjectName ?? "Coordenação",
      creatorName: event.creatorName ?? "Coordenação",
    })),
  };
}

function buildCoordinatorStudents(state: DemoState) {
  const primaryClass = getPrimaryClass(state);
  const attendance = buildStudentAttendance(state);

  return {
    data: state.users
      .filter((user) => user.role === "student")
      .map((student) => ({
        ...publicUser(student),
        classInfo: primaryClass
          ? {
              id: primaryClass.id,
              name: primaryClass.name,
              grade: primaryClass.grade,
              section: primaryClass.section,
              enrollmentDate: student.updatedAt,
            }
          : undefined,
        attendanceStats: {
          totalClasses: attendance.generalStats.totalClasses,
          presentCount: attendance.generalStats.presentCount,
          absentCount: attendance.generalStats.absentCount,
          attendanceRate: attendance.generalStats.attendanceRate,
          lastAttendanceDate: attendance.attendance[0]?.date,
        },
        gradeStats: {
          averageGrade: 8.4,
          totalGrades: 2,
          lastGradeDate: state.currentPeriod.updatedAt,
        },
      })),
  };
}

function buildCoordinatorTeacherStats(state: DemoState) {
  return {
    data: state.users
      .filter((user) => user.role === "teacher")
      .map((teacher) => {
        const teacherActivities = state.activities.filter((activity) => activity.teacherId === teacher.id);
        const teacherExams = state.exams.filter((exam) => exam.teacherId === teacher.id);
        const teacherMaterials = state.materials.filter((material) => material.teacherId === teacher.id);
        const gradedActivities = teacherActivities.filter((activity) => activity.studentSubmissionStatus === "graded").length;
        const pendingActivities = teacherActivities.filter((activity) => activity.studentSubmissionStatus === "submitted").length;

        return {
          ...publicUser(teacher),
          stats: {
            activities: {
              total: teacherActivities.length,
              approved: teacherActivities.filter((activity) => activity.status === "active").length,
              draft: teacherActivities.filter((activity) => activity.status === "inactive").length,
              expired: 0,
            },
            exams: {
              total: teacherExams.length,
              completed: teacherExams.filter((exam) => exam.status === "completed").length,
              active: teacherExams.filter((exam) => exam.status === "scheduled").length,
            },
            materials: {
              total: teacherMaterials.length,
            },
            grades: {
              activityGrades: { total: gradedActivities, average: 8.5 },
              examGrades: { total: teacherExams.length ? 1 : 0, average: 8.2 },
            },
            submissions: {
              total: teacherActivities.filter((activity) => activity.studentSubmissionStatus).length,
              graded: gradedActivities,
              pending: pendingActivities,
            },
            performance: 8.7,
            approvalRate: 92,
            gradingRate: 88,
          },
        };
      }),
  };
}

function buildCoordinatorTeacherDetails(state: DemoState, teacherId: string) {
  const teacherActivities = buildTeacherActivities(state, teacherId);

  return {
    data: {
      recentActivities: teacherActivities.slice(0, 5).map((activity) => ({
        id: activity.id,
        title: activity.title,
        subjectName: activity.subjectName,
        className: activity.className,
        status: activity.status,
      })),
      pendingSubmissions: teacherActivities
        .filter((activity) => activity.pendingCount > 0)
        .map((activity) => ({
          id: `submission-${activity.id}`,
          activityTitle: activity.title,
          studentName: "Aluno Demo",
          subjectName: activity.subjectName,
          submittedAt: state.currentPeriod.updatedAt,
        })),
    },
  };
}

function buildCoordinatorActivities(state: DemoState) {
  return state.activities.map((activity) => ({
    id: activity.id,
    title: activity.title,
    description: activity.description,
    teacherName:
      state.users.find((user) => user.id === activity.teacherId)
        ? `${state.users.find((user) => user.id === activity.teacherId)!.firstName} ${state.users.find((user) => user.id === activity.teacherId)!.lastName}`
        : "",
    subjectName: state.subjects.find((subject) => subject.id === activity.subjectId)?.name ?? "",
    className: state.classes.find((item) => item.id === activity.classId)?.name ?? "",
    createdAt: activity.createdAt,
    dueDate: activity.dueDate,
    status: activity.status,
    isActive: activity.status === "active",
  }));
}

function buildCoordinatorPerformanceSimple(state: DemoState) {
  return {
    data: {
      summary: {
        totalStudents: state.users.filter((user) => user.role === "student").length,
        totalTeachers: state.users.filter((user) => user.role === "teacher").length,
        avgPerformance: 8.6,
        attendanceRate: 91.5,
        completionRate: 88.2,
      },
      keyMetrics: {
        topPerformingClass: state.classes[0]?.name ?? "9º Ano A",
        needsAttention: 1,
        overallTrend: "up" as const,
      },
    },
  };
}

function buildPeriods(state: DemoState) {
  const academicYear = Number(state.currentPeriod.academicYear);

  return {
    data: ["1", "2", "3", "4"].map((period, index) => ({
      id: `demo-period-${period}`,
      name: `${period}º Bimestre ${academicYear}`,
      period,
      academicYear,
      startDate: `2026-0${index * 2 + 2}-01`,
      endDate: `2026-0${index * 2 + 3}-30`,
      status: period === state.currentPeriod.period ? "active" : Number(period) < Number(state.currentPeriod.period) ? "completed" : "pending",
      totalDays: 60,
      remainingDays: period === state.currentPeriod.period ? state.currentPeriod.remainingDays : 0,
      isCurrent: period === state.currentPeriod.period,
    })),
  };
}

function buildTeacherSubjectsForExams(state: DemoState, teacherId: string) {
  return {
    success: true,
    data: buildTeacherClasses(state, teacherId),
  };
}

function buildExamDetails(state: DemoState, examId: string) {
  const exam = state.exams.find((entry) => entry.id === examId);
  if (!exam) return null;

  const students = buildClassStudents(state, exam.classId);

  return {
    id: exam.id,
    title: exam.title,
    description: exam.description,
    examDate: exam.examDate,
    duration: exam.duration,
    totalPoints: exam.totalPoints,
    semester: exam.semester,
    bimonthly: exam.bimonthly,
    status: exam.status,
    subjectId: exam.subjectId,
    subjectName: state.subjects.find((subject) => subject.id === exam.subjectId)?.name ?? "",
    classId: exam.classId,
    className: state.classes.find((item) => item.id === exam.classId)?.name ?? "",
    grades: students.map((student, index) => ({
      id: `exam-grade-${exam.id}-${student.id}`,
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`,
      registrationNumber: student.registrationNumber,
      grade: index === 0 ? 8.5 : null,
      observations: index === 0 ? "Boa compreensão do conteúdo." : "",
      isPresent: true,
    })),
  };
}

function buildCoordinatorSubmissions(state: DemoState) {
  const student = getStudentUser(state);

  return state.activities
    .filter((activity) => activity.studentSubmissionStatus)
    .map((activity) => ({
      id: `submission-${activity.id}`,
      activityId: activity.id,
      studentId: student?.id ?? "browser_demo_student",
      studentName: `${student?.firstName ?? "Aluno"} ${student?.lastName ?? "Demo"}`.trim(),
      submittedAt: activity.studentSubmissionDate ?? state.currentPeriod.updatedAt,
      grade: activity.studentSubmissionGrade,
      status: activity.studentSubmissionStatus,
    }));
}

function buildCoordinatorExamGrades(state: DemoState) {
  return state.exams.map((exam, index) => ({
    id: `coordinator-grade-${exam.id}`,
    examId: exam.id,
    classId: exam.classId,
    subjectId: exam.subjectId,
    grade: index === 0 ? 8.5 : 7.2,
    totalPoints: exam.totalPoints,
  }));
}

function buildUsersByRole(state: DemoState, role: string) {
  const primaryClass = getPrimaryClass(state);

  return state.users
    .filter((user) => user.role === role)
    .map((user) => ({
      ...publicUser(user),
      classId: role === "student" ? primaryClass?.id ?? "" : undefined,
      className: role === "student" ? primaryClass?.name ?? "" : undefined,
      profileImageUrl: user.profileImageUrl,
    }));
}

function buildClassesList(state: DemoState) {
  return state.classes.map((item) => ({
    id: item.id,
    name: item.name,
    grade: item.grade,
    section: item.section,
    academicYear: item.academicYear,
    status: item.status,
    studentsCount: state.users.filter((user) => user.role === "student").length,
    createdAt: item.createdAt,
  }));
}

function buildActivityDetails(state: DemoState, activityId: string) {
  const activity = state.activities.find((entry) => entry.id === activityId);
  if (!activity) return null;

  return {
    id: activity.id,
    title: activity.title,
    description: activity.description,
    subjectId: activity.subjectId,
    subjectName: state.subjects.find((subject) => subject.id === activity.subjectId)?.name ?? "",
    classId: activity.classId,
    className: state.classes.find((item) => item.id === activity.classId)?.name ?? "",
    dueDate: activity.dueDate,
    maxGrade: activity.maxGrade,
    instructions: activity.instructions,
    requirements: activity.requirements,
    status: activity.status,
    allowLateSubmission: activity.allowLateSubmission,
    latePenalty: activity.latePenalty,
    maxFileSize: activity.maxFileSize,
    files: [],
    submissionStatus: activity.studentSubmissionStatus,
    submissionGrade: activity.studentSubmissionGrade,
    submissionFeedback: activity.studentSubmissionFeedback,
    submissionDate: activity.studentSubmissionDate,
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

async function parseBody(init?: RequestInit, request?: Request) {
  const body = init?.body;
  if (!body && !request) return {};

  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }

  if (body instanceof FormData) {
    return Object.fromEntries(body.entries());
  }

  if (request) {
    try {
      return await request.clone().json();
    } catch {
      return {};
    }
  }

  return {};
}

function buildUserEmail(firstName: string, lastName: string, users: DemoUser[]) {
  const base = `${slugify(firstName)}.${slugify(lastName) || "usuario"}`.replace(/\.+/g, ".");
  let candidate = `${base}@escola.com`;
  let counter = 1;

  while (users.some((user) => user.email === candidate)) {
    candidate = `${base}${counter}@escola.com`;
    counter += 1;
  }

  return candidate;
}

function buildRegistration(role: DemoRole, users: DemoUser[]) {
  const prefix = getRolePrefix(role);
  const total = users.filter((user) => user.role === role).length + 1;
  return `${prefix}${String(total).padStart(3, "0")}`;
}

function requireUser(state: DemoState) {
  const user = getCurrentUser(state);
  if (!user) {
    return null;
  }

  return publicUser(user);
}

async function handleDemoApi(url: string, init?: RequestInit, request?: Request) {
  const parsed = new URL(url, window.location.origin);
  const path = parsed.pathname;
  const method = (init?.method || request?.method || "GET").toUpperCase();

  if (path === "/api/health") {
    return jsonResponse({ status: "ok", server: "SchoolManager Demo" });
  }

  if (path === "/api/auth/login" && method === "POST") {
    const body = (await parseBody(init, request)) as { email?: string; password?: string };
    const state = getState();
    const user = state.users.find((entry) => entry.email === body.email);

    if (!user || body.password !== DEMO_PASSWORD) {
      return jsonResponse({ message: "Credenciais inválidas" }, 401);
    }

    const next = updateState((draft) => {
      draft.currentUserId = user.id;
    });

    return jsonResponse({
      message: "Login successful",
      user: publicUser(next.users.find((entry) => entry.id === user.id)!),
    });
  }

  if (path === "/api/auth/user" && method === "GET") {
    const user = requireUser(getState());
    return user ? jsonResponse(user) : jsonResponse({ message: "Não autenticado" }, 401);
  }

  if (path === "/api/auth/logout" && method === "POST") {
    updateState((draft) => {
      draft.currentUserId = null;
    });
    return jsonResponse({ message: "Logout successful" });
  }

  if (path === "/api/profile" && method === "PUT") {
    const body = (await parseBody(init, request)) as Partial<DemoUser>;
    const next = updateState((draft) => {
      const current = getCurrentUser(draft);
      if (!current) return;
      current.firstName = body.firstName || current.firstName;
      current.lastName = body.lastName || current.lastName;
      current.email = body.email || current.email;
      current.phone = body.phone ?? current.phone;
      current.updatedAt = getNowIso();
    });
    const current = getCurrentUser(next);
    return current
      ? jsonResponse({ message: "Perfil atualizado com sucesso", user: publicUser(current) })
      : jsonResponse({ message: "Não autenticado" }, 401);
  }

  if (path === "/api/profile/password" && method === "PUT") {
    const body = (await parseBody(init, request)) as {
      currentPassword?: string;
    };

    if (body.currentPassword !== DEMO_PASSWORD) {
      return jsonResponse({ message: "Senha atual inválida" }, 400);
    }

    return jsonResponse({ message: "Senha alterada com sucesso" });
  }

  if (path === "/api/periods/current" && method === "GET") {
    const state = getState();
    return jsonResponse({ success: true, data: state.currentPeriod });
  }

  if (path === "/api/admin/dashboard" && method === "GET") {
    return jsonResponse({ data: buildAdminDashboard(getState()) });
  }

  if (path === "/api/admin/users" && method === "GET") {
    return jsonResponse({ data: buildAdminUsers(getState()) });
  }

  if (path === "/api/admin/users" && method === "POST") {
    const body = (await parseBody(init, request)) as Partial<DemoUser>;
    const next = updateState((draft) => {
      const role = (body.role as DemoRole) || "student";
      const firstName = body.firstName || "Novo";
      const lastName = body.lastName || "Usuário";
      const now = getNowIso();
      draft.users.push({
        id: `demo_${role}_${crypto.randomUUID().slice(0, 8)}`,
        email: body.email || buildUserEmail(firstName, lastName, draft.users),
        firstName,
        lastName,
        role,
        status: (body.status as DemoStatus) || "active",
        phone: body.phone ?? null,
        address: body.address ?? null,
        birthDate: body.birthDate ?? null,
        registrationNumber: buildRegistration(role, draft.users),
        profileImageUrl: null,
        createdAt: now,
        updatedAt: now,
      });
    });

    return jsonResponse({
      message: "Usuário criado com sucesso",
      data: buildAdminUsers(next),
    });
  }

  const adminUserMatch = path.match(/^\/api\/admin\/users\/([^/]+)$/);
  if (adminUserMatch && method === "PUT") {
    const [, userId] = adminUserMatch;
    const body = (await parseBody(init, request)) as Partial<DemoUser>;
    const next = updateState((draft) => {
      const target = draft.users.find((user) => user.id === userId);
      if (!target) return;
      target.firstName = body.firstName || target.firstName;
      target.lastName = body.lastName || target.lastName;
      target.role = (body.role as DemoRole) || target.role;
      target.status = (body.status as DemoStatus) || target.status;
      target.phone = body.phone ?? target.phone;
      target.address = body.address ?? target.address;
      target.email = body.email || target.email;
      target.updatedAt = getNowIso();
    });

    return jsonResponse({
      message: "Usuário atualizado com sucesso",
      data: buildAdminUsers(next),
    });
  }

  if (adminUserMatch && method === "DELETE") {
    const [, userId] = adminUserMatch;
    const body = (await parseBody(init, request)) as { password?: string };
    if (body.password !== DEMO_PASSWORD) {
      return jsonResponse({ message: "Senha inválida" }, 400);
    }

    const next = updateState((draft) => {
      draft.users = draft.users.filter((user) => user.id !== userId);
      delete draft.teacherAssignments[userId];
      draft.subjects = draft.subjects.filter((subject) => subject.teacherId !== userId);
      draft.activities = draft.activities.filter((activity) => activity.teacherId !== userId);
      draft.materials = draft.materials.filter((material) => material.teacherId !== userId);
      draft.exams = draft.exams.filter((exam) => exam.teacherId !== userId);
      if (draft.currentUserId === userId) {
        draft.currentUserId = null;
      }
    });

    return jsonResponse({
      message: "Usuário excluído com sucesso",
      data: buildAdminUsers(next),
    });
  }

  if (path === "/api/admin/teachers" && method === "GET") {
    return jsonResponse({ data: buildAdminTeachers(getState()) });
  }

  if (path === "/api/admin/teachers" && method === "POST") {
    const body = (await parseBody(init, request)) as {
      firstName?: string;
      lastName?: string;
      phone?: string;
      address?: string;
      subjects?: string[];
      classes?: string[];
    };

    const next = updateState((draft) => {
      const firstName = body.firstName || "Novo";
      const lastName = body.lastName || "Professor";
      const now = getNowIso();
      const teacherId = `demo_teacher_${crypto.randomUUID().slice(0, 8)}`;
      const email = buildUserEmail(firstName, lastName, draft.users);

      draft.users.push({
        id: teacherId,
        email,
        firstName,
        lastName,
        role: "teacher",
        status: "active",
        phone: body.phone ?? null,
        address: body.address ?? null,
        birthDate: null,
        registrationNumber: buildRegistration("teacher", draft.users),
        profileImageUrl: null,
        createdAt: now,
        updatedAt: now,
      });

      draft.teacherAssignments[teacherId] = {
        subjectIds: body.subjects || [],
        classIds: body.classes || [],
      };

      draft.subjects = draft.subjects.map((subject) =>
        body.subjects?.includes(subject.id)
          ? { ...subject, teacherId, linkedClassIds: body.classes?.length ? body.classes : subject.linkedClassIds }
          : subject,
      );
    });

    return jsonResponse({
      message: "Professor criado com sucesso",
      data: buildAdminTeachers(next),
    });
  }

  const teacherDetailsMatch = path.match(/^\/api\/admin\/teachers\/([^/]+)\/details$/);
  if (teacherDetailsMatch && method === "GET") {
    const details = buildTeacherDetails(getState(), teacherDetailsMatch[1]);
    return details ? jsonResponse(details) : jsonResponse({ message: "Professor não encontrado" }, 404);
  }

  const teacherAssignmentsMatch = path.match(/^\/api\/admin\/teachers\/([^/]+)\/assignments$/);
  if (teacherAssignmentsMatch && method === "GET") {
    return jsonResponse(buildTeacherAssignments(getState(), teacherAssignmentsMatch[1]));
  }

  if (teacherAssignmentsMatch && method === "PUT") {
    const teacherId = teacherAssignmentsMatch[1];
    const body = (await parseBody(init, request)) as { subjects?: string[]; classes?: string[] };
    updateState((draft) => {
      draft.teacherAssignments[teacherId] = {
        subjectIds: body.subjects || [],
        classIds: body.classes || [],
      };
      draft.subjects = draft.subjects.map((subject) =>
        body.subjects?.includes(subject.id)
          ? { ...subject, teacherId, linkedClassIds: body.classes?.length ? body.classes : subject.linkedClassIds }
          : subject,
      );
    });
    return jsonResponse({ message: "Vínculos atualizados com sucesso" });
  }

  const teacherUpdateMatch = path.match(/^\/api\/admin\/teachers\/([^/]+)$/);
  if (teacherUpdateMatch && method === "PUT") {
    const teacherId = teacherUpdateMatch[1];
    const body = (await parseBody(init, request)) as Partial<DemoUser>;
    updateState((draft) => {
      const teacher = draft.users.find((user) => user.id === teacherId && user.role === "teacher");
      if (!teacher) return;
      teacher.firstName = body.firstName || teacher.firstName;
      teacher.lastName = body.lastName || teacher.lastName;
      teacher.email = body.email || teacher.email;
      teacher.phone = body.phone ?? teacher.phone;
      teacher.address = body.address ?? teacher.address;
      teacher.birthDate = body.birthDate ?? teacher.birthDate;
      teacher.status = (body.status as DemoStatus) || teacher.status;
      teacher.updatedAt = getNowIso();
    });

    return jsonResponse({ message: "Professor atualizado com sucesso" });
  }

  if (path === "/api/admin/subjects" && method === "GET") {
    return jsonResponse({ data: buildAdminSubjects(getState()) });
  }

  if (path === "/api/admin/classes" && method === "GET") {
    return jsonResponse({ data: buildAdminClasses(getState()) });
  }

  if (path === "/api/admin/classes" && method === "POST") {
    const body = (await parseBody(init, request)) as Partial<DemoClass>;
    const next = updateState((draft) => {
      const now = getNowIso();
      draft.classes.push({
        id: `demo_class_${crypto.randomUUID().slice(0, 8)}`,
        name: body.name || "Nova Turma",
        grade: body.grade || "1º Ano",
        section: body.section || "A",
        academicYear: body.academicYear || "2026",
        capacity: Number(body.capacity) || 30,
        status: "active",
        coordinatorId: draft.users.find((user) => user.role === "coordinator")?.id || "browser_demo_coord",
        createdAt: now,
        updatedAt: now,
      });
    });
    return jsonResponse({ message: "Turma criada com sucesso", data: buildAdminClasses(next) });
  }

  const adminClassMatch = path.match(/^\/api\/admin\/classes\/([^/]+)$/);
  if (adminClassMatch && method === "PUT") {
    const classId = adminClassMatch[1];
    const body = (await parseBody(init, request)) as Partial<DemoClass>;
    updateState((draft) => {
      const target = draft.classes.find((item) => item.id === classId);
      if (!target) return;
      target.name = body.name || target.name;
      target.grade = body.grade || target.grade;
      target.section = body.section || target.section;
      target.academicYear = body.academicYear || target.academicYear;
      target.capacity = Number(body.capacity) || target.capacity;
      target.status = (body.status as DemoStatus) || target.status;
      target.updatedAt = getNowIso();
    });
    return jsonResponse({ message: "Turma atualizada com sucesso" });
  }

  const classDetailsMatch = path.match(/^\/api\/admin\/classes\/([^/]+)\/details$/);
  if (classDetailsMatch && method === "GET") {
    const details = buildClassDetails(getState(), classDetailsMatch[1]);
    return details ? jsonResponse(details) : jsonResponse({ message: "Turma não encontrada" }, 404);
  }

  const studentDetailsMatch = path.match(/^\/api\/admin\/students\/([^/]+)\/details$/);
  if (studentDetailsMatch && method === "GET") {
    const details = buildStudentDetails(getState(), studentDetailsMatch[1]);
    return details ? jsonResponse(details) : jsonResponse({ message: "Aluno não encontrado" }, 404);
  }

  if (path === "/api/admin/capabilities" && method === "GET") {
    return jsonResponse({
      data: {
        canManageAdmins: true,
        canTransferDirector: true,
      },
    });
  }

  const dependencyMatch = path.match(/^\/api\/users\/([^/]+)\/dependencies$/);
  if (dependencyMatch && method === "GET") {
    const userId = dependencyMatch[1];
    const state = getState();
    const user = state.users.find((item) => item.id === userId);
    const assignments = state.teacherAssignments[userId];
    const dependencyPayload =
      user?.role === "teacher"
        ? {
            classSubjects: assignments?.subjectIds.length ?? 0,
            activities: state.activities.filter((activity) => activity.teacherId === userId).length,
            exams: state.exams.filter((exam) => exam.teacherId === userId).length,
            materials: state.materials.filter((material) => material.teacherId === userId).length,
            isCoordinator: false,
          }
        : {
            classSubjects: 0,
            activities: 0,
            exams: 0,
            materials: 0,
            isCoordinator: user?.role === "coordinator",
          };

    return jsonResponse({
      hasDependencies:
        dependencyPayload.classSubjects > 0 ||
        dependencyPayload.activities > 0 ||
        dependencyPayload.exams > 0 ||
        dependencyPayload.materials > 0,
      dependencies: dependencyPayload,
      userRole: user?.role ?? "student",
    });
  }

  if (path === "/api/subjects" && method === "GET") {
    return jsonResponse(buildTeacherSubjects(getState()));
  }

  if (path === "/api/subjects" && method === "POST") {
    const body = (await parseBody(init, request)) as Partial<DemoSubject>;
    const next = updateState((draft) => {
      draft.subjects.push({
        id: `demo_subject_${crypto.randomUUID().slice(0, 8)}`,
        name: body.name || "Nova Disciplina",
        code: body.code || `COD-${draft.subjects.length + 1}`,
        description: body.description || "Disciplina criada no modo demo",
        status: "active",
        teacherId: draft.users.find((user) => user.role === "teacher")?.id || "browser_demo_teacher",
        linkedClassIds: draft.classes[0] ? [draft.classes[0].id] : [],
        createdAt: getNowIso(),
      });
    });
    return jsonResponse({ message: "Disciplina criada com sucesso", data: buildAdminSubjects(next) });
  }

  const adminSubjectMatch = path.match(/^\/api\/admin\/subjects\/([^/]+)$/);
  if (adminSubjectMatch && method === "PUT") {
    const subjectId = adminSubjectMatch[1];
    const body = (await parseBody(init, request)) as Partial<DemoSubject>;
    updateState((draft) => {
      const target = draft.subjects.find((subject) => subject.id === subjectId);
      if (!target) return;
      target.name = body.name || target.name;
      target.code = body.code || target.code;
      target.description = body.description || target.description;
      target.status = (body.status as DemoStatus) || target.status;
    });
    return jsonResponse({ message: "Disciplina atualizada com sucesso" });
  }

  const deleteSubjectMatch = path.match(/^\/api\/subjects\/([^/]+)$/);
  if (deleteSubjectMatch && method === "DELETE") {
    const body = (await parseBody(init, request)) as { password?: string };
    if (body.password !== DEMO_PASSWORD) {
      return jsonResponse({ message: "Senha inválida" }, 400);
    }

    updateState((draft) => {
      draft.subjects = draft.subjects.filter((subject) => subject.id !== deleteSubjectMatch[1]);
      draft.activities = draft.activities.filter((activity) => activity.subjectId !== deleteSubjectMatch[1]);
      draft.materials = draft.materials.filter((material) => material.subjectId !== deleteSubjectMatch[1]);
      draft.exams = draft.exams.filter((exam) => exam.subjectId !== deleteSubjectMatch[1]);
    });
    return jsonResponse({ message: "Disciplina excluída com sucesso" });
  }

  const deleteClassMatch = path.match(/^\/api\/classes\/([^/]+)$/);
  if (deleteClassMatch && method === "DELETE") {
    const body = (await parseBody(init, request)) as { password?: string };
    if (body.password !== DEMO_PASSWORD) {
      return jsonResponse({ message: "Senha inválida" }, 400);
    }

    updateState((draft) => {
      draft.classes = draft.classes.filter((item) => item.id !== deleteClassMatch[1]);
      draft.subjects = draft.subjects.map((subject) => ({
        ...subject,
        linkedClassIds: subject.linkedClassIds.filter((classId) => classId !== deleteClassMatch[1]),
      }));
      draft.activities = draft.activities.filter((activity) => activity.classId !== deleteClassMatch[1]);
      draft.materials = draft.materials.filter((material) => material.classId !== deleteClassMatch[1]);
      draft.exams = draft.exams.filter((exam) => exam.classId !== deleteClassMatch[1]);
    });
    return jsonResponse({ message: "Turma excluída com sucesso" });
  }

  if (path === "/api/student/class-info" && method === "GET") {
    return jsonResponse(buildStudentClassInfo(getState()));
  }

  if (path === "/api/student/activities" && method === "GET") {
    return jsonResponse(buildStudentActivities(getState()));
  }

  if (path === "/api/student/subjects" && method === "GET") {
    return jsonResponse(buildStudentSubjects(getState()));
  }

  if (path === "/api/materials/student" && method === "GET") {
    return jsonResponse(buildStudentMaterials(getState(), parsed.searchParams.get("subjectId")));
  }

  if (path === "/api/student/exams" && method === "GET") {
    return jsonResponse(buildStudentExams(getState()));
  }

  const activityDetailsMatch = path.match(/^\/api\/activities\/([^/]+)$/);
  if (activityDetailsMatch && method === "GET") {
    const details = buildActivityDetails(getState(), activityDetailsMatch[1]);
    return details ? jsonResponse(details) : jsonResponse({ message: "Atividade não encontrada" }, 404);
  }

  const activityFilesMatch = path.match(/^\/api\/activities\/([^/]+)\/files$/);
  if (activityFilesMatch && method === "GET") {
    return jsonResponse([]);
  }

  const classStudentsMatch = path.match(/^\/api\/classes\/([^/]+)\/students$/);
  if (classStudentsMatch && method === "GET") {
    return jsonResponse(buildClassStudents(getState(), classStudentsMatch[1]));
  }

  const coordinatorClassStudentsMatch = path.match(/^\/api\/coordinator\/classes\/([^/]+)\/students$/);
  if (coordinatorClassStudentsMatch && method === "GET") {
    return jsonResponse({ data: buildClassStudents(getState(), coordinatorClassStudentsMatch[1]) });
  }

  const teacherSubjectsMatch = path.match(/^\/api\/teacher\/([^/]+)\/subjects$/);
  if (teacherSubjectsMatch && method === "GET") {
    return jsonResponse(buildTeacherSubjectsForExams(getState(), teacherSubjectsMatch[1]));
  }

  const teacherClassesMatch = path.match(/^\/api\/teacher\/([^/]+)\/classes$/);
  if (teacherClassesMatch && method === "GET") {
    return jsonResponse(buildTeacherClasses(getState(), teacherClassesMatch[1]));
  }

  const teacherActivitiesMatch = path.match(/^\/api\/activities\/teacher\/([^/]+)$/);
  if (teacherActivitiesMatch && method === "GET") {
    return jsonResponse(buildTeacherActivities(getState(), teacherActivitiesMatch[1]));
  }

  const teacherMaterialsMatch = path.match(/^\/api\/materials\/teacher\/([^/]+)$/);
  if (teacherMaterialsMatch && method === "GET") {
    const folder = parsed.searchParams.get("folder");
    const materials = buildTeacherMaterials(getState(), teacherMaterialsMatch[1]);
    return jsonResponse(folder ? materials.filter((material) => material.folder === folder) : materials);
  }

  const teacherFoldersMatch = path.match(/^\/api\/materials\/teacher\/([^/]+)\/folders$/);
  if (teacherFoldersMatch && method === "GET") {
    return jsonResponse(buildTeacherFolders(getState(), teacherFoldersMatch[1]));
  }

  const teacherExamsMatch = path.match(/^\/api\/exams\/teacher\/([^/]+)$/);
  if (teacherExamsMatch && method === "GET") {
    return jsonResponse(buildTeacherExams(getState(), teacherExamsMatch[1]));
  }

  const teacherEventsMatch = path.match(/^\/api\/teacher\/([^/]+)\/events$/);
  if (teacherEventsMatch && method === "GET") {
    return jsonResponse(buildTeacherEvents(getState(), teacherEventsMatch[1]));
  }

  const examDetailsMatch = path.match(/^\/api\/exams\/([^/]+)$/);
  if (examDetailsMatch && method === "GET") {
    const details = buildExamDetails(getState(), examDetailsMatch[1]);
    return details ? jsonResponse(details) : jsonResponse({ message: "Prova não encontrada" }, 404);
  }

  const completeExamMatch = path.match(/^\/api\/exams\/([^/]+)\/complete$/);
  if (completeExamMatch && method === "PATCH") {
    updateState((draft) => {
      const exam = draft.exams.find((entry) => entry.id === completeExamMatch[1]);
      if (exam) {
        exam.status = "completed";
      }
    });
    return jsonResponse({ message: "Prova marcada como concluída" });
  }

  if (path === "/api/exams" && method === "GET") {
    return jsonResponse(buildTeacherExams(getState(), getTeacherUser(getState())?.id ?? "browser_demo_teacher"));
  }

  if (path === "/api/exams" && method === "POST") {
    const body = (await parseBody(init, request)) as Partial<DemoExam>;
    const next = updateState((draft) => {
      draft.exams.push({
        id: `demo_exam_${crypto.randomUUID().slice(0, 8)}`,
        title: body.title || "Nova Prova",
        description: body.description || "Prova criada no modo demonstração",
        subjectId: body.subjectId || draft.subjects[0]?.id || "browser_demo_subject_math",
        classId: body.classId || draft.classes[0]?.id || "browser_demo_class_9a",
        teacherId: draft.users.find((user) => user.role === "teacher")?.id || "browser_demo_teacher",
        examDate: body.examDate || getNowIso().slice(0, 10),
        duration: Number(body.duration) || 60,
        totalPoints: Number(body.totalPoints) || 10,
        semester: String(body.semester || "1"),
        bimonthly: String(body.bimonthly || draft.currentPeriod.period || "1"),
        status: "scheduled",
        createdAt: getNowIso(),
      });
    });
    return jsonResponse(buildTeacherExams(next, getTeacherUser(next)?.id ?? "browser_demo_teacher"));
  }

  if (examDetailsMatch && method === "DELETE") {
    updateState((draft) => {
      draft.exams = draft.exams.filter((entry) => entry.id !== examDetailsMatch[1]);
    });
    return jsonResponse({ message: "Prova excluída com sucesso" });
  }

  const examGradesMatch = path.match(/^\/api\/exams\/([^/]+)\/grades$/);
  if (examGradesMatch && (method === "POST" || method === "PUT")) {
    return jsonResponse({ message: "Notas salvas com sucesso" });
  }

  if (path === "/api/periods/all" && method === "GET") {
    return jsonResponse(buildPeriods(getState()));
  }

  if (path === "/api/periods" && method === "GET") {
    return jsonResponse(buildPeriods(getState()));
  }

  if (path === "/api/coordinator/dashboard" && method === "GET") {
    return jsonResponse(buildCoordinatorDashboard(getState()));
  }

  if (path === "/api/coordinator/students" && method === "GET") {
    return jsonResponse(buildCoordinatorStudents(getState()));
  }

  if (path === "/api/coordinator/teacher-stats" && method === "GET") {
    return jsonResponse(buildCoordinatorTeacherStats(getState()));
  }

  const coordinatorTeacherDetailsMatch = path.match(/^\/api\/coordinator\/teacher-details\/([^/]+)$/);
  if (coordinatorTeacherDetailsMatch && method === "GET") {
    return jsonResponse(buildCoordinatorTeacherDetails(getState(), coordinatorTeacherDetailsMatch[1]));
  }

  if (path === "/api/coordinator/activities" && method === "GET") {
    return jsonResponse(buildCoordinatorActivities(getState()));
  }

  if (path === "/api/coordinator/performance-simple" && method === "GET") {
    return jsonResponse(buildCoordinatorPerformanceSimple(getState()));
  }

  if (path === "/api/coordinator/submissions" && method === "GET") {
    return jsonResponse(buildCoordinatorSubmissions(getState()));
  }

  if (path === "/api/coordinator/exam-grades" && method === "GET") {
    return jsonResponse(buildCoordinatorExamGrades(getState()));
  }

  if (path === "/api/coordinator/calendar/events" && method === "GET") {
    return jsonResponse({
      data: getState().events.map((event) => ({
        ...event,
        creatorName: event.creatorName ?? "Coordenação",
        color: event.color ?? "#F97316",
        isGlobal: event.isGlobal ?? true,
      })),
    });
  }

  if (path === "/api/coordinator/classes" && method === "GET") {
    return jsonResponse(buildCoordinatorClasses(getState()));
  }

  const coordinatorGlobalEventMatch = path.match(/^\/api\/coordinator\/global-events\/([^/]+)$/);
  if (coordinatorGlobalEventMatch && method === "DELETE") {
    updateState((draft) => {
      draft.events = draft.events.filter((event) => event.id !== coordinatorGlobalEventMatch[1]);
    });
    return jsonResponse({ message: "Evento excluído com sucesso" });
  }

  if (path === "/api/coordinator/system/status" && method === "GET") {
    return jsonResponse(buildSystemStatus());
  }

  if (path === "/api/director/dashboard" && method === "GET") {
    return jsonResponse(buildDirectorDashboard(getState()));
  }

  const studentEventsMatch = path.match(/^\/api\/student\/([^/]+)\/events$/);
  if (studentEventsMatch && method === "GET") {
    return jsonResponse(buildStudentEvents(getState()));
  }

  if (path === "/api/users" && method === "GET") {
    const role = parsed.searchParams.get("role");
    return jsonResponse(role ? buildUsersByRole(getState(), role) : buildAdminUsers(getState()));
  }

  if (path === "/api/classes" && method === "GET") {
    return jsonResponse(buildClassesList(getState()));
  }

  if (path === "/api/events" && method === "POST") {
    const body = (await parseBody(init, request)) as Partial<DemoEvent> & { classIds?: string[] };
    const classes = body.isGlobal ? [undefined] : (body.classIds && body.classIds.length > 0 ? body.classIds : [body.classId]);

    const next = updateState((draft) => {
      classes.forEach((classId) => {
        const targetClass = draft.classes.find((item) => item.id === classId);
        draft.events.push({
          id: `demo_event_${crypto.randomUUID().slice(0, 8)}`,
          title: body.title || "Novo Evento",
          description: body.description || "",
          startDate: body.startDate || getNowIso().slice(0, 10),
          endDate: body.endDate || body.startDate || getNowIso().slice(0, 10),
          startTime: body.startTime || "08:00",
          endTime: body.endTime || body.startTime || "09:00",
          location: body.location || "Escola",
          type: body.type || "event",
          color: body.color || "#F97316",
          isGlobal: body.isGlobal ?? true,
          classId: classId,
          className: targetClass?.name,
          subjectName: body.subjectName || "Coordenação",
          customType: body.customType,
          createdBy: body.createdBy || getCoordinatorUser(draft)?.id || "browser_demo_coord",
          creatorName: "Coordenação",
          createdAt: getNowIso(),
          status: "active",
        });
      });
    });

    return jsonResponse({ message: "Evento criado com sucesso", data: next.events });
  }

  if (path === "/api/calendar/events" && method === "GET") {
    return jsonResponse(buildCalendarEvents(getState()));
  }

  return jsonResponse(
    {
      message: `Modo demonstração: rota não implementada (${method} ${path})`,
    },
    404,
  );
}

function shouldHandle(url: string) {
  if (!isStaticDemo) return false;

  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.pathname.startsWith("/api/");
  } catch {
    return false;
  }
}

let installed = false;

export function installDemoApi() {
  if (!isStaticDemo || installed || typeof window === "undefined") {
    return;
  }

  installed = true;
  const nativeFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    if (shouldHandle(url)) {
      return handleDemoApi(url, init, input instanceof Request ? input : undefined);
    }

    return nativeFetch(input, init);
  };
}

export function resetDemoApiState() {
  saveState(clone(seedState));
}
