import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Home,
  Users,
  GraduationCap,
  BookOpen,
  UserCheck,
  LogOut,
  X,
  User,
  MessageSquare,
  BarChart3,
  Lightbulb,
  Terminal
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import AdminInstructionModal from '@/components/instructions/AdminInstructionModal';
import { isStaticDemo } from '@/lib/runtime';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [location, navigate] = useLocation();
  const { user, logout } = useAuth();

  const navigation = isStaticDemo
    ? [
        {
          title: 'PRINCIPAL',
          items: [
            { icon: BarChart3, label: 'Dashboard', path: '/admin/dashboard' }
          ]
        },
        {
          title: 'GESTAO DE PESSOAS',
          items: [
            { icon: GraduationCap, label: 'Professores', path: '/admin/teachers' },
            { icon: Users, label: 'Alunos', path: '/admin/students' }
          ]
        },
        {
          title: 'ACADEMICO',
          items: [
            { icon: BookOpen, label: 'Disciplinas', path: '/admin/subjects' },
            { icon: Users, label: 'Turmas', path: '/admin/classes' }
          ]
        }
      ]
    : [
        {
          title: 'PRINCIPAL',
          items: [
            { icon: BarChart3, label: 'Dashboard', path: '/admin/dashboard' }
          ]
        },
        {
          title: 'GESTAO DE PESSOAS',
          items: [
            { icon: GraduationCap, label: 'Professores', path: '/admin/teachers' },
            { icon: Users, label: 'Alunos', path: '/admin/students' },
            { icon: UserCheck, label: 'Coordenadores', path: '/admin/coordinators' },
            { icon: Users, label: 'Administradores', path: '/admin/administrators' },
            { icon: UserCheck, label: 'Diretor', path: '/admin/director-view' }
          ]
        },
        {
          title: 'ACADEMICO',
          items: [
            { icon: BookOpen, label: 'Disciplinas', path: '/admin/subjects' },
            { icon: Users, label: 'Turmas', path: '/admin/classes' }
          ]
        },
        {
          title: 'COMUNICACAO',
          items: [
            { icon: MessageSquare, label: 'Chat', path: '/chat' }
          ]
        },
        {
          title: 'SISTEMA',
          items: [
            { icon: Terminal, label: 'Logs', path: '/admin/logs' },
            { icon: UserCheck, label: 'Solicitacao de Cargo', path: '/admin/director-transfer' }
          ]
        }
      ];

  const isActive = (path: string) => location === path;

  const getUserInitials = (name: string) => {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase();
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="lg:hidden sticky top-0 z-40 bg-card border-b border-border px-3 py-2 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => setIsSidebarOpen(true)}>
          <span className="sr-only">Abrir menu</span>
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
        </Button>
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.avatar} />
            <AvatarFallback className="bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-200">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium">{user?.firstName}</span>
        </div>
      </div>

      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-purple-900 to-purple-800 transform transition-transform duration-300 ease-in-out flex flex-col overflow-y-auto max-h-screen ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0`}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-purple-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <Home className="h-5 w-5 text-purple-800" />
            </div>
            <span className="text-white font-semibold text-lg">Sistema Escolar</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden text-white hover:bg-purple-700"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="px-6 py-4 border-b border-purple-700">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user?.avatar} />
              <AvatarFallback className="bg-white text-purple-800">
                {getUserInitials(user?.firstName + ' ' + user?.lastName || 'A')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="text-white font-medium">{user?.firstName} {user?.lastName}</div>
              <div className="text-purple-300 text-sm">Administrador</div>
            </div>
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-6">
          {navigation.map((section, sectionIndex) => (
            <div key={sectionIndex}>
              <h3 className="px-2 text-xs font-semibold text-purple-300 uppercase tracking-wider mb-3 border-b border-purple-600/30 pb-2">
                {section.title}
              </h3>
              <div className="space-y-1">
                {section.items.map((item, itemIndex) => (
                  <Link key={itemIndex} href={item.path}>
                    <Button
                      variant="ghost"
                      className={`w-full justify-start text-left h-10 px-3 ${
                        isActive(item.path)
                          ? 'bg-purple-700 text-white'
                          : 'text-purple-100 hover:bg-purple-700 hover:text-white'
                      }`}
                    >
                      <item.icon className="h-4 w-4 mr-3" />
                      {item.label}
                    </Button>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-auto px-4 py-4 border-t border-purple-700 space-y-2">
          <Button
            variant="ghost"
            className="w-full justify-start text-left text-purple-100 hover:bg-purple-700 hover:text-white"
            onClick={() => navigate('/meu-perfil')}
          >
            <User className="h-4 w-4 mr-3" />
            Meu Perfil
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-left text-purple-100 hover:bg-purple-700 hover:text-white"
            onClick={() => setShowInstructions(true)}
          >
            <Lightbulb className="h-4 w-4 mr-3" />
            Instrucoes
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-left text-purple-100 hover:bg-purple-700 hover:text-white"
            onClick={logout}
          >
            <LogOut className="h-4 w-4 mr-3" />
            Sair
          </Button>
        </div>
      </div>

      <div className="lg:ml-64">
        <main className="min-h-screen bg-background p-6">
          {children}
        </main>
      </div>

      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <AdminInstructionModal
        isOpen={showInstructions}
        onClose={() => setShowInstructions(false)}
      />
    </div>
  );
};

export default AdminLayout;
