// Serviço AVANÇADO de envio de SMS com múltiplas APIs
const twilio = require('twilio');

class AdvancedSmsService {
  constructor() {
    // Configurações das APIs
    this.apis = {
      // Twilio (Mais confiável)
      twilio: {
        accountSid: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', // Substitua pelo seu Account SID
        authToken: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',   // Substitua pelo seu Auth Token
        fromNumber: '+1234567890' // Substitua pelo seu número Twilio
      },
      
      // SMSDev (Backup)
      smsdev: {
        url: 'https://api.smsdev.com.br/v1/send',
        token: 'SEU_TOKEN_SMSDEV'
      },
      
      // Z-API WhatsApp (Backup)
      zapi: {
        url: 'https://api.z-api.io/instances/3C8B8A1F4B5C6D7E8F9A0B1C2D3E4F5A/send-text',
        token: '3C8B8A1F4B5C6D7E8F9A0B1C2D3E4F5A'
      }
    };
    
    // Inicializar cliente Twilio
    this.twilioClient = twilio(this.apis.twilio.accountSid, this.apis.twilio.authToken);
  }

  // Método principal - tenta todas as APIs
  async sendCode(phone, code) {
    console.log(`🚀 SISTEMA AVANÇADO DE SMS - Enviando para ${phone}: ${code}`);
    
    const results = {
      twilio: false,
      smsdev: false,
      whatsapp: false,
      console: true
    };

    // 1. TENTAR TWILIO (Mais confiável)
    try {
      console.log('📱 Tentando Twilio...');
      
      const message = await this.twilioClient.messages.create({
        body: `🔐 SchoolManager - Recuperação de Senha\n\nSeu código de verificação é: ${code}\n\nVálido por 10 minutos.`,
        from: this.apis.twilio.fromNumber,
        to: phone.startsWith('+') ? phone : `+55${phone}`
      });
      
      console.log(`✅ TWILIO ENVIADO COM SUCESSO! SID: ${message.sid}`);
      results.twilio = true;
      
    } catch (error) {
      console.log(`❌ Twilio falhou: ${error.message}`);
    }

    // 2. TENTAR SMSDEV (Backup)
    try {
      console.log('📱 Tentando SMSDev...');
      
      const response = await fetch(this.apis.smsdev.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apis.smsdev.token}`
        },
        body: JSON.stringify({
          number: phone,
          message: `SchoolManager - Codigo: ${code}. Valido por 10 min.`
        })
      });
      
      if (response.ok) {
        console.log(`✅ SMSDev enviado com sucesso!`);
        results.smsdev = true;
      } else {
        console.log(`❌ SMSDev falhou: ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ SMSDev erro: ${error.message}`);
    }

    // 3. TENTAR WHATSAPP (Backup)
    try {
      console.log('📱 Tentando WhatsApp...');
      
      const response = await fetch(this.apis.zapi.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Client-Token': this.apis.zapi.token
        },
        body: JSON.stringify({
          phone: phone,
          message: `🔐 *SchoolManager - Recuperação de Senha*\n\nSeu código de verificação é: *${code}*\n\nVálido por 10 minutos.`
        })
      });
      
      if (response.ok) {
        console.log(`✅ WhatsApp enviado com sucesso!`);
        results.whatsapp = true;
      } else {
        console.log(`❌ WhatsApp falhou: ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ WhatsApp erro: ${error.message}`);
    }

    // 4. FALLBACK: Console
    console.log(`\n🔑 ===== CÓDIGO DE VERIFICAÇÃO =====`);
    console.log(`📱 Número: ${phone}`);
    console.log(`🔢 Código: ${code}`);
    console.log(`⏰ Válido por: 10 minutos`);
    console.log(`=====================================\n`);

    const success = results.twilio || results.smsdev || results.whatsapp;
    
    return {
      success,
      results,
      code,
      message: success ? 'SMS enviado com sucesso!' : 'Código disponível no console'
    };
  }

  // Método para configurar Twilio
  configureTwilio(accountSid, authToken, fromNumber) {
    this.apis.twilio.accountSid = accountSid;
    this.apis.twilio.authToken = authToken;
    this.apis.twilio.fromNumber = fromNumber;
    
    // Reinicializar cliente
    this.twilioClient = twilio(accountSid, authToken);
    
    console.log('✅ Twilio configurado com sucesso!');
  }
}

module.exports = new AdvancedSmsService();



