# Design Document

## Overview

Esta spec cobre a implantação da API (`/api`) em produção em uma VM AWS que o usuário já possui e já opera (VM_Producao), com Docker, Nginx e PostgreSQL já instalados e em uso por outras aplicações. O escopo é **exclusivamente de infraestrutura de deploy**: nenhuma lógica de negócio da API ou do app mobile é alterada. Os únicos artefatos novos no repositório são arquivos de configuração de implantação (`Dockerfile`, `.dockerignore`, `docker-compose.prod.yml`, template de configuração do Nginx, `.env.production.example`) e documentação operacional. O código-fonte em `api/src` permanece intacto.

A abordagem escolhida é containerizar a API com Docker seguindo o mesmo padrão já usado pelas demais aplicações da VM_Producao, publicar a porta do container apenas localmente (`127.0.0.1:PORT`, sem expô-la para a internet) e reaproveitar o Nginx_Existente como proxy reverso HTTPS para o domínio já configurado (`appsalao.abrasel.xyz`). O Banco_De_Producao é um novo database + usuário dedicados dentro da instância PostgreSQL já existente na VM, sem provisionar um novo serviço de banco.

O deploy inicial e os deploys subsequentes são feitos manualmente pelo Administrador via `git pull` na VM, seguidos de uma sequência documentada e repetível de comandos (build da imagem, migrations, restart do container). Não há CI/CD nesta spec.

## Architecture

```mermaid
flowchart LR
    subgraph Internet
        Client[Cliente Web / Browser]
    end

    subgraph VM_Producao["VM_Producao (EC2)"]
        subgraph Nginx["Nginx_Existente"]
            NginxHTTPS["appsalao.abrasel.xyz:443 (TLS)"]
            NginxHTTP["appsalao.abrasel.xyz:80 -> redirect 443"]
        end

        subgraph Docker["Docker Engine (já em uso por outras apps)"]
            APIContainer["Container salao-abrasel-api\n(node dist/index.js)\nrestart: unless-stopped\nporta interna 3333"]
        end

        subgraph Postgres["PostgreSQL (instância já existente)"]
            OtherDBs[(Bancos de outras apps)]
            ProdDB[(Banco_De_Producao\nsalao_abrasel_prod)]
        end
    end

    Client -->|HTTPS 443| NginxHTTPS
    Client -->|HTTP 80| NginxHTTP
    NginxHTTPS -->|proxy_pass 127.0.0.1:3333| APIContainer
    APIContainer -->|DATABASE_URL| ProdDB
```

Pontos-chave da arquitetura:

- **Isolamento de rede**: a porta do container é publicada apenas em `127.0.0.1` (loopback), nunca em `0.0.0.0`. Só o Nginx_Existente, rodando na própria VM, alcança a API. Isso preserva o modelo de segurança já usado pelas outras aplicações do servidor.
- **Banco compartilhado, dados isolados**: a instância PostgreSQL é compartilhada com outras aplicações, mas o Banco_De_Producao e seu usuário são exclusivos desta API (Requisito 3, Glossário).
- **Sem alteração de código**: o `Dockerfile` empacota exatamente o que `npm run build` já produz (`dist/index.js`); nenhuma rota, middleware ou schema é tocado.

## Components and Interfaces

### 1. `api/Dockerfile` (novo arquivo de infraestrutura)

Build multi-stage para manter a imagem final pequena e sem ferramentas de desenvolvimento:

- **Stage `builder`**: imagem `node:20-alpine`, copia `package.json`/`package-lock.json`, executa `npm ci`, copia o restante de `api/`, executa `npx prisma generate` e `npm run build` (gera `dist/`).
- **Stage `runner`**: imagem `node:20-alpine` limpa, copia apenas `package.json`, `package-lock.json`, `node_modules` (produção) ou reexecuta `npm ci --omit=dev`, copia `dist/`, `prisma/` (necessário para `prisma migrate deploy` e para o client gerado) e `node_modules/.prisma`.
- `CMD ["node", "dist/index.js"]` — nunca `ts-node-dev` (Requisito 1.4).
- `EXPOSE 3333` apenas como documentação da porta interna (não expõe nada por si só).

### 2. `api/.dockerignore` (novo)

Evita copiar `node_modules`, `.env`, `.git`, `dist` local e artefatos de desenvolvimento para o contexto de build, reduzindo tamanho de imagem e risco de vazar segredos locais para dentro da imagem.

### 3. `api/docker-compose.prod.yml` (novo)

Decisão: usar **Docker Compose** em vez de `docker run` direto.

Justificativa: as demais aplicações da VM já seguem o padrão Docker; Compose facilita reproduzir a mesma política de restart, variáveis de ambiente e publicação de porta de forma declarativa e versionada, além de tornar o comando de deploy (`docker compose up -d --build`) idempotente e fácil de repetir manualmente (Requisito 5.1), sem exigir memorizar flags de `docker run`.

