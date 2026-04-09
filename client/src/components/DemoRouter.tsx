import { Redirect, Route, Switch } from "wouter";
import LoginPage from "@/pages/LoginPage";
import NotFound from "@/pages/not-found";
import { useAuth } from "@/hooks/useAuth";
import AdminLayout from "@/components/layout/AdminLayout";
import MainLayout from "@/components/layout/MainLayout";
import TeacherLayout from "@/components/layout/TeacherLayout";
import StudentLayout from "@/components/layout/StudentLayout";
import DirectorLayout from "@/components/layout/DirectorLayout";
import AdminDashboardPage from "@/pages/admin/DashboardPage";
import AdminTeachersPage from "@/pages/admin/TeachersPage";
import AdminStudentsPage from "@/pages/admin/StudentsPage";
import AdminSubjectsPage from "@/pages/admin/SubjectsPage";
import AdminClassesPage from "@/pages/admin/ClassesPage";
import TeacherDashboardPage from "@/pages/teacher/TeacherDashboardPage";
import TeacherClassesPage from "@/pages/teacher/TeacherClassesPage";
import TeacherExamsPage from "@/pages/teacher/TeacherExamsPage";
import TeacherChatPage from "@/pages/teacher/TeacherChatPage";
import TeacherCalendarPage from "@/pages/teacher/TeacherCalendarPage";
import { TeacherMaterialsPage } from "@/pages/teacher/TeacherMaterialsPage";
import TeacherActivitiesPage from "@/pages/teacher/TeacherActivitiesPage";
import StudentDashboardPage from "@/pages/student/StudentDashboardPage";
import StudentClassPage from "@/pages/student/StudentClassPage";
import StudentActivitiesPage from "@/pages/student/StudentActivitiesPage";
import { StudentMaterialsPage } from "@/pages/student/StudentMaterialsPage";
import StudentExamsPage from "@/pages/student/StudentExamsPage";
import StudentGradesPage from "@/pages/student/StudentGradesPage";
import StudentCalendarPage from "@/pages/student/StudentCalendarPage";
import CoordinatorDashboard from "@/pages/coordinator/CoordinatorDashboard";
import CoordinatorTeachers from "@/pages/coordinator/CoordinatorTeachers";
import CoordinatorClasses from "@/pages/coordinator/CoordinatorClasses";
import CoordinatorStudents from "@/pages/coordinator/CoordinatorStudents";
import CoordinatorActivities from "@/pages/coordinator/CoordinatorActivities";
import CoordinatorPerformance from "@/pages/coordinator/CoordinatorPerformance";
import CoordinatorReports from "@/pages/coordinator/CoordinatorReports";
import CoordinatorAcademicCalendar from "@/pages/coordinator/CoordinatorAcademicCalendar";
import DirectorDashboard from "@/pages/director/DirectorDashboard";
import TestProfilePage from "@/pages/TestProfilePage";

function getDefaultRoute(role?: string) {
  switch (role) {
    case "admin":
      return "/admin/dashboard";
    case "teacher":
      return "/teacher/dashboard";
    case "student":
      return "/student/dashboard";
    case "coordinator":
      return "/coordinator/dashboard";
    case "director":
      return "/director/dashboard";
    default:
      return "/";
  }
}

function ProfileRoute() {
  const { user } = useAuth();

  if (!user) {
    return <Redirect to="/" />;
  }

  if (user.role === "admin") {
    return (
      <AdminLayout>
        <TestProfilePage />
      </AdminLayout>
    );
  }

  if (user.role === "teacher") {
    return (
      <TeacherLayout>
        <TestProfilePage />
      </TeacherLayout>
    );
  }

  if (user.role === "student") {
    return (
      <StudentLayout>
        <TestProfilePage />
      </StudentLayout>
    );
  }

  if (user.role === "director") {
    return (
      <DirectorLayout>
        <TestProfilePage />
      </DirectorLayout>
    );
  }

  return (
    <MainLayout pageTitle="Meu Perfil">
      <TestProfilePage />
    </MainLayout>
  );
}

