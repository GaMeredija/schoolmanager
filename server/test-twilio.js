// Teste do Twilio com suas credenciais
const { createRequire } = require('module');
const require = createRequire(import.meta.url);
const ProfessionalSmsService = require('./services/professionalSmsService');

async function testTwilio() {
  console.log('🚀 Testando Twilio com suas credenciais...\n');
  
  const smsService = new ProfessionalSmsService();
  const phone = '18996441734';
  const code = Math.floor(100000 + Math.random() * 900000);
  
  console.log('📱 Testando SMS via Twilio...');
  console.log('Credenciais:');
  console.log('- Account SID:', smsService.twilioConfig.accountSid);
  console.log('- Auth Token:', smsService.twilioConfig.authToken.substring(0, 10) + '...');
  console.log('- Phone Number:', smsService.twilioConfig.phoneNumber);
  console.log('- Destino:', phone);
  console.log('- Código:', code);
  console.log('');
  
  try {
    const result = await smsService.sendSMS(phone, code);
    console.log('Resultado:', result);
  } catch (error) {
    console.error('Erro:', error.message);
  }
}

testTwilio().catch(console.error);