Conteúdo funcional (não a lógica da API, apenas orquestração):

```yaml
services:
  api:
    build: .
    image: salao-abrasel-api:latest
    container_name: salao-abrasel-api
    restart: unless-stopped
    env_file:
      - .env.production
    ports:
      - "127.0.0.1:3333:3333"
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "5"
```

- `restart: unless-stopped` atende ao Requisito 1.1–1.3 (reinício automático após falha ou reboot da VM, sem impedir parada manual pelo Administrador).
- `ports: "127.0.0.1:3333:3333"` publica a porta apenas localmente — o Nginx_Existente faz `proxy_pass` para `127.0.0.1:3333`.
- `env_file: .env.production` carrega as Variaveis_De_Ambiente_De_Producao sem commitá-las (Requisito 3.1).
- `logging` com `json-file` + rotação (`max-size`/`max-file`) atende ao Requisito 6.2 (histórico consultável, sem crescer indefinidamente); 5 arquivos de 10MB cobrem confortavelmente os 7 dias exigidos para o volume de logs desta API.
- O comportamento de backoff após reinícios repetidos (Requisito 1.5) é o comportamento nativo do Docker para containers com `restart` policy — não requer configuração adicional.

### 4. `api/.env.production.example` (novo, versionado como referência; o `.env.production` real NUNCA é commitado)

Lista as mesmas chaves de `api/.env.example`, com comentários indicando que os valores devem ser **diferentes** dos de desenvolvimento (Requisito 3.4):

```
DATABASE_URL="postgresql://salao_abrasel_prod:SENHA_FORTE@localhost:5432/salao_abrasel_prod?schema=public"
PORT=3333
APP_API_KEY="valor-de-producao-diferente-do-dev"
ADMIN_API_KEY="valor-de-producao-diferente-do-dev"
JWT_SECRET="segredo-jwt-de-producao-longo-e-aleatorio"
RESEND_API_KEY=""
EMAIL_FROM=""
```

**Observação sobre `ADMIN_API_KEY`**: os requisitos (3.3, Glossário) citam `ADMIN_API_KEY` como uma das Variaveis_De_Ambiente_De_Producao obrigatórias, mas o arquivo atual `api/src/env.ts` **não** declara nem valida essa variável no `envSchema` — apenas `DATABASE_URL`, `PORT`, `APP_API_KEY` e `JWT_SECRET` são validadas. Como esta spec não altera código da API, este design documenta a lacuna, mas **não** adiciona `ADMIN_API_KEY` ao `env.ts`. Consequência prática: se essa variável for definida no `.env.production` sem uso correspondente no código, ela simplesmente não terá efeito nem validação — não é um erro de deploy, mas deve ser resolvido em uma spec futura de código caso a autenticação administrativa realmente dependa dela. O Administrador deve incluir a variável no arquivo de produção por conformidade com o requisito documental, mesmo que hoje o processo não a valide.

Local no servidor: `/opt/salao-abrasel-api/.env.production` (fora do diretório do repositório git, ou em um caminho do repositório coberto por `.gitignore` — ver Fluxo de Deploy Operacional), com permissão restrita (`chmod 600`).

### 5. Template de configuração do Nginx (novo arquivo de referência no repositório, ex.: `deploy/nginx/appsalao.abrasel.xyz.conf`)

Arquivo versionado como **modelo de referência**; o arquivo real ativo já existe no Nginx_Existente (domínio e certificado já configurados) e deve ser ajustado manualmente pelo Administrador para incluir o bloco de proxy:

