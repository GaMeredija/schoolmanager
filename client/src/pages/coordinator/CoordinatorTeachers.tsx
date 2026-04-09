import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useQuery } from '@tanstack/react-query';
import { 
  Search, 
  Filter, 
  MessageSquare, 
  Calendar,
  Users,
  BookOpen,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye
} from 'lucide-react';

export default function CoordinatorTeachers() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [subjectFilter, setSubjectFilter] = useState('todos');
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [, setLocation] = useLocation();

  // Buscar professores com estatísticas reais da API
  const { data: teachersData, isLoading: teachersLoading, error: teachersError } = useQuery({
    queryKey: ['coordinator-teacher-stats'],
    queryFn: async () => {
      console.log('ðŸ”„ Fazendo chamada para API de estatísticas dos professores...');
      const response = await fetch('/api/coordinator/teacher-stats', {
        credentials: 'include'
      });
      console.log('ðŸ“¡ Resposta da API:', response.status, response.statusText);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erro na API:', errorText);
        throw new Error('Erro ao buscar estatísticas dos professores');
      }
      const data = await response.json();
      console.log('ðŸ“Š Dados recebidos:', data);
      return data.data || [];
    }
  });

  // Buscar detalhes específicos de um professor
  const { data: teacherDetails, isLoading: detailsLoading } = useQuery({
    queryKey: ['coordinator-teacher-details', selectedTeacher?.id],
    queryFn: async () => {
      if (!selectedTeacher?.id) return null;
      const response = await fetch(`/api/coordinator/teacher-details/${selectedTeacher.id}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Erro ao buscar detalhes do professor');
      const data = await response.json();
      return data.data;
    },
    enabled: !!selectedTeacher?.id
  });

  const teachers = teachersData || [];
  
  console.log('ðŸ‘¥ Professores carregados:', teachers.length);
  console.log('ðŸ“Š Dados dos professores:', teachers);

  // Debug logs
  console.log('🔍 Debug - teachersData:', teachersData);
  console.log('🔍 Debug - teachersLoading:', teachersLoading);
  console.log('🔍 Debug - teachersError:', teachersError);
  console.log('🔍 Debug - teachers:', teachers);

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'ativo':
      case 'active':
        return <Badge className="border-green-500/30 bg-green-500/10 text-green-700 hover:bg-green-500/10 dark:bg-green-500/15 dark:text-green-200"><CheckCircle2 className="w-3 h-3 mr-1" />Ativo</Badge>;
      case 'inativo':
      case 'inactive':
        return <Badge className="border-red-500/30 bg-red-500/10 text-red-700 hover:bg-red-500/10 dark:bg-red-500/15 dark:text-red-200"><AlertCircle className="w-3 h-3 mr-1" />Inativo</Badge>;
      default:
        return <Badge className="border-green-500/30 bg-green-500/10 text-green-700 hover:bg-green-500/10 dark:bg-green-500/15 dark:text-green-200"><CheckCircle2 className="w-3 h-3 mr-1" />Ativo</Badge>;
    }
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 9) return 'text-green-600';
    if (score >= 7) return 'text-yellow-600';
    return 'text-red-600 dark:text-red-300';
  };

  // Função para gerar iniciais do nome
  const getInitials = (name: string) => {
    if (!name || name.trim() === '') return '?';
    
    const nameParts = name.trim().split(' ').filter(part => part.length > 0);
    
    if (nameParts.length === 1) {
      // Se só tem um nome, pega a primeira letra
      return nameParts[0][0].toUpperCase();
    } else {
      // Se tem mais de um nome, pega a primeira letra de cada (máximo 2)
      return nameParts.slice(0, 2).map(part => part[0].toUpperCase()).join('.');
    }
  };

  // Função para obter estatísticas do professor (agora vem da API)
  const getTeacherStats = (teacher: any) => {
    return teacher.stats || {
      activities: { total: 0, approved: 0, draft: 0, expired: 0 },
      exams: { total: 0, completed: 0, active: 0 },
      materials: { total: 0 },
      grades: { activityGrades: { total: 0, average: 0 }, examGrades: { total: 0, average: 0 } },
      submissions: { total: 0, graded: 0, pending: 0 },
      performance: 0,
      approvalRate: 0,
      gradingRate: 0
    };
  };

  const filteredTeachers = teachers.filter((teacher: any) => {
    const fullName = `${teacher.firstName} ${teacher.lastName}`;
    const matchesSearch = fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         teacher.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const viewDetails = (teacher: any) => {
    setSelectedTeacher(teacher);
    setIsDetailsModalOpen(true);
  };

  const sendMessage = (teacherId: string) => {
    // Redirecionar para o chat e abrir conversa com o professor
    setLocation(`/coordinator/chat?teacherId=${teacherId}`);
  };

  if (teachersLoading) {
    return (
      <MainLayout pageTitle="Monitoramento de Professores">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando professores...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (teachersError) {
    return (
      <MainLayout pageTitle="Monitoramento de Professores">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-red-600 dark:text-red-300 text-6xl mb-4">⚠️ï¸</div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Erro ao carregar professores</h3>
            <p className="text-muted-foreground mb-4">{teachersError.message}</p>
            <Button onClick={() => window.location.reload()}>
              Tentar Novamente
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Calcular estatísticas gerais
  const totalActivities = teachers.reduce((sum: number, teacher: any) => sum + (teacher.stats?.activities?.total || 0), 0);
  const totalExams = teachers.reduce((sum: number, teacher: any) => sum + (teacher.stats?.exams?.total || 0), 0);
  const totalMaterials = teachers.reduce((sum: number, teacher: any) => sum + (teacher.stats?.materials?.total || 0), 0);
  const pendingSubmissions = teachers.reduce((sum: number, teacher: any) => sum + (teacher.stats?.submissions?.pending || 0), 0);
  const averagePerformance = teachers.length > 0 ? 
    teachers.reduce((sum: number, teacher: any) => sum + (teacher.stats?.performance || 0), 0) / teachers.length : 0;

  return (
    <MainLayout pageTitle="Monitoramento de Professores">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Monitoramento de Professores</h1>
            <p className="text-muted-foreground mt-2">
              Acompanhe a performance e atividades dos professores
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Professores</p>
                <p className="text-2xl font-bold">{teachers.length}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Atividades</p>
                <p className="text-2xl font-bold text-violet-600 dark:text-violet-300">{totalActivities}</p>
              </div>
              <BookOpen className="h-8 w-8 text-violet-600 dark:text-violet-300" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Performance Média</p>
                <p className="text-2xl font-bold text-green-600">
                  {averagePerformance.toFixed(1)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendências</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingSubmissions}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[300px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground/60 h-4 w-4" />
                <Input
                  placeholder="Buscar professores ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Mais Filtros
            </Button>
          </div>
        </Card>

        {/* Teachers List */}
        <div className="space-y-4">
          {filteredTeachers.length > 0 ? (
            filteredTeachers.map((teacher: any) => {
              const stats = getTeacherStats(teacher);
              const fullName = `${teacher.firstName} ${teacher.lastName}`;
              return (
                <Card key={teacher.id} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 flex items-center justify-center rounded-full bg-violet-500/10 dark:bg-violet-500/15">
                          <span className="text-violet-600 dark:text-violet-300 font-bold text-lg">
                            {getInitials(fullName)}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-xl font-semibold text-foreground">{fullName}</h3>
                            {getStatusBadge(teacher.status)}
                          </div>
                          <p className="text-muted-foreground">{teacher.email}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Performance</p>
                          <p className={`text-xl font-bold ${getPerformanceColor(stats.performance)}`}>
                            {stats.performance}/10
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Atividades</p>
                          <p className="text-lg font-semibold text-blue-600">{stats.activities.total}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Provas</p>
                          <p className="text-lg font-semibold text-indigo-600 dark:text-indigo-300">{stats.exams.total}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Materiais</p>
                          <p className="text-lg font-semibold text-green-600">{stats.materials.total}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Pendentes</p>
                          <p className="text-lg font-semibold text-yellow-600">{stats.submissions.pending}</p>
                        </div>
                      </div>

                      {/* Progress Bars */}
                      <div className="space-y-3 mb-4">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-muted-foreground">Taxa de Aprovação de Atividades</span>
                            <span className="font-medium">{stats.approvalRate}%</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-muted">
                            <div 
                              className="bg-green-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${stats.approvalRate}%` }}
                            ></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-muted-foreground">Taxa de Correção de Submissões</span>
                            <span className="font-medium">{stats.gradingRate}%</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-muted">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${stats.gradingRate}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>

                      {/* Additional Info */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="font-medium text-foreground">Cadastrado em:</p>
                          <p className="text-muted-foreground">{new Date(teacher.createdAt).toLocaleDateString('pt-BR')}</p>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">Ãšltima atividade:</p>
                          <p className="text-muted-foreground">
                            {stats.activities.total > 0 || stats.exams.total > 0 || stats.materials.total > 0 
                              ? 'Atividade recente' 
                              : 'Sem atividades criadas'}
                          </p>
                        </div>
                      </div>

                      {/* Alerts */}
                      {stats.submissions.pending > 0 && (
                        <div className="flex items-center gap-2 mt-4 p-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 dark:bg-yellow-500/15">
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                          <span className="text-sm text-yellow-800 dark:text-yellow-100">
                            {stats.submissions.pending} submissão{stats.submissions.pending > 1 ? 'ões' : ''} pendente{stats.submissions.pending > 1 ? 's' : ''} de correção
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => viewDetails(teacher)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Ver Detalhes
                      </Button>
                      <Button 
                        size="sm" 
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={() => sendMessage(teacher.id)}
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Enviar Mensagem
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })
          ) : (
            <Card className="p-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground/60 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Nenhum professor encontrado</h3>
              <p className="text-muted-foreground">
                Não há professores que correspondam aos filtros selecionados.
              </p>
            </Card>
          )}
        </div>

        {/* Modal de Detalhes do Professor */}
        <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <div className="w-12 h-12 flex items-center justify-center rounded-full bg-violet-500/10 dark:bg-violet-500/15">
                  <span className="text-violet-600 dark:text-violet-300 font-bold text-lg">
                    {selectedTeacher ? getInitials(`${selectedTeacher.firstName} ${selectedTeacher.lastName}`) : '?'}
                  </span>
                </div>
                Detalhes do Professor
              </DialogTitle>
            </DialogHeader>
            
            {selectedTeacher && (
              <div className="space-y-6">
                {/* Informações Básicas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="rounded-lg bg-muted/60 p-4">
                    <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Informações Pessoais
                    </h4>
                    <div className="space-y-2">
                      <p><span className="font-medium">Nome:</span> {selectedTeacher.firstName} {selectedTeacher.lastName}</p>
                      <p><span className="font-medium">Email:</span> {selectedTeacher.email}</p>
                      <p><span className="font-medium">Status:</span> {getStatusBadge(selectedTeacher.status)}</p>
                      <p><span className="font-medium">Cadastrado em:</span> {new Date(selectedTeacher.createdAt).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                  
                  <div className="rounded-lg bg-muted/60 p-4">
                    <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Performance Geral
                    </h4>
                    <div className="space-y-2">
                      {(() => {
                        const stats = getTeacherStats(selectedTeacher);
                        return (
                          <>
                            <p><span className="font-medium">Performance:</span> <span className={`font-bold ${getPerformanceColor(stats.performance)}`}>{stats.performance}/10</span></p>
                            <p><span className="font-medium">Taxa de Aprovação:</span> <span className="text-green-600 font-semibold">{stats.approvalRate}%</span></p>
                            <p><span className="font-medium">Taxa de Correção:</span> <span className="text-blue-600 font-semibold">{stats.gradingRate}%</span></p>
                            <p><span className="font-medium">Total de Conteúdo:</span> <span className="text-violet-600 dark:text-violet-300 font-semibold">{stats.activities.total + stats.exams.total + stats.materials.total}</span></p>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Estatísticas Detalhadas */}
                <div>
                  <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Estatísticas Detalhadas
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {(() => {
                      const stats = getTeacherStats(selectedTeacher);
                      return (
                        <>
                          <Card className="p-4 text-center bg-blue-500/10 border-blue-500/30 dark:bg-blue-500/15">
                            <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10 dark:bg-blue-500/15">
                              <BookOpen className="h-4 w-4 text-blue-600" />
                            </div>
                            <p className="text-2xl font-bold text-blue-600">{stats.activities.total}</p>
                            <p className="text-sm text-muted-foreground">Total Atividades</p>
                            <p className="text-xs text-muted-foreground mt-1">{stats.activities.approved} aprovadas</p>
                          </Card>
                          <Card className="border-indigo-500/30 bg-indigo-500/10 p-4 text-center dark:bg-indigo-500/15">
                            <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/10 dark:bg-indigo-500/15">
                              <Calendar className="h-4 w-4 text-indigo-600 dark:text-indigo-300" />
                            </div>
                            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-300">{stats.exams.total}</p>
                            <p className="text-sm text-muted-foreground">Total Provas</p>
                            <p className="text-xs text-muted-foreground mt-1">{stats.exams.completed} concluídas</p>
                          </Card>
                          <Card className="p-4 text-center bg-green-500/10 border-green-500/30 dark:bg-green-500/15">
                            <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-green-500/10 dark:bg-green-500/15">
                              <BookOpen className="h-4 w-4 text-green-600" />
                            </div>
                            <p className="text-2xl font-bold text-green-600">{stats.materials.total}</p>
                            <p className="text-sm text-muted-foreground">Materiais</p>
                            <p className="text-xs text-muted-foreground mt-1">Conteúdo didático</p>
                          </Card>
                          <Card className="p-4 text-center bg-yellow-500/10 border-yellow-500/30 dark:bg-yellow-500/15">
                            <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-2">
                              <Clock className="h-4 w-4 text-yellow-600" />
                            </div>
                            <p className="text-2xl font-bold text-yellow-600">{stats.submissions.pending}</p>
                            <p className="text-sm text-muted-foreground">Pendentes</p>
                            <p className="text-xs text-muted-foreground mt-1">Para correção</p>
                          </Card>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Informações de Notas */}
                {(() => {
                  const stats = getTeacherStats(selectedTeacher);
                  if (stats.grades.activityGrades.total > 0 || stats.grades.examGrades.total > 0) {
                    return (
                      <div>
                        <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                          <TrendingUp className="h-5 w-5" />
                          Informações de Avaliação
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Card className="p-4 bg-blue-500/10 border-blue-500/30 dark:bg-blue-500/15">
                            <h5 className="font-medium text-blue-900 mb-2">Notas de Atividades</h5>
                            <div className="space-y-1">
                              <p className="text-sm"><span className="font-medium">Total corrigidas:</span> {stats.grades.activityGrades.total}</p>
                              <p className="text-sm"><span className="font-medium">Média geral:</span> {stats.grades.activityGrades.average ? Number(stats.grades.activityGrades.average).toFixed(1) : '0.0'}</p>
                            </div>
                          </Card>
                          <Card className="border-indigo-500/30 bg-indigo-500/10 p-4 dark:bg-indigo-500/15">
                            <h5 className="font-medium text-indigo-900 dark:text-indigo-100 mb-2">Notas de Provas</h5>
                            <div className="space-y-1">
                              <p className="text-sm"><span className="font-medium">Total corrigidas:</span> {stats.grades.examGrades.total}</p>
                              <p className="text-sm"><span className="font-medium">Média geral:</span> {stats.grades.examGrades.average ? Number(stats.grades.examGrades.average).toFixed(1) : '0.0'}</p>
                            </div>
                          </Card>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Atividades Recentes */}
                {teacherDetails && teacherDetails.recentActivities && teacherDetails.recentActivities.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      Atividades Recentes
                    </h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {teacherDetails.recentActivities.slice(0, 5).map((activity: any) => (
                        <div key={activity.id} className="flex items-center justify-between rounded bg-muted/60 p-2">
                          <div>
                            <p className="font-medium text-sm">{activity.title}</p>
                            <p className="text-xs text-muted-foreground">{activity.subjectName} - {activity.className}</p>
                          </div>
                          <Badge className={activity.status === 'active' ? 'border-green-500/30 bg-green-500/10 text-green-700 dark:bg-green-500/15 dark:text-green-200' : 'border-border bg-muted text-foreground'}>
                            {activity.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Submissões Pendentes */}
                {teacherDetails && teacherDetails.pendingSubmissions && teacherDetails.pendingSubmissions.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                      Submissões Pendentes de Correção
                    </h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {teacherDetails.pendingSubmissions.slice(0, 5).map((submission: any) => (
                        <div key={submission.id} className="flex items-center justify-between rounded border border-yellow-500/30 bg-yellow-500/10 p-2 dark:bg-yellow-500/15">
                          <div>
                            <p className="font-medium text-sm">{submission.activityTitle}</p>
                            <p className="text-xs text-muted-foreground">{submission.studentName} - {submission.subjectName}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {new Date(submission.submittedAt).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ações */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => {
                      setIsDetailsModalOpen(false);
                      sendMessage(selectedTeacher.id);
                    }}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Enviar Mensagem
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setIsDetailsModalOpen(false)}
                  >
                    Fechar
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}

