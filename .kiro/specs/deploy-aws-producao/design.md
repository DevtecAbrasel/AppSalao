# Design Document

## Overview

Esta spec cobre a implantação em produção, em uma VM AWS que o usuário já possui e já opera (VM_Producao), com Docker, Nginx e PostgreSQL já instalados e em uso por outras aplicações, de dois artefatos:

1. **A API** (`/api`), containerizada com Docker.
2. **O App_Web** (`/app`), exportado como aplicação web estática via `npx expo export --platform web` e servido diretamente pelo Nginx_Existente.

O escopo é **exclusivamente de infraestrutura de deploy**: nenhuma lógica de negócio da API ou do app é alterada — nem em `api/src` nem em `app/src`. Os artefatos novos no repositório são arquivos de configuração de implantação (`api/Dockerfile`, `api/.dockerignore`, `api/docker-compose.prod.yml`, `api/.env.production.example`, `app/.env.production.example`, template de configuração do Nginx em `deploy/nginx/appsalao.abrasel.xyz.conf`) e documentação operacional.

A abordagem escolhida é containerizar a API com Docker seguindo o mesmo padrão já usado pelas demais aplicações da VM_Producao, publicar a porta do container apenas localmente (`127.0.0.1:PORT`, sem expô-la para a internet) e reaproveitar o Nginx_Existente como proxy reverso HTTPS para o domínio já configurado (`appsalao.abrasel.xyz`). O App_Web é gerado como build estático diretamente na VM_Producao e servido pelo mesmo Nginx_Existente na raiz do domínio, com o prefixo `/api/` roteado para o container da API. O Banco_De_Producao é um novo database + usuário dedicados dentro da instância PostgreSQL já existente na VM, sem provisionar um novo serviço de banco.

O deploy inicial e os deploys subsequentes (tanto da API quanto do App_Web) são feitos manualmente pelo Administrador via `git pull` na VM, seguidos de uma sequência documentada e repetível de comandos. Não há CI/CD nesta spec.

**Nota sobre a implementação real**: esta versão do design já reflete ajustes feitos durante a implementação real na VM_Producao (path do repositório, conectividade Docker→PostgreSQL nativo, correções no Dockerfile, formato real do bloco Nginx), descritos nas seções abaixo.

## Architecture

```mermaid
flowchart LR
    subgraph Internet
        Client[Cliente Web / Browser]
    end

    subgraph VM_Producao["VM_Producao (EC2) - /var/www/AppSalao"]
        subgraph Nginx["Nginx_Existente"]
            NginxHTTPS["appsalao.abrasel.xyz:443 (TLS wildcard abrasel.xyz)"]
            NginxRedirect["Bloco catch-all existente: HTTP:80 -> redirect 443"]
            LocationAPI["location /api/ -> proxy_pass 127.0.0.1:3333/"]
            LocationRoot["location / -> root app/dist (App_Web estático)\ntry_files $uri $uri/ /index.html"]
        end

        subgraph Docker["Docker Engine (já em uso por outras apps)"]
            APIContainer["Container salao-abrasel-api\n(node dist/index.js)\nrestart: unless-stopped\nporta interna 3333"]
        end

        AppWebDist["app/dist (arquivos estáticos gerados por\nnpx expo export --platform web)"]

        subgraph Postgres["PostgreSQL (instância nativa já existente, não containerizada)"]
            OtherDBs[(Bancos de outras apps)]
            ProdDB[(Banco_De_Producao\nsalao_abrasel_prod)]
        end
    end

    Client -->|HTTPS 443| NginxHTTPS
    Client -->|HTTP 80| NginxRedirect
    NginxHTTPS --> LocationAPI
    NginxHTTPS --> LocationRoot
    LocationAPI -->|proxy_pass 127.0.0.1:3333/| APIContainer
    LocationRoot -->|lê arquivos estáticos| AppWebDist
    APIContainer -->|DATABASE_URL via host.docker.internal| ProdDB
```

Pontos-chave da arquitetura:

- **Isolamento de rede**: a porta do container é publicada apenas em `127.0.0.1` (loopback), nunca em `0.0.0.0`. Só o Nginx_Existente, rodando na própria VM, alcança a API. Isso preserva o modelo de segurança já usado pelas outras aplicações do servidor.
- **Divisão de caminho no mesmo domínio**: `appsalao.abrasel.xyz/api/*` é roteado pelo Nginx_Existente (com remoção do prefixo `/api`) para o container da API; qualquer outro caminho é servido como arquivo estático do App_Web, com fallback de SPA para `index.html`.
- **PostgreSQL nativo, não containerizado**: a instância PostgreSQL roda diretamente no sistema operacional da VM (não em container), o que faz o container da API precisar alcançá-la via `host.docker.internal` em vez de `localhost` (ver Componente 4 e 6).
- **Banco compartilhado, dados isolados**: a instância PostgreSQL é compartilhada com outras aplicações, mas o Banco_De_Producao e seu usuário são exclusivos desta API (Requisito 3, Glossário).
- **App_Web sem processo Node.js contínuo**: o App_Web é um conjunto de arquivos estáticos servidos diretamente do disco pelo Nginx_Existente, sem servidor de aplicação, sem container e sem necessidade de política de restart.
- **Sem alteração de código**: o `Dockerfile` empacota exatamente o que `npm run build` já produz (`dist/index.js`); o `expo export --platform web` empacota exatamente o que já existe em `app/src`. Nenhuma rota, componente ou schema é tocado.

