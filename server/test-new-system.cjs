// Teste do novo sistema duplo
const DualSmsService = require('./services/dualSmsService.cjs');

async function testNewSystem() {
  console.log('🚀 TESTANDO NOVO SISTEMA DUPLO');
  console.log('==============================');
  
  const phone = '18996441734';
  const code = '123456';
  
  try {
    const result = await DualSmsService.sendCode(phone, code);
    console.log('✅ Resultado:', result);
  } catch (error) {
    console.log('❌ Erro:', error.message);
  }
}

testNewSystem();
