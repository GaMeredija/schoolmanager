# SchoolManager

Sistema escolar web para gestao academica com frontend em React/Vite e backend em Node.js/Express.

## Resumo

O projeto centraliza operacoes de administracao escolar em uma unica aplicacao web, com modulos para usuarios, turmas, disciplinas, calendario, frequencia, notas, relatorios, atividades, materiais e comunicacao entre perfis como administrador, diretor, coordenador, professor e aluno.

## Tecnologias

- React + Vite no frontend
- Node.js + Express no backend
- Drizzle ORM
- SQLite em ambiente local
- Tailwind CSS para interface

## Estrutura principal

- `client/`: interface web
- `server/`: API, autenticacao e regras de negocio
- `shared/`: schemas e tipos compartilhados
- `migrations/`: migracoes de banco
- `docs/`: documentacao funcional e tecnica
- `scripts/`: utilitarios de manutencao e testes

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

4. Acesse no navegador:

```text
http://localhost:3001
```

## Build de producao

```powershell
npm run build
npm start
```

## Documentacao complementar

- Veja `docs/` para arquitetura, fluxos, planos e materiais de TCC.
- Veja `scripts/` para utilitarios administrativos, manutencao de banco e testes auxiliares.
