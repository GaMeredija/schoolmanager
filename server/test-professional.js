// Teste do Sistema PROFISSIONAL de SMS/WhatsApp
const ProfessionalSmsService = require('./services/professionalSmsService');

async function testProfessionalSystem() {
  console.log('🚀 Testando Sistema PROFISSIONAL de SMS/WhatsApp...\n');
  
  const smsService = new ProfessionalSmsService();
  const phone = '18996441734';
  const code = Math.floor(100000 + Math.random() * 900000);
  
  console.log('📱 Testando SMS via Twilio...');
  const smsResult = await smsService.sendSMS(phone, code);
  console.log('Resultado SMS:', smsResult);
  
  console.log('\n💬 Testando WhatsApp via Z-API...');
  const whatsappResult = await smsService.sendWhatsApp(phone, code);
  console.log('Resultado WhatsApp:', whatsappResult);
  
  console.log('\n🎯 Testando método completo...');
  const fullResult = await smsService.sendCode(phone, code, 'both');
  console.log('Resultado completo:', fullResult);
}

testProfessionalSystem().catch(console.error);