```nginx
server {
    listen 80;
    server_name appsalao.abrasel.xyz;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name appsalao.abrasel.xyz;

    # Certificado já emitido e gerenciado pelo Nginx_Existente (Let's Encrypt)
    # ssl_certificate / ssl_certificate_key: manter os já configurados.

    location / {
        proxy_pass http://127.0.0.1:3333;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Isso atende ao Requisito 2.1 (preserva método, corpo e cabeçalhos de host/protocolo) e 2.3 (redirect HTTP→HTTPS). Como o domínio e certificado já existem, o Administrador apenas adiciona/ajusta o `location` deste bloco no arquivo real já existente no Nginx_Existente — não cria um novo `server_name` do zero.

### 6. Banco de dados e usuário dedicados

Nenhum arquivo novo de código; são comandos SQL executados manualmente pelo Administrador via `psql` contra a instância PostgreSQL já existente (ver Fluxo de Deploy Operacional, passo 3).

### 7. Migrations em produção

`prisma migrate deploy` é executado **dentro do container**, como parte do processo de deploy documentado, antes do `docker compose up -d` colocar a nova versão em tráfego — nunca `prisma migrate dev` (Requisito 4.1). Isso é um comando operacional, não uma mudança de código.

## Data Models

Não há novos modelos de dados nesta spec. O `Banco_De_Producao` usa exatamente o schema já definido em `api/prisma/schema.prisma` e as migrations já existentes em `api/prisma/migrations/`. Nenhuma migration nova é criada como parte desta spec — o objetivo é aplicar as migrations **já existentes** contra um banco de produção novo, do zero.

## Correctness Properties

Esta spec é de infraestrutura e configuração de implantação (Docker, Nginx, variáveis de ambiente, comandos operacionais de banco de dados), não código de aplicação com funções puras e espaço de entrada variável. Não há transformação de dados, parser, serializer ou lógica de negócio nova cujo comportamento varie de forma testável com a entrada — os "resultados" aqui são estados de infraestrutura (container rodando, Nginx respondendo, variáveis carregadas) verificáveis por checagem direta, não por geração aleatória de entradas.

Por isso, testes baseados em propriedades (PBT) não se aplicam a esta spec. A verificação é feita por meio de testes de integração/fumaça pontuais (poucos exemplos representativos) e checagens manuais/documentadas, detalhados na seção de Testing Strategy abaixo.

## Fluxo de Deploy Operacional

Esta seção documenta a sequência de comandos que o Administrador executa manualmente na VM_Producao. Passos marcados com 🔁 fazem parte do processo repetível de deploy (Requisito 5); passos marcados com 1️⃣ são feitos apenas na primeira implantação.

### 1️⃣ Preparação inicial (uma vez)

```bash
# 1. Clonar o repositório (se ainda não estiver na VM)
git clone <url-do-repo> /opt/salao-abrasel-api
cd /opt/salao-abrasel-api/api

# 2. Criar o arquivo de ambiente de produção (fora do git, permissão restrita)
cp .env.production.example .env.production
nano .env.production   # preencher com valores reais e distintos do dev
chmod 600 .env.production
```

### 1️⃣ 3. Criar o Banco_De_Producao (uma vez, na instância PostgreSQL já existente)

```bash
sudo -u postgres psql
```
```sql
CREATE DATABASE salao_abrasel_prod;
CREATE USER salao_abrasel_prod WITH ENCRYPTED PASSWORD 'SENHA_FORTE_AQUI';
GRANT ALL PRIVILEGES ON DATABASE salao_abrasel_prod TO salao_abrasel_prod;
\q
```

Atualizar `DATABASE_URL` em `.env.production` com esse usuário/banco/senha.

### 🔁 4. Build da imagem e aplicação de migrations

```bash
cd /opt/salao-abrasel-api/api

# Build da imagem (a partir do Dockerfile, não do modo dev)
docker compose -f docker-compose.prod.yml build

# Aplicar migrations pendentes contra o Banco_De_Producao,
# usando o mesmo .env.production, ANTES de trocar o container em produção
docker compose -f docker-compose.prod.yml run --rm \
  --env-file .env.production api \
  npx prisma migrate deploy
```

> ⚠️ Antes deste passo, fazer backup completo do Banco_De_Producao (Requisito 4.3), por exemplo com `pg_dump`. Se `prisma migrate deploy` retornar código de saída diferente de zero, **não** avançar para o passo 5 — o container anterior continua em execução, sem impacto (Requisito 4.6–4.8).

### 🔁 5. Subir/atualizar o container

```bash
docker compose -f docker-compose.prod.yml up -d
```

O Compose recria o container `salao-abrasel-api` com a nova imagem, mantendo `restart: unless-stopped`.

### 🔁 6. Testar localmente antes de expor via domínio

```bash
curl -i http://127.0.0.1:3333/health
```

Esperado: resposta HTTP de sucesso em poucos segundos.

### 1️⃣ 7. Configurar e recarregar o Nginx_Existente (apenas quando o bloco de proxy ainda não existir ou precisar de ajuste)

```bash
# Editar o server block existente para appsalao.abrasel.xyz incluindo o location de proxy_pass (ver template acima)
sudo nano /etc/nginx/sites-available/appsalao.abrasel.xyz.conf

# Testar a sintaxe ANTES de recarregar (Requisito 2.5)
sudo nginx -t