## Components and Interfaces

### 1. `api/Dockerfile` (versão corrigida com base na implementação real)

Build multi-stage para manter a imagem final pequena e sem ferramentas de desenvolvimento. Em relação à primeira versão do design, dois ajustes foram necessários e já estão refletidos abaixo:

- **`COPY prisma ./prisma` deve vir ANTES de `npm ci`/`npm ci --omit=dev` em ambos os estágios.** O script `postinstall` do projeto executa `prisma generate` automaticamente durante o `npm ci`; se o diretório `prisma/` (contendo `schema.prisma`) ainda não tiver sido copiado para a imagem nesse momento, o `npm ci` falha.
- **`RUN apk add --no-cache openssl libc6-compat` é necessário em ambos os estágios.** Sem esse pacote, o Prisma não consegue detectar a versão do OpenSSL disponível na imagem `node:20-alpine`, o que causa o erro `Could not parse schema engine response` tanto no `prisma generate` (stage builder) quanto no `prisma migrate deploy` (executado a partir da imagem final via `docker compose run`).

```dockerfile
# syntax=docker/dockerfile:1

# ---- Stage 1: builder ----
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache openssl libc6-compat

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

COPY . .

RUN npm run build

# ---- Stage 2: runner ----
FROM node:20-alpine AS runner

ENV NODE_ENV=production

WORKDIR /app

RUN apk add --no-cache openssl libc6-compat

COPY package.json package-lock.json ./
COPY --from=builder /app/prisma ./prisma
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3333

CMD ["node", "dist/index.js"]
```

- `CMD ["node", "dist/index.js"]` — nunca `ts-node-dev` (Requisito 1.4).
- `EXPOSE 3333` apenas como documentação da porta interna (não expõe nada por si só).

### 2. `api/.dockerignore` (novo)

Evita copiar `node_modules`, `.env`, `.git`, `dist` local e artefatos de desenvolvimento para o contexto de build, reduzindo tamanho de imagem e risco de vazar segredos locais para dentro da imagem.

### 3. `api/docker-compose.prod.yml` (versão corrigida com base na implementação real)

Decisão: usar **Docker Compose** em vez de `docker run` direto.

