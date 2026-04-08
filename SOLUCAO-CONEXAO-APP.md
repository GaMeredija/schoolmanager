# 🔧 Solução - Conexão do App com Servidor

## 🚨 **Problema Identificado:**
O app não consegue se conectar ao `localhost:3001` porque:
- **Localhost** só funciona no computador
- **Dispositivos móveis** precisam do IP da rede

## ✅ **Soluções:**

### **1️⃣ Para Emulador Android:**
```typescript
// No capacitor.config.ts, descomente:
url: 'http://10.0.2.2:3001'
```

### **2️⃣ Para Dispositivo Físico:**
```typescript
// No capacitor.config.ts, descomente:
url: 'http://192.168.1.100:3001' // Substitua pelo seu IP
```

### **3️⃣ Descobrir seu IP:**
```bash
# No Windows:
ipconfig

# Procure por "Adaptador de Rede sem Fio"
# Use o "Endereço IPv4"
```

## 🔄 **Passos para Corrigir:**

### **Método 1 - IP da Rede (Recomendado):**
1. **Descubra seu IP:**
   ```bash
   ipconfig
   ```
2. **Edite `capacitor.config.ts`:**
   ```typescript
   url: 'http://SEU_IP_AQUI:3001'
   ```
3. **Rebuild:**
   ```bash
   npm run build
   npx cap sync android
   ```

### **Método 2 - Servidor Público (Alternativa):**
1. **Use ngrok ou similar:**
   ```bash
   npx ngrok http 3001
   ```
2. **Use a URL gerada no app**

## 📱 **Configuração Completa:**

### **1. Descobrir IP:**
```bash
ipconfig
# Exemplo de resultado: 192.168.1.105
```

### **2. Atualizar Config:**
```typescript
// capacitor.config.ts
server: {
  androidScheme: 'https',
  url: 'http://192.168.1.105:3001', // SEU IP AQUI
  cleartext: true
}
```

### **3. Rebuild e Sync:**
```bash
npm run build
npx cap sync android
```

### **4. Gerar APK:**
```bash
# No Android Studio:
Build > Build Bundle(s) / APK(s) > Build APK(s)
```

## 🌐 **Verificar Conectividade:**

### **No Computador:**
- ✅ Web: http://localhost:3001
- ✅ Rede: http://SEU_IP:3001

### **No Celular:**
- ❌ localhost:3001 (não funciona)
- ✅ SEU_IP:3001 (deve funcionar)

## 🔥 **Dica Rápida:**
1. **Descubra seu IP**: `ipconfig`
2. **Teste no navegador do celular**: `http://SEU_IP:3001`
3. **Se funcionar no navegador**, funcionará no app
4. **Atualize o `capacitor.config.ts`** com esse IP
5. **Rebuild e gere o APK**

## 📋 **Checklist Final:**
- [ ] Servidor rodando (`npm run dev`)
- [ ] IP descoberto (`ipconfig`)
- [ ] Config atualizada (`capacitor.config.ts`)
- [ ] Build feito (`npm run build`)
- [ ] Sync feito (`npx cap sync android`)
- [ ] APK gerado (Android Studio)
- [ ] Testado no dispositivo

**Agora o app deve conectar perfeitamente! 🚀**