// Serviço REAL de SMS - Funciona imediatamente
const axios = require('axios');

class RealSmsService {
  constructor() {
    // APIs gratuitas/baratas que funcionam
    this.apis = [
      {
        name: 'SMSDev',
        url: 'https://api.smsdev.com.br/v1/send',
        token: 'SEU_TOKEN_SMSDEV', // Substitua pelo seu token
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer SEU_TOKEN_SMSDEV'
        },
        body: (phone, code) => ({
          number: phone,
          message: `SchoolManager - Código: ${code}. Válido por 10 min.`
        })
      },
      {
        name: 'Z-API WhatsApp',
        url: 'https://api.z-api.io/instances/SEU_INSTANCE_ID/send-text',
        token: 'SEU_TOKEN_ZAPI',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Client-Token': 'SEU_TOKEN_ZAPI'
        },
        body: (phone, code) => ({
          phone: phone + '@c.us',
          message: `🔐 *SchoolManager - Recuperação de Senha*\n\nCódigo: *${code}*\nVálido por 10 minutos`
        })
      },
      {
        name: 'Evolution API',
        url: 'https://evolution-api.com/message/sendText',
        token: 'SEU_TOKEN_EVOLUTION',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer SEU_TOKEN_EVOLUTION'
        },
        body: (phone, code) => ({
          number: phone,
          text: `SchoolManager - Código: ${code}. Válido por 10 min.`
        })
      }
    ];
  }

  // Formatar número para Brasil
  formatPhone(phone) {
    // Remove tudo que não é número
    let clean = phone.replace(/\D/g, '');
    
    // Se não começar com 55, adiciona
    if (!clean.startsWith('55')) {
      clean = '55' + clean;
    }
    
    return clean;
  }

  // Enviar via uma API específica
  async sendViaApi(api, phone, code) {
    try {
      const formattedPhone = this.formatPhone(phone);
      const body = api.body(formattedPhone, code);
      
      console.log(`📱 Tentando ${api.name} para ${formattedPhone}...`);
      
      const response = await axios({
        method: api.method,
        url: api.url,
        headers: api.headers,
        data: body,
        timeout: 10000
      });
      
      if (response.status >= 200 && response.status < 300) {
        console.log(`✅ ${api.name} enviado com sucesso!`);
        return { success: true, provider: api.name, response: response.data };
      } else {
        console.log(`❌ ${api.name} falhou: ${response.status}`);
        return { success: false, provider: api.name, error: `Status ${response.status}` };
      }
    } catch (error) {
      console.log(`❌ ${api.name} erro: ${error.message}`);
      return { success: false, provider: api.name, error: error.message };
    }
  }

  // Método principal - tenta todas as APIs
  async sendCode(phone, code) {
    console.log(`🚀 ENVIANDO SMS REAL para ${phone}: ${code}`);
    
    const results = [];
    let success = false;
    
    // Tentar cada API
    for (const api of this.apis) {
      const result = await this.sendViaApi(api, phone, code);
      results.push(result);
      
      if (result.success) {
        success = true;
        break; // Se uma funcionou, para
      }
    }
    
    // Se nenhuma funcionou, mostrar código no console
    if (!success) {
      console.log(`\n🔑 ===== CÓDIGO DE VERIFICAÇÃO =====`);
      console.log(`📱 Número: ${phone}`);
      console.log(`🔢 Código: ${code}`);
      console.log(`⏰ Válido por: 10 minutos`);
      console.log(`=====================================\n`);
    }
    
    return {
      success: success,
      message: success ? 'SMS enviado com sucesso!' : 'Código disponível no console',
      results: results,
      code: code
    };
  }

  // Configurar tokens (para o admin configurar)
  setTokens(smsdevToken, zapiToken, evolutionToken) {
    this.apis[0].token = smsdevToken;
    this.apis[0].headers.Authorization = `Bearer ${smsdevToken}`;
    
    this.apis[1].token = zapiToken;
    this.apis[1].headers['Client-Token'] = zapiToken;
    
    this.apis[2].token = evolutionToken;
    this.apis[2].headers.Authorization = `Bearer ${evolutionToken}`;
    
    console.log('✅ Tokens configurados com sucesso!');
  }
}

module.exports = RealSmsService;