# SchoolManager

Sistema escolar hibrido com frontend React/Vite, backend Node/Express, banco SQLite/Drizzle e projeto Android via Capacitor.

## Como rodar

1. Copie `.env.example` para `.env` e ajuste os valores necessarios.
2. Instale as dependencias:

```powershell
npm ci
```

3. Inicie o ambiente de desenvolvimento:

```powershell
npm run dev
```

4. Para sincronizar o app Android:

```powershell
npx cap sync android
```

## Observacoes

- Esta pasta foi preparada para publicacao no GitHub sem `node_modules`, builds, bancos locais, uploads e segredos.
- O arquivo original `README-APP.md` foi preservado para documentacao complementar.
