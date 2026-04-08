// Serviço SIMPLES de SMS/WhatsApp - SchoolManager
const axios = require('axios');

class SimpleSmsService {
  constructor() {
    // Configurações simples
    this.smsConfig = {
      // SMSDev - API gratuita para testes
      smsdev: {
        url: 'https://api.smsdev.com.br/v1/send',
        token: 'SEU_TOKEN_SMSDEV' // Substitua pelo token real
      },
      // Z-API WhatsApp - API gratuita para testes  
      whatsapp: {
        url: 'https://api.z-api.io/instances/SEU_INSTANCE/send-text',
        token: 'SEU_TOKEN_ZAPI' // Substitua pelo token real
      }
    };
  }

  // Formatar número para Brasil
  formatPhone(phone) {
    let cleanPhone = phone.replace(/\D/g, '');
    
    // Se não começar com 55, adiciona
    if (!cleanPhone.startsWith('55')) {
      cleanPhone = '55' + cleanPhone;
    }
    
    return cleanPhone;
  }

  // Enviar SMS via SMSDev
  async sendSMS(phone, code) {
    try {
      const formattedPhone = this.formatPhone(phone);
      
      const message = `SchoolManager - Codigo: ${code}. Valido por 10 min.`;
      
      // Simular envio SMS (para desenvolvimento)
      console.log(`📱 SIMULANDO SMS para ${formattedPhone}: ${message}`);
      
      // Simular delay de envio
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        success: true,
        method: 'SMS',
        response: { message: 'SMS simulado enviado' }
      };
    } catch (error) {
      console.log(`❌ SMS falhou: ${error.message}`);
      return {
        success: false,
        method: 'SMS',
        error: error.message
      };
    }
  }

  // Enviar WhatsApp via Z-API
  async sendWhatsApp(phone, code) {
    try {
      const formattedPhone = this.formatPhone(phone) + '@c.us';
      
      const message = `🔐 *SchoolManager - Recuperação de Senha*

Seu código de verificação é: *${code}*

⏰ Válido por: 10 minutos
🔒 Não compartilhe este código com ninguém

Se você não solicitou esta recuperação, ignore esta mensagem.`;
      
      // Simular envio WhatsApp (para desenvolvimento)
      console.log(`💬 SIMULANDO WhatsApp para ${formattedPhone}:`);
      console.log(message);
      
      // Simular delay de envio
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        success: true,
        method: 'WhatsApp',
        response: { message: 'WhatsApp simulado enviado' }
      };
    } catch (error) {
      console.log(`❌ WhatsApp falhou: ${error.message}`);
      return {
        success: false,
        method: 'WhatsApp',
        error: error.message
      };
    }
  }

  // Método principal - tenta ambos
  async sendCode(phone, code, method = 'both') {
    console.log(`\n🔐 ===== RECUPERAÇÃO DE SENHA =====`);
    console.log(`📱 Número: ${phone}`);
    console.log(`🔢 Código: ${code}`);
    console.log(`📋 Método: ${method.toUpperCase()}`);
    console.log(`⏰ Válido por: 10 minutos`);
    console.log(`=====================================\n`);
    
    const results = {
      sms: false,
      whatsapp: false,
      console: true
    };

    // Se método for 'sms' ou 'both', tenta SMS
    if (method === 'sms' || method === 'both') {
      console.log('📱 Tentando SMS...');
      const smsResult = await this.sendSMS(phone, code);
      if (smsResult.success) {
        results.sms = true;
        console.log('✅ SMS enviado com sucesso!');
      }
    }

    // Se método for 'whatsapp' ou 'both', tenta WhatsApp
    if (method === 'whatsapp' || method === 'both') {
      console.log('💬 Tentando WhatsApp...');
      const whatsappResult = await this.sendWhatsApp(phone, code);
      if (whatsappResult.success) {
        results.whatsapp = true;
        console.log('✅ WhatsApp enviado com sucesso!');
      }
    }

    const success = results.sms || results.whatsapp;

    return {
      success: success,
      results: results,
      message: success ? 'Código enviado com sucesso!' : 'Código disponível no console'
    };
  }
}

module.exports = SimpleSmsService;