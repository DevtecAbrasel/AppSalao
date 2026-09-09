# Implementation Plan: Deploy AWS Produção

## Overview

Esta spec é exclusivamente de infraestrutura de deploy: nenhuma lógica de negócio da API é alterada. As tarefas abaixo criam os artefatos de configuração de implantação (`Dockerfile`, `.dockerignore`, `docker-compose.prod.yml`, template de ambiente, template de Nginx) e a documentação operacional do fluxo de deploy manual na VM_Producao, conforme especificado em `design.md`. Não há novo código de aplicação, portanto não há tarefas de PBT (o design justifica explicitamente que PBT não se aplica a esta spec). A verificação é feita via smoke test local do build da imagem Docker — o deploy real no servidor AWS é executado manualmente pelo usuário fora deste fluxo.

## Tasks

- [x] 1. Criar `api/.dockerignore`
  - Excluir `node_modules`, `.env`, `.env.*` (exceto `.env.production.example`), `.git`, `dist`, `*.log` e demais artefatos de desenvolvimento do contexto de build
  - _Requisito: 1.4_

- [x] 2. Criar `api/Dockerfile` multi-stage
  - Stage `builder` a partir de `node:20-alpine`: copiar `package.json`/`package-lock.json`, executar `npm ci`, copiar o restante de `api/`, executar `npx prisma generate` e `npm run build` (gera `dist/`)
  - Stage `runner` a partir de `node:20-alpine` limpo: copiar `package.json`/`package-lock.json` e instalar apenas dependências de produção (`npm ci --omit=dev`), copiar `dist/`, `prisma/` e o client gerado (`node_modules/.prisma`) do stage `builder`
  - Definir `CMD ["node", "dist/index.js"]` (nunca `ts-node-dev`)
  - Adicionar `EXPOSE 3333` como documentação da porta interna
  - _Requisito: 1.4_

- [~] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Criar `api/docker-compose.prod.yml`
  - Definir o serviço `api` com `build: .`, `image: salao-abrasel-api:latest`, `container_name: salao-abrasel-api`
  - Configurar `restart: unless-stopped`
  - Configurar `env_file: - .env.production`
  - Publicar a porta apenas em loopback: `ports: - "127.0.0.1:3333:3333"`
  - Configurar `logging` com driver `json-file` e opções `max-size: "10m"` e `max-file: "5"`
  - _Requisito: 1.1, 1.2, 1.3, 1.5, 2.1, 3.1, 6.2_

- [x] 5. Criar `api/.env.production.example`
  - Incluir todas as Variaveis_De_Ambiente_De_Producao: `DATABASE_URL`, `PORT`, `APP_API_KEY`, `ADMIN_API_KEY`, `JWT_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`
  - Preencher apenas com placeholders (sem segredos reais), com comentários indicando que os valores de produção devem ser diferentes dos valores de desenvolvimento local
  - Incluir comentário documentando a observação do design sobre `ADMIN_API_KEY` não ser validada atualmente em `api/src/env.ts`
  - _Requisito: 3.1, 3.4_

- [x] 6. Criar template de referência do Nginx em `deploy/nginx/appsalao.abrasel.xyz.conf`
  - Bloco `server` na porta 80 para `appsalao.abrasel.xyz` com `return 301 https://$host$request_uri;`
  - Bloco `server` na porta 443 (`ssl`) para `appsalao.abrasel.xyz` com `location / { proxy_pass http://127.0.0.1:3333; ... }` preservando `Host`, `X-Real-IP`, `X-Forwarded-For` e `X-Forwarded-Proto`
  - Incluir comentário indicando que os diretivas de certificado (`ssl_certificate`/`ssl_certificate_key`) já existem no Nginx_Existente e devem ser mantidas, não recriadas
  - _Requisito: 2.1, 2.2, 2.3_

