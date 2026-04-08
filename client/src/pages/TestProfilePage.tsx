import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  User, 
  Mail, 
  Phone, 
  Calendar,
  Shield, 
  Edit3,
  Save,
  X,
  Camera,
  Key,
  Settings,
  Clock,
  Hash,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const TestProfilePage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Inicializar dados do formulário quando o usuário carregar
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    }
  }, [user]);

  // Mutation para atualizar perfil
  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log('Enviando dados para API:', data);
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      console.log('Resposta da API:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Erro da API:', errorData);
        throw new Error(errorData.message || 'Erro ao atualizar perfil');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast.success('Perfil atualizado com sucesso!');
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['auth', 'user'] });
    },
    onError: (error: any) => {
      console.error('Erro na mutation:', error);
      toast.error(error.message || 'Erro ao atualizar perfil');
    }
  });

  // Mutation para alterar senha
  const changePasswordMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log('Enviando dados de senha para API:', { ...data, currentPassword: '***', newPassword: '***' });
      const response = await fetch('/api/profile/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      console.log('Resposta da API de senha:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Erro da API de senha:', errorData);
        throw new Error(errorData.message || 'Erro ao alterar senha');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast.success('Senha alterada com sucesso!');
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
      setShowPasswordModal(false);
    },
    onError: (error: any) => {
      console.error('Erro na mutation de senha:', error);
      toast.error(error.message || 'Erro ao alterar senha');
    }
  });

  const handleSave = () => {
    const { currentPassword, newPassword, confirmPassword, ...profileData } = formData;
    console.log('Dados que serão enviados:', profileData);
    updateProfileMutation.mutate(profileData);
  };

  const handleCancel = () => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    }
    setIsEditing(false);
  };

  const handlePasswordChange = () => {
    console.log('Tentando alterar senha...');
    console.log('Senha atual:', formData.currentPassword);
    console.log('Nova senha:', formData.newPassword);
    console.log('Confirmar senha:', formData.confirmPassword);
    
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }
    
    if (formData.newPassword.length < 6) {
      toast.error('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }

    console.log('Enviando para API...');
    changePasswordMutation.mutate({
      currentPassword: formData.currentPassword,
      newPassword: formData.newPassword
    });
  };

  const getUserInitials = (firstName: string, lastName: string) => {
    return `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase();
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'coordinator': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'teacher': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'student': return 'bg-amber-100 text-amber-800 border-amber-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'coordinator': return 'Coordenador';
      case 'teacher': return 'Professor';
      case 'student': return 'Aluno';
      default: return 'Usuário';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'inactive': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'pending': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Ativo';
      case 'inactive': return 'Inativo';
      case 'pending': return 'Pendente';
      default: return 'Desconhecido';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Não informado';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'Não informado';
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const formatPhone = (phone: string) => {
    if (!phone) return '';
    // Remove todos os caracteres não numéricos
    const numbers = phone.replace(/\D/g, '');
    // Aplica a formatação brasileira
    if (numbers.length === 11) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    } else if (numbers.length === 10) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
    }
    return phone;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const numbers = value.replace(/\D/g, '');
    setFormData(prev => ({ ...prev, phone: numbers }));
  };

  if (!user) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Meu Perfil</h1>
          <p className="text-gray-600">Gerencie suas informações pessoais e configurações</p>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleCancel}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button 
                onClick={handleSave} 
                className="bg-amber-600 hover:bg-amber-700 text-white"
                disabled={updateProfileMutation.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                {updateProfileMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </>
          ) : (
            <>
              <Button 
                onClick={() => setShowPasswordModal(true)} 
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                <Key className="h-4 w-4 mr-2" />
                Alterar Senha
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Card Principal - Informações Pessoais */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Informações Pessoais
                  </CardTitle>
                  <CardDescription>
                    Atualize suas informações de perfil
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Avatar e Nome */}
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <Avatar className="h-20 w-20">
                        <AvatarImage src={user?.profileImageUrl} />
                        <AvatarFallback className="bg-amber-100 text-amber-600 text-xl">
                          {getUserInitials(user?.firstName || '', user?.lastName || '')}
                        </AvatarFallback>
                      </Avatar>
                      {isEditing && (
                        <Button
                          size="sm"
                          className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-amber-600 hover:bg-amber-700 text-white"
                        >
                          <Camera className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">
                        {user?.firstName} {user?.lastName}
                      </h2>
                      <Badge className={getRoleColor(user?.role || '')}>
                        {getRoleText(user?.role || '')}
                      </Badge>
                    </div>
                  </div>

                  <Separator />

                  {/* Formulário */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">Nome *</Label>
                      <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                        disabled={!isEditing}
                        className={!isEditing ? 'bg-gray-50' : ''}
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Sobrenome *</Label>
                      <Input
                        id="lastName"
                        value={formData.lastName}
                        onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                        disabled={!isEditing}
                        className={!isEditing ? 'bg-gray-50' : ''}
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        disabled={!isEditing}
                        className={!isEditing ? 'bg-gray-50' : ''}
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Telefone</Label>
                      <Input
                        id="phone"
                        value={formatPhone(formData.phone)}
                        onChange={handlePhoneChange}
                        disabled={!isEditing}
                        className={!isEditing ? 'bg-gray-50' : ''}
                        placeholder="(11) 99999-9999"
                        maxLength={15}
                      />
                    </div>
                    {/* Campos removidos: Data de Nascimento, Endereço e Biografia */}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar - Informações Adicionais */}
            <div className="space-y-6">
              {/* Card de Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Status da Conta
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Status</span>
                    <Badge className={getStatusColor(user?.status || '')}>
                      {getStatusText(user?.status || '')}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Função</span>
                    <Badge className={getRoleColor(user?.role || '')}>
                      {getRoleText(user?.role || '')}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Último Acesso</span>
                    <span className="text-sm text-gray-900">
                      {user?.lastSeen ? formatDateTime(user.lastSeen) : 'Agora'}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Card de Informações do Sistema */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Informações do Sistema
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Hash className="h-4 w-4" />
                    <span>ID: {user?.id?.slice(0, 8)}...</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>Criado em: {formatDateTime(user?.createdAt || '')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="h-4 w-4" />
                    <span>Atualizado em: {formatDateTime(user?.updatedAt || '')}</span>
                  </div>
                  {user?.registrationNumber && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Hash className="h-4 w-4" />
                      <span>Matrícula: {user.registrationNumber}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
      </div>

      {/* Modal de Alteração de Senha */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Alterar Senha</h2>
            <p className="text-gray-600 mb-4">Para sua segurança, digite sua senha atual antes de definir uma nova</p>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="modalCurrentPassword">Senha Atual *</Label>
                <Input
                  id="modalCurrentPassword"
                  type="password"
                  value={formData.currentPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, currentPassword: e.target.value }))}
                  placeholder="Digite sua senha atual"
                />
              </div>
              <div>
                <Label htmlFor="modalNewPassword">Nova Senha *</Label>
                <Input
                  id="modalNewPassword"
                  type="password"
                  value={formData.newPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="Digite sua nova senha"
                />
              </div>
              <div>
                <Label htmlFor="modalConfirmPassword">Confirmar Nova Senha *</Label>
                <Input
                  id="modalConfirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Confirme sua nova senha"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowPasswordModal(false);
                  setFormData(prev => ({
                    ...prev,
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: ''
                  }));
                }}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handlePasswordChange}
                className="bg-amber-600 hover:bg-amber-700 text-white"
                disabled={changePasswordMutation.isPending || !formData.currentPassword || !formData.newPassword || !formData.confirmPassword}
              >
                <Key className="h-4 w-4 mr-2" />
                {changePasswordMutation.isPending ? 'Alterando...' : 'Alterar Senha'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestProfilePage;