# Só recarregar se o teste acima passar sem erros
sudo systemctl reload nginx
```

### 🔁 8. Validar via domínio público

```bash
curl -i https://appsalao.abrasel.xyz/health
```

Esperado: HTTP 200 (ou equivalente de sucesso) em até 5 segundos (Requisito 6.1).

### Resumo do passo a passo repetível (deploys subsequentes)

```bash
cd /opt/salao-abrasel-api
git pull
cd api
docker compose -f docker-compose.prod.yml build
# backup do banco antes de migrar
docker compose -f docker-compose.prod.yml run --rm --env-file .env.production api npx prisma migrate deploy
docker compose -f docker-compose.prod.yml up -d
curl -i http://127.0.0.1:3333/health
curl -i https://appsalao.abrasel.xyz/health
```

Isso cobre integralmente o Requisito 5.1 (git pull, instalar dependências e buildar dentro da imagem, reconstruir imagem, migrations, reiniciar container).

## Estratégia de Rollback

- A imagem Docker construída a cada deploy é tagueada como `salao-abrasel-api:latest`; antes de reconstruir, o Administrador deve retaguear a imagem atual como `salao-abrasel-api:previous`:
  ```bash
  docker tag salao-abrasel-api:latest salao-abrasel-api:previous
  ```
- Se qualquer etapa falhar (build, migration ou o `/health` local não responder após o `up -d`), o rollback consiste em:
  ```bash
  docker compose -f docker-compose.prod.yml down
  docker tag salao-abrasel-api:previous salao-abrasel-api:latest
  docker compose -f docker-compose.prod.yml up -d
  ```
- Isso restaura o código da versão anterior em execução (Requisito 5.4) sem afetar os dados do Banco_De_Producao, já que o rollback de container não reverte migrations. Caso a falha tenha sido especificamente na migration, o backup tirado no passo 4 é o mecanismo de recuperação do banco (Requisito 4.7).
- O Administrador é notificado da falha de migration diretamente pela saída não-zero do comando `prisma migrate deploy` no terminal (Requisito 4.8) — não há canal de alerta automatizado nesta spec.

## Error Handling

- **Container não inicia / crash loop**: coberto nativamente pela política `restart: unless-stopped` do Docker Compose e pelo comportamento de backoff do Docker após reinícios repetidos (Requisito 1.5). O Administrador diagnostica via `docker ps`, `docker inspect salao-abrasel-api` e `docker logs salao-abrasel-api`.
- **Variáveis de ambiente obrigatórias ausentes**: já tratado pelo código existente em `api/src/env.ts` (`envSchema.safeParse` + `process.exit(1)`), sem necessidade de alteração — o container simplesmente não entra em estado de escuta e o `docker logs` mostra a mensagem de erro do Zod listando os campos ausentes (Requisito 3.3).
- **Falha do `prisma migrate deploy`**: tratada operacionalmente — o processo de deploy documentado exige checar o código de saída antes de prosseguir para o `up -d`; em caso de falha, seguir a Estratégia de Rollback acima.
- **Porta do container indisponível ao Nginx**: o Nginx_Existente retorna `502 Bad Gateway` (ou equivalente) ao cliente, sem afetar outros `server` blocks configurados (Requisito 2.4), já que cada `server` block é independente.
- **Erro de sintaxe no Nginx**: detectado por `nginx -t` antes do `reload`; se falhar, o Administrador corrige a configuração sem impactar as demais aplicações, pois o `reload` só ocorre após o teste passar (Requisito 2.5, 2.6).

## Testing Strategy

PBT não se aplica a esta spec (ver seção Correctness Properties). A verificação segue uma abordagem de testes de integração/fumaça manuais, executados pelo Administrador durante e após o deploy:

- **Smoke test de build**: `docker compose -f docker-compose.prod.yml build` completa sem erro e produz a imagem a partir de `dist/index.js` (não `ts-node-dev`).
- **Smoke test de variáveis obrigatórias**: iniciar o container com um `.env.production` incompleto (removendo uma variável obrigatória) e confirmar que o processo encerra com código de saída diferente de zero e loga as variáveis ausentes — validando o comportamento já existente em `env.ts` dentro do ambiente containerizado.
- **Integration test de persistência**: parar o container (`docker stop`) e confirmar reinício automático em até 10s; reiniciar a VM (ou simular) e confirmar que o container volta a subir sem intervenção manual.
- **Integration test de proxy**: com o container rodando, `curl http://127.0.0.1:3333/health` deve responder com sucesso; em seguida `curl https://appsalao.abrasel.xyz/health` deve responder de forma equivalente através do Nginx.
- **Integration test de migrations**: rodar `prisma migrate deploy` duas vezes em sequência contra o mesmo Banco_De_Producao e confirmar que a segunda execução é um no-op bem-sucedido (idempotência esperada do Prisma Migrate), sem erro.
- **Integration test de rollback**: simular uma falha de deploy (ex.: build de uma imagem propositalmente quebrada) e validar que o procedimento de rollback documentado restaura o container anterior respondendo em `/health`.
- **Documentação como artefato de verificação**: a sequência de comandos do Fluxo de Deploy Operacional deve ser executada integralmente ao menos uma vez pelo Administrador durante a implementação desta spec, servindo como validação de ponta a ponta de todos os requisitos.