- [~] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Criar documentação operacional `DEPLOY.md` (na raiz do repositório ou em `api/DEPLOY.md`)
  - [~] 8.1 Documentar a preparação inicial (apenas primeira implantação)
    - Passos de `git clone`/posicionamento em `/opt/salao-abrasel-api`, criação de `.env.production` a partir do `.env.production.example` com `chmod 600`
    - _Requisito: 3.1, 3.4, 5.1_
  - [~] 8.2 Documentar a criação do Banco_De_Producao e usuário dedicado
    - Comandos SQL via `psql` (`CREATE DATABASE`, `CREATE USER`, `GRANT ALL PRIVILEGES`) executados na instância PostgreSQL já existente, e atualização de `DATABASE_URL` em `.env.production`
    - _Requisito: 4.1_
  - [~] 8.3 Documentar build da imagem e aplicação de migrations
    - Comando `docker compose -f docker-compose.prod.yml build`
    - Aviso de backup completo do Banco_De_Producao (ex.: `pg_dump`) antes de migrar
    - Comando `docker compose -f docker-compose.prod.yml run --rm --env-file .env.production api npx prisma migrate deploy`, com instrução de não avançar para o próximo passo se o código de saída for diferente de zero
    - _Requisito: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_
  - [~] 8.4 Documentar subida/atualização do container e verificação local
    - Comando `docker compose -f docker-compose.prod.yml up -d`
    - Verificação local com `curl -i http://127.0.0.1:3333/health`
    - _Requisito: 1.1, 1.2, 1.3, 5.2, 6.1_
  - [~] 8.5 Documentar configuração e recarga do Nginx_Existente
    - Edição do server block existente para incluir o bloco `location` de `proxy_pass` (referenciando o template criado na tarefa 6)
    - Comando `sudo nginx -t` obrigatório antes de `sudo systemctl reload nginx`, com instrução de só recarregar se o teste passar
    - Verificação via domínio público com `curl -i https://appsalao.abrasel.xyz/health`
    - _Requisito: 2.4, 2.5, 2.6, 5.3, 6.1_
  - [~] 8.6 Documentar o resumo do fluxo repetível de deploy (deploys subsequentes)
    - Sequência consolidada: `git pull`, build da imagem, backup do banco, `prisma migrate deploy`, `up -d`, verificação local e via domínio
    - _Requisito: 5.1, 5.2, 5.3_
  - [~] 8.7 Documentar a Estratégia de Rollback
    - Retag da imagem atual como `salao-abrasel-api:previous` antes de reconstruir
    - Procedimento de rollback (`down`, retag `previous` para `latest`, `up -d`) em caso de falha em qualquer etapa
    - Nota sobre o backup do passo 8.3 ser o mecanismo de recuperação do banco em caso de falha de migration
    - _Requisito: 5.4, 4.6, 4.7, 4.8_
  - [~] 8.8 Documentar diagnóstico e observabilidade
    - Comandos `docker ps`, `docker inspect salao-abrasel-api`, `docker logs salao-abrasel-api` e `docker events` para diagnosticar crash loops, causas de reinício e consultar logs
    - _Requisito: 6.2, 6.3, 6.4_

- [~] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Smoke test local do build da imagem Docker
  - Executar `docker compose -f docker-compose.prod.yml build` (ou `docker build -f api/Dockerfile api`) localmente e confirmar que a imagem é construída sem erros, a partir do artefato `dist/index.js` gerado por `npm run build`, e não a partir de `ts-node-dev`
  - Validar que o `Dockerfile` e o `docker-compose.prod.yml` são sintaticamente válidos (`docker compose -f docker-compose.prod.yml config`)
  - Não requer acesso à VM_Producao real; o deploy no servidor AWS é executado manualmente pelo usuário fora deste fluxo
  - _Requisito: 1.4, 5.1_

- [~] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Nenhuma tarefa altera código de negócio em `api/src`; todas as tarefas criam arquivos de infraestrutura/configuração ou documentação operacional.
- Não há tarefas de PBT: o design.md justifica que testes baseados em propriedades não se aplicam a esta spec de infraestrutura.
- A verificação automatizável se limita ao smoke test de build da imagem Docker (tarefa 10). Os demais itens de "Testing Strategy" do design (persistência do container, proxy via Nginx, idempotência de migrations, rollback real) exigem a VM_Producao real e são executados manualmente pelo Administrador, fora do escopo de execução por agente de código.
- Checkpoints intermediários (tarefas 3, 7, 9) permitem validação incremental antes de avançar para o próximo grupo de artefatos.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2", "4", "5", "6"] },
    { "id": 2, "tasks": ["8.1", "8.2"] },
    { "id": 3, "tasks": ["8.3", "8.4"] },
    { "id": 4, "tasks": ["8.5", "8.6"] },
    { "id": 5, "tasks": ["8.7", "8.8"] },
    { "id": 6, "tasks": ["10"] }
  ]
}
```
