// Script de configuração do WhatsApp Bot
import WhatsAppService from './services/whatsappService.mjs';

async function configureWhatsApp() {
  console.log('🤖 ===== CONFIGURAÇÃO DO WHATSAPP BOT =====');
  console.log('');
  
  const whatsappService = new WhatsAppService();
  
  // Verificar status da instância
  console.log('📡 Verificando status da instância...');
  const status = await whatsappService.checkStatus();
  console.log('Status:', status);
  
  console.log('');
  console.log('🔧 ===== CONFIGURAÇÕES NECESSÁRIAS =====');
  console.log('');
  console.log('1. Z-API (Recomendado):');
  console.log('   - Acesse: https://z-api.io');
  console.log('   - Crie uma conta e obtenha:');
  console.log('     * Instance ID');
  console.log('     * Client Token');
  console.log('');
  console.log('2. Evolution API (Alternativa):');
  console.log('   - Acesse: https://evolution-api.com');
  console.log('   - Configure sua instância');
  console.log('');
  console.log('3. Baileys API (Alternativa):');
  console.log('   - Acesse: https://baileys-api.com');
  console.log('   - Configure sua instância');
  console.log('');
  console.log('📝 ===== COMO CONFIGURAR =====');
  console.log('');
  console.log('1. Edite o arquivo: server/services/whatsappService.js');
  console.log('2. Substitua os tokens pelos seus:');
  console.log('   - instanceId: "SEU_INSTANCE_ID"');
  console.log('   - clientToken: "SEU_CLIENT_TOKEN"');
  console.log('');
  console.log('3. Para testar, execute:');
  console.log('   node server/test-whatsapp.js');
  console.log('');
  console.log('✅ Configuração concluída!');
}

configureWhatsApp().catch(console.error);
