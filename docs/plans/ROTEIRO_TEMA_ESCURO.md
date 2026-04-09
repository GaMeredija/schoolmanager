# Roteiro de Implementacao do Tema Escuro

## Objetivo

Implementar tema escuro no SchoolManager de forma gradual, sem quebrar navegacao, autenticacao, componentes existentes ou a demonstracao publicada no GitHub Pages.

## Situacao Atual

O projeto tem base tecnica para tema escuro, mas ela esta incompleta:

- o Tailwind ja usa `darkMode: ["class"]`
- existe um `ThemeProvider`
- ha telas e componentes com classes `dark:`
- o CSS global foi alterado para forcar tema claro
- parte dos componentes-base ainda usa cores fixas
- varias paginas usam classes antigas ou inconsistentes

## Principios de Execucao

- fazer por fases pequenas e verificaveis
- validar a navegacao em cada perfil antes de seguir
- preservar a identidade visual por perfil
- preferir tokens de tema a cores fixas
- se uma fase gerar regressao visual relevante, interromper e corrigir antes da proxima

## Criterios de Sucesso

- o usuario consegue alternar entre claro e escuro sem recarregar a pagina
- o tema escolhido persiste entre sessoes
- login, logout, navegação e toasts continuam funcionando
- paginas principais de admin, diretor, coordenador, professor e aluno ficam legiveis e consistentes
- GitHub Pages continua funcionando em modo demonstracao

## Fase 0 - Preparacao e Seguranca

Objetivo: criar uma base segura para mudar o visual sem perder controle.

- trabalhar por checkpoints pequenos
- validar cada fase antes de abrir a proxima
- manter rollback simples por commit
- tratar primeiro estrutura global, depois layouts, depois paginas

Validacoes:

- `npm run build:pages`
- navegacao manual no demo
- login e logout de todos os perfis principais

## Fase 1 - Infraestrutura de Tema

Objetivo: religar o mecanismo de tema sem mudar o sistema inteiro de uma vez.

Arquivos alvo principais:

- `client/src/components/ThemeProvider.tsx`
- `client/src/App.tsx`
- `client/src/index.css`

Tarefas:

- reativar a logica de `light`, `dark` e `system`
- aplicar o `ThemeProvider` na raiz da aplicacao
- restaurar variaveis CSS de tema escuro
- remover a forca de tema claro aplicada globalmente
- garantir persistencia em `localStorage`

Risco:

- baixo para funcionalidade
- medio para aparencia global

Aceite da fase:

- alternar tema muda a classe do `html`
- o estado do tema persiste apos recarregar
- a aplicacao continua abrindo normalmente

## Fase 2 - Componentes Base

Objetivo: garantir que a fundacao visual responda corretamente aos tokens.

Arquivos provaveis:

- `client/src/components/ui/card.tsx`
- `client/src/components/ui/input.tsx`
- `client/src/components/ui/select.tsx`
- `client/src/components/ui/dialog.tsx`
- `client/src/components/ui/sheet.tsx`
- `client/src/components/ui/toast.tsx`
- `client/src/components/ui/sidebar.tsx`

Tarefas:

- trocar `bg-white`, `text-gray-*` e bordas fixas por tokens de tema
- alinhar modais, dropdowns, popovers e formularios
- revisar componentes Radix com fundo e texto fixos

Risco:

- medio, porque impacta muitas telas de uma vez

Aceite da fase:

- cards, inputs, selects e dialogos ficam legiveis em ambos os temas
- nao surgem areas brancas isoladas em telas escuras

## Fase 3 - Layouts e Estrutura por Perfil

Objetivo: adaptar as molduras principais sem perder a identidade de cada papel.

Arquivos principais:

- `client/src/components/layout/AdminLayout.tsx`
- `client/src/components/layout/TeacherLayout.tsx`
- `client/src/components/layout/StudentLayout.tsx`
- `client/src/components/layout/DirectorLayout.tsx`
- `client/src/components/layout/MainLayout.tsx`
- `client/src/components/layout/Header.tsx`
- `client/src/components/layout/AppSidebar.tsx`