Justificativa: as demais aplicações da VM já seguem o padrão Docker; Compose facilita reproduzir a mesma política de restart, variáveis de ambiente e publicação de porta de forma declarativa e versionada, além de tornar o comando de deploy (`docker compose up -d --build`) idempotente e fácil de repetir manualmente (Requisito 5.1), sem exigir memorizar flags de `docker run`.

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
    extra_hosts:
      - "host.docker.internal:host-gateway"
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "5"
```

- `restart: unless-stopped` atende ao Requisito 1.1–1.3 (reinício automático após falha ou reboot da VM, sem impedir parada manual pelo Administrador).
- `ports: "127.0.0.1:3333:3333"` publica a porta apenas localmente — o Nginx_Existente faz `proxy_pass` para `127.0.0.1:3333`.
- **`extra_hosts: - "host.docker.internal:host-gateway"`**: necessário porque o PostgreSQL desta VM roda nativamente no sistema operacional (não em container). Sem essa entrada, o hostname `host.docker.internal` não resolveria dentro do container em ambientes Linux (em Docker Desktop/macOS/Windows ele já funciona nativamente, mas em Docker Engine no Linux precisa ser adicionado explicitamente). Isso permite que a `DATABASE_URL` no `.env.production` aponte para `host.docker.internal` em vez de `localhost`, alcançando o PostgreSQL do host (ver Componente 4 e 6).
- `env_file: .env.production` carrega as Variaveis_De_Ambiente_De_Producao sem commitá-las (Requisito 3.1).
- `logging` com `json-file` + rotação (`max-size`/`max-file`) atende ao Requisito 6.2 (histórico consultável, sem crescer indefinidamente); 5 arquivos de 10MB cobrem confortavelmente os 7 dias exigidos para o volume de logs desta API.
- O comportamento de backoff após reinícios repetidos (Requisito 1.5) é o comportamento nativo do Docker para containers com `restart` policy — não requer configuração adicional.

### 4. `api/.env.production.example` (novo, versionado como referência; o `.env.production` real NUNCA é commitado)

Lista as mesmas chaves de `api/.env.example`, com comentários indicando que os valores devem ser **diferentes** dos de desenvolvimento (Requisito 3.4):

```
# host.docker.internal (não localhost!): o container alcança o PostgreSQL
# nativo do host via essa entrada, configurada em extra_hosts no
# docker-compose.prod.yml.
#
# Atenção: se a senha contiver caracteres especiais (@, :, /, #, etc.),
# faça URL-encode antes de colocá-la na connection string. Uma senha com
# caractere especial não codificado já causou o erro real
# "invalid port number in database URL" durante a implementação.
DATABASE_URL="postgresql://salao_abrasel_prod:SENHA_FORTE_URL_ENCODED@host.docker.internal:5432/salao_abrasel_prod?schema=public"
PORT=3333
APP_API_KEY="valor-de-producao-diferente-do-dev"
ADMIN_API_KEY="valor-de-producao-diferente-do-dev"
JWT_SECRET="segredo-jwt-de-producao-longo-e-aleatorio"
RESEND_API_KEY=""
EMAIL_FROM=""
```

**Observação sobre `ADMIN_API_KEY`**: os requisitos (3.3, Glossário) citam `ADMIN_API_KEY` como uma das Variaveis_De_Ambiente_De_Producao obrigatórias, mas o arquivo atual `api/src/env.ts` **não** declara nem valida essa variável no `envSchema` — apenas `DATABASE_URL`, `PORT`, `APP_API_KEY` e `JWT_SECRET` são validadas. Como esta spec não altera código da API, este design documenta a lacuna, mas **não** adiciona `ADMIN_API_KEY` ao `env.ts`. Consequência prática: se essa variável for definida no `.env.production` sem uso correspondente no código, ela simplesmente não terá efeito nem validação — não é um erro de deploy, mas deve ser resolvido em uma spec futura de código caso a autenticação administrativa realmente dependa dela. O Administrador deve incluir a variável no arquivo de produção por conformidade com o requisito documental, mesmo que hoje o processo não a valide.

Local no servidor: `/var/www/AppSalao/api/.env.production` (dentro do repositório, mas coberto por `.gitignore` — nunca commitado), com permissão restrita (`chmod 600`).

### 5. Configuração do Nginx (versão real, cobrindo API e App_Web)

Arquivo versionado em `deploy/nginx/appsalao.abrasel.xyz.conf`, manualmente copiado/adaptado para `/etc/nginx/sites-available/appsalao.abrasel.xyz` no servidor e habilitado via symlink (`ln -s /etc/nginx/sites-available/appsalao.abrasel.xyz /etc/nginx/sites-enabled/appsalao.abrasel.xyz`), seguindo o mesmo padrão já usado para as outras aplicações do usuário.

Diferenças em relação ao template original do design:

- **Não há bloco de redirect HTTP→HTTPS neste arquivo.** O servidor já possui um bloco catch-all/wildcard existente (certificado wildcard `abrasel.xyz`) que trata esse redirect para todos os subdomínios, incluindo `appsalao.abrasel.xyz`. Duplicar o redirect aqui seria redundante e é evitado.
- **Certificado incluído via snippet compartilhado** (`include /etc/nginx/certs/abrasel.xyz.conf;`), em vez de `ssl_certificate`/`ssl_certificate_key` diretos — já é o padrão do servidor para o certificado wildcard.
- **`location /api/`** encaminha para a API com `proxy_pass http://127.0.0.1:3333/` — a barra final é o que faz o Nginx remover o prefixo `/api` antes de repassar a requisição (atende ao Requisito 2.1 e 8, já que a API não possui esse prefixo em suas rotas reais).
- **`location /api/events` (novo, cache de leitura)**: adicionado para lidar com o volume esperado do evento (milhares de pessoas consultando a agenda ao mesmo tempo, numa VM_Producao de 1 vCPU). Cacheia por 30s as respostas de `GET /events` e `GET /events/:id`, que são as rotas mais lidas de toda a API e mudam raramente (só quando um ADMIN edita a programação). Como o Nginx só cacheia GET/HEAD por padrão, as rotas de escrita (POST/PUT/DELETE, usadas só pelo ADMIN) continuam indo direto para a API. A chave de cache inclui o header `x-api-key` para não servir uma resposta cacheada de volta para quem não apresentou a chave correta, preservando o efeito da checagem feita pelo middleware `requireAppKey`. Por ser um prefixo mais específico que `/api/`, precisa vir declarado antes dele no arquivo.
- **`location /`** serve os arquivos estáticos do App_Web a partir da Pasta_De_Build_Do_App_Web (`/var/www/AppSalao/app/dist`), com fallback de SPA via `try_files` (atende ao Requisito 8.1–8.2).
- Nginx escolhe o `location` pelo prefixo mais específico (mais longo), então tecnicamente a ordem dos blocos no arquivo não afeta o roteamento — `/api/events` e `/api/` sempre têm precedência sobre `/` para requisições que começam com esses prefixos. Ainda assim, o arquivo mantém os blocos mais específicos declarados antes de `location /` por clareza de leitura.

