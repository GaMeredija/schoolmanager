// Script de teste do WhatsApp Bot
import WhatsAppService from './services/whatsappService.mjs';

async function testWhatsApp() {
  console.log('🧪 ===== TESTE DO WHATSAPP BOT =====');
  console.log('');
  
  const whatsappService = new WhatsAppService();
  
  // Número de teste
  const testPhone = '18996441734';
  const testCode = Math.floor(100000 + Math.random() * 900000);
  
  console.log(`📱 Testando envio para: ${testPhone}`);
  console.log(`🔢 Código de teste: ${testCode}`);
  console.log('');
  
  try {
    const result = await whatsappService.sendCode(testPhone, testCode);
    
    console.log('');
    console.log('📊 ===== RESULTADOS =====');
    console.log(`✅ Sucesso: ${result.success}`);
    console.log(`📱 Mensagem: ${result.message}`);
    console.log('');
    console.log('🔍 Detalhes:');
    console.log(`   Z-API: ${result.results.zApi ? '✅' : '❌'}`);
    console.log(`   Evolution: ${result.results.evolution ? '✅' : '❌'}`);
    console.log(`   Baileys: ${result.results.baileys ? '✅' : '❌'}`);
    console.log(`   Console: ${result.results.console ? '✅' : '❌'}`);
    
    if (result.responses && result.responses.length > 0) {
      console.log('');
      console.log('📋 Respostas das APIs:');
      result.responses.forEach((response, index) => {
        console.log(`   ${index + 1}. ${response.provider}: ${response.success ? '✅' : '❌'}`);
        if (!response.success) {
          console.log(`      Erro: ${response.error}`);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
  
  console.log('');
  console.log('✅ Teste concluído!');
}

testWhatsApp().catch(console.error);
