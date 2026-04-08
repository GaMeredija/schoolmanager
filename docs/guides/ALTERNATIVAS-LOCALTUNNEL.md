# Alternativas ao LocalTunnel

Este guia resume opcoes para expor a versao web do sistema em ambientes externos, como demonstracoes, homologacao ou testes fora da rede local.

## Objetivo

Evitar a pagina de aviso do LocalTunnel e melhorar a estabilidade do acesso remoto ao servidor web em `http://localhost:3001`.

## Opcoes recomendadas

### 1. Cloudflare Tunnel

- Gratuito
- HTTPS automatico
- Mais estavel para testes externos

```bash
cloudflared tunnel --url http://localhost:3001
```

### 2. Pinggy

- Bom para testes rapidos
- Compartilhamento simples de URL externa

```bash
ssh -p 443 -R0:localhost:3001 a.pinggy.io
```

### 3. Serveo

- Alternativa baseada em SSH
- Util para cenarios simples

```bash
ssh -R 80:localhost:3001 serveo.net
```

## Boas praticas

- Mantenha o servidor web em execucao com `npm run dev`
- Valide o endpoint `http://localhost:3001/api/health` antes de abrir o tunel
- Prefira URLs HTTPS ao compartilhar o sistema externamente
- Evite versionar URLs temporarias dentro do codigo

## Observacao

Como o repositorio agora esta focado na versao web, qualquer configuracao externa deve ser tratada apenas como acesso remoto ao servidor, sem dependencia de plataforma mobile ou empacotamento nativo.