**Pré-requisito de infraestrutura (fora do arquivo do site, feito uma vez só)**: a diretiva `proxy_cache_path`, que declara a zona de cache `appsalao_events_cache` usada pelo bloco `/api/events`, só pode existir no contexto `http {}` do Nginx (nunca dentro de um `server {}`), então precisa ser adicionada ao `nginx.conf` principal ou a um arquivo em `/etc/nginx/conf.d/` incluído por ele — não ao arquivo `sites-available/appsalao.abrasel.xyz`. Sem isso, `nginx -t` falha com "zone not found". Ver passo 1️⃣ 7 do Fluxo de Deploy Operacional.

```nginx
server {
    listen 443 ssl;
    listen [::]:443 ssl;

    http2 on;

    server_name appsalao.abrasel.xyz;

    include /etc/nginx/certs/abrasel.xyz.conf;

    # TLS
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;

    client_max_body_size 1m;

    # Cache de GET /events e /events/:id (ver zona appsalao_events_cache
    # declarada no http{} global — passo 1️⃣ 7). Precedência sobre
    # location /api/ por ser o prefixo mais específico.
    location /api/events {
        proxy_cache appsalao_events_cache;
        proxy_cache_key "$scheme$request_method$host$request_uri$http_x_api_key";
        proxy_cache_valid 200 30s;
        proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
        proxy_cache_background_update on;
        proxy_cache_lock on;
        add_header X-Cache-Status $upstream_cache_status always;

        proxy_pass http://127.0.0.1:3333/events;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Requisições /api/* -> container Docker da API (prefixo removido pela
    # barra final em proxy_pass). Precedência sobre location / por ser o
    # prefixo mais específico. Não cacheado: cobre rotas por usuário
    # (favoritos, notificações, /auth/me).
    location /api/ {
        proxy_pass http://127.0.0.1:3333/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # App_Web: arquivos estáticos gerados por `npx expo export --platform web`.
    # try_files com fallback para index.html implementa o comportamento de
    # SPA exigido pelo Requisito 8.2.
    location / {
        root /var/www/AppSalao/app/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

Isso atende ao Requisito 2.1 (preserva método, corpo e cabeçalhos de host/protocolo), 2.3 (redirect HTTP→HTTPS, já coberto pelo bloco catch-all existente), 8.1 e 8.2 (App_Web servido na raiz com fallback de SPA). O redirect HTTP→HTTPS (Requisito 2.3) é responsabilidade do bloco wildcard já existente no servidor, não deste arquivo. O cache de `/api/events` é uma otimização de capacidade para o volume esperado do evento (ver seção de Performance/Capacidade), não um requisito funcional original desta spec.

### 6. Banco de dados e usuário dedicados (comandos reais, incluindo permissões de schema)

Nenhum arquivo novo de código; são comandos SQL executados manualmente pelo Administrador via `psql` contra a instância PostgreSQL já existente (ver Fluxo de Deploy Operacional, passo 3).

Em relação ao design original, dois comandos adicionais foram necessários na implementação real: em PostgreSQL 15+, `GRANT ALL PRIVILEGES ON DATABASE` não concede automaticamente permissão de uso no schema `public` (mudança de comportamento a partir da versão 15). Sem os comandos abaixo, migrations e queries falham por falta de permissão no schema, mesmo com o `GRANT` no nível de banco já aplicado:

```sql
CREATE DATABASE salao_abrasel_prod;
CREATE USER salao_abrasel_prod WITH ENCRYPTED PASSWORD 'SENHA_FORTE_AQUI';
GRANT ALL PRIVILEGES ON DATABASE salao_abrasel_prod TO salao_abrasel_prod;
\c salao_abrasel_prod
GRANT ALL ON SCHEMA public TO salao_abrasel_prod;
ALTER SCHEMA public OWNER TO salao_abrasel_prod;
```

Adicionalmente, como o PostgreSQL passa a aceitar conexões vindas da rede do Docker Compose (e não apenas de `localhost`), duas configurações do próprio servidor PostgreSQL precisam ser ajustadas (fora do escopo de código, mas documentadas aqui por serem pré-requisito de conectividade):

- **`postgresql.conf`**: `listen_addresses = '*'` (estava comentado como `#listen_addresses = 'localhost'`), para que o PostgreSQL escute em todas as interfaces, incluindo a interface de bridge do Docker.
- **`pg_hba.conf`**: uma regra adicional liberando especificamente a rede do Docker Compose para o banco e usuário desta aplicação (princípio de menor privilégio — não libera acesso irrestrito):
  ```
  host    salao_abrasel_prod    salao_abrasel_prod    172.19.0.0/16    scram-sha-256
  ```
  A subnet real (`172.19.0.0/16` no exemplo) varia por ambiente e deve ser descoberta com:
  ```bash
  docker network inspect <nome_do_projeto>_default | grep Subnet
  ```
  onde `<nome_do_projeto>_default` é a rede criada automaticamente pelo Docker Compose (por padrão, o nome do diretório do projeto seguido de `_default`).
