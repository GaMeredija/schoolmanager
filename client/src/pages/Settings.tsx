import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { useAuth } from "@/hooks/useAuth";
import { 
  User, 
  School, 
  Lock, 
  Eye, 
  EyeOff, 
  Shield, 
  Building2, 
  MapPin, 
  Phone, 
  Mail,
  Globe,
  Calendar,
  Users,
  BookOpen,
  GraduationCap,
  BarChart3,
  Clock,
  MapPin as MapPinIcon
} from "lucide-react";

export default function Settings() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert("As senhas não coincidem!");
      return;
    }
    
    setIsChangingPassword(true);
    // Simular mudança de senha
    setTimeout(() => {
      setIsChangingPassword(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      alert("Senha alterada com sucesso!");
    }, 2000);
  };

  // Dados do calendário da semana
  const weekSchedule = [
    {
      day: "Segunda-feira",
      shortDay: "SEG",
      subjects: [
        { time: "07:30", subject: "Matemática", teacher: "Prof. Silva", room: "Sala 101", color: "bg-blue-500" },
        { time: "08:20", subject: "Português", teacher: "Prof. Santos", room: "Sala 102", color: "bg-green-500" },
        { time: "09:10", subject: "História", teacher: "Prof. Costa", room: "Sala 103", color: "bg-violet-500" },
        { time: "10:00", subject: "Geografia", teacher: "Prof. Lima", room: "Sala 104", color: "bg-orange-500" },
        { time: "10:50", subject: "Educação Física", teacher: "Prof. Oliveira", room: "Quadra", color: "bg-rose-500" }
      ]
    },
    {
      day: "Terça-feira",
      shortDay: "TER",
      subjects: [
        { time: "07:30", subject: "Física", teacher: "Prof. Pereira", room: "Lab. Física", color: "bg-indigo-500" },
        { time: "08:20", subject: "Química", teacher: "Prof. Ferreira", room: "Lab. Química", color: "bg-pink-500" },
        { time: "09:10", subject: "Biologia", teacher: "Prof. Rodrigues", room: "Lab. Biologia", color: "bg-teal-500" },
        { time: "10:00", subject: "Matemática", teacher: "Prof. Silva", room: "Sala 101", color: "bg-blue-500" },
        { time: "10:50", subject: "Português", teacher: "Prof. Santos", room: "Sala 102", color: "bg-green-500" }
      ]
    },
    {
      day: "Quarta-feira",
      shortDay: "QUA",
      subjects: [
        { time: "07:30", subject: "História", teacher: "Prof. Costa", room: "Sala 103", color: "bg-violet-500" },
        { time: "08:20", subject: "Geografia", teacher: "Prof. Lima", room: "Sala 104", color: "bg-orange-500" },
        { time: "09:10", subject: "Matemática", teacher: "Prof. Silva", room: "Sala 101", color: "bg-blue-500" },
        { time: "10:00", subject: "Português", teacher: "Prof. Santos", room: "Sala 102", color: "bg-green-500" },
        { time: "10:50", subject: "Arte", teacher: "Prof. Martins", room: "Sala de Arte", color: "bg-yellow-500" }
      ]
    },
    {
      day: "Quinta-feira",
      shortDay: "QUI",
      subjects: [
        { time: "07:30", subject: "Educação Física", teacher: "Prof. Oliveira", room: "Quadra", color: "bg-rose-500" },
        { time: "08:20", subject: "Matemática", teacher: "Prof. Silva", room: "Sala 101", color: "bg-blue-500" },
        { time: "09:10", subject: "Física", teacher: "Prof. Pereira", room: "Lab. Física", color: "bg-indigo-500" },
        { time: "10:00", subject: "Química", teacher: "Prof. Ferreira", room: "Lab. Química", color: "bg-pink-500" },
        { time: "10:50", subject: "Biologia", teacher: "Prof. Rodrigues", room: "Lab. Biologia", color: "bg-teal-500" }
      ]
    },
    {
      day: "Sexta-feira",
      shortDay: "SEX",
      subjects: [
        { time: "07:30", subject: "Português", teacher: "Prof. Santos", room: "Sala 102", color: "bg-green-500" },
        { time: "08:20", subject: "História", teacher: "Prof. Costa", room: "Sala 103", color: "bg-violet-500" },
        { time: "09:10", subject: "Geografia", teacher: "Prof. Lima", room: "Sala 104", color: "bg-orange-500" },
        { time: "10:00", subject: "Matemática", teacher: "Prof. Silva", room: "Sala 101", color: "bg-blue-500" },
        { time: "10:50", subject: "Inglês", teacher: "Prof. Johnson", room: "Sala 105", color: "bg-cyan-500" }
      ]
    }
  ];

  return (
    <MainLayout pageTitle="Sistema Escolar">
      <div className="max-w-7xl mx-auto">
        {/* Header Elegante */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-amber-600 to-orange-600 rounded-full mb-4 shadow-lg">
            <School className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-700 to-orange-700 bg-clip-text text-transparent mb-2">
            Sistema Escolar
          </h1>
          <p className="text-amber-600 dark:text-amber-300 text-lg">
            Visualize informações sobre alunos e disciplinas
          </p>
        </div>

        {/* Tabs Principais */}
        <Tabs defaultValue="students" className="w-full">
          <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-3 bg-card/80 backdrop-blur-sm border border-amber-200/70 dark:border-amber-500/20 rounded-xl p-1 shadow-lg">
            <TabsTrigger 
              value="students" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 rounded-lg"
            >
              <Users className="w-4 h-4 mr-2" />
              Alunos
            </TabsTrigger>
            <TabsTrigger 
              value="subjects" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 rounded-lg"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Disciplinas
            </TabsTrigger>
            <TabsTrigger 
              value="schedule" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300 rounded-lg"
            >
              <Clock className="w-4 h-4 mr-2" />
              Horário
            </TabsTrigger>
          </TabsList>

          {/* Aba Alunos */}
          <TabsContent value="students" className="mt-8">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Estatísticas dos Alunos */}
              <Card className="bg-card/90 backdrop-blur-sm border border-amber-200/70 dark:border-amber-500/20 shadow-xl hover:shadow-2xl transition-all duration-300">
                <CardHeader className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-t-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-black/10 dark:bg-white/10 rounded-full flex items-center justify-center">
                      <Users className="w-6 h-6" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Estatísticas dos Alunos</CardTitle>
                      <CardDescription className="text-amber-100">
                        Números da instituição
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3 p-3 bg-amber-50 rounded-lg">
                      <Users className="w-5 h-5 text-amber-600 dark:text-amber-300" />
                      <div>
                        <p className="font-semibold text-foreground">1.250</p>
                        <p className="text-sm text-amber-600 dark:text-amber-300">Total de Alunos</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3 p-3 bg-amber-50 rounded-lg">
                      <GraduationCap className="w-5 h-5 text-amber-600 dark:text-amber-300" />
                      <div>
                        <p className="font-semibold text-foreground">45</p>
                        <p className="text-sm text-amber-600 dark:text-amber-300">Turmas</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3 p-3 bg-amber-50 rounded-lg">
                      <BookOpen className="w-5 h-5 text-amber-600 dark:text-amber-300" />
                      <div>
                        <p className="font-semibold text-foreground">12</p>
                        <p className="text-sm text-amber-600 dark:text-amber-300">Séries</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Distribuição por Série */}
              <Card className="bg-card/90 backdrop-blur-sm border border-amber-200/70 dark:border-amber-500/20 shadow-xl hover:shadow-2xl transition-all duration-300">
                <CardHeader className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-t-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-black/10 dark:bg-white/10 rounded-full flex items-center justify-center">
                      <BarChart3 className="w-6 h-6" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Distribuição por Série</CardTitle>
                      <CardDescription className="text-amber-100">
                        Alunos por ano escolar
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                      <span className="text-foreground font-medium">1º Ano</span>
                      <span className="text-amber-600 dark:text-amber-300 font-semibold">120 alunos</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                      <span className="text-foreground font-medium">2º Ano</span>
                      <span className="text-amber-600 dark:text-amber-300 font-semibold">135 alunos</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                      <span className="text-foreground font-medium">3º Ano</span>
                      <span className="text-amber-600 dark:text-amber-300 font-semibold">142 alunos</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Informações da Turma */}
              <Card className="bg-card/90 backdrop-blur-sm border border-amber-200/70 dark:border-amber-500/20 shadow-xl hover:shadow-2xl transition-all duration-300">
                <CardHeader className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-t-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-black/10 dark:bg-white/10 rounded-full flex items-center justify-center">
                      <GraduationCap className="w-6 h-6" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Minha Turma</CardTitle>
                      <CardDescription className="text-amber-100">
                        Informações da turma atual
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3 p-3 bg-amber-50 rounded-lg">
                      <Users className="w-5 h-5 text-amber-600 dark:text-amber-300" />
                      <div>
                        <p className="font-semibold text-foreground">Turma 3A</p>
                        <p className="text-sm text-amber-600 dark:text-amber-300">Nome da Turma</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3 p-3 bg-amber-50 rounded-lg">
                      <BookOpen className="w-5 h-5 text-amber-600 dark:text-amber-300" />
                      <div>
                        <p className="font-semibold text-foreground">3º Ano</p>
                        <p className="text-sm text-amber-600 dark:text-amber-300">Série</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3 p-3 bg-amber-50 rounded-lg">
                      <Users className="w-5 h-5 text-amber-600 dark:text-amber-300" />
                      <div>
                        <p className="font-semibold text-foreground">28</p>
                        <p className="text-sm text-amber-600 dark:text-amber-300">Total de Alunos</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Aba Disciplinas */}
          <TabsContent value="subjects" className="mt-8">
            <div className="space-y-6">
              {/* Header das Disciplinas */}
              <div className="text-center">
                <h2 className="text-2xl font-bold text-amber-800 dark:text-amber-100 mb-2">Disciplinas da Escola</h2>
                <p className="text-amber-600 dark:text-amber-300">Informações sobre as disciplinas oferecidas</p>
              </div>

              {/* Lista de Disciplinas */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {weekSchedule[0].subjects.map((subject, index) => (
                  <Card key={index} className="bg-card/90 backdrop-blur-sm border border-amber-200/70 dark:border-amber-500/20 shadow-xl hover:shadow-2xl transition-all duration-300">
                    <CardHeader className={`${subject.color} text-white rounded-t-lg`}>
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-black/10 dark:bg-white/10 rounded-full flex items-center justify-center">
                          <BookOpen className="w-6 h-6" />
                        </div>
                        <div>
                          <CardTitle className="text-xl">{subject.subject}</CardTitle>
                          <CardDescription className="text-white/80">
                            {subject.teacher}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3 p-3 bg-muted/60 rounded-lg">
                          <MapPinIcon className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <p className="font-semibold text-foreground">{subject.room}</p>
                            <p className="text-sm text-muted-foreground">Local das Aulas</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3 p-3 bg-muted/60 rounded-lg">
                          <Clock className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <p className="font-semibold text-foreground">50 min</p>
                            <p className="text-sm text-muted-foreground">Duração da Aula</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3 p-3 bg-muted/60 rounded-lg">
                          <Users className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <p className="font-semibold text-foreground">30 alunos</p>
                            <p className="text-sm text-muted-foreground">Capacidade da Turma</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Informações Adicionais */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Total de Disciplinas */}
                <Card className="bg-card/90 backdrop-blur-sm border border-amber-200/70 dark:border-amber-500/20 shadow-xl hover:shadow-2xl transition-all duration-300">
                  <CardHeader className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-t-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-black/10 dark:bg-white/10 rounded-full flex items-center justify-center">
                        <BookOpen className="w-6 h-6" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">Total de Disciplinas</CardTitle>
                        <CardDescription className="text-blue-100">
                          Disciplinas oferecidas
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-blue-600 mb-2">12</div>
                      <p className="text-blue-600">Disciplinas Ativas</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Professores */}
                <Card className="bg-card/90 backdrop-blur-sm border border-amber-200/70 dark:border-amber-500/20 shadow-xl hover:shadow-2xl transition-all duration-300">
                  <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-t-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-black/10 dark:bg-white/10 rounded-full flex items-center justify-center">
                        <Users className="w-6 h-6" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">Professores</CardTitle>
                        <CardDescription className="text-green-100">
                          Corpo docente
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-green-600 mb-2">15</div>
                      <p className="text-green-600">Professores Ativos</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Carga Horária */}
                <Card className="bg-card/90 backdrop-blur-sm border border-amber-200/70 dark:border-amber-500/20 shadow-xl hover:shadow-2xl transition-all duration-300">
                  <CardHeader className="bg-gradient-to-r from-violet-500 to-pink-500 text-white rounded-t-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-black/10 dark:bg-white/10 rounded-full flex items-center justify-center">
                        <Clock className="w-6 h-6" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">Carga Horária</CardTitle>
                        <CardDescription className="text-violet-100">
                          Horas semanais
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-violet-600 dark:text-violet-300 mb-2">25</div>
                      <p className="text-violet-600 dark:text-violet-300">Horas por Semana</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Aba Horário */}
          <TabsContent value="schedule" className="mt-8">
            <div className="space-y-6">
              {/* Header do Horário */}
              <div className="text-center">
                <h2 className="text-2xl font-bold text-amber-800 dark:text-amber-100 mb-2">Horário Semanal</h2>
                <p className="text-amber-600 dark:text-amber-300">Grade de horários da semana</p>
              </div>

              {/* Calendário Semanal Elegante */}
              <div className="bg-card/90 backdrop-blur-sm border border-amber-200/70 dark:border-amber-500/20 rounded-2xl shadow-xl overflow-hidden">
                {/* Cabeçalho dos Dias */}
                <div className="grid grid-cols-6 gap-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white p-4">
                  <div className="text-center font-semibold text-lg">Horário</div>
                  <div className="text-center font-semibold text-lg">Segunda</div>
                  <div className="text-center font-semibold text-lg">Terça</div>
                  <div className="text-center font-semibold text-lg">Quarta</div>
                  <div className="text-center font-semibold text-lg">Quinta</div>
                  <div className="text-center font-semibold text-lg">Sexta</div>
                </div>

                {/* Grade de Horários */}
                <div className="p-4">
                  {Array.from({ length: 5 }, (_, periodIndex) => (
                    <div key={periodIndex} className="grid grid-cols-6 gap-2 mb-3">
                      {/* Horário */}
                      <div className="flex items-center justify-center p-4 bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl text-amber-700 font-bold text-lg border border-amber-200">
                        {weekSchedule[0].subjects[periodIndex]?.time}
                      </div>
                      
                      {/* Disciplinas de cada dia */}
                      {weekSchedule.map((day, dayIndex) => {
                        const subject = day.subjects[periodIndex];
                        return (
                          <div key={dayIndex} className="p-1">
                            {subject ? (
                              <div className={`${subject.color} text-white p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border border-white/20`}>
                                <div className="text-center">
                                  <div className="text-lg font-bold mb-2">{subject.subject}</div>
                                  <div className="text-sm opacity-90 mb-2">{subject.teacher}</div>
                                  <div className="text-xs opacity-75 flex items-center justify-center">
                                    <MapPinIcon className="w-4 h-4 mr-1" />
                                    {subject.room}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="p-4 bg-gradient-to-br from-muted to-muted/70 rounded-xl text-muted-foreground/60 text-center text-lg border border-border">
                                -
                              </div>
                        )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* Informações do Horário */}
              <div className="grid gap-6 md:grid-cols-3">
                <Card className="bg-card/90 backdrop-blur-sm border border-amber-200/70 dark:border-amber-500/20 shadow-xl hover:shadow-2xl transition-all duration-300">
                  <CardHeader className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-t-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-black/10 dark:bg-white/10 rounded-full flex items-center justify-center">
                        <Clock className="w-6 h-6" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">Horário de Funcionamento</CardTitle>
                        <CardDescription className="text-amber-100">
                          Períodos de aula
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                        <span className="text-foreground font-medium">Início</span>
                        <span className="text-amber-600 dark:text-amber-300 font-semibold">07:30</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                        <span className="text-foreground font-medium">Fim</span>
                        <span className="text-amber-600 dark:text-amber-300 font-semibold">11:10</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                        <span className="text-foreground font-medium">Períodos</span>
                        <span className="text-amber-600 dark:text-amber-300 font-semibold">5 aulas</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card/90 backdrop-blur-sm border border-amber-200/70 dark:border-amber-500/20 shadow-xl hover:shadow-2xl transition-all duration-300">
                  <CardHeader className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-t-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-black/10 dark:bg-white/10 rounded-full flex items-center justify-center">
                        <BookOpen className="w-6 h-6" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">Total de Disciplinas</CardTitle>
                        <CardDescription className="text-blue-100">
                          Por semana
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-blue-600 mb-2">25</div>
                      <p className="text-blue-600">Aulas Semanais</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card/90 backdrop-blur-sm border border-amber-200/70 dark:border-amber-500/20 shadow-xl hover:shadow-2xl transition-all duration-300">
                  <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-t-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-black/10 dark:bg-white/10 rounded-full flex items-center justify-center">
                        <Users className="w-6 h-6" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">Professores</CardTitle>
                        <CardDescription className="text-green-100">
                          Ativos na turma
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-green-600 mb-2">12</div>
                      <p className="text-green-600">Professores</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}