Tarefas:

- definir superficies escuras coerentes para header, sidebar e area de conteudo
- manter cores-identidade por perfil como acento
- revisar menus, avatar, dropdown de usuario e notificacoes
- ajustar sobreposicoes mobile

Risco:

- medio para alto no visual

Aceite da fase:

- todos os layouts principais ficam consistentes
- nao ha textos escuros sobre fundo escuro
- nao ha paines claros “soltos” em layout escuro

## Fase 4 - Correcoes de Classes Inconsistentes

Objetivo: limpar classes antigas que podem quebrar o tema.

Problemas mapeados:

- uso de `dark:bg-dark-*`
- uso de `text-primary-500`, `bg-secondary-500` e variantes sem token claro no projeto
- paginas com muitas cores fixas e pouca cobertura `dark:`

Arquivos prioritarios:

- dashboards e paginas com maior concentracao de cores fixas
- telas de professor, admin, coordenador e chat

Tarefas:

- substituir classes inconsistentes por tokens validos
- padronizar cores semanticas
- revisar componentes com contadores, badges e estados

Risco:

- alto se feito sem ordem

Aceite da fase:

- nao restam classes invalidas de dark theme nas telas prioritarias
- paginas principais nao apresentam contraste ruim

## Fase 5 - Paginas Criticas

Objetivo: consolidar o tema nas telas de maior uso.

Prioridade de revisao:

- login
- dashboard admin
- dashboard professor
- dashboard aluno
- dashboard diretor
- chat
- calendarios
- relatorios
- classes, alunos, professores e notas

Tarefas:

- revisar listas, tabelas, cards e formularios
- ajustar graficos ao tema atual
- corrigir estados vazios, loaders e alertas

Risco:

- medio, com muito volume de ajuste fino

Aceite da fase:

- fluxos principais ficam visualmente coerentes no claro e no escuro
- graficos e tabelas continuam legiveis

## Fase 6 - Configuracao do Usuario

Objetivo: conectar o tema real ao painel de configuracoes.

Arquivos provaveis:

- `client/src/pages/admin/SettingsPage.tsx`
- outras paginas de configuracao equivalentes, se necessario

Tarefas:

- ligar o seletor de tema ao provider real
- opcionalmente expor `Claro`, `Escuro` e `Sistema`
- garantir que a escolha reflita imediatamente na interface

Aceite da fase:

- mudar o tema na configuracao funciona de verdade
- o botao de alternancia do header e a tela de configuracoes permanecem sincronizados

## Fase 7 - QA Final e Publicacao

Objetivo: fechar a entrega sem regressao.

Checklist:

- login e logout em todos os perfis
- navegacao principal por papel
- modais e dropdowns
- formulários
- responsividade mobile
- GitHub Pages em modo demonstracao
- build local e build do Pages

Comandos de verificacao:

```powershell
npm.cmd run build:pages
```

## Rollback Seguro

Se qualquer fase introduzir regressao forte:

- parar a implementacao naquela fase
- corrigir antes de seguir
- se necessario, voltar ao ultimo checkpoint estavel

## Ordem Recomendada de Execucao

1. Fase 1 - Infraestrutura de Tema
2. Fase 2 - Componentes Base
3. Fase 3 - Layouts e Estrutura por Perfil
4. Fase 4 - Correcoes de Classes Inconsistentes
5. Fase 5 - Paginas Criticas
6. Fase 6 - Configuracao do Usuario
7. Fase 7 - QA Final e Publicacao

## Observacao Final

O tema escuro e tecnicamente viavel neste projeto. O ponto mais importante nao e “criar um dark mode”, e sim reativar e consolidar uma base que ja existe parcialmente, com seguranca e previsibilidade.
