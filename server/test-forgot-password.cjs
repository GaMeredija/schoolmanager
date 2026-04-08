// Teste da recuperação de senha
const fetch = require('node-fetch');

async function testForgotPassword() {
  try {
    console.log('🚀 TESTANDO RECUPERAÇÃO DE SENHA');
    console.log('================================');
    
    const response = await fetch('http://localhost:3001/api/auth/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phone: '18996441734'
      })
    });
    
    const data = await response.json();
    console.log('✅ Resposta:', data);
    
  } catch (error) {
    console.log('❌ Erro:', error.message);
  }
}

testForgotPassword();



