// Serviço WhatsApp Simples - SchoolManager
class SimpleWhatsAppService {
  constructor() {
    this.baseUrl = 'https://web.whatsapp.com/send';
  }

  // Gerar link do WhatsApp Web
  generateWhatsAppLink(phone, message) {
    const cleanPhone = phone.replace(/\D/g, '');
    const encodedMessage = encodeURIComponent(message);
    return `${this.baseUrl}?phone=${cleanPhone}&text=${encodedMessage}`;
  }

  // Enviar via WhatsApp Web
  async sendMessage(phone, message) {
    try {
      const link = this.generateWhatsAppLink(phone, message);
      
      console.log(`💬 GERANDO LINK DO WHATSAPP WEB:`);
      console.log(`📱 Número: ${phone}`);
      console.log(`🔗 Link: ${link}`);
      console.log(`📝 Mensagem: ${message}`);
      
      // Simular envio
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return {
        success: true,
        method: 'WhatsApp Web',
        link: link,
        message: 'Link gerado - abra no navegador'
      };
    } catch (error) {
      console.log(`❌ Erro ao gerar link: ${error.message}`);
      return {
        success: false,
        method: 'WhatsApp Web',
        error: error.message
      };
    }
  }
}

module.exports = SimpleWhatsAppService;