export default function DemoRouter() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const defaultRoute = getDefaultRoute(user?.role);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-amber-600 font-medium">Carregando demonstracao...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/">
          <LoginPage />
        </Route>
        <Route component={NotFound} />
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/">
        <Redirect to={defaultRoute} />
      </Route>

      <Route path="/admin/dashboard">
        <AdminLayout>
          <AdminDashboardPage />
        </AdminLayout>
      </Route>
      <Route path="/admin/teachers">
        <AdminLayout>
          <AdminTeachersPage />
        </AdminLayout>
      </Route>
      <Route path="/admin/students">
        <AdminLayout>
          <AdminStudentsPage />
        </AdminLayout>
      </Route>
      <Route path="/admin/subjects">
        <AdminLayout>
          <AdminSubjectsPage />
        </AdminLayout>
      </Route>
      <Route path="/admin/classes">
        <AdminLayout>
          <AdminClassesPage />
        </AdminLayout>
      </Route>

      <Route path="/teacher/dashboard">
        <TeacherLayout>
          <TeacherDashboardPage />
        </TeacherLayout>
      </Route>

      <Route path="/teacher/classes">
        <TeacherLayout>
          <TeacherClassesPage />
        </TeacherLayout>
      </Route>

      <Route path="/teacher/materials">
        <TeacherLayout>
          <TeacherMaterialsPage />
        </TeacherLayout>
      </Route>

      <Route path="/teacher/activities">
        <TeacherLayout>
          <TeacherActivitiesPage />
        </TeacherLayout>
      </Route>

      <Route path="/teacher/exams">
        <TeacherLayout>
          <TeacherExamsPage />
        </TeacherLayout>
      </Route>

      <Route path="/teacher/chat">
        <TeacherLayout>
          <TeacherChatPage />
        </TeacherLayout>
      </Route>

      <Route path="/teacher/calendar">
        <TeacherLayout>
          <TeacherCalendarPage />
        </TeacherLayout>
      </Route>

      <Route path="/student/dashboard">
        <StudentLayout>
          <StudentDashboardPage />
        </StudentLayout>
      </Route>

      <Route path="/student/class">
        <StudentLayout>
          <StudentClassPage />
        </StudentLayout>
      </Route>

      <Route path="/student/activities">
        <StudentLayout>
          <StudentActivitiesPage />
        </StudentLayout>
      </Route>

      <Route path="/student/materials">
        <StudentLayout>
          <StudentMaterialsPage />
        </StudentLayout>
      </Route>

      <Route path="/student/exams">
        <StudentLayout>
          <StudentExamsPage />
        </StudentLayout>
      </Route>

      <Route path="/student/grades">
        <StudentLayout>
          <StudentGradesPage />
        </StudentLayout>
      </Route>

      <Route path="/student/calendar">
        <StudentLayout>
          <StudentCalendarPage />
        </StudentLayout>
      </Route>

      <Route path="/coordinator/dashboard">
        <MainLayout pageTitle="Dashboard">
          <CoordinatorDashboard />
        </MainLayout>
      </Route>

      <Route path="/coordinator/teachers">
        <CoordinatorTeachers />
      </Route>

      <Route path="/coordinator/classes">
        <CoordinatorClasses />
      </Route>

      <Route path="/coordinator/students">
        <CoordinatorStudents />
      </Route>

      <Route path="/coordinator/activities">
        <CoordinatorActivities />
      </Route>

      <Route path="/coordinator/performance">
        <CoordinatorPerformance />
      </Route>

      <Route path="/coordinator/reports">
        <CoordinatorReports />
      </Route>

      <Route path="/coordinator/academic-calendar">
        <CoordinatorAcademicCalendar />
      </Route>

      <Route path="/director/dashboard">
        <DirectorLayout>
          <DirectorDashboard />
        </DirectorLayout>
      </Route>

      <Route path="/director/teachers">
        <DirectorLayout>
          <AdminTeachersPage />
        </DirectorLayout>
      </Route>

      <Route path="/director/students">
        <DirectorLayout>
          <AdminStudentsPage />
        </DirectorLayout>
      </Route>

      <Route path="/director/subjects">
        <DirectorLayout>
          <AdminSubjectsPage />
        </DirectorLayout>
      </Route>

      <Route path="/director/classes">
        <DirectorLayout>
          <AdminClassesPage />
        </DirectorLayout>
      </Route>

      <Route path="/meu-perfil">
        <ProfileRoute />
      </Route>

      <Route>
        <Redirect to={defaultRoute} />
      </Route>
    </Switch>
  );
}