- Após editar ambos os arquivos, reiniciar/recarregar o PostgreSQL (`sudo systemctl reload postgresql` ou `restart`, dependendo se a mudança exige reinício completo) para aplicar.

### 7. Migrations em produção

`prisma migrate deploy` é executado **dentro do container**, como parte do processo de deploy documentado, antes do `docker compose up -d` colocar a nova versão em tráfego — nunca `prisma migrate dev` (Requisito 4.1). O comando correto, validado na implementação real, **não** usa a flag `--env-file` (essa flag não existe para `docker compose run`; o Compose já carrega o `env_file` declarado no serviço automaticamente):

```bash
docker compose -f docker-compose.prod.yml run --rm api npx prisma migrate deploy
```

Isso é um comando operacional, não uma mudança de código.

### 8. `app/.env.production.example` (novo, versionado como referência)

Análogo ao `api/.env.production.example`. O projeto `app/` hoje só possui `.env.example` para desenvolvimento; este arquivo novo documenta o valor de produção da única variável relevante para o build web:

```
# URL absoluta da API, já que o App_Web roda no navegador do cliente
# (fora da rede interna da VM_Producao) e não pode usar host.docker.internal
# ou caminho relativo dependente de contexto de execução.
EXPO_PUBLIC_API_BASE_URL=https://appsalao.abrasel.xyz/api

# Mesma chave configurada em APP_API_KEY na API (api/.env.production)
EXPO_PUBLIC_API_KEY=valor-de-producao-diferente-do-dev
```

Diferente da API, o build do App_Web não é executado dentro de um container: o comando `npx expo export --platform web` é executado diretamente no shell da VM_Producao, lendo as variáveis `EXPO_PUBLIC_*` do arquivo `app/.env` (ou de variáveis exportadas no shell antes do comando) e embutindo os valores no bundle JavaScript gerado — não há carregamento dinâmico dessas variáveis em tempo de execução no navegador, então o valor precisa estar correto **antes** do export (Requisito 7.2, 7.3).

### 9. Saída do build do App_Web (`app/dist/`)

`npx expo export --platform web` gera a Pasta_De_Build_Do_App_Web em `app/dist/`, contendo:

- `index.html` na raiz (verificado pelo Requisito 7.4 como critério de sucesso do build).
- Bundles JavaScript/CSS versionados por hash de conteúdo (nomes de arquivo mudam a cada build).
- Assets estáticos (imagens, fontes) copiados de `app/assets`.

Essa pasta é o `root` referenciado no `location /` do Nginx (Componente 5) e é sobrescrita a cada novo deploy do App_Web (Componente 5 no Fluxo de Deploy Operacional abaixo).

## Data Models

Não há novos modelos de dados nesta spec, nem para a API nem para o App_Web. O `Banco_De_Producao` usa exatamente o schema já definido em `api/prisma/schema.prisma` e as migrations já existentes em `api/prisma/migrations/`. Nenhuma migration nova é criada como parte desta spec — o objetivo é aplicar as migrations **já existentes** contra um banco de produção novo, do zero. O App_Web não introduz nenhum modelo de dados: é apenas o empacotamento estático do código já existente em `app/src`.

## Correctness Properties

Esta spec é de infraestrutura e configuração de implantação (Docker, Nginx, PostgreSQL, variáveis de ambiente, build estático de frontend, comandos operacionais), não código de aplicação com funções puras e espaço de entrada variável. Não há transformação de dados, parser, serializer ou lógica de negócio nova cujo comportamento varie de forma testável com a entrada — tanto para a API quanto para o App_Web, os "resultados" aqui são estados de infraestrutura (container rodando, Nginx respondendo, variáveis carregadas, arquivos estáticos publicados) verificáveis por checagem direta, não por geração aleatória de entradas.

Por isso, testes baseados em propriedades (PBT) não se aplicam a esta spec. A verificação é feita por meio de testes de integração/fumaça pontuais (poucos exemplos representativos) e checagens manuais/documentadas, detalhados na seção de Testing Strategy abaixo.

## Fluxo de Deploy Operacional

Esta seção documenta a sequência de comandos que o Administrador executa manualmente na VM_Producao. Passos marcados com 🔁 fazem parte do processo repetível de deploy (Requisito 5 e 9); passos marcados com 1️⃣ são feitos apenas na primeira implantação. O caminho real do repositório na VM_Producao é `/var/www/AppSalao` (contendo as pastas `api/` e `app/`).

### 1️⃣ Preparação inicial (uma vez)

O repositório é privado, então o clone é feito via SSH com uma deploy key dedicada, não via HTTPS. Na VM_Producao, sob o usuário `ubuntu`, configura-se um alias em `~/.ssh/config` apontando para a chave dedicada, por exemplo:

```
Host github.com-appsalao
    HostName github.com
    User git
    IdentityFile ~/.ssh/appsalao_deploy_key
    IdentitiesOnly yes
```

