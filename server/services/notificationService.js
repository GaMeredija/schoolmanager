import nodemailer from 'nodemailer';
import { createClient } from '@libsql/client';

const client = createClient({
  url: 'file:server/school.db'
});

class NotificationService {
  constructor() {
    this.smsProviders = [
      {
        name: 'SMSDev',
        url: 'https://api.smsdev.com.br/v1/send',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer SEU_TOKEN_SMSDEV'
        }
      },
      {
        name: 'Zenvia',
        url: 'https://api.zenvia.com/v2/channels/sms/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-TOKEN': 'SEU_TOKEN_ZENVIA'
        }
      },
      {
        name: 'TotalVoice',
        url: 'https://api.totalvoice.com.br/sms',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Access-Token': 'SEU_TOKEN_TOTALVOICE'
        }
      }
    ];

    this.emailTransporter = nodemailer.createTransporter({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: 'seu-email@gmail.com',
        pass: 'sua-senha-app'
      }
    });
  }

  // Enviar SMS via múltiplos provedores
  async sendSMS(phone, message) {
    const results = [];
    
    for (const provider of this.smsProviders) {
      try {
        console.log(`📱 Tentando ${provider.name}...`);
        
        const response = await fetch(provider.url, {
          method: provider.method,
          headers: provider.headers,
          body: JSON.stringify({
            number: phone,
            message: message
          })
        });

        if (response.ok) {
          console.log(`✅ SMS enviado via ${provider.name}`);
          results.push({ provider: provider.name, success: true });
          return { success: true, provider: provider.name };
        } else {
          console.log(`❌ ${provider.name} falhou: ${response.status}`);
          results.push({ provider: provider.name, success: false, error: response.status });
        }
      } catch (error) {
        console.log(`❌ ${provider.name} erro:`, error.message);
        results.push({ provider: provider.name, success: false, error: error.message });
      }
    }

    return { success: false, results };
  }

  // Enviar email como fallback
  async sendEmail(email, code, phone) {
    try {
      const mailOptions = {
        from: 'SchoolManager <noreply@schoolmanager.com>',
        to: email,
        subject: '🔐 Código de Verificação - SchoolManager',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🔐 SchoolManager</h1>
              <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Recuperação de Senha</p>
            </div>
            
            <div style="padding: 30px; background: #f8f9fa;">
              <h2 style="color: #333; margin: 0 0 20px 0;">Código de Verificação</h2>
              
              <div style="background: white; padding: 20px; border-radius: 10px; text-align: center; margin: 20px 0;">
                <p style="margin: 0 0 10px 0; color: #666;">Seu código de verificação é:</p>
                <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; font-size: 24px; font-weight: bold; color: #1976d2; letter-spacing: 3px;">
                  ${code}
                </div>
              </div>
              
              <div style="background: #fff3e0; padding: 15px; border-radius: 8px; border-left: 4px solid #ff9800;">
                <p style="margin: 0; color: #e65100; font-size: 14px;">
                  <strong>⚠️ Importante:</strong> Este código é válido por 10 minutos e foi solicitado para o número ${phone}.
                </p>
              </div>
              
              <div style="margin-top: 20px; padding: 15px; background: #f5f5f5; border-radius: 8px;">
                <p style="margin: 0; color: #666; font-size: 14px;">
                  Se você não solicitou esta recuperação de senha, ignore este email.
                </p>
              </div>
            </div>
            
            <div style="background: #333; padding: 20px; text-align: center;">
              <p style="color: #999; margin: 0; font-size: 12px;">
                © 2024 SchoolManager - Sistema de Gestão Escolar
              </p>
            </div>
          </div>
        `
      };

      await this.emailTransporter.sendMail(mailOptions);
      console.log(`✅ Email enviado para ${email}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Erro ao enviar email:', error);
      return { success: false, error: error.message };
    }
  }

  // Enviar via WhatsApp Business API
  async sendWhatsApp(phone, message) {
    try {
      const response = await fetch('https://graph.facebook.com/v17.0/SEU_PHONE_NUMBER_ID/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer SEU_ACCESS_TOKEN'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: phone,
          type: 'text',
          text: { body: message }
        })
      });

      if (response.ok) {
        console.log(`✅ WhatsApp enviado para ${phone}`);
        return { success: true };
      } else {
        console.log(`❌ WhatsApp falhou: ${response.status}`);
        return { success: false };
      }
    } catch (error) {
      console.log(`❌ WhatsApp erro:`, error.message);
      return { success: false, error: error.message };
    }
  }

  // Sistema de notificação em tempo real
  async sendRealTimeNotification(userId, code) {
    try {
      // Salvar notificação no banco para exibição em tempo real
      await client.execute(`
        INSERT INTO notifications (id, userId, type, title, message, data, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        `notif_${Date.now()}`,
        userId,
        'verification_code',
        'Código de Verificação',
        `Seu código é: ${code}`,
        JSON.stringify({ code, expires: Date.now() + (10 * 60 * 1000) }),
        new Date().toISOString()
      ]);

      console.log(`✅ Notificação em tempo real salva para usuário ${userId}`);
      return { success: true };
    } catch (error) {
      console.error('❌ Erro ao salvar notificação:', error);
      return { success: false, error: error.message };
    }
  }

  // Método principal que tenta todas as opções
  async sendVerificationCode(phone, email, code, userId) {
    const results = {
      sms: null,
      email: null,
      whatsapp: null,
      notification: null
    };

    // 1. Tentar SMS
    console.log('📱 Tentando enviar SMS...');
    results.sms = await this.sendSMS(phone, `SchoolManager - Código: ${code}. Válido por 10 min.`);

    // 2. Tentar Email
    if (email) {
      console.log('📧 Tentando enviar email...');
      results.email = await this.sendEmail(email, code, phone);
    }

    // 3. Tentar WhatsApp
    console.log('💬 Tentando enviar WhatsApp...');
    results.whatsapp = await this.sendWhatsApp(phone, `🔐 *SchoolManager*\n\nCódigo: *${code}*\nVálido por 10 minutos.`);

    // 4. Salvar notificação em tempo real
    if (userId) {
      console.log('🔔 Salvando notificação em tempo real...');
      results.notification = await this.sendRealTimeNotification(userId, code);
    }

    // Verificar se pelo menos um método funcionou
    const success = results.sms?.success || results.email?.success || results.whatsapp?.success || results.notification?.success;

    return {
      success,
      results,
      code // Sempre retornar o código para fallback
    };
  }
}

export default new NotificationService();



