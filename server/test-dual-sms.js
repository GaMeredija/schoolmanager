// Teste do sistema duplo de SMS
import fetch from 'node-fetch';

async function testDualSms() {
  const phone = '18996441734';
  const code = '123456';
  
  console.log(`🚀 TESTANDO SISTEMA DUPLO DE SMS`);
  console.log(`📱 Número: ${phone}`);
  console.log(`🔢 Código: ${code}`);
  console.log('================================================');
  
  try {
    // Testar SMSDev
    console.log('📱 Testando SMSDev...');
    const smsResponse = await fetch('https://api.smsdev.com.br/v1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer SEU_TOKEN_SMSDEV'
      },
      body: JSON.stringify({
        number: phone,
        message: `SchoolManager - Codigo: ${code}. Valido por 10 min.`
      })
    });
    
    if (smsResponse.ok) {
      console.log(`✅ SMSDev enviado com sucesso!`);
    } else {
      console.log(`❌ SMSDev falhou: ${smsResponse.status}`);
    }
  } catch (error) {
    console.log(`❌ SMSDev erro: ${error.message}`);
  }

  try {
    // Testar Z-API WhatsApp
    console.log('💬 Testando Z-API WhatsApp...');
    const whatsappResponse = await fetch('https://api.z-api.io/instances/3C8B8A1F4B5C6D7E8F9A0B1C2D3E4F5A/send-text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Client-Token': '3C8B8A1F4B5C6D7E8F9A0B1C2D3E4F5A'
      },
      body: JSON.stringify({
        phone: phone,
        message: `🔐 *SchoolManager - Recuperação de Senha*\n\nSeu código de verificação é: *${code}*\n\nVálido por 10 minutos.`
      })
    });
    
    if (whatsappResponse.ok) {
      console.log(`✅ Z-API WhatsApp enviado com sucesso!`);
    } else {
      console.log(`❌ Z-API WhatsApp falhou: ${whatsappResponse.status}`);
    }
  } catch (error) {
    console.log(`❌ Z-API WhatsApp erro: ${error.message}`);
  }

  console.log(`\n🔑 ===== CÓDIGO DE VERIFICAÇÃO =====`);
  console.log(`📱 Número: ${phone}`);
  console.log(`🔢 Código: ${code}`);
  console.log(`⏰ Válido por: 10 minutos`);
  console.log(`=====================================\n`);
  
  console.log('📱 Para receber SMS real:');
  console.log('1. Configure SMSDev: https://smsdev.com.br/');
  console.log('2. Configure Z-API: https://z-api.io/');
  console.log('3. Execute: node server/configure-sms.cjs SEU_TOKEN_SMSDEV SEU_TOKEN_ZAPI');
}

testDualSms().catch(console.error);