```bash
# 1. Clonar o repositório usando o alias SSH configurado acima
git clone git@github.com-appsalao:<org>/<repo>.git /var/www/AppSalao
cd /var/www/AppSalao/api

# 2. Criar o arquivo de ambiente de produção (não commitado, permissão restrita)
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
\c salao_abrasel_prod
GRANT ALL ON SCHEMA public TO salao_abrasel_prod;
ALTER SCHEMA public OWNER TO salao_abrasel_prod;
\q
```

Em seguida, habilitar a conectividade do container (que acessa o PostgreSQL via `host.docker.internal`, ver Componente 6):

```bash
# Descobrir a subnet da rede criada pelo Docker Compose
docker network inspect appsalao_default | grep Subnet

# Editar postgresql.conf: listen_addresses = '*'
sudo nano /etc/postgresql/<versao>/main/postgresql.conf

# Editar pg_hba.conf: adicionar regra restrita ao banco/usuário desta app
sudo nano /etc/postgresql/<versao>/main/pg_hba.conf
# host    salao_abrasel_prod    salao_abrasel_prod    <subnet_descoberta>    scram-sha-256

sudo systemctl restart postgresql
```

Atualizar `DATABASE_URL` em `.env.production` com esse usuário/banco/senha, usando `host.docker.internal` como host (não `localhost`) e com a senha URL-encoded caso contenha caracteres especiais (ver Componente 4).

### 🔁 4. Build da imagem e aplicação de migrations

```bash
cd /var/www/AppSalao/api

# Build da imagem (a partir do Dockerfile, não do modo dev)
docker compose -f docker-compose.prod.yml build

# Aplicar migrations pendentes contra o Banco_De_Producao.
# O compose já carrega .env.production via env_file do serviço — não usar --env-file.
docker compose -f docker-compose.prod.yml run --rm api npx prisma migrate deploy
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

### 1️⃣ 7. Configurar e recarregar o Nginx_Existente (apenas quando o bloco ainda não existir ou precisar de ajuste)

```bash
# Declarar a zona de cache usada por location /api/events. Precisa estar no
# contexto http{} do Nginx, não dentro de um server{} — por isso vai num
# arquivo próprio em conf.d/, incluído automaticamente pelo nginx.conf
# principal na maioria das instalações (confirmar com
# `grep -n "include" /etc/nginx/nginx.conf` se não tiver certeza).
#
# keys_zone=appsalao_events_cache:10m reserva 10MB de memória só para as
# CHAVES do cache (não o conteúdo em si) — suficiente para milhares de
# entradas dado o tamanho da agenda de um evento. max_size=100m limita o
# espaço em disco ocupado pelo conteúdo cacheado, relevante numa VM com 4GB
# de RAM. inactive=10m remove do cache o que não é acessado por 10 minutos.
echo 'proxy_cache_path /var/cache/nginx/appsalao_events levels=1:2 keys_zone=appsalao_events_cache:10m max_size=100m inactive=10m use_temp_path=off;' | sudo tee /etc/nginx/conf.d/appsalao-events-cache.conf

# Copiar/adaptar o template versionado para sites-available e habilitar via symlink
sudo cp /var/www/AppSalao/deploy/nginx/appsalao.abrasel.xyz.conf /etc/nginx/sites-available/appsalao.abrasel.xyz
sudo ln -s /etc/nginx/sites-available/appsalao.abrasel.xyz /etc/nginx/sites-enabled/appsalao.abrasel.xyz

# Testar a sintaxe ANTES de recarregar (Requisito 2.5, 8.5)
sudo nginx -t

# Só recarregar se o teste acima passar sem erros
sudo systemctl reload nginx
```

Validação do cache (opcional, após o reload):

```bash
# A primeira requisição é MISS (busca na API); a segunda, dentro de 30s, deve
# ser HIT (servida pelo Nginx sem tocar no container). Observar o header
# X-Cache-Status na resposta.
curl -sI https://appsalao.abrasel.xyz/api/events | grep -i x-cache-status
curl -sI https://appsalao.abrasel.xyz/api/events | grep -i x-cache-status
```

### 🔁 8. Validar via domínio público

```bash
curl -i https://appsalao.abrasel.xyz/api/health
```

Esperado: HTTP 200 (ou equivalente de sucesso) em até 5 segundos (Requisito 6.1).

### Resumo do passo a passo repetível da API (deploys subsequentes)

```bash
cd /var/www/AppSalao
git pull
cd api
docker compose -f docker-compose.prod.yml build
# backup do banco antes de migrar
docker compose -f docker-compose.prod.yml run --rm api npx prisma migrate deploy
docker compose -f docker-compose.prod.yml up -d
curl -i http://127.0.0.1:3333/health
curl -i https://appsalao.abrasel.xyz/api/health
```

Isso cobre integralmente o Requisito 5.1 (git pull, instalar dependências e buildar dentro da imagem, reconstruir imagem, migrations, reiniciar container).

### 🔁 Fluxo de Deploy Operacional do App_Web (Requisito 7 e 9)

Diferente da API, este fluxo não envolve Docker nem reinício de processo — apenas gera arquivos estáticos que o Nginx_Existente já está configurado para servir a partir do disco.

```bash
cd /var/www/AppSalao
git pull
cd app

