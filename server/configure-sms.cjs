// Script para configurar SMSDev + Z-API
const DualSmsService = require('./services/dualSmsService.cjs');

console.log('🚀 CONFIGURAÇÃO DO SISTEMA DUPLO DE SMS');
console.log('=====================================');
console.log('');
console.log('Para configurar o sistema:');
console.log('');
console.log('1. SMSDev Brasil:');
console.log('   - Acesse: https://smsdev.com.br/');
console.log('   - Crie uma conta gratuita');
console.log('   - Pegue seu token');
console.log('');
console.log('2. Z-API WhatsApp:');
console.log('   - Acesse: https://z-api.io/');
console.log('   - Crie uma conta gratuita');
console.log('   - Pegue seu token');
console.log('');
console.log('Depois execute:');
console.log('node server/configure-sms.cjs SEU_TOKEN_SMSDEV SEU_TOKEN_ZAPI');
console.log('');

// Verificar se foi passado os parâmetros
if (process.argv.length >= 4) {
  const smsdevToken = process.argv[2];
  const zapiToken = process.argv[3];
  
  console.log('🔧 Configurando sistema duplo...');
  DualSmsService.configureTokens(smsdevToken, zapiToken);
  console.log('✅ Sistema duplo configurado com sucesso!');
  console.log('');
  console.log('Agora o sistema enviará SMS via SMSDev e WhatsApp via Z-API!');
} else {
  console.log('⚠️ Parâmetros não fornecidos. Execute com os tokens corretos.');
}
