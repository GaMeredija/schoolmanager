// Sistema DUPLO: SMSDev + Z-API WhatsApp (ES Module)
import fetch from 'node-fetch';

class DualSmsService {
  constructor() {
    // SMSDev Brasil (SMS)
    this.smsdev = {
      url: 'https://api.smsdev.com.br/v1/send',
      token: 'SEU_TOKEN_SMSDEV', // Substitua pelo seu token real
      name: 'SMSDev Brasil'
    };
    
    // Z-API WhatsApp
    this.zapi = {
      url: 'https://api.z-api.io/instances/3C8B8A1F4B5C6D7E8F9A0B1C2D3E4F5A/send-text',
      token: '3C8B8A1F4B5C6D7E8F9A0B1C2D3E4F5A', // Substitua pelo seu token real
      name: 'Z-API WhatsApp'
    };
  }

  // Enviar via SMSDev (SMS)
  async sendSMS(phone, code) {
    try {
      console.log(`📱 Enviando SMS via SMSDev para ${phone}: ${code}`);
      
      const response = await fetch(this.smsdev.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.smsdev.token}`
        },
        body: JSON.stringify({
          number: phone,
          message: `SchoolManager - Codigo: ${code}. Valido por 10 min.`
        })
      });
      
      if (response.ok) {
        console.log(`✅ SMSDev enviado com sucesso para ${phone}`);
        return { success: true, method: 'sms' };
      } else {
        console.log(`❌ SMSDev falhou: ${response.status}`);
        return { success: false, error: response.status };
      }
    } catch (error) {
      console.log(`❌ SMSDev erro: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // Enviar via Z-API (WhatsApp)
  async sendWhatsApp(phone, code) {
    try {
      console.log(`💬 Enviando WhatsApp via Z-API para ${phone}: ${code}`);
      
      const response = await fetch(this.zapi.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Client-Token': this.zapi.token
        },
        body: JSON.stringify({
          phone: phone,
          message: `🔐 *SchoolManager - Recuperação de Senha*\n\nSeu código de verificação é: *${code}*\n\nVálido por 10 minutos.\n\nSe você não solicitou esta recuperação, ignore esta mensagem.`
        })
      });
      
      if (response.ok) {
        console.log(`✅ Z-API WhatsApp enviado com sucesso para ${phone}`);
        return { success: true, method: 'whatsapp' };
      } else {
        console.log(`❌ Z-API WhatsApp falhou: ${response.status}`);
        return { success: false, error: response.status };
      }
    } catch (error) {
      console.log(`❌ Z-API WhatsApp erro: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // Método principal - tenta ambas as APIs
  async sendCode(phone, code) {
    console.log(`🚀 SISTEMA DUPLO - Enviando para ${phone}: ${code}`);
    console.log('================================================');
    
    const results = {
      sms: false,
      whatsapp: false,
      console: true
    };

    // 1. Tentar SMS via SMSDev
    const smsResult = await this.sendSMS(phone, code);
    if (smsResult.success) {
      results.sms = true;
    }

    // 2. Tentar WhatsApp via Z-API
    const whatsappResult = await this.sendWhatsApp(phone, code);
    if (whatsappResult.success) {
      results.whatsapp = true;
    }

    // 3. Fallback: Console
    console.log(`\n🔑 ===== CÓDIGO DE VERIFICAÇÃO =====`);
    console.log(`📱 Número: ${phone}`);
    console.log(`🔢 Código: ${code}`);
    console.log(`⏰ Válido por: 10 minutos`);
    console.log(`=====================================\n`);

    const success = results.sms || results.whatsapp;
    
    return {
      success,
      results,
      code,
      message: success ? 'Código enviado com sucesso!' : 'Código disponível no console'
    };
  }

  // Configurar tokens reais
  configureTokens(smsdevToken, zapiToken) {
    this.smsdev.token = smsdevToken;
    this.zapi.token = zapiToken;
    console.log('✅ Tokens configurados com sucesso!');
  }
}

export default new DualSmsService();



