// Serviço WhatsApp Web Direto - SchoolManager
const { chromium } = require('playwright');

class WhatsAppWebService {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async init() {
    try {
      console.log('🚀 Iniciando WhatsApp Web...');
      this.browser = await chromium.launch({ 
        headless: false, // Mostrar navegador
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      this.page = await this.browser.newPage();
      await this.page.goto('https://web.whatsapp.com');
      
      console.log('✅ WhatsApp Web carregado');
      console.log('📱 Escaneie o QR Code para conectar');
      
      // Aguardar conexão
      await this.page.waitForSelector('[data-testid="chat-list"]', { timeout: 60000 });
      console.log('✅ WhatsApp conectado!');
      
      return true;
    } catch (error) {
      console.log(`❌ Erro ao conectar WhatsApp: ${error.message}`);
      return false;
    }
  }

  async sendMessage(phone, message) {
    try {
      if (!this.page) {
        throw new Error('WhatsApp não conectado');
      }

      // Formatar número
      const formattedPhone = phone.replace(/\D/g, '');
      const whatsappUrl = `https://web.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`;
      
      console.log(`💬 Enviando mensagem para ${phone}...`);
      
      // Abrir conversa
      await this.page.goto(whatsappUrl);
      await this.page.waitForTimeout(3000);
      
      // Enviar mensagem
      await this.page.click('[data-testid="compose-btn-send"]');
      await this.page.waitForTimeout(2000);
      
      console.log('✅ Mensagem enviada via WhatsApp Web!');
      return { success: true };
      
    } catch (error) {
      console.log(`❌ Erro ao enviar mensagem: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

module.exports = WhatsAppWebService;



