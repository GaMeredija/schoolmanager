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
import StudentDashboardPage from "@/pages/student/StudentDashboardPage";
import CoordinatorDashboard from "@/pages/coordinator/CoordinatorDashboard";
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

      <Route path="/student/dashboard">
        <StudentLayout>
          <StudentDashboardPage />
        </StudentLayout>
      </Route>

      <Route path="/coordinator/dashboard">
        <MainLayout pageTitle="Dashboard">
          <CoordinatorDashboard />
        </MainLayout>
      </Route>

      <Route path="/director/dashboard">
        <DirectorLayout>
          <DirectorDashboard />
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
