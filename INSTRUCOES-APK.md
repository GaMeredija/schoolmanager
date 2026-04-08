# 📱 Como Gerar o APK - School Manager

## 🚨 Problema Identificado
O Gradle está com incompatibilidade de versão Java. Vamos resolver isso:

## ✅ Solução Rápida - Android Studio

### 1️⃣ Abrir o Projeto
```bash
npx cap open android
```

### 2️⃣ No Android Studio:
1. **Aguarde** o Gradle Sync terminar
2. Se der erro de Java, vá em:
   - `File > Settings > Build > Build Tools > Gradle`
   - Mude para "Use Gradle from: wrapper"
3. Clique em **"Sync Now"**

### 3️⃣ Gerar APK:
1. `Build > Build Bundle(s) / APK(s) > Build APK(s)`
2. Aguarde o build terminar
3. Clique em **"locate"** quando aparecer a notificação

### 4️⃣ Copiar APK para Raiz:
O APK estará em: `android/app/build/outputs/apk/debug/app-debug.apk`

**Copie manualmente para a raiz** e renomeie para: `SchoolManager.apk`

## 🔄 Alternativa - Comando Direto

Se o Android Studio não funcionar, tente:

```bash
# 1. Build web
npm run build

# 2. Sync
npx cap sync android

# 3. Gerar APK (se Java estiver correto)
cd android
./gradlew assembleDebug
cd ..

# 4. Copiar APK
copy "android\app\build\outputs\apk\debug\app-debug.apk" "SchoolManager.apk"
```

## 📱 Resultado Final

Você terá o arquivo **`SchoolManager.apk`** na raiz do projeto, pronto para:
- ✅ Enviar pelo WhatsApp
- ✅ Baixar no celular
- ✅ Instalar diretamente

## 🔧 Se Continuar com Erro Java

1. **Verifique a versão do Java:**
   ```bash
   java -version
   ```

2. **Instale Java 17 ou 21** se necessário

3. **Configure no Android Studio:**
   - `File > Settings > Build > Build Tools > Gradle`
   - Configure o JDK correto

## 🎯 Usuários para Teste no App

- **Diretor**: diretor@escola.com / 123
- **Admin**: admin@escola.com / 123  
- **Coordenador**: coordenador@escola.com / 123
- **Professor**: professor1@escola.com / 123
- **Aluno**: aluno1@escola.com / 123

## 📞 Conectividade

O app se conectará automaticamente em:
- **Servidor**: http://localhost:3001
- **Banco**: SQLite compartilhado

**Importante**: O servidor precisa estar rodando (`npm run dev`) para o app funcionar!