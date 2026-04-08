# 📱 School Manager - App Híbrido

## 🚀 Como Gerar o APK

### Pré-requisitos
- Android Studio instalado
- Java JDK 8 ou superior
- Android SDK configurado

### Método 1: Script Automático
```bash
# Execute o script que automatiza todo o processo
./build-apk.bat
```

### Método 2: Manual
```bash
# 1. Build do projeto web
npm run build

# 2. Sincronizar com Android
npx cap sync android

# 3. Abrir Android Studio
npx cap open android

# 4. No Android Studio:
# - Aguarde o Gradle Sync
# - Build > Build Bundle(s) / APK(s) > Build APK(s)
# - APK gerado em: android/app/build/outputs/apk/debug/
```

## 🔧 Configuração

### Conectividade
O app está configurado para se conectar com:
- **Servidor local**: http://localhost:3001
- **Banco de dados**: SQLite local no servidor

### Usuários de Teste
- **Diretor**: diretor@escola.com / 123
- **Admin**: admin@escola.com / 123
- **Coordenador**: coordenador@escola.com / 123
- **Professor**: professor1@escola.com / 123
- **Aluno**: aluno1@escola.com / 123

## 📋 Funcionalidades do App

### ✅ Implementado
- Login e autenticação
- Interface responsiva para mobile
- Conectividade com backend
- Todas as funcionalidades do sistema web

### 🔄 Sistema Híbrido
- **Web**: Acesso via navegador (http://localhost:3001)
- **Mobile**: App nativo Android (.apk)
- **Backend**: Servidor Node.js compartilhado
- **Banco**: SQLite compartilhado

## 🛠️ Desenvolvimento

### Testar no Dispositivo
```bash
# Executar em modo desenvolvimento
npm run dev

# Em outro terminal, sincronizar
npx cap sync android

# Abrir no Android Studio para debug
npx cap open android
```

### Configurações Importantes
- `capacitor.config.ts`: Configuração principal
- `client/index.html`: Meta tags para mobile
- `android/`: Projeto Android nativo

## 📦 Distribuição

O APK gerado pode ser:
- Instalado diretamente em dispositivos Android
- Distribuído via APK file
- Publicado na Google Play Store (após configurações adicionais)

## 🔗 Arquitetura

```
┌─────────────────┐    ┌─────────────────┐
│   Web Browser   │    │   Android App   │
│  (localhost)    │    │     (.apk)      │
└─────────┬───────┘    └─────────┬───────┘
          │                      │
          └──────────┬───────────┘
                     │
          ┌─────────────────┐
          │  Backend API    │
          │ (localhost:3001)│
          └─────────┬───────┘
                    │
          ┌─────────────────┐
          │  SQLite DB      │
          │   (school.db)   │
          └─────────────────┘
```

## 🎯 Para TCC

Este sistema híbrido oferece:
- **Flexibilidade**: Web + Mobile
- **Economia**: Um backend para ambos
- **Modernidade**: Tecnologias atuais
- **Escalabilidade**: Fácil expansão
- **Profissionalismo**: Solução completa