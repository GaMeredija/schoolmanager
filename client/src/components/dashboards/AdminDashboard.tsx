
import { useDashboardStats, useUsers, useClasses, useSubjects, User, Class, Subject } from "../../hooks/useApi";
import { 
  Users, 
  GraduationCap, 
  BookOpen, 
  TrendingUp, 
  UserPlus, 
  Plus,
  Search,
  Filter
} from "lucide-react";
import CurrentPeriodCard from "../CurrentPeriodCard";

export function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: users, isLoading: usersLoading } = useUsers();
  const { data: classes, isLoading: classesLoading } = useClasses();
  const { data: subjects, isLoading: subjectsLoading } = useSubjects();

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-500';
      case 'coordinator': return 'bg-green-500';
      case 'teacher': return 'bg-blue-500';
      case 'student': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'coordinator': return 'Coordenador';
      case 'teacher': return 'Professor';
      case 'student': return 'Aluno';
      default: return role;
    }
  };

  return (
      <div className="p-6 space-y-6">
        {/* Current Period Card */}
        <CurrentPeriodCard />
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard Administrativo</h1>
            <p className="text-muted-foreground">Gerencie usuários, turmas e disciplinas</p>
          </div>
          <div className="flex gap-3">
            <button className="btn-modern bg-blue-600 hover:bg-blue-700 text-white">
              <UserPlus className="w-4 h-4" />
              Novo Usuário
            </button>
            <button className="btn-modern bg-green-600 hover:bg-green-700 text-white">
              <Plus className="w-4 h-4" />
              Nova Turma
            </button>
            <button 
              onClick={() => {
                alert('ðŸ” COORDENADOR\n\nðŸ“§ Email: coord@escola.com\nðŸ”‘ Senha: 123\n\n⚠️ï¸ Use essas credenciais para fazer login como coordenador pedagógico');
              }}
              className="btn-modern bg-violet-600 text-white hover:bg-violet-700 dark:bg-violet-500 dark:hover:bg-violet-400"
            >
              <Users className="w-4 h-4" />
              Coordenador
            </button>
            <a 
              href="/coordinator/dashboard"
              className="btn-modern bg-orange-600 hover:bg-orange-700 text-white"
            >
              <Users className="w-4 h-4" />
              Coordenação Pedagógica
            </a>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="stats-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total de Usuários</p>
                <p className="text-2xl font-bold text-foreground">
                  {statsLoading ? '...' : stats?.totalUsers || 0}
                </p>
              </div>
              <div className="rounded-full bg-blue-500/10 p-3 dark:bg-blue-500/15">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-green-600">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span>+12% este mês</span>
            </div>
          </div>

          <div className="stats-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total de Turmas</p>
                <p className="text-2xl font-bold text-foreground">
                  {statsLoading ? '...' : stats?.totalClasses || 0}
                </p>
              </div>
              <div className="rounded-full bg-green-500/10 p-3 dark:bg-green-500/15">
                <GraduationCap className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-green-600">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span>+5% este mês</span>
            </div>
          </div>

          <div className="stats-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total de Disciplinas</p>
                <p className="text-2xl font-bold text-foreground">
                  {statsLoading ? '...' : stats?.totalSubjects || 0}
                </p>
              </div>
              <div className="rounded-full bg-violet-500/10 p-3 dark:bg-violet-500/15">
                <BookOpen className="w-6 h-6 text-violet-600 dark:text-violet-300" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-green-600">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span>+8% este mês</span>
            </div>
          </div>

          <div className="stats-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Sistema Ativo</p>
                <p className="text-2xl font-bold text-green-600">100%</p>
              </div>
              <div className="rounded-full bg-green-500/10 p-3 dark:bg-green-500/15">
                <div className="w-6 h-6 bg-green-500 rounded-full animate-pulse" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-green-600">
              <span>Online</span>
            </div>
          </div>
        </div>

        {/* Recent Users */}
        <div className="dashboard-card">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-foreground">Usuários Recentes</h2>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                <input
                  type="text"
                  placeholder="Buscar usuários..."
                  className="input-modern pl-10"
                />
              </div>
              <button className="btn-modern bg-muted text-foreground hover:bg-muted/80">
                <Filter className="w-4 h-4" />
                Filtros
              </button>
            </div>
          </div>

          {usersLoading ? (
            <div className="flex justify-center py-8">
              <div className="loading-dots"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-foreground">Nome</th>
                    <th className="text-left py-3 px-4 font-medium text-foreground">Email</th>
                    <th className="text-left py-3 px-4 font-medium text-foreground">Função</th>
                    <th className="text-left py-3 px-4 font-medium text-foreground">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody>
                                     {users?.slice(0, 5).map((user: User) => (
                    <tr key={user.id} className="border-b border-border hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center mr-3">
                            <span className="text-sm font-medium text-muted-foreground">
                              {user.firstName[0]}{user.lastName[0]}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{user.firstName} {user.lastName}</p>
                            <p className="text-sm text-muted-foreground">{user.registrationNumber}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-foreground">{user.email}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${getRoleColor(user.role)}`}>
                          {getRoleLabel(user.role)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.status === 'active' 
                            ? 'border-green-500/30 bg-green-500/10 text-green-700 dark:bg-green-500/15 dark:text-green-200' 
                            : 'border-red-500/30 bg-red-500/10 text-red-700 dark:bg-red-500/15 dark:text-red-200'
                        }`}>
                          {user.status === 'active' ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <button className="text-blue-600 hover:text-blue-500 dark:text-blue-300 dark:hover:text-blue-200 text-sm font-medium">
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Classes and Subjects Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Classes */}
          <div className="dashboard-card">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-foreground">Turmas Ativas</h2>
              <button className="text-blue-600 hover:text-blue-500 dark:text-blue-300 dark:hover:text-blue-200 text-sm font-medium">
                Ver todas
              </button>
            </div>

            {classesLoading ? (
              <div className="flex justify-center py-8">
                <div className="loading-dots"></div>
              </div>
            ) : (
              <div className="space-y-4">
                                 {classes?.slice(0, 3).map((classItem: Class) => (
                  <div key={classItem.id} className="flex items-center justify-between rounded-lg bg-muted/60 p-4">
                    <div>
                      <h3 className="font-medium text-foreground">{classItem.name}</h3>
                      <p className="text-sm text-muted-foreground">{classItem.grade} - {classItem.section}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-foreground">
                        {classItem.currentStudents}/{classItem.capacity}
                      </p>
                      <p className="text-xs text-muted-foreground">alunos</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Subjects */}
          <div className="dashboard-card">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-foreground">Disciplinas</h2>
              <button className="text-blue-600 hover:text-blue-500 dark:text-blue-300 dark:hover:text-blue-200 text-sm font-medium">
                Ver todas
              </button>
            </div>

            {subjectsLoading ? (
              <div className="flex justify-center py-8">
                <div className="loading-dots"></div>
              </div>
            ) : (
              <div className="space-y-4">
                                 {subjects?.slice(0, 3).map((subject: Subject) => (
                  <div key={subject.id} className="flex items-center justify-between rounded-lg bg-muted/60 p-4">
                    <div>
                      <h3 className="font-medium text-foreground">{subject.name}</h3>
                      <p className="text-sm text-muted-foreground">{subject.code} - {subject.credits} créditos</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-foreground">{subject.workload}h</p>
                      <p className="text-xs text-muted-foreground">carga horária</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="dashboard-card">
          <h2 className="text-xl font-semibold text-foreground mb-6">Ações Rápidas</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="p-4 rounded-lg border-2 border-dashed border-border transition-colors hover:border-blue-400 hover:bg-blue-500/10">
              <div className="text-center">
                <UserPlus className="w-8 h-8 text-muted-foreground/60 mx-auto mb-2" />
                <p className="font-medium text-foreground">Adicionar Usuário</p>
                <p className="text-sm text-muted-foreground">Criar novo usuário</p>
              </div>
            </button>
            <button className="p-4 rounded-lg border-2 border-dashed border-border transition-colors hover:border-green-400 hover:bg-green-500/10">
              <div className="text-center">
                <GraduationCap className="w-8 h-8 text-muted-foreground/60 mx-auto mb-2" />
                <p className="font-medium text-foreground">Criar Turma</p>
                <p className="text-sm text-muted-foreground">Nova turma</p>
              </div>
            </button>
            <button className="p-4 rounded-lg border-2 border-dashed border-border transition-colors hover:border-violet-400 hover:bg-violet-500/10">
              <div className="text-center">
                <BookOpen className="w-8 h-8 text-muted-foreground/60 mx-auto mb-2" />
                <p className="font-medium text-foreground">Adicionar Disciplina</p>
                <p className="text-sm text-muted-foreground">Nova disciplina</p>
              </div>
            </button>
          </div>
        </div>
      </div>
  );
}