# Instalar dependências
npm ci

# Configurar a URL absoluta da API (o app roda no navegador do cliente,
# fora da rede interna da VM, então precisa da URL pública completa)
cp .env.production.example .env   # na primeira vez, ou editar .env existente
# garantir que app/.env contenha:
# EXPO_PUBLIC_API_BASE_URL=https://appsalao.abrasel.xyz/api

# Preservar o build anterior antes de gerar o novo (ver Estratégia de Rollback)
[ -d dist ] && mv dist dist.previous

# Gerar o novo build estático
npx expo export --platform web
```

Após o `expo export` concluir com sucesso (código de saída zero e `dist/index.html` presente — Requisito 7.4), o Nginx_Existente já passa a servir a nova versão imediatamente na próxima requisição, pois lê os arquivos diretamente de `app/dist` a cada request — **não é necessário reiniciar Nginx nem qualquer container** (Requisito 9.2).

```bash
# Validar
curl -I https://appsalao.abrasel.xyz/
```

Esperado: `200 OK` com `Content-Type: text/html`, e conferência visual no navegador de que a tela de login/agenda carrega corretamente.

## Estratégia de Rollback

### API

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
- O comando de migration usado no fluxo de rollback (caso seja necessário reexecutar) também não usa `--env-file`:
  ```bash
  docker compose -f docker-compose.prod.yml run --rm api npx prisma migrate deploy
  ```
- O Administrador é notificado da falha de migration diretamente pela saída não-zero do comando `prisma migrate deploy` no terminal (Requisito 4.8) — não há canal de alerta automatizado nesta spec.

### App_Web

Mais simples que o da API, já que não envolve banco de dados nem migrations:

- Antes de cada novo `expo export`, a pasta `dist/` anterior é preservada renomeando-a para `dist.previous` (ver Fluxo de Deploy Operacional do App_Web acima).
- Se o novo `npx expo export --platform web` falhar (código de saída diferente de zero), o rollback consiste em simplesmente não substituir a pasta antiga:
  ```bash
  # Se o export falhou, restaurar a versão anterior
  rm -rf dist
  mv dist.previous dist
  ```
- Como o Nginx lê os arquivos diretamente do disco a cada requisição, a versão anterior volta a ser servida imediatamente, sem reiniciar nada (Requisito 9.3).

## Error Handling

- **Container não inicia / crash loop**: coberto nativamente pela política `restart: unless-stopped` do Docker Compose e pelo comportamento de backoff do Docker após reinícios repetidos (Requisito 1.5). O Administrador diagnostica via `docker ps`, `docker inspect salao-abrasel-api` e `docker logs salao-abrasel-api`.
- **Erro `Could not parse schema engine response` do Prisma em Alpine**: causado pela ausência de `openssl`/`libc6-compat` na imagem `node:20-alpine`; resolvido definitivamente pelo `apk add --no-cache openssl libc6-compat` em ambos os estágios do Dockerfile (Componente 1). Se reaparecer, verificar se algum estágio da imagem foi alterado sem manter esse pacote.
- **Falha do `npm ci` por schema do Prisma ausente**: causada por copiar `prisma/` depois do `npm ci` (o `postinstall` roda `prisma generate` durante a instalação); resolvido pela ordem correta no Dockerfile (Componente 1).
- **Container não alcança o PostgreSQL do host (`ECONNREFUSED` ou timeout na `DATABASE_URL`)**: geralmente causado por `listen_addresses` do PostgreSQL restrito a `localhost`, por falta da regra correspondente em `pg_hba.conf` para a subnet do Docker Compose, ou por usar `localhost`/`127.0.0.1` em vez de `host.docker.internal` na `DATABASE_URL` (Componente 4 e 6). Diagnosticar com `docker compose exec api sh` seguido de tentativa de conexão, e revisar `postgresql.conf`/`pg_hba.conf`.
- **`invalid port number in database URL`**: causado por caractere especial não codificado na senha dentro da `DATABASE_URL` (ex.: `:`, `@`, `/`, `#`); resolvido fazendo URL-encode da senha antes de colocá-la na connection string (Componente 4).
- **Variáveis de ambiente obrigatórias ausentes**: já tratado pelo código existente em `api/src/env.ts` (`envSchema.safeParse` + `process.exit(1)`), sem necessidade de alteração — o container simplesmente não entra em estado de escuta e o `docker logs` mostra a mensagem de erro do Zod listando os campos ausentes (Requisito 3.3).
- **Falha do `prisma migrate deploy`**: tratada operacionalmente — o processo de deploy documentado exige checar o código de saída antes de prosseguir para o `up -d`; em caso de falha, seguir a Estratégia de Rollback acima.
- **Porta do container indisponível ao Nginx**: o Nginx_Existente retorna `502 Bad Gateway` (ou equivalente) ao cliente apenas para requisições em `location /api/`, sem afetar `location /` (App_Web) nem outros `server` blocks configurados (Requisito 2.4), já que cada `location`/`server` block é independente.
- **Erro de sintaxe no Nginx**: detectado por `nginx -t` antes do `reload`; se falhar, o Administrador corrige a configuração sem impactar as demais aplicações, pois o `reload` só ocorre após o teste passar (Requisito 2.5, 2.6, 8.5).
- **Falha no build do App_Web (`npx expo export --platform web` com código de saída diferente de zero)**: como a pasta `dist/` anterior é preservada como `dist.previous` antes de cada novo export, a versão anterior continua acessível pelo Nginx (que serve a pasta `dist/` diretamente do disco) até que o Administrador restaure `dist.previous` para `dist` ou corrija o problema e gere um novo build com sucesso (Requisito 7.5, 9.3).
- **Requisição para caminho inexistente no App_Web**: tratada pelo `try_files $uri $uri/ /index.html` no `location /` do Nginx, que sempre cai para `index.html` com status 200, implementando o comportamento de SPA esperado (Requisito 8.2) — não gera erro 404 para rotas do lado do cliente.

