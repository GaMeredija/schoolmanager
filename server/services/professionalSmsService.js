// Serviço PROFISSIONAL de SMS/WhatsApp - SchoolManager
const twilio = require('twilio');
const axios = require('axios');

class ProfessionalSmsService {
  constructor() {
    // Configurações PROFISSIONAIS - TWILIO REAL
    this.twilioConfig = {
      accountSid: 'ACf40f26305f5d6a052d3889ee15849a9b',
      authToken: '0167c75a18a5c0c29ce3288f1ee6dba2',
      phoneNumber: '+15551234567' // Número de teste do Twilio
    };
    
    this.zApiConfig = {
      instanceId: process.env.ZAPI_INSTANCE_ID || 'SEU_INSTANCE_ID',
      clientToken: process.env.ZAPI_CLIENT_TOKEN || 'SEU_CLIENT_TOKEN'
    };
    
    // Inicializar Twilio
    this.twilioClient = twilio(this.twilioConfig.accountSid, this.twilioConfig.authToken);
  }

  // Formatar número para Brasil
  formatPhone(phone) {
    let cleanPhone = phone.replace(/\D/g, '');
    
    // Se não começar com 55, adiciona
    if (!cleanPhone.startsWith('55')) {
      cleanPhone = '55' + cleanPhone;
    }
    
    return '+' + cleanPhone;
  }

  // Enviar SMS via Twilio (PROFISSIONAL)
  async sendSMS(phone, code) {
    try {
      const formattedPhone = this.formatPhone(phone);
      
      const message = `🔐 SchoolManager - Recuperação de Senha

Seu código de verificação é: ${code}

⏰ Válido por: 10 minutos
🔒 Não compartilhe este código com ninguém

Se você não solicitou esta recuperação, ignore esta mensagem.`;
      
      console.log(`📱 ENVIANDO SMS PROFISSIONAL via Twilio para ${formattedPhone}`);
      
      const messageResponse = await this.twilioClient.messages.create({
        body: message,
        from: this.twilioConfig.phoneNumber,
        to: formattedPhone
      });

      console.log(`✅ SMS Twilio enviado! SID: ${messageResponse.sid}`);
      
      return {
        success: true,
        method: 'SMS',
        provider: 'Twilio',
        sid: messageResponse.sid,
        response: messageResponse
      };
    } catch (error) {
      console.log(`❌ SMS Twilio falhou: ${error.message}`);
      return {
        success: false,
        method: 'SMS',
        provider: 'Twilio',
        error: error.message
      };
    }
  }

  // Enviar WhatsApp via Z-API (PROFISSIONAL)
  async sendWhatsApp(phone, code) {
    try {
      const formattedPhone = this.formatPhone(phone) + '@c.us';
      
      const message = `🔐 *SchoolManager - Recuperação de Senha*

Seu código de verificação é: *${code}*

⏰ Válido por: 10 minutos
🔒 Não compartilhe este código com ninguém

Se você não solicitou esta recuperação, ignore esta mensagem.`;
      
      console.log(`💬 ENVIANDO WHATSAPP PROFISSIONAL via Z-API para ${formattedPhone}`);
      
      const response = await axios.post(
        `https://api.z-api.io/instances/${this.zApiConfig.instanceId}/send-text`,
        {
          phone: formattedPhone,
          message: message
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Client-Token': this.zApiConfig.clientToken
          },
          timeout: 15000
        }
      );

      console.log(`✅ WhatsApp Z-API enviado! Status: ${response.status}`);
      
      return {
        success: true,
        method: 'WhatsApp',
        provider: 'Z-API',
        response: response.data
      };
    } catch (error) {
      console.log(`❌ WhatsApp Z-API falhou: ${error.message}`);
      return {
        success: false,
        method: 'WhatsApp',
        provider: 'Z-API',
        error: error.message
      };
    }
  }

  // Método principal PROFISSIONAL
  async sendCode(phone, code, method = 'both') {
    console.log(`\n🚀 ===== SISTEMA PROFISSIONAL DE RECUPERAÇÃO =====`);
    console.log(`📱 Número: ${phone}`);
    console.log(`🔢 Código: ${code}`);
    console.log(`📋 Método: ${method.toUpperCase()}`);
    console.log(`⏰ Válido por: 10 minutos`);
    console.log(`🔧 APIs: Twilio (SMS) + Z-API (WhatsApp)`);
    console.log(`================================================\n`);
    
    const results = {
      sms: false,
      whatsapp: false,
      console: true
    };

    // Se método for 'sms' ou 'both', tenta SMS Twilio
    if (method === 'sms' || method === 'both') {
      console.log('📱 Tentando SMS via Twilio...');
      const smsResult = await this.sendSMS(phone, code);
      if (smsResult.success) {
        results.sms = true;
        console.log('✅ SMS Twilio enviado com sucesso!');
      }
    }

    // Se método for 'whatsapp' ou 'both', tenta WhatsApp Z-API
    if (method === 'whatsapp' || method === 'both') {
      console.log('💬 Tentando WhatsApp via Z-API...');
      const whatsappResult = await this.sendWhatsApp(phone, code);
      if (whatsappResult.success) {
        results.whatsapp = true;
        console.log('✅ WhatsApp Z-API enviado com sucesso!');
      }
    }

    // Fallback: sempre mostra no console
    console.log(`\n🔑 ===== CÓDIGO DE VERIFICAÇÃO (FALLBACK) =====`);
    console.log(`📱 Número: ${phone}`);
    console.log(`🔢 Código: ${code}`);
    console.log(`⏰ Válido por: 10 minutos`);
    console.log(`=============================================\n`);

    const success = results.sms || results.whatsapp;

    return {
      success: success,
      results: results,
      message: success ? 'Código enviado via APIs profissionais!' : 'Código disponível no console (APIs não configuradas)'
    };
  }
}

module.exports = ProfessionalSmsService;
