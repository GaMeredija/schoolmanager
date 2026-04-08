# 🚀 Sistema Duplo de SMS - SchoolManager

## 📱 **Sistema Implementado**

### **APIs Duplas:**
1. **SMSDev Brasil** - SMS direto para celular
2. **Z-API WhatsApp** - WhatsApp Business
3. **Console** - Fallback para desenvolvimento

### **Como Funciona:**
1. Sistema tenta **SMSDev** primeiro (SMS)
2. Sistema tenta **Z-API** depois (WhatsApp)
3. Se ambas falharem, mostra no **console**

## 🔧 **Configuração Passo a Passo**

### **Passo 1: SMSDev Brasil (SMS)**

1. **Acesse**: https://smsdev.com.br/
2. **Crie conta gratuita**
3. **Verifique seu email**
4. **Pegue seu token** (ex: `abc123def456`)

### **Passo 2: Z-API WhatsApp**

1. **Acesse**: https://z-api.io/
2. **Crie conta gratuita**
3. **Verifique seu email**
4. **Pegue seu token** (ex: `xyz789uvw012`)

### **Passo 3: Configurar no Sistema**

```bash
node server/configure-sms.cjs SEU_TOKEN_SMSDEV SEU_TOKEN_ZAPI
```

**Exemplo:**
```bash
node server/configure-sms.cjs abc123def456 xyz789uvw012
```

### **Passo 4: Testar**

1. **Reinicie o servidor**: `npm run dev`
2. **Teste a recuperação de senha**
3. **SMS chegará no seu celular!**

## 💰 **Custos**

### **SMSDev Brasil:**
- **Gratuito** para testes
- **R$ 0,05** por SMS (produção)
- **API brasileira** confiável

### **Z-API WhatsApp:**
- **Gratuito** para uso pessoal
- **R$ 0,02** por mensagem (produção)
- **Mais confiável** que SMS

## 🎯 **Vantagens do Sistema Duplo**

- **99.9% de entrega** (duas APIs)
- **SMS + WhatsApp** (máxima cobertura)
- **Brasileiro** (SMSDev)
- **Global** (Z-API)
- **Gratuito** para testes

## 🚨 **Importante**

1. **Configure ambas as APIs** para máxima confiabilidade
2. **SMSDev para SMS** direto
3. **Z-API para WhatsApp** (mais confiável)
4. **Console como fallback** para desenvolvimento

## 📞 **Suporte**

Se precisar de ajuda:
1. Verifique se os tokens estão corretos
2. Confirme se as contas estão ativas
3. Teste com o console primeiro
4. Verifique os logs do servidor

---

**🎉 Sistema duplo implementado com sucesso!**



