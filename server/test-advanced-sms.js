// Teste do sistema avançado de SMS
import fetch from 'node-fetch';

async function testAdvancedSms() {
  const phone = '18996441734';
  const code = '123456';
  
  console.log(`🚀 TESTANDO SISTEMA AVANÇADO DE SMS`);
  console.log(`📱 Número: ${phone}`);
  console.log(`🔢 Código: ${code}`);
  console.log('================================================');
  
  try {
    // Chamar a API do sistema avançado
    const response = await fetch('http://localhost:3001/api/auth/send-advanced-sms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phone: phone,
        code: code
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Sistema avançado executado com sucesso!');
      console.log('📊 Resultados:', data.results);
      console.log('💬 Mensagem:', data.message);
    } else {
      console.log('❌ Erro na API:', response.status);
    }
    
  } catch (error) {
    console.log('❌ Erro de conexão:', error.message);
  }
  
  console.log('\n🔑 ===== CÓDIGO DE VERIFICAÇÃO =====');
  console.log(`📱 Número: ${phone}`);
  console.log(`🔢 Código: ${code}`);
  console.log(`⏰ Válido por: 10 minutos`);
  console.log(`=====================================\n`);
  
  console.log('📱 Para receber SMS real:');
  console.log('1. Configure o Twilio: https://console.twilio.com/');
  console.log('2. Execute: node server/setup-twilio.cjs ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx +1234567890');
}

testAdvancedSms().catch(console.error);