## Testing Strategy

PBT não se aplica a esta spec (ver seção Correctness Properties). A verificação segue uma abordagem de testes de integração/fumaça manuais, executados pelo Administrador durante e após o deploy:

### API

- **Smoke test de build**: `docker compose -f docker-compose.prod.yml build` completa sem erro e produz a imagem a partir de `dist/index.js` (não `ts-node-dev`), validando também que a ordem `COPY prisma` → `npm ci` e o `apk add openssl libc6-compat` estão corretos (ausência do erro `Could not parse schema engine response`).
- **Smoke test de variáveis obrigatórias**: iniciar o container com um `.env.production` incompleto (removendo uma variável obrigatória) e confirmar que o processo encerra com código de saída diferente de zero e loga as variáveis ausentes — validando o comportamento já existente em `env.ts` dentro do ambiente containerizado.
- **Integration test de persistência**: parar o container (`docker stop`) e confirmar reinício automático em até 10s; reiniciar a VM (ou simular) e confirmar que o container volta a subir sem intervenção manual.
- **Integration test de conectividade com o PostgreSQL do host**: com o container rodando, confirmar que `prisma migrate deploy` e as rotas da API que acessam o banco funcionam via `host.docker.internal`, validando `listen_addresses`, `pg_hba.conf` e a URL-encode da senha na `DATABASE_URL`.
- **Integration test de proxy da API**: com o container rodando, `curl http://127.0.0.1:3333/health` deve responder com sucesso; em seguida `curl https://appsalao.abrasel.xyz/api/health` deve responder de forma equivalente através do Nginx, confirmando que o prefixo `/api` é removido corretamente.
- **Integration test de migrations**: rodar `prisma migrate deploy` duas vezes em sequência contra o mesmo Banco_De_Producao e confirmar que a segunda execução é um no-op bem-sucedido (idempotência esperada do Prisma Migrate), sem erro.
- **Integration test de rollback**: simular uma falha de deploy (ex.: build de uma imagem propositalmente quebrada) e validar que o procedimento de rollback documentado restaura o container anterior respondendo em `/health`.

### App_Web

- **Smoke test de build**: `npx expo export --platform web` completa com código de saída zero e gera `app/dist/index.html` (Requisito 7.4).
- **Integration test de servidor estático**: `curl -I https://appsalao.abrasel.xyz/` deve retornar `200` com `Content-Type: text/html` (Requisito 10.1); requisições para os arquivos de bundle JS/CSS referenciados no `index.html` também devem retornar `200` (Requisito 10.2).
- **Integration test de fallback de SPA**: requisição para um caminho arbitrário não correspondente a um arquivo estático (ex.: `/agenda`) deve retornar o conteúdo de `index.html` com status 200, não 404 (Requisito 8.2).
- **Integration test de precedência de rotas**: confirmar que requisições para `/api/*` nunca caem no fallback de SPA do App_Web, sempre sendo roteadas para o container da API.
- **Verificação visual manual**: abrir `https://appsalao.abrasel.xyz/` no navegador e confirmar que a tela de login carrega e que as chamadas à API (via `EXPO_PUBLIC_API_BASE_URL`) funcionam corretamente (Requisito 10.1, 10.3).
- **Integration test de rollback do App_Web**: simular uma falha de build (ex.: interromper o `expo export` propositalmente) e validar que a pasta `dist.previous` restaurada continua servindo a versão anterior sem erro (Requisito 9.3).

### Geral

- **Documentação como artefato de verificação**: a sequência de comandos do Fluxo de Deploy Operacional (API e App_Web) deve ser executada integralmente ao menos uma vez pelo Administrador durante a implementação desta spec, servindo como validação de ponta a ponta de todos os requisitos. Esta versão do design já reflete essa execução real, incluindo os ajustes descobertos durante o processo.
