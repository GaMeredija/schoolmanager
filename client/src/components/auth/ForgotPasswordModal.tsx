import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Smartphone, 
  Shield, 
  CheckCircle, 
  ArrowLeft, 
  Eye, 
  EyeOff,
  Lock,
  Key,
  Phone
} from 'lucide-react';
import { toast } from 'sonner';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 'phone' | 'verification' | 'new-password' | 'success';

const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [whatsappUrl, setWhatsappUrl] = useState('');
  const [whatsappDirect, setWhatsappDirect] = useState('');
  const [availableMethods, setAvailableMethods] = useState<string[]>([]);
  const [tempToken, setTempToken] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<'sms' | 'whatsapp'>('sms');

  const handlePhoneSubmit = async () => {
    if (!phone.trim()) {
      toast.error('Por favor, digite seu número de telefone');
      return;
    }

    setIsLoading(true);
    try {
      // Enviar o número limpo (sem formatação)
      const cleanPhone = phone.replace(/\D/g, '');
      console.log('📱 Enviando telefone limpo:', cleanPhone);
      
      const response = await fetch('/api/auth/send-recovery-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phone: cleanPhone,
          method: selectedMethod // SMS ou WhatsApp
        })
      });

      const data = await response.json();

      if (data.success) {
        setUserEmail(data.email);
        setStep('verification');
        
        // Mostrar mensagem específica baseada no método
        if (selectedMethod === 'sms') {
          toast.success('Código enviado via SMS! Verifique seu telefone.');
        } else {
          toast.success('Código enviado via WhatsApp! Verifique seu WhatsApp.');
        }
        
        // Código enviado com sucesso
        console.log(`🔑 Código enviado para ${phone} via ${selectedMethod}`);
        
        // Sistema já envia SMS e WhatsApp automaticamente
        
        // Salvar apenas o essencial
        if (data.whatsappUrl) {
          setWhatsappUrl(data.whatsappUrl);
        }
        
        if (data.whatsappDirect) {
          setWhatsappDirect(data.whatsappDirect);
        }
        
        if (data.methods) {
          setAvailableMethods(data.methods);
        }
      } else {
        toast.error(data.message || 'Erro ao enviar código');
      }
    } catch (error) {
      toast.error('Erro de conexão. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerificationSubmit = async () => {
    if (!verificationCode.trim()) {
      toast.error('Por favor, digite o código de verificação');
      return;
    }

    setIsLoading(true);
    try {
      const cleanPhone = phone.replace(/\D/g, '');
      const response = await fetch('/api/auth/verify-recovery-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone, code: verificationCode })
      });

      const data = await response.json();

      if (data.success) {
        setTempToken(data.tempToken);
        setStep('new-password');
        toast.success('Código verificado com sucesso!');
      } else {
        toast.error(data.message || 'Código inválido');
      }
    } catch (error) {
      toast.error('Erro de conexão. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async () => {
    if (!newPassword.trim()) {
      toast.error('Por favor, digite uma nova senha');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setIsLoading(true);
    try {
      const cleanPhone = phone.replace(/\D/g, '');
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phone: cleanPhone, 
          tempToken: tempToken,
          newPassword 
        })
      });

      const data = await response.json();

      if (data.success) {
        setStep('success');
        toast.success('Senha redefinida com sucesso!');
      } else {
        toast.error(data.message || 'Erro ao redefinir senha');
      }
    } catch (error) {
      toast.error('Erro de conexão. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setStep('phone');
    setPhone('');
    setVerificationCode('');
    setNewPassword('');
    setConfirmPassword('');
    setUserEmail('');
    onClose();
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return value;
  };

  const renderStep = () => {
    switch (step) {
      case 'phone':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Smartphone className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Recuperar Senha
              </h3>
              <p className="text-gray-600">
                Digite seu número de telefone para receber um código de verificação
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                  Número de Telefone
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(11) 99999-9999"
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-gray-600 text-center">
                Escolha como deseja receber o código:
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  onClick={() => {
                    setSelectedMethod('sms');
                    handlePhoneSubmit();
                  }}
                  disabled={isLoading || !phone.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isLoading && selectedMethod === 'sms' ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Smartphone className="w-4 h-4 mr-2" />
                      SMS
                    </>
                  )}
                </Button>
                
                <Button 
                  onClick={() => {
                    setSelectedMethod('whatsapp');
                    handlePhoneSubmit();
                  }}
                  disabled={isLoading || !phone.trim()}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {isLoading && selectedMethod === 'whatsapp' ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 mr-2" />
                      WhatsApp
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        );

      case 'verification':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Key className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Verificação por {selectedMethod === 'sms' ? 'SMS' : 'WhatsApp'}
              </h3>
              <p className="text-gray-600">
                Digite o código de 6 dígitos enviado para <br />
                <span className="font-semibold text-blue-600">{phone}</span>
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="code" className="text-sm font-medium text-gray-700">
                  Código de Verificação
                </Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="text-center text-2xl tracking-widest"
                  maxLength={6}
                />
              </div>
            </div>

            {/* Informação sobre o envio */}
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <p className="text-sm text-green-800">
                  Código enviado via {selectedMethod === 'sms' ? 'SMS' : 'WhatsApp'}
                </p>
              </div>
              <p className="text-xs text-green-600 mt-1">
                Se não receber, verifique o console do servidor
              </p>
            </div>
            
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setStep('phone')}
                className="flex-1"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <Button 
                onClick={handleVerificationSubmit}
                disabled={isLoading || verificationCode.length !== 6}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Verificando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Verificar
                  </>
                )}
              </Button>
            </div>
          </div>
        );

      case 'new-password':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                <Lock className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Nova Senha
              </h3>
              <p className="text-gray-600">
                Defina uma nova senha para sua conta
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="newPassword" className="text-sm font-medium text-gray-700">
                  Nova Senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Digite sua nova senha"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                  </button>
                </div>
              </div>

              <div>
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                  Confirmar Nova Senha
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirme sua nova senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setStep('verification')}
                className="flex-1"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <Button 
                onClick={handlePasswordSubmit}
                disabled={isLoading || !newPassword.trim() || !confirmPassword.trim()}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Salvando...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Redefinir Senha
                  </>
                )}
              </Button>
            </div>
          </div>
        );

      case 'success':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Senha Redefinida!
              </h3>
              <p className="text-gray-600">
                Sua senha foi redefinida com sucesso. <br />
                Agora você pode fazer login com sua nova senha.
              </p>
            </div>

            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800">Conta verificada</p>
                    <p className="text-sm text-green-600">{userEmail}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button 
              onClick={handleClose}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Fazer Login
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            Recuperação de Senha
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-6">
          {renderStep()}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ForgotPasswordModal;

