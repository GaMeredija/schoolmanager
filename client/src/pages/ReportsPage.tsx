import { useState, useMemo, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import TeacherLayout from "@/components/layout/TeacherLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useStudentGrades } from "@/hooks/useStudentGrades";
import jsPDF from "jspdf";
import { 
  DownloadCloud, 
  BarChart3, 
  FileText, 
  Users, 
  UserRound, 
  BookOpen, 
  GraduationCap,
  AlertCircle
} from "lucide-react";
import { PerformanceChart } from "@/components/charts/PerformanceChart";
import { GradeDistributionChart } from "@/components/charts/GradeDistributionChart";
import { AttendanceChart } from "@/components/charts/AttendanceChart";

// Mock data - in a real application, this would be fetched from the API
const CLASSES = [
  "Todas",
  "9º Ano - A",
  "9º Ano - B",
  "8º Ano - A",
  "8º Ano - B",
  "7º Ano - A",
  "7º Ano - B",
  "7º Ano - C",
  "6º Ano - A",
  "6º Ano - B"
];

const PERIODS_FALLBACK = ["1º Bimestre","2º Bimestre","3º Bimestre","4º Bimestre","Anual"];

const SUBJECTS = [
  "Todas",
  "Matemática",
  "Português",
  "Ciências",
  "História",
  "Geografia",
  "Inglês",
  "Artes",
  "Educação Física"
];

// Sample students with low performance
const LOW_PERFORMANCE_STUDENTS = [
  { id: 1, name: "Ana Ferreira", class: "9º Ano - A", average: 4.8, attendance: "75%", subjects: ["Matemática", "Física"] },
  { id: 2, name: "Pedro Santos", class: "8º Ano - C", average: 5.2, attendance: "68%", subjects: ["Português", "História"] },
  { id: 3, name: "João Silva", class: "7º Ano - B", average: 5.5, attendance: "72%", subjects: ["Matemática"] },
  { id: 4, name: "Mariana Oliveira", class: "6º Ano - A", average: 5.8, attendance: "70%", subjects: ["Ciências", "Geografia"] },
  { id: 5, name: "Lucas Costa", class: "9º Ano - B", average: 4.5, attendance: "65%", subjects: ["Matemática", "Física", "Química"] }
];

// Sample attendance issues
const ATTENDANCE_ISSUES = [
  { id: 1, name: "Carlos Mendes", class: "8º Ano - A", attendance: "60%", consecutive_absences: 5, last_attendance: "10/07/2023" },
  { id: 2, name: "Julia Pereira", class: "7º Ano - C", attendance: "65%", consecutive_absences: 4, last_attendance: "12/07/2023" },
  { id: 3, name: "Roberto Lima", class: "9º Ano - B", attendance: "62%", consecutive_absences: 3, last_attendance: "11/07/2023" },
  { id: 4, name: "Camila Ferreira", class: "6º Ano - B", attendance: "68%", consecutive_absences: 4, last_attendance: "13/07/2023" }
];

// Sample class performance data
const CLASS_PERFORMANCE = [
  { class_name: "9º Ano - A", students: 32, average: 7.8, attendance: "92%", passing_rate: "90%" },
  { class_name: "9º Ano - B", students: 30, average: 7.5, attendance: "88%", passing_rate: "87%" },
  { class_name: "8º Ano - A", students: 28, average: 7.9, attendance: "90%", passing_rate: "93%" },
  { class_name: "8º Ano - B", students: 31, average: 7.2, attendance: "85%", passing_rate: "84%" },
  { class_name: "8º Ano - C", students: 29, average: 6.8, attendance: "80%", passing_rate: "75%" },
  { class_name: "7º Ano - A", students: 33, average: 8.0, attendance: "93%", passing_rate: "94%" },
  { class_name: "7º Ano - B", students: 32, average: 7.5, attendance: "89%", passing_rate: "88%" },
  { class_name: "7º Ano - C", students: 30, average: 7.1, attendance: "84%", passing_rate: "82%" },
  { class_name: "6º Ano - A", students: 34, average: 8.2, attendance: "95%", passing_rate: "97%" },
  { class_name: "6º Ano - B", students: 33, average: 7.9, attendance: "91%", passing_rate: "91%" }
];

// Sample teacher performance data
const TEACHER_PERFORMANCE = [
  { teacher: "Marcos Silva", subject: "Matemática", classes: 5, students: 150, average: 7.5, approval_rate: "85%" },
  { teacher: "Carla Mendes", subject: "Ciências", classes: 6, students: 180, average: 7.8, approval_rate: "88%" },
  { teacher: "Roberto Lima", subject: "História", classes: 4, students: 120, average: 8.0, approval_rate: "90%" },
  { teacher: "Ana Ferreira", subject: "Português", classes: 5, students: 150, average: 7.7, approval_rate: "87%" },
  { teacher: "Pedro Santos", subject: "Geografia", classes: 4, students: 120, average: 7.9, approval_rate: "89%" }
];

export default function ReportsPage() {
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("Anual");
  const [selectedSubject, setSelectedSubject] = useState<string>("Todas");
  const [activeTab, setActiveTab] = useState<string>("class");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Get user type from the authenticated user
  const userType = user?.role || 'admin';
  const isCoordinatorOrAdmin = userType === 'admin' || userType === 'coordinator';
  const isTeacher = userType === 'teacher';

  const [attendanceSubjectId, setAttendanceSubjectId] = useState<string>("");
  const [attendanceView, setAttendanceView] = useState<string>("all");
  const [attendanceStudentId, setAttendanceStudentId] = useState<string>("");

  const { data: currentPeriodData } = useQuery({
    queryKey: ['period-current'],
    queryFn: async () => {
      const res = await fetch('/api/periods/current', { credentials: 'include' });
      if (!res.ok) return null;
      return res.json();
    }
  });
  const { data: openPeriodsData } = useQuery({
    queryKey: ['period-all'],
    queryFn: async () => {
      const res = await fetch('/api/periods/all', { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    }
  });
  const periodOptions: string[] = (() => {
    const list: any[] = Array.isArray(openPeriodsData) ? (openPeriodsData as any[]) : (((openPeriodsData as any)?.data as any[]) || []);
    const names = list.map((p: any) => (p.name ? String(p.name) : (p.period ? `${p.period}º Bimestre` : ''))).filter((n: string) => n.length > 0);
    const unique = Array.from(new Set(names));
    const current = (currentPeriodData?.data ? (currentPeriodData as any).data?.name || ((currentPeriodData as any).data?.period ? `${(currentPeriodData as any).data?.period}º Bimestre` : null) : (currentPeriodData?.name || (currentPeriodData?.period ? `${currentPeriodData.period}º Bimestre` : null)));
    if (current && !unique.includes(current)) unique.unshift(current);
    if (unique.length === 0) return PERIODS_FALLBACK;
    return [...unique, 'Anual'];
  })();
  const toQuarter = (label: string) => {
    if (label.startsWith('1')) return '1';
    if (label.startsWith('2')) return '2';
    if (label.startsWith('3')) return '3';
    if (label.startsWith('4')) return '4';
    return '';
  };

  const { data: classesData } = useQuery({
    queryKey: ['report-classes', userType, user?.id],
    queryFn: async () => {
      if (isTeacher) {
        const res = await fetch(`/api/teacher/${user?.id}/classes`, { credentials: 'include' });
        if (!res.ok) throw new Error('Erro ao buscar turmas do professor');
        return res.json();
      }
      const res = await fetch('/api/coordinator/classes', { credentials: 'include' });
      if (!res.ok) throw new Error('Erro ao buscar turmas');
      return res.json();
    }
  });
  const classesApi = classesData?.data || [];
  const classesList = (classesApi as any[]).map((c: any) => ({
    id: c.classId ? c.classId : c.id,
    name: c.className ? c.className : c.name
  }));

  const { data: studentsData } = useQuery({
    queryKey: ['report-class-students', selectedClass, userType, user?.id],
    queryFn: async () => {
      if (!selectedClass) return [];
      if (isCoordinatorOrAdmin) {
        const res = await fetch(`/api/coordinator/classes/${selectedClass}/students`, { credentials: 'include' });
        if (!res.ok) throw new Error('Erro ao buscar alunos');
        return res.json();
      }
      if (isTeacher) {
        const res = await fetch(`/api/classes/${selectedClass}/students`, { credentials: 'include' });
        if (!res.ok) throw new Error('Erro ao buscar alunos');
        return res.json();
      }
      return [];
    },
    enabled: !!selectedClass && selectedClass !== 'Todas'
  });
  const studentsList = Array.isArray(studentsData) ? (studentsData as any[]) : (((studentsData as any)?.data) || []);

  const { data: teacherSubjectsData } = useQuery({
    queryKey: ['teacher-subjects', user?.id],
    queryFn: async () => {
      const res = await fetch(`/api/teacher/${user?.id}/subjects`, { credentials: 'include' });
      if (!res.ok) throw new Error('Erro ao buscar disciplinas do professor');
      return res.json();
    },
    enabled: isTeacher && !!user?.id
  });
  const teacherSubjectsList = (teacherSubjectsData?.data || []) as any[];
  const subjectsFromTeacherClasses = isTeacher ? (classesApi as any[]).filter((c: any) => String(c.classId) === String(selectedClass)).map((c: any) => ({ id: c.subjectId, name: c.subjectName })) : [];
  const subjectsFromTeacherEndpoint = teacherSubjectsList.filter((s: any) => String(s.classId) === String(selectedClass)).map((s: any) => ({ id: s.subjectId, name: s.subjectName }));
  const subjectsForSelectedClass = subjectsFromTeacherEndpoint.length > 0 ? subjectsFromTeacherEndpoint : subjectsFromTeacherClasses;

  useEffect(() => {
    setAttendanceSubjectId("");
    setGradesSubjectId("");
    setSelectedStudentId("");
  }, [selectedClass]);

  

  const { data: attendanceSummaryData } = useQuery({
    queryKey: ['attendance-summary', selectedClass, attendanceSubjectId],
    queryFn: async () => {
      const res = await fetch(`/api/attendance/class/${selectedClass}/subject/${attendanceSubjectId}/summary`, { credentials: 'include' });
      if (!res.ok) throw new Error('Erro ao buscar frequência');
      return res.json();
    },
    enabled: isTeacher && !!selectedClass && !!attendanceSubjectId && attendanceView === 'all'
  });
  const attendanceSummaryRows = (attendanceSummaryData?.data || []) as any[];

  const { data: attendanceDetailData } = useQuery({
    queryKey: ['attendance-detail', selectedClass, attendanceSubjectId, attendanceStudentId],
    queryFn: async () => {
      const res = await fetch(`/api/attendance/class/${selectedClass}/subject/${attendanceSubjectId}/student/${attendanceStudentId}/list`, { credentials: 'include' });
      if (!res.ok) throw new Error('Erro ao buscar frequência do aluno');
      return res.json();
    },
    enabled: isTeacher && !!selectedClass && !!attendanceSubjectId && attendanceView === 'student' && !!attendanceStudentId
  });
  const attendanceDetailRows = (attendanceDetailData?.data || []) as any[];

  const { data: teacherSummary } = useQuery({
    queryKey: ['teacher-summary', user?.id, selectedClass, selectedPeriod],
    queryFn: async () => {
      const q = toQuarter(selectedPeriod);
      const classParam = selectedClass && selectedClass !== 'Todas' ? `classId=${selectedClass}` : '';
      const url = `/api/teacher/${user?.id}/reports/summary${q || classParam ? `?${[q ? `quarter=${q}` : '', classParam].filter(Boolean).join('&')}` : ''}`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Erro ao buscar resumo');
      return res.json();
    },
    enabled: isTeacher && !!user?.id
  });
  const summaryData = teacherSummary?.data || { totalStudents: 0, avgPerformance: 0, attendanceRate: 0, approvalRate: 0 };

  const { data: perfByClassData } = useQuery({
    queryKey: ['teacher-perf-class', user?.id, selectedPeriod],
    queryFn: async () => {
      const q = toQuarter(selectedPeriod);
      const url = `/api/teacher/${user?.id}/reports/performance-by-class${q ? `?quarter=${q}` : ''}`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Erro ao buscar desempenho por turma');
      return res.json();
    },
    enabled: isTeacher && !!user?.id
  });
  const perfClassList = perfByClassData?.data || [];
  const perfLabels = (perfClassList as any[]).map((c: any) => c.className);
  const perfSeriesA = (perfClassList as any[]).map((c: any) => Number(c.average || 0));
  const attendanceLabels = (perfClassList as any[]).map((c: any) => c.className);
  const attendanceValues = (perfClassList as any[]).map((c: any) => Number(String(c.attendance || '').replace('%','')));

  const { data: gradesDistData } = useQuery({
    queryKey: ['teacher-grades-dist', user?.id, selectedPeriod],
    queryFn: async () => {
      const q = toQuarter(selectedPeriod);
      const url = `/api/teacher/${user?.id}/reports/grades-distribution${q ? `?quarter=${q}` : ''}`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Erro ao buscar distribuição');
      return res.json();
    },
    enabled: isTeacher && !!user?.id
  });
  const gradeBuckets = gradesDistData?.data || undefined;
  const { data: subjectsPerfData } = useQuery({
    queryKey: ['teacher-subjects-performance', user?.id, selectedClass, selectedPeriod],
    queryFn: async () => {
      const q = toQuarter(selectedPeriod);
      const classParam = selectedClass && selectedClass !== 'Todas' ? `classId=${selectedClass}` : '';
      const url = `/api/teacher/${user?.id}/reports/subjects-performance${q || classParam ? `?${[q ? `quarter=${q}` : '', classParam].filter(Boolean).join('&')}` : ''}`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Erro ao buscar desempenho por disciplina');
      return res.json();
    },
    enabled: isTeacher && !!user?.id
  });
  const subjectsPerfList = subjectsPerfData?.data || [];
  const bestSubjects = [...subjectsPerfList].sort((a: any, b: any) => (b.average || 0) - (a.average || 0)).slice(0, 5);
  const criticalSubjects = [...subjectsPerfList].sort((a: any, b: any) => (a.average || 0) - (b.average || 0)).slice(0, 5);

  const { data: lowPerfData } = useQuery({
    queryKey: ['teacher-low-performance', user?.id, selectedPeriod],
    queryFn: async () => {
      const q = toQuarter(selectedPeriod);
      const url = `/api/teacher/${user?.id}/reports/low-performance${q ? `?quarter=${q}` : ''}`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Erro ao buscar baixo desempenho');
      return res.json();
    },
    enabled: isTeacher && !!user?.id
  });
  const lowPerformanceList = lowPerfData?.data || [];

  const { data: lowAttData } = useQuery({
    queryKey: ['teacher-low-attendance', user?.id, selectedPeriod],
    queryFn: async () => {
      const url = `/api/teacher/${user?.id}/reports/low-attendance`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Erro ao buscar baixa frequência');
      return res.json();
    },
    enabled: isTeacher && !!user?.id
  });
  const lowAttendanceList = lowAttData?.data || [];

  const { data: studentGrades } = useStudentGrades(selectedStudentId);
  const groupedGrades = useMemo(() => {
    const list = studentGrades || [];
    const bySubject: Record<string, { subject: string; grades: any[]; average: number }> = {};
    for (const g of list as any[]) {
      const subject = g.subjectName || 'Disciplina';
      if (!bySubject[subject]) bySubject[subject] = { subject, grades: [], average: 0 };
      bySubject[subject].grades.push(g);
    }
    Object.values(bySubject).forEach((s) => {
      const total = s.grades.reduce((acc, it) => acc + (it.grade || 0), 0);
      const count = s.grades.length || 1;
      s.average = Number((total / count).toFixed(2));
    });
    return Object.values(bySubject);
  }, [studentGrades]);

  const [gradesSubjectId, setGradesSubjectId] = useState<string>("");
  const [gradesView, setGradesView] = useState<string>("all");
  useEffect(() => {
    if (gradesView === 'student' && !selectedStudentId && studentsList.length === 1) {
      const only = studentsList[0];
      if (only?.id) setSelectedStudentId(String(only.id));
    }
  }, [gradesView, studentsList, selectedStudentId]);
  const { data: bimonthlySummaryData } = useQuery({
    queryKey: ['bimonthly-summary', user?.id, selectedClass, gradesSubjectId],
    queryFn: async () => {
      const res = await fetch(`/api/teacher/${user?.id}/grades/class/${selectedClass}/subject/${gradesSubjectId}/bimonthly-summary`, { credentials: 'include' });
      if (!res.ok) throw new Error('Erro ao buscar boletins');
      return res.json();
    },
    enabled: isTeacher && !!user?.id && !!selectedClass && !!gradesSubjectId && gradesView === 'all'
  });
  const bimonthlySummaryRows = (bimonthlySummaryData?.data || []) as any[];
  const { data: bimonthlyDetailData } = useQuery({
    queryKey: ['bimonthly-detail', user?.id, selectedClass, gradesSubjectId, selectedStudentId],
    queryFn: async () => {
      const res = await fetch(`/api/teacher/${user?.id}/grades/class/${selectedClass}/subject/${gradesSubjectId}/student/${selectedStudentId}/bimonthly-detail`, { credentials: 'include' });
      if (!res.ok) throw new Error('Erro ao buscar detalhes do boletim');
      return res.json();
    },
    enabled: isTeacher && !!user?.id && !!selectedClass && !!gradesSubjectId && gradesView === 'student' && !!selectedStudentId
  });
  const bimonthlyDetail = (bimonthlyDetailData?.data || {}) as any;

  const renderBoletimPage = (
    doc: jsPDF,
    logoData: string | undefined,
    studentName: string,
    className: string,
    periodLabel: string,
    rows: Array<{ sname: string; q1?: number; q2?: number; q3?: number; q4?: number; avg?: number; att: number; sit: string }>,
    birthDate?: string
  ) => {
    const left = 15;
    const right = 195;
    const width = right - left;
    doc.setTextColor(0, 0, 0);
    doc.setDrawColor(0, 0, 0);
    // Cabeçalho preto e branco
    doc.rect(left, 12, width, 22);
    if (logoData) { try { doc.addImage(logoData, 'PNG', left + 6, 14, 24, 18); } catch {} }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Boletim Escolar', 105, 26, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const infoY = 36;
    const infoH = 28;
    const midX = left + width / 2;
    doc.rect(left, infoY, width, infoH);
    doc.line(midX, infoY, midX, infoY + infoH);
    const formatDateBR = (iso?: string) => {
      if (!iso) return '-';
      const d = new Date(iso);
      if (!isNaN(d.getTime())) {
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = String(d.getFullYear());
        return `${dd}/${mm}/${yyyy}`;
      }
      // tenta dd/mm/yyyy
      if (iso.includes('/')) return iso;
      return '-';
    };
    doc.text(`Escola: SchoolManager`, left + 2, infoY + 7);
    doc.text(`Aluno: ${studentName}`, left + 2, infoY + 15);
    doc.text(`Curso: ${className || ''}`, left + 2, infoY + 23);
    doc.text(`Data de Nascimento: ${formatDateBR(birthDate)}`, midX + 2, infoY + 7);
    doc.text(`Série/Etapa: ${className || ''}`, midX + 2, infoY + 15);
    doc.text(`Ano Letivo: ${periodLabel}`, midX + 2, infoY + 23);
    doc.setDrawColor(0, 0, 0);

    // Definição de colunas (mm)
    const colW = {
      subj: 55,
      q: 15,
      avg: 18,
      freq: 18,
      sit: 0
    };
    const colX = [left, left + colW.subj, left + colW.subj + colW.q, left + colW.subj + colW.q * 2, left + colW.subj + colW.q * 3, left + colW.subj + colW.q * 4, left + colW.subj + colW.q * 4 + colW.avg, left + colW.subj + colW.q * 4 + colW.avg + colW.freq, right];
    let y = 70;
    const headerH = 10;
    // Header row: desenhar caixas por célula
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    const headers = ['Componente Curricular', '1ª AV', '2ª AV', '3ª AV', '4ª AV', 'Média Anual', 'Freq. Anual', 'Situação'];
    for (let i = 0; i < 8; i++) {
      const x0 = colX[i];
      const w0 = colX[i + 1] - colX[i];
      doc.rect(x0, y - headerH + 2, w0, headerH);
      const tx = x0 + w0 / 2;
      const alignCenter = i === 0 ? undefined : 'center';
      doc.text(headers[i], alignCenter ? tx : x0 + 2, y, alignCenter ? { align: 'center' } : undefined);
    }
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const rowH = 7;
    
    const avgVals: number[] = [];
    const attVals: number[] = [];
    for (const r of rows) {
      // textos
      doc.text(String(r.sname), colX[0] + 2, y);
      const center = (idx: number, val: string) => doc.text(val, colX[idx] + (colX[idx + 1] - colX[idx]) / 2, y, { align: 'center' });
      center(1, r.q1 != null ? String(r.q1) : '-');
      center(2, r.q2 != null ? String(r.q2) : '-');
      center(3, r.q3 != null ? String(r.q3) : '-');
      center(4, r.q4 != null ? String(r.q4) : '-');
      center(5, r.avg != null ? String(r.avg) : '-');
      center(6, `${Number(r.att || 0).toFixed(0)}%`);
      center(7, String(r.sit));
      if (typeof r.avg === 'number') avgVals.push(r.avg);
      attVals.push(r.att || 0);
      y += rowH;
      if (y > 240) { doc.addPage(); y = 20; }
    }
    // bordas externas da tabela
    doc.rect(left, 70 - headerH + 2, width, (y - (70 - headerH + 2)));
    for (let i = 1; i <= 7; i++) {
      doc.line(colX[i], 70 - headerH + 2, colX[i], y);
    }
    const overallAvg = avgVals.length ? Number((avgVals.reduce((a, b) => a + b, 0) / avgVals.length).toFixed(1)) : 0;
    const overallAtt = attVals.length ? Number((attVals.reduce((a, b) => a + b, 0) / attVals.length).toFixed(0)) : 0;
    const sitOverall = overallAvg >= 6 && overallAtt >= 75 ? 'Aprovado' : overallAvg < 5 || overallAtt < 75 ? 'Reprovado' : 'Recuperação';
    const freqRowH = 10;
    doc.rect(left, y + 2, width, freqRowH);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Frequência Anual', left + 2, y + 8);
    doc.text(`${String(overallAtt)}%`, colX[6] + (colX[7] - colX[6]) / 2, y + 8, { align: 'center' });
    y += freqRowH + 6;

    
    y += 6;
    doc.setFont('helvetica', 'bold');
    const resH = 14;
    doc.rect(left, y, width, resH);
    doc.text(`Resultado Final: ${sitOverall}`, left + 2, y + 9);
    y += resH + 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const depH = 22;
    doc.text('Dependência de Estudos', left, y);
    y += 2;
    doc.rect(left, y, width, depH);
    y += depH + 6;
    doc.text('Observações', left, y);
    y += 6;
    doc.setFontSize(9);
    const obs = [
      '• Este boletim é válido somente com assinatura da direção.',
      '• As médias consideram avaliações por bimestre conforme regulamento escolar.',
      '• Frequência mínima exigida: 75%.'
    ];
    let oy = y;
    for (const t of obs) { doc.text(t, left + 2, oy); oy += 5; }
    y = oy + 6;
    doc.setFontSize(10);
    doc.text('Informações', left, y);
    y += 6;
    doc.setFontSize(9);
    const infos = [
      '• Recuperação ocorre conforme calendário e normas internas.',
      '• Em caso de dependência, o aluno será convocado ao programa específico.'
    ];
    let iy = y;
    for (const t of infos) { doc.text(t, left + 2, iy); iy += 5; }
    const pageH = (doc as any).internal.pageSize.getHeight ? (doc as any).internal.pageSize.getHeight() : (doc.internal as any).pageSize.getHeight();
    const bottomMargin = 20;
    const ySig = pageH - bottomMargin;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = String(now.getFullYear());
    doc.text('Assinaturas', left, ySig - 14);
    doc.text(`Data: ${dd}/${mm}/${yyyy}`, right - 34, ySig - 14);
    doc.line(left, ySig, left + width / 3 - 10, ySig);
    doc.text('Responsável', left + 2, ySig + 6);
    doc.line(105 - width / 6, ySig, 105 + width / 6, ySig);
    doc.text('Secretário(a)', 105 - 14, ySig + 6);
    doc.line(right - (width / 3 - 10), ySig, right, ySig);
    doc.text('Diretor(a)', right - 24, ySig + 6);
  };

  const downloadStudentReportPDF = async () => {
    if (!selectedStudentId) return;
    const student = studentsList.find((s: any) => s.id === selectedStudentId);
    const klass = classesList.find((c: any) => c.id === selectedClass);
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    doc.setTextColor(0, 0, 0);
    doc.setDrawColor(0, 0, 0);

    const line = (y: number) => doc.line(15, y, 195, y);
    const text = (str: string, x: number, y: number, opts?: any) => doc.text(str, x, y, opts);

    let logoData: string | undefined;
    try {
      const resLogo = await fetch('/assets/logo-transparent.png');
      if (resLogo.ok) {
        const buf = await resLogo.arrayBuffer();
        const b64 = btoa(Array.from(new Uint8Array(buf)).map((b) => String.fromCharCode(b)).join(''));
        logoData = `data:image/png;base64,${b64}`;
      }
    } catch {}
    const studentName = student ? `${student.firstName} ${student.lastName}` : '';
    const className = klass ? klass.name : '';

    const gradesRes = await fetch(`/api/grades/student/${selectedStudentId}`, { credentials: 'include' });
    const gradesList = gradesRes.ok ? await gradesRes.json() : [];
    const attRes = await fetch(`/api/attendance/student/${selectedStudentId}`, { credentials: 'include' });
    const attJson = attRes.ok ? await attRes.json() : {};
    const attMap = new Map<string, number>();
    (attJson?.statsBySubject || []).forEach((s: any) => {
      const rate = s.totalClasses > 0 ? Math.round((Number(s.presentClasses || 0) / Number(s.totalClasses || 0)) * 100) : 0;
      attMap.set(String(s.subjectName), rate);
    });
    // Períodos do diretor (para mapear as notas por bimestre/semestre)
    let periodsAll: Array<{ startDate: string; endDate: string; name?: string; academicYear?: string; period?: number }> = [];
    try {
      const resPeriods = await fetch('/api/periods/all', { credentials: 'include' });
      if (resPeriods.ok) {
        const json = await resPeriods.json();
        periodsAll = (json?.data || []) as any[];
      }
    } catch {}
    const parsePeriodInfo = (p: any) => {
      const start = new Date(p.startDate);
      const end = new Date(p.endDate);
      let year: string = String(p.academicYear || start.getFullYear() || '');
      let num: number | undefined = typeof p.period === 'number' ? p.period : undefined;
      const name: string = String(p.name || '');
      const m = name.match(/(\\d+)\\D*Bimestre\\s*(\\d{4})?/i);
      if (!num && m) num = Number(m[1]);
      if (!year && m && m[2]) year = String(m[2]);
      return { start, end, year, num };
    };
    const normalizedPeriods = periodsAll.map(parsePeriodInfo).filter((p) => !isNaN(p.start.getTime()) && !isNaN(p.end.getTime()));
    const toPeriodByDirector = (dateStr?: string, fallbackStr?: string, yearHint?: string) => {
    const parseD = (s?: string) => {
        if (!s) return undefined;
        if (s.includes('/')) {
          const [dd, mm, yyyy] = s.split('/');
        const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
          if (!isNaN(d.getTime())) return d;
        }
      const num = Number(s);
      if (!isNaN(num) && isFinite(num)) {
        const d = new Date(num);
        return isNaN(d.getTime()) ? undefined : d;
      }
      const d = new Date(s as any);
        return isNaN(d.getTime()) ? undefined : d;
      };
      const d = parseD(dateStr) || parseD(fallbackStr);
      if (!d) return undefined;
      const y = String(yearHint || d.getFullYear());
      const match = normalizedPeriods.find((p) => String(p.year) === y && d >= p.start && d <= p.end);
      return match?.num;
    };

  const toQuarterByDate = (dstr: string, fallback?: string) => {
    const parseMonth = (s?: string) => {
      if (!s) return undefined;
      if (s.includes('/')) {
        const [dd, mm, yyyy] = s.split('/');
        const m = Number(mm);
        if (m >= 1 && m <= 12) return m;
      }
      const num = Number(s);
      if (!isNaN(num) && isFinite(num)) {
        const d = new Date(num);
        if (!isNaN(d.getTime())) return d.getMonth() + 1;
      }
      const d = new Date(s);
      if (!isNaN(d.getTime())) return d.getMonth() + 1;
      return undefined;
    };
    const m = parseMonth(dstr) ?? parseMonth(fallback);
    if (!m) return 4;
    if (m <= 3) return 1;
    if (m <= 6) return 2;
    if (m <= 9) return 3;
    return 4;
  };
    let subjects = Array.from(new Set((gradesList as any[]).map((g: any) => String(g.subjectName)).concat(Array.from(attMap.keys()))));
    if (selectedSubject && selectedSubject !== 'Todas') {
      const normalizeName = (s: string) => s.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').trim().toLowerCase();
      const target = normalizeName(selectedSubject);
      subjects = subjects.filter((n) => normalizeName(n) === target);
      if (subjects.length === 0) subjects = [selectedSubject];
    }
    const rows = subjects.map((sname) => {
      const list = (gradesList as any[]).filter((g: any) => String(g.subjectName) === sname);
      const buckets: Record<number, { sum: number; w: number }> = { 1: { sum: 0, w: 0 }, 2: { sum: 0, w: 0 }, 3: { sum: 0, w: 0 }, 4: { sum: 0, w: 0 } };
      for (const g of list) {
        const qDir = toPeriodByDirector(String(g.date), String(g.createdAt), String(g.academicYear || ''));
        const q = typeof qDir === 'number' ? qDir : toQuarterByDate(String(g.date), String(g.createdAt));
        const w = Number(g.weight || 1);
        buckets[q].sum += Number(g.grade || 0) * w;
        buckets[q].w += w;
      }
      const q1 = buckets[1].w ? Number((buckets[1].sum / buckets[1].w).toFixed(1)) : undefined;
      const q2 = buckets[2].w ? Number((buckets[2].sum / buckets[2].w).toFixed(1)) : undefined;
      const q3 = buckets[3].w ? Number((buckets[3].sum / buckets[3].w).toFixed(1)) : undefined;
      const q4 = buckets[4].w ? Number((buckets[4].sum / buckets[4].w).toFixed(1)) : undefined;
      const parts = [q1, q2, q3, q4].filter((n) => typeof n === 'number') as number[];
      const avg = parts.length ? Number((parts.reduce((a, b) => a + b, 0) / parts.length).toFixed(1)) : undefined;
      const att = attMap.get(sname) ?? 0;
      const sit = typeof avg === 'number' ? (avg >= 6 && att >= 75 ? 'Aprovado' : (avg < 5 || att < 75) ? 'Reprovado' : 'Recuperação') : '-';
      return { sname, q1, q2, q3, q4, avg, att, sit };
    });

    renderBoletimPage(doc, logoData, studentName, className, selectedPeriod, rows, student?.birthDate);

    

    const fileName = `Boletim_${student ? student.firstName + '_' + student.lastName : ''}_${selectedPeriod}.pdf`;
    const total = (doc as any).getNumberOfPages ? (doc as any).getNumberOfPages() : (doc.internal as any).getNumberOfPages();
    for (let i = 1; i <= total; i++) { doc.setPage(i); doc.setFontSize(8); doc.text(`Página ${i} de ${total}`, 105, 292, { align: 'center' }); }
    doc.save(fileName);
  };

  const downloadClassReportPDF = async () => {
    if (!selectedClass) return;
    const klass = classesList.find((c: any) => c.id === selectedClass);
    const students = studentsList;
    const fetchGrades = async (studentId: string) => {
      const res = await fetch(`/api/grades/student/${studentId}`);
      if (!res.ok) return [];
      return res.json();
    };
    const summaries: Array<{ name: string; average: number; count: number }> = [];
    for (const s of students as any[]) {
      const gradesList = await fetchGrades(s.id);
      const avg = gradesList.length > 0 ? Number((gradesList.reduce((a: number, g: any) => a + (g.grade || 0), 0) / gradesList.length).toFixed(2)) : 0;
      summaries.push({ name: `${s.firstName} ${s.lastName}`, average: avg, count: gradesList.length });
    }

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const text = (str: string, x: number, y: number, opts?: any) => doc.text(str, x, y, opts);
    const line = (y: number) => doc.line(20, y, 190, y);

    text('Relatório de Turma', 105, 15, { align: 'center' });
    line(18);
    text(`Turma: ${klass ? klass.name : ''}`, 20, 28);
    text(`Período: ${selectedPeriod}`, 20, 36);
    line(40);

    let y = 52;
    doc.setFontSize(11);
    text('Aluno', 20, y);
    text('Média', 150, y);
    text('Avaliações', 170, y);
    line(y + 2);
    y += 8;
    doc.setFontSize(10);

    summaries.forEach((row) => {
      text(row.name, 20, y);
      text(String(row.average), 150, y);
      text(String(row.count), 175, y);
      y += 7;
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    });

    const fileName = `Relatorio_Turma_${klass ? klass.name.replace(/\s+/g, '-') : ''}_${selectedPeriod}.pdf`;
    doc.save(fileName);
  };

  const downloadClassBoletinsPDF = async () => {
    if (!selectedClass) return;
    // Refeito para robustez: usar lista de alunos e buscar dados por aluno
    const klass = classesList.find((c: any) => c.id === selectedClass);
    const students = studentsList as any[];
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    doc.setTextColor(0, 0, 0);
    doc.setDrawColor(0, 0, 0);
    // Logo
    let logoData: string | undefined;
    try {
      const resLogo = await fetch('/assets/logo-transparent.png');
      if (resLogo.ok) {
        const buf = await resLogo.arrayBuffer();
        const b64 = btoa(Array.from(new Uint8Array(buf)).map((b) => String.fromCharCode(b)).join(''));
        logoData = `data:image/png;base64,${b64}`;
      }
    } catch {}
    // Buscar períodos acadêmicos definidos pelo diretor (acessível ao professor)
    let periodsAll: Array<{ startDate: string; endDate: string; name?: string; academicYear?: string; period?: number }> = [];
    try {
      const resPeriods = await fetch('/api/periods/all', { credentials: 'include' });
      if (resPeriods.ok) {
        const json = await resPeriods.json();
        periodsAll = (json?.data || []) as any[];
      }
    } catch {}
    const parsePeriodInfo = (p: any) => {
      const start = new Date(p.startDate);
      const end = new Date(p.endDate);
      let year: string = String(p.academicYear || start.getFullYear() || '');
      let num: number | undefined = typeof p.period === 'number' ? p.period : undefined;
      const name: string = String(p.name || '');
      const m = name.match(/(\\d+)\\D*Bimestre\\s*(\\d{4})?/i);
      if (!num && m) num = Number(m[1]);
      if (!year && m && m[2]) year = String(m[2]);
      return { start, end, year, num };
    };
    const normalizedPeriods = periodsAll.map(parsePeriodInfo).filter((p) => !isNaN(p.start.getTime()) && !isNaN(p.end.getTime()));
    const normalizeName = (s: string) => s.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').trim().toLowerCase();
    const toPeriodByDirector = (dateStr?: string, fallbackStr?: string, yearHint?: string) => {
      const parseD = (s?: string) => {
        if (!s) return undefined;
        if (s.includes('/')) {
          const [dd, mm, yyyy] = s.split('/');
          const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
          if (!isNaN(d.getTime())) return d;
        }
        const num = Number(s);
        if (!isNaN(num) && isFinite(num)) {
          const d = new Date(num);
          return isNaN(d.getTime()) ? undefined : d;
        }
        const d = new Date(s as any);
        return isNaN(d.getTime()) ? undefined : d;
      };
      const d = parseD(dateStr) || parseD(fallbackStr);
      if (!d) return undefined;
      const y = String(yearHint || d.getFullYear());
      const match = normalizedPeriods.find((p) => String(p.year) === y && d >= p.start && d <= p.end);
      return match?.num;
    };
    const toQuarterByDate = (dstr: string, fallback?: string) => {
      const parseMonth = (s?: string) => {
        if (!s) return undefined;
        if (s.includes('/')) {
          const [dd, mm, yyyy] = s.split('/');
          const m = Number(mm);
          if (m >= 1 && m <= 12) return m;
        }
        const num = Number(s);
        if (!isNaN(num) && isFinite(num)) {
          const d = new Date(num);
          if (!isNaN(d.getTime())) return d.getMonth() + 1;
        }
        const d = new Date(s);
        if (!isNaN(d.getTime())) return d.getMonth() + 1;
        return undefined;
      };
      const m = parseMonth(dstr) ?? parseMonth(fallback);
      if (!m) return 4;
      if (m <= 3) return 1;
      if (m <= 6) return 2;
      if (m <= 9) return 3;
      return 4;
    };
    let first = true;
  for (const s of students) {
      if (!first) doc.addPage();
      first = false;
      let rowsCount = 0;
      const gradesRes = await fetch(`/api/grades/student/${s.id}`, { credentials: 'include' });
      const gradesList = gradesRes.ok ? await gradesRes.json() : [];
      const attRes = await fetch(`/api/attendance/student/${s.id}`, { credentials: 'include' });
      const attJson = attRes.ok ? await attRes.json() : {};
      const attMap = new Map<string, number>();
      (attJson?.statsBySubject || []).forEach((st: any) => { const rate = st.totalClasses > 0 ? Math.round((Number(st.presentClasses || 0) / Number(st.totalClasses || 0)) * 100) : 0; attMap.set(String(st.subjectName), rate); });
      let subjects = Array.from(new Set((gradesList as any[]).map((g: any) => String(g.subjectName)).concat(Array.from(attMap.keys()))));
      if (selectedSubject && selectedSubject !== 'Todas') {
        const target = normalizeName(selectedSubject);
        subjects = subjects.filter((n) => normalizeName(n) === target);
        if (subjects.length === 0) subjects = [selectedSubject];
      }
      const rows: Array<{ sname: string; q1?: number; q2?: number; q3?: number; q4?: number; avg?: number; att: number; sit: string }> = [];
      for (const sname of subjects) {
        const list = (gradesList as any[]).filter((g: any) => String(g.subjectName) === sname);
        const buckets: Record<number, { sum: number; w: number }> = { 1: { sum: 0, w: 0 }, 2: { sum: 0, w: 0 }, 3: { sum: 0, w: 0 }, 4: { sum: 0, w: 0 } };
      for (const g of list) {
          const qDir = toPeriodByDirector(String(g.date), String(g.createdAt), String(g.academicYear || ''));
          const q = typeof qDir === 'number' ? qDir : toQuarterByDate(String(g.date), String(g.createdAt));
          const w = Number(g.weight || 1);
          buckets[q].sum += Number(g.grade || 0) * w;
          buckets[q].w += w;
        }
        const q1 = buckets[1].w ? Number((buckets[1].sum / buckets[1].w).toFixed(1)) : undefined;
        const q2 = buckets[2].w ? Number((buckets[2].sum / buckets[2].w).toFixed(1)) : undefined;
        const q3 = buckets[3].w ? Number((buckets[3].sum / buckets[3].w).toFixed(1)) : undefined;
        const q4 = buckets[4].w ? Number((buckets[4].sum / buckets[4].w).toFixed(1)) : undefined;
        const parts = [q1, q2, q3, q4].filter((n) => typeof n === 'number') as number[];
        const avg = parts.length ? Number((parts.reduce((a, b) => a + b, 0) / parts.length).toFixed(1)) : undefined;
        const att = attMap.get(sname) ?? 0;
        const sit = typeof avg === 'number' ? (avg >= 6 && att >= 75 ? 'Aprovado' : (avg < 5 || att < 75) ? 'Reprovado' : 'Recuperação') : '-';
        rows.push({ sname, q1, q2, q3, q4, avg, att, sit });
        rowsCount++;
      }
      renderBoletimPage(doc, logoData, `${s.firstName} ${s.lastName}`, klass ? klass.name : '', selectedPeriod, rows, (s as any).birthDate);
    }
    if (students.length === 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('Boletins da Turma', 105, 26, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.text(`Turma: ${klass ? klass.name : ''}`, 20, 42);
      doc.text('Sem alunos encontrados para a turma selecionada.', 20, 52);
    }
    const fileName = `Boletins_Turma_${klass ? klass.name.replace(/\s+/g, '-') : ''}_${selectedPeriod}.pdf`;
    const total = (doc as any).getNumberOfPages ? (doc as any).getNumberOfPages() : (doc.internal as any).getNumberOfPages();
    for (let i = 1; i <= total; i++) { doc.setPage(i); doc.setFontSize(8); doc.text(`Página ${i} de ${total}`, 105, 292, { align: 'center' }); }
    doc.save(fileName);
  };

  const handleExportReport = () => {
    toast({
      title: "Exportando relatório",
      description: "O relatório está sendo gerado e será baixado em instantes.",
    });
  };

  const content = (
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <h1 className="text-2xl font-bold text-foreground">Relatórios e Análises</h1>
          
          <Button 
            variant="outline" 
            className="flex items-center gap-2 mt-4 sm:mt-0"
            onClick={handleExportReport}
          >
            <DownloadCloud className="h-4 w-4" />
            Exportar Relatório
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardContent className="p-4">
              <Label htmlFor="class-select" className="mb-2 block">Turma</Label>
              <Select 
                value={selectedClass} 
                onValueChange={setSelectedClass}
              >
                <SelectTrigger id="class-select">
                  <SelectValue placeholder="Selecione a turma" />
                </SelectTrigger>
                <SelectContent>
                  {classesList.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <Label htmlFor="period-select" className="mb-2 block">Período</Label>
              <Select 
                value={selectedPeriod} 
                onValueChange={setSelectedPeriod}
              >
                <SelectTrigger id="period-select">
                  <SelectValue placeholder="Selecione um período" />
                </SelectTrigger>
                <SelectContent>
                  {periodOptions.map((period) => (
                    <SelectItem key={period} value={period}>{period}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <Label htmlFor="subject-select" className="mb-2 block">Disciplina</Label>
              <Select 
                value={selectedSubject} 
                onValueChange={setSelectedSubject}
              >
                <SelectTrigger id="subject-select">
                  <SelectValue placeholder="Selecione uma disciplina" />
                </SelectTrigger>
                <SelectContent>
                  {SUBJECTS.map((subject) => (
                    <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                <Users className="h-6 w-6 text-blue-500 dark:text-blue-300" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total de Alunos</p>
                <h3 className="text-2xl font-bold text-foreground">{summaryData.totalStudents}</h3>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                <GraduationCap className="h-6 w-6 text-green-500 dark:text-green-300" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Média Geral</p>
                <h3 className="text-2xl font-bold text-foreground">{summaryData.avgPerformance}</h3>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-full">
                <UserRound className="h-6 w-6 text-yellow-500 dark:text-yellow-300" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Taxa de Frequência</p>
                <h3 className="text-2xl font-bold text-foreground">{summaryData.attendanceRate}%</h3>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
                <BookOpen className="h-6 w-6 text-purple-500 dark:text-purple-300" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Taxa de Aprovação</p>
                <h3 className="text-2xl font-bold text-foreground">{summaryData.approvalRate}%</h3>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Main Report Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-1 md:grid-cols-4 h-auto">
            <TabsTrigger value="class" className="flex items-center gap-2 py-3">
              <BookOpen className="h-4 w-4" />
              <span>Turmas</span>
            </TabsTrigger>
            <TabsTrigger value="attendance" className="flex items-center gap-2 py-3">
              <Users className="h-4 w-4" />
              <span>Frequência</span>
            </TabsTrigger>
            <TabsTrigger value="report-card" className="flex items-center gap-2 py-3">
              <FileText className="h-4 w-4" />
              <span>Boletins</span>
            </TabsTrigger>
            {isCoordinatorOrAdmin && (
              <TabsTrigger value="teacher" className="flex items-center gap-2 py-3">
                <GraduationCap className="h-4 w-4" />
                <span>Professores</span>
              </TabsTrigger>
            )}
          </TabsList>
          
          

          {/* Report Card Tab */}
          <TabsContent value="report-card">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium">Boletins de Notas</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Turma</Label>
                    <Select value={selectedClass} onValueChange={(v) => setSelectedClass(v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a turma" />
                      </SelectTrigger>
                      <SelectContent>
                        {classesList.map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Disciplina</Label>
                    <Select value={gradesSubjectId} onValueChange={setGradesSubjectId}>
                      <SelectTrigger>
                        <SelectValue placeholder={selectedClass ? "Selecione a disciplina" : "Selecione a turma"} />
                      </SelectTrigger>
                      <SelectContent>
                        {subjectsForSelectedClass.length === 0 ? (
                          null
                        ) : (
                          subjectsForSelectedClass.map((s: any) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Visualização</Label>
                    <Select value={gradesView} onValueChange={setGradesView}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="student">Aluno</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {gradesView === 'student' && (
                    <div>
                      <Label>Aluno</Label>
                      <Select value={(selectedStudentId as string) || ''} onValueChange={(v) => setSelectedStudentId(v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o aluno" />
                        </SelectTrigger>
                        <SelectContent>
                          {studentsList.map((s: any) => (
                            <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {gradesView === 'all' ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Aluno</TableHead>
                          <TableHead>1º Bimestre</TableHead>
                          <TableHead>2º Bimestre</TableHead>
                          <TableHead>3º Bimestre</TableHead>
                          <TableHead>4º Bimestre</TableHead>
                          <TableHead>Média</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bimonthlySummaryRows.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">Sem dados</TableCell>
                          </TableRow>
                        ) : (
                          bimonthlySummaryRows.map((r: any, idx: number) => (
                            <TableRow key={idx}>
                              <TableCell className="font-medium">{r.name}</TableCell>
                              <TableCell>{r.averages?.b1 ?? '-'}</TableCell>
                              <TableCell>{r.averages?.b2 ?? '-'}</TableCell>
                              <TableCell>{r.averages?.b3 ?? '-'}</TableCell>
                              <TableCell>{r.averages?.b4 ?? '-'}</TableCell>
                              <TableCell>{(() => {
                                const vals = [r.averages?.b1, r.averages?.b2, r.averages?.b3, r.averages?.b4].filter((v: any) => v != null);
                                return vals.length > 0 ? Number((vals.reduce((a: number, v: number) => a + v, 0) / vals.length).toFixed(2)) : '-';
                              })()}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Bimestre</TableHead>
                          <TableHead>Prova</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Nota</TableHead>
                          <TableHead>Presença</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.keys(bimonthlyDetail).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">Sem dados</TableCell>
                          </TableRow>
                        ) : (
                          ['1','2','3','4'].flatMap((b) => ((bimonthlyDetail[b] || []).slice().sort((a: any, b2: any) => String(a.date).localeCompare(String(b2.date))).map((e: any, idx: number) => (
                            <TableRow key={`${b}-${idx}`}>
                              <TableCell className="font-medium">{b}º</TableCell>
                              <TableCell>{e.title}</TableCell>
                              <TableCell>{String(e.date)}</TableCell>
                              <TableCell>{e.grade ?? '-'}</TableCell>
                              <TableCell>{e.present ? 'Presente' : 'Falta'}</TableCell>
                            </TableRow>
                          ))))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}

                <div className="flex flex-wrap justify-end gap-2">
                  <Button 
                    onClick={() => (gradesView === 'student' ? downloadStudentReportPDF() : downloadClassBoletinsPDF())}
                    disabled={!selectedClass || (gradesView === 'student' && !selectedStudentId)}
                    className="bg-blue-700 hover:bg-blue-800"
                  >
                    <DownloadCloud className="h-4 w-4 mr-2" />
                    Gerar Boletim
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Attendance Tab */}
          <TabsContent value="attendance">
            <Card>
              <CardContent className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label>Turma</Label>
                  <Select value={selectedClass} onValueChange={(v) => setSelectedClass(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a turma" />
                    </SelectTrigger>
                    <SelectContent>
                      {classesList.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!selectedClass && (
                    <p className="text-xs text-muted-foreground mt-1">Selecione a turma para carregar as disciplinas</p>
                  )}
                </div>
                <div>
                  <Label>Disciplina</Label>
                  <Select value={attendanceSubjectId} onValueChange={setAttendanceSubjectId}>
                    <SelectTrigger>
                      <SelectValue placeholder={selectedClass ? "Selecione a disciplina" : "Selecione a turma"} />
                    </SelectTrigger>
                    <SelectContent>
                      {subjectsForSelectedClass.length === 0 ? (
                        null
                      ) : (
                        subjectsForSelectedClass.map((s: any) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Visualização</Label>
                  <Select value={attendanceView} onValueChange={setAttendanceView}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="student">Aluno</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {attendanceView === 'student' && (
                  <div>
                    <Label>Aluno</Label>
                    <Select value={attendanceStudentId} onValueChange={setAttendanceStudentId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o aluno" />
                      </SelectTrigger>
                      <SelectContent>
                        {studentsList.map((s: any) => (
                          <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!selectedClass && (
                      <p className="text-xs text-muted-foreground mt-1">Selecione a turma para carregar as disciplinas</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg font-medium">Frequência</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {attendanceView === 'all' ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Aluno</TableHead>
                          <TableHead>Presenças</TableHead>
                          <TableHead>Faltas</TableHead>
                          <TableHead>Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attendanceSummaryRows.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">Sem dados</TableCell>
                          </TableRow>
                        ) : (
                          attendanceSummaryRows.map((r: any, idx: number) => (
                            <TableRow key={idx}>
                              <TableCell className="font-medium">{r.firstName} {r.lastName}</TableCell>
                              <TableCell>{r.present}</TableCell>
                              <TableCell>{r.absent}</TableCell>
                              <TableCell>{r.total}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attendanceDetailRows.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={2} className="text-center text-sm text-muted-foreground">Sem dados</TableCell>
                          </TableRow>
                        ) : (
                          attendanceDetailRows.map((r: any, idx: number) => (
                            <TableRow key={idx}>
                              <TableCell className="font-medium">{String(r.date)}</TableCell>
                              <TableCell>{r.status === 'present' ? 'Presente' : 'Falta'}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium">Frequência por Série</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-80">
                <AttendanceChart labels={attendanceLabels} values={attendanceValues} />
              </div>
            </CardContent>
          </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-medium flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    Alunos com Problemas de Frequência
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Aluno</TableHead>
                          <TableHead>Turma</TableHead>
                          <TableHead>Frequência</TableHead>
                          <TableHead>Faltas Consecutivas</TableHead>
                          <TableHead>Ãšltimo Comparecimento</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lowAttendanceList.map((student: any) => (
                          <TableRow key={student.id}>
                            <TableCell className="font-medium">{student.name}</TableCell>
                            <TableCell>{student.class || '-'}</TableCell>
                            <TableCell className="text-red-600 dark:text-red-400">{student.attendance}</TableCell>
                            <TableCell>{student.consecutive_absences}</TableCell>
                            <TableCell>{student.last_attendance}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
            
          </TabsContent>
          
          {/* Classes Tab */}
          <TabsContent value="class">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-medium">Desempenho por Turma</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Turma</TableHead>
                        <TableHead>Alunos</TableHead>
                        <TableHead>Média Geral</TableHead>
                        <TableHead>Frequência</TableHead>
                        <TableHead>Taxa de Aprovação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {perfClassList.map((cls: any) => (
                        <TableRow key={cls.classId}>
                          <TableCell className="font-medium">{cls.className}</TableCell>
                          <TableCell>{cls.students}</TableCell>
                          <TableCell className={(cls.average || 0) >= 7 ? "text-green-600 dark:text-green-400" : "text-yellow-600 dark:text-yellow-400"}>
                            {cls.average}
                          </TableCell>
                          <TableCell>{cls.attendance}</TableCell>
                          <TableCell>{cls.passingRate}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-medium">Disciplinas com Melhor Desempenho</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="hidden">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="h-3 w-3 rounded-full bg-green-500"></div>
                        <span className="font-medium">Educação Física</span>
                      </div>
                      <span className="font-bold">8.7</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="h-3 w-3 rounded-full bg-green-500"></div>
                        <span className="font-medium">Artes</span>
                      </div>
                      <span className="font-bold">8.5</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="h-3 w-3 rounded-full bg-green-500"></div>
                        <span className="font-medium">Ciências</span>
                      </div>
                      <span className="font-bold">8.2</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="h-3 w-3 rounded-full bg-green-500"></div>
                        <span className="font-medium">História</span>
                      </div>
                      <span className="font-bold">7.9</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="h-3 w-3 rounded-full bg-green-500"></div>
                        <span className="font-medium">Geografia</span>
                      </div>
                      <span className="font-bold">7.8</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {bestSubjects.length === 0 ? (
                      <div className="text-sm text-muted-foreground">Sem dados</div>
                    ) : (
                      bestSubjects.map((s: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <div className="h-3 w-3 rounded-full bg-green-500"></div>
                            <span className="font-medium">{s.subject}</span>
                          </div>
                          <span className="font-bold">{s.average}</span>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-medium">Disciplinas com Desempenho Crítico</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="hidden">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="h-3 w-3 rounded-full bg-red-500"></div>
                        <span className="font-medium">Matemática</span>
                      </div>
                      <span className="font-bold">6.5</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="h-3 w-3 rounded-full bg-red-500"></div>
                        <span className="font-medium">Física</span>
                      </div>
                      <span className="font-bold">6.7</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                        <span className="font-medium">Química</span>
                      </div>
                      <span className="font-bold">7.0</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                        <span className="font-medium">Português</span>
                      </div>
                      <span className="font-bold">7.2</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                        <span className="font-medium">Inglês</span>
                      </div>
                      <span className="font-bold">7.3</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {criticalSubjects.length === 0 ? (
                      <div className="text-sm text-muted-foreground">Sem dados</div>
                    ) : (
                      criticalSubjects.map((s: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <div className="h-3 w-3 rounded-full bg-red-500"></div>
                            <span className="font-medium">{s.subject}</span>
                          </div>
                          <span className="font-bold">{s.average}</span>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* Teachers Tab (only for admin and coordinator) */}
          {isCoordinatorOrAdmin && (
            <TabsContent value="teacher">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-medium">Desempenho por Professor</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Professor</TableHead>
                          <TableHead>Disciplina</TableHead>
                          <TableHead>Turmas</TableHead>
                          <TableHead>Alunos</TableHead>
                          <TableHead>Média das Turmas</TableHead>
                          <TableHead>Taxa de Aprovação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {TEACHER_PERFORMANCE.map((teacher, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{teacher.teacher}</TableCell>
                            <TableCell>{teacher.subject}</TableCell>
                            <TableCell>{teacher.classes}</TableCell>
                            <TableCell>{teacher.students}</TableCell>
                            <TableCell className={teacher.average >= 7.5 ? "text-green-600 dark:text-green-400" : "text-yellow-600 dark:text-yellow-400"}>
                              {teacher.average}
                            </TableCell>
                            <TableCell>{teacher.approval_rate}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-medium">Observações e Recomendações</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium text-foreground mb-2">Áreas de Atenção</h4>
                        <ul className="list-disc pl-5 space-y-1 text-muted-foreground text-sm">
                          <li>Matemática apresenta o menor desempenho geral, com média de 6.5.</li>
                          <li>A turma 8º Ano C apresenta a menor frequência (80%) e taxa de aprovação (75%).</li>
                          <li>14 alunos estão com frequência abaixo de 75% e precisam de atenção imediata.</li>
                          <li>Observa-se queda de frequência no 4º bimestre (85%) em comparação ao 1º bimestre (90%).</li>
                        </ul>
                      </div>
                      
                      <div className="p-4 border rounded-lg">
                        <h4 className="font-medium text-foreground mb-2">Recomendações</h4>
                        <ul className="list-disc pl-5 space-y-1 text-muted-foreground text-sm">
                          <li>Implementar reforço escolar para alunos com baixo desempenho em Matemática e Física.</li>
                          <li>Realizar reunião específica com responsáveis de alunos com baixa frequência.</li>
                          <li>Desenvolver estratégias para manter o engajamento dos alunos no 4º bimestre.</li>
                          <li>Analisar práticas pedagógicas da turma 6º Ano A para replicar nas demais (melhor desempenho).</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-medium">Comparativo Anual</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-6">
                      <div>
                        <h4 className="font-medium text-foreground mb-2">Média Geral</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-sm">
                            <span>2023</span>
                            <span className="font-medium">7.5</span>
                          </div>
                          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                            <div className="h-2 bg-blue-500 rounded-full" style={{ width: "75%" }}></div>
                          </div>
                          
                          <div className="flex justify-between items-center text-sm">
                            <span>2022</span>
                            <span className="font-medium">7.2</span>
                          </div>
                          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                            <div className="h-2 bg-blue-500 rounded-full" style={{ width: "72%" }}></div>
                          </div>
                          
                          <div className="flex justify-between items-center text-sm">
                            <span>2021</span>
                            <span className="font-medium">7.0</span>
                          </div>
                          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                            <div className="h-2 bg-blue-500 rounded-full" style={{ width: "70%" }}></div>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-foreground mb-2">Taxa de Aprovação</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-sm">
                            <span>2023</span>
                            <span className="font-medium">85%</span>
                          </div>
                          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                            <div className="h-2 bg-green-500 rounded-full" style={{ width: "85%" }}></div>
                          </div>
                          
                          <div className="flex justify-between items-center text-sm">
                            <span>2022</span>
                            <span className="font-medium">82%</span>
                          </div>
                          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                            <div className="h-2 bg-green-500 rounded-full" style={{ width: "82%" }}></div>
                          </div>
                          
                          <div className="flex justify-between items-center text-sm">
                            <span>2021</span>
                            <span className="font-medium">80%</span>
                          </div>
                          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                            <div className="h-2 bg-green-500 rounded-full" style={{ width: "80%" }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}
        </Tabs>
        
        <div className="mt-6 flex justify-end">
          <Button className="flex items-center gap-2" onClick={handleExportReport}>
            <FileText className="h-4 w-4" />
            Gerar Relatório Completo
          </Button>
        </div>
      </div>
  );

  if (isTeacher) {
    return (
      <TeacherLayout>
        {content}
      </TeacherLayout>
    );
  }
  

  return (
    <MainLayout pageTitle="Relatórios">
      {content}
    </MainLayout>
  );
}

