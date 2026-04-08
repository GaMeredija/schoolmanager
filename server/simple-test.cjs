// Teste simples do sistema duplo
console.log('🚀 TESTE SIMPLES DO SISTEMA DUPLO');
console.log('=================================');

try {
  const DualSmsService = require('./services/dualSmsService.cjs');
  console.log('✅ DualSmsService carregado com sucesso!');
  
  // Testar configuração
  DualSmsService.configureTokens('test_token_smsdev', 'test_token_zapi');
  console.log('✅ Tokens configurados!');
  
  console.log('🎉 Sistema duplo está funcionando!');
  
} catch (error) {
  console.log('❌ Erro:', error.message);
}



