// Script de teste para enviar SMS
const fetch = require('node-fetch');

async function testSms() {
  const phone = '18996441734';
  const code = '123456';
  
  console.log(`🚀 TESTANDO ENVIO DE SMS PARA ${phone}: ${code}`);
  console.log('================================================');
  
  // 1. Tentar SMSDev
  try {
    console.log('📱 Tentando SMSDev...');
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

  // 2. Tentar WhatsApp
  try {
    console.log('📱 Tentando WhatsApp...');
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
      console.log(`✅ WhatsApp enviado com sucesso!`);
    } else {
      console.log(`❌ WhatsApp falhou: ${whatsappResponse.status}`);
    }
  } catch (error) {
    console.log(`❌ WhatsApp erro: ${error.message}`);
  }

  // 3. Fallback: Console
  console.log(`\n🔑 ===== CÓDIGO DE VERIFICAÇÃO =====`);
  console.log(`📱 Número: ${phone}`);
  console.log(`🔢 Código: ${code}`);
  console.log(`⏰ Válido por: 10 minutos`);
  console.log(`=====================================\n`);
  
  console.log('📱 Para receber o SMS real, configure o Twilio:');
  console.log('1. Acesse: https://console.twilio.com/');
  console.log('2. Crie uma conta gratuita');
  console.log('3. Pegue Account SID e Auth Token');
  console.log('4. Compre um número de telefone');
  console.log('5. Execute: node server/setup-twilio.cjs ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx +1234567890');
}

testSms().catch(console.error);



