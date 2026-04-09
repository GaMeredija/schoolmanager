# SchoolManager

Sistema escolar web com foco em gestao academica, comunicacao interna e acompanhamento de rotinas entre administrador, diretor, coordenador, professor e aluno.

## Resumo

O projeto concentra em uma unica aplicacao modulos de:

- usuarios e perfis
- turmas e disciplinas
- atividades, materiais e provas
- calendario, frequencia e notas
- relatorios e rotinas administrativas

## Tecnologias

- React + Vite no frontend
- Node.js + Express no backend
- Drizzle ORM
- SQLite em ambiente local
- Tailwind CSS na interface

## Estrutura principal

- `client/`: interface web
- `server/`: API, autenticacao e regras de negocio
- `shared/`: schemas e tipos compartilhados
- `migrations/`: migracoes de banco
- `docs/`: documentacao funcional e tecnica
- `scripts/`: utilitarios de manutencao

## Demonstracao online

O repositorio publica uma demonstracao estatica no GitHub Pages:

- [gameredija.github.io/schoolmanager](https://gameredija.github.io/schoolmanager/)

Perfis de demonstracao:

- `admin@escola.com` / `123`
- `diretor@escola.com` / `123`
- `coord@escola.com` / `123`
- `prof@escola.com` / `123`
- `aluno@escola.com` / `123`

Observacao:

A versao do GitHub Pages e uma demonstracao de portfolio. Ela usa dados simulados no navegador e nao substitui a execucao completa local com backend e banco.

## Como rodar localmente

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

## Build local

```powershell
npm run build
npm start
```

## GitHub Pages

O deploy da demonstracao e feito automaticamente pelo workflow em `.github/workflows/github-pages.yml`.

Para gerar localmente a versao estatica usada no Pages:

```powershell
npm run build:pages
```

## Documentacao complementar

- Veja `docs/` para materiais tecnicos e funcionais
- Veja `scripts/` para utilitarios de banco e suporte
