// Rota para envio real de SMS
const express = require('express');
const router = express.Router();

router.post('/send-real-sms', async (req, res) => {
  try {
    const { phone, code } = req.body;
    
    console.log(`📱 ENVIANDO SMS REAL PARA ${phone}: ${code}`);
    
    const results = {
      sms: false,
      whatsapp: false,
      console: true
    };

    // 1. Tentar SMS via API gratuita
    try {
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
        console.log(`✅ SMS enviado com sucesso para ${phone}`);
        results.sms = true;
      } else {
        console.log(`❌ SMS falhou: ${smsResponse.status}`);
      }
    } catch (error) {
      console.log(`❌ Erro no SMS: ${error.message}`);
    }

    // 2. Tentar WhatsApp via Z-API
    try {
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
        console.log(`✅ WhatsApp enviado com sucesso para ${phone}`);
        results.whatsapp = true;
      } else {
        console.log(`❌ WhatsApp falhou: ${whatsappResponse.status}`);
      }
    } catch (error) {
      console.log(`❌ Erro no WhatsApp: ${error.message}`);
    }

    // 3. Fallback: Console
    console.log(`\n🔑 ===== CÓDIGO DE VERIFICAÇÃO =====`);
    console.log(`📱 Número: ${phone}`);
    console.log(`🔢 Código: ${code}`);
    console.log(`⏰ Válido por: 10 minutos`);
    console.log(`=====================================\n`);

    const success = results.sms || results.whatsapp;
    
    res.json({
      success: true,
      message: success ? 'SMS enviado com sucesso!' : 'Código disponível no console',
      results: results,
      code: code
    });
    
  } catch (error) {
    console.error('❌ Erro ao enviar SMS real:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao enviar SMS'
    });
  }
});

module.exports = router;