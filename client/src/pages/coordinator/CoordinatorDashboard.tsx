import React from 'react';
import { useLocation } from 'wouter';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useCoordinatorDashboard, useCoordinatorClasses, useSystemStatus } from '@/hooks/useApi';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Users,
  GraduationCap,
  BookOpen,
  Building,
  TrendingUp,
  FileText,
  BarChart3,
  Activity,
  User
} from 'lucide-react';
import { isStaticDemo } from '@/lib/runtime';

const CoordinatorDashboard: React.FC = () => {
  const [, navigate] = useLocation();

  const { data: dashboardData, isLoading: statsLoading } = useCoordinatorDashboard();
  const { data: classesData, isLoading: classesLoading } = useCoordinatorClasses();
  const { data: systemStatus } = useSystemStatus();

  const stats = [
    {
      title: 'Total de Alunos',
      value: dashboardData?.totals?.students ?? 0,
      change: '',
      changeType: 'neutral',
      icon: Users,
      description: 'atual'
    },
    {
      title: 'Professores Ativos',
      value: dashboardData?.totals?.teachers ?? 0,
      change: '',
      changeType: 'neutral',
      icon: GraduationCap,
      description: 'atual'
    },
    {
      title: 'Turmas',
      value: dashboardData?.totals?.classes ?? 0,
      change: '',
      changeType: 'neutral',
      icon: Building,
      description: 'atual'
    },
    {
      title: 'Atividades Pendentes',
      value: dashboardData?.totals?.pendingActivities ?? 0,
      change: '',
      changeType: 'neutral',
      icon: FileText,
      description: 'aguardando aprovação'
    },
  ];

  const classesList = Array.isArray(classesData?.data)
    ? classesData.data
    : Array.isArray(classesData)
      ? classesData
      : [];

  const recentActivities = classesList
    .map((cls: any) => ({
      id: `${cls.id}-last-activity`,
      type: 'activity',
      message: cls.lastActivity
        ? `Atividade recente em ${cls.name}: ${cls.lastActivity.title}`
        : `Sem atividades recentes em ${cls.name}`,
      time: cls.lastActivity
        ? format(new Date(cls.lastActivity.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })
        : '--',
      icon: Activity
    }))
    .slice(0, 6);

  const quickActions = isStaticDemo
    ? [
        { label: 'Atualizar painel', icon: BarChart3, path: '/coordinator/dashboard' },
        { label: 'Meu perfil', icon: User, path: '/meu-perfil' },
      ]
    : [
        { label: 'Gerenciar Alunos', icon: Users, path: '/coordinator/students' },
        { label: 'Gerenciar Professores', icon: GraduationCap, path: '/coordinator/teachers' },
        { label: 'Gerenciar Turmas', icon: Building, path: '/coordinator/classes' },
        { label: 'Gerenciar Atividades', icon: BookOpen, path: '/coordinator/activities' },
      ];

  return (
    <MainLayout pageTitle="Dashboard do Coordenador">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard do Coordenador</h1>
            <p className="text-muted-foreground">Visão geral do sistema escolar</p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="bg-green-500/10 text-green-700 dark:bg-green-500/15 dark:text-green-200">
              <Activity className="mr-1 h-3 w-3" />
              {systemStatus?.serverOnline ? 'Sistema Online' : 'Sistema Offline'}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {(statsLoading ? [1, 2, 3, 4] : stats).map((stat: any, index: number) => (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {statsLoading ? 'Carregando...' : stat.title}
                </CardTitle>
                {!statsLoading && stat.icon && <stat.icon className="h-4 w-4 text-muted-foreground/60" />}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statsLoading ? '--' : stat.value}</div>
                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                  <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                    stat.changeType === 'positive'
                      ? 'bg-green-500/10 text-green-700 dark:bg-green-500/15 dark:text-green-200'
                      : stat.changeType === 'negative'
                        ? 'bg-red-500/10 text-red-700 dark:bg-red-500/15 dark:text-red-200'
                        : 'bg-muted text-foreground'
                  }`}>
                    {stat.change || '--'}
                  </span>
                  <span>{stat.description}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="mr-2 h-5 w-5" />
                Atividades Recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(classesLoading ? [] : recentActivities).map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                        <activity.icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground">{activity.message}</p>
                      <p className="text-xs text-muted-foreground">{activity.time}</p>
                    </div>
                  </div>
                ))}
                {!classesLoading && recentActivities.length === 0 && (
                  <div className="text-sm text-muted-foreground">Nenhuma atividade recente encontrada.</div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="mr-2 h-5 w-5" />
                {isStaticDemo ? 'Ações de Demonstração' : 'Ações Rápidas'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`grid gap-3 ${isStaticDemo ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-2'}`}>
                {quickActions.map((action) => (
                  <Button
                    key={action.label}
                    variant="outline"
                    className="flex h-20 flex-col items-center justify-center"
                    onClick={() => navigate(action.path)}
                  >
                    <action.icon className="mb-2 h-6 w-6" />
                    <span className="text-sm">{action.label}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="mr-2 h-5 w-5" />
              Status do Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="flex items-center space-x-3">
                <div className={`h-3 w-3 rounded-full ${systemStatus?.serverOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm">Servidor {systemStatus?.serverOnline ? 'Online' : 'Offline'}</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className={`h-3 w-3 rounded-full ${systemStatus?.databaseConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm">Banco de Dados {systemStatus?.databaseConnected ? 'Conectado' : 'Desconectado'}</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className={`h-3 w-3 rounded-full ${systemStatus?.apiWorking ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm">API {systemStatus?.apiWorking ? 'Funcionando' : 'Indisponivel'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default CoordinatorDashboard;
