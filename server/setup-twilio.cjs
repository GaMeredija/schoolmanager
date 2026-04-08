// Script para configurar Twilio
const AdvancedSmsService = require('./services/advancedSmsService.js');

console.log('🚀 CONFIGURAÇÃO DO TWILIO');
console.log('==========================');
console.log('');
console.log('Para configurar o Twilio:');
console.log('1. Acesse: https://console.twilio.com/');
console.log('2. Crie uma conta gratuita');
console.log('3. Pegue seu Account SID e Auth Token');
console.log('4. Compre um número de telefone (gratuito para teste)');
console.log('');
console.log('Depois execute:');
console.log('node setup-twilio.js ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx +1234567890');
console.log('');
console.log('Onde:');
console.log('- ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx = Account SID');
console.log('- xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx = Auth Token');
console.log('- +1234567890 = Número Twilio');
console.log('');

// Verificar se foi passado os parâmetros
if (process.argv.length >= 5) {
  const accountSid = process.argv[2];
  const authToken = process.argv[3];
  const fromNumber = process.argv[4];
  
  console.log('🔧 Configurando Twilio...');
  AdvancedSmsService.configureTwilio(accountSid, authToken, fromNumber);
  console.log('✅ Twilio configurado com sucesso!');
  console.log('');
  console.log('Agora o sistema enviará SMS reais para o número do usuário!');
} else {
  console.log('⚠️ Parâmetros não fornecidos. Execute com os parâmetros corretos.');
}
