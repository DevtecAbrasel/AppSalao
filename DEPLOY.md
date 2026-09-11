# DEPLOY.md — Salão Abrasel

Guia operacional de implantação em produção na VM_Producao (AWS EC2, Ubuntu, 1 vCPU / 4GB RAM), com Docker, Nginx e PostgreSQL já instalados e em uso por outras aplicações. Repositório na VM: `/var/www/AppSalao`.

Legenda: 🔁 passo repetível (todo deploy) — 1️⃣ passo de primeira implantação (uma vez só).

---

## 1️⃣ Preparação inicial (uma vez)

```
# ~/.ssh/config na VM (usuário ubuntu), deploy key dedicada:
Host github.com-appsalao
    HostName github.com
    User git
    IdentityFile ~/.ssh/appsalao_deploy_key
    IdentitiesOnly yes
```

```bash
git clone git@github.com-appsalao:<org>/<repo>.git /var/www/AppSalao
cd /var/www/AppSalao/api

cp .env.production.example .env.production
nano .env.production   # preencher com valores reais, diferentes dos de dev
chmod 600 .env.production
```

## 1️⃣ Criar o Banco_De_Producao (uma vez)

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

```bash
# Descobrir a subnet criada pelo Docker Compose
docker network inspect appsalao_default | grep Subnet

# postgresql.conf: listen_addresses = '*'
sudo nano /etc/postgresql/<versao>/main/postgresql.conf

# pg_hba.conf: regra restrita ao banco/usuário desta app (não libera tudo)
sudo nano /etc/postgresql/<versao>/main/pg_hba.conf
# host    salao_abrasel_prod    salao_abrasel_prod    <subnet_descoberta>    scram-sha-256

sudo systemctl restart postgresql
```

Atualizar `DATABASE_URL` em `.env.production`:

```
postgresql://salao_abrasel_prod:SENHA_URL_ENCODED@host.docker.internal:5432/salao_abrasel_prod?schema=public&connection_limit=10&pool_timeout=20
```

- `host.docker.internal`, não `localhost` — o Postgres roda nativo no host, não em container.
- Senha com caractere especial (`@ : / #`) precisa estar URL-encoded, senão dá `invalid port number in database URL`.
- `connection_limit=10&pool_timeout=20`: calibrado para 1 vCPU e Postgres compartilhado com outras apps da VM. O padrão do Prisma nessa máquina seria só 3 conexões — baixo para o volume esperado do evento (milhares de usuários simultâneos). `pool_timeout=20` faz uma requisição em pico esperar até 20s por conexão livre em vez de falhar na hora.

Preencher também `APP_API_KEY`, `ADMIN_API_KEY` (não validada hoje pelo código, mas preencher por conformidade), `JWT_SECRET` — todos diferentes dos valores de dev.

## 🔁 Build da imagem e migrations

```bash
cd /var/www/AppSalao/api

docker compose -f docker-compose.prod.yml build

docker compose -f docker-compose.prod.yml run --rm api npx prisma migrate deploy
```

⚠️ Antes deste passo: backup completo do banco (`pg_dump`). Se `prisma migrate deploy` retornar código de saída diferente de zero, **não avance** — o container anterior continua rodando, sem impacto.

## 🔁 Subir/atualizar o container

```bash
docker compose -f docker-compose.prod.yml up -d
```

## 🔁 Testar localmente

```bash
curl -i http://127.0.0.1:3333/health
```

## 1️⃣ Configurar o Nginx (primeira vez, ou ao alterar o bloco)

```bash
# Zona de cache de /api/events — precisa estar no http{} global, não no
# arquivo do site. keys_zone:10m cobre as chaves; max_size=100m limita
# disco (relevante com 4GB de RAM); inactive=10m expira entradas frias.
echo 'proxy_cache_path /var/cache/nginx/appsalao_events levels=1:2 keys_zone=appsalao_events_cache:10m max_size=100m inactive=10m use_temp_path=off;' | sudo tee /etc/nginx/conf.d/appsalao-events-cache.conf

sudo cp /var/www/AppSalao/deploy/nginx/appsalao.abrasel.xyz.conf /etc/nginx/sites-available/appsalao.abrasel.xyz
sudo ln -s /etc/nginx/sites-available/appsalao.abrasel.xyz /etc/nginx/sites-enabled/appsalao.abrasel.xyz

sudo nginx -t              # obrigatório antes do reload
sudo systemctl reload nginx   # só se o teste acima passar
```

Validar o cache (opcional):

```bash
curl -sI https://appsalao.abrasel.xyz/api/events | grep -i x-cache-status   # 1ª: MISS
curl -sI https://appsalao.abrasel.xyz/api/events | grep -i x-cache-status   # 2ª (<30s): HIT
```

## 🔁 Validar via domínio público

```bash
curl -i https://appsalao.abrasel.xyz/api/health
```

## 🔁 Resumo — deploys subsequentes da API

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

## 🔁 Deploy do App_Web (sem Docker, sem restart de processo)

```bash
cd /var/www/AppSalao
git pull
cd app

npm ci

cp .env.production.example .env   # primeira vez, ou editar .env existente
# garantir: EXPO_PUBLIC_API_BASE_URL=https://appsalao.abrasel.xyz/api

[ -d dist ] && mv dist dist.previous   # preserva o build anterior

npx expo export --platform web
```

O Nginx lê `app/dist` a cada request — não precisa reiniciar nada. Validar:

```bash
curl -I https://appsalao.abrasel.xyz/
```

Esperado: `200 OK`, `Content-Type: text/html`.

---

## Rollback

### API

```bash
# Antes de reconstruir, retaguear a imagem atual:
docker tag salao-abrasel-api:latest salao-abrasel-api:previous
```

Se build, migration ou `/health` falharem após `up -d`:

```bash
docker compose -f docker-compose.prod.yml down
docker tag salao-abrasel-api:previous salao-abrasel-api:latest
docker compose -f docker-compose.prod.yml up -d
```

Rollback de container não reverte migrations — se a falha foi na migration, o `pg_dump` do passo de build é o mecanismo de recuperação do banco.

### App_Web

```bash
# Se o expo export falhar, restaurar a versão anterior:
rm -rf dist
mv dist.previous dist
```

---

## Checklist de testes específicos deste deploy (evento com ~5.000 pessoas)

Rodar antes de abrir para o público, com poucas pessoas:

1. **Cache ativo**: duas chamadas seguidas a `curl -sI https://appsalao.abrasel.xyz/api/events` — a 2ª deve vir com `X-Cache-Status: HIT`.
2. **Rate limit por e-mail, não por IP**: errar a senha de uma conta 21 vezes seguidas — a 21ª deve ser bloqueada (`429`). Confirma que o limite é por conta, não por rede.
3. **Sem bloqueio cruzado entre usuários**: duas pessoas em redes diferentes logando ao mesmo tempo não devem se afetar (valida `trust proxy: loopback` + rate limit por e-mail).
4. **Restart automático**: `docker restart salao-abrasel-api` e confirmar que a API volta a responder em `/health` em poucos segundos.

Durante o evento, sob carga real:

5. **Observar recursos**: `docker stats` e `docker logs -f salao-abrasel-api` nos primeiros minutos de pico — sinal mais direto de saturação do único vCPU.
6. **Propagação de edição de agenda**: editar um evento como ADMIN e cronometrar até aparecer para um usuário comum (esperado: até ~30s, por causa do cache de `/api/events`).

---

## Diagnóstico

```bash
docker ps
docker inspect salao-abrasel-api
docker logs salao-abrasel-api
docker events
```

| Sintoma | Causa provável |
|---|---|
| `Could not parse schema engine response` | Falta `openssl`/`libc6-compat` na imagem Alpine (já corrigido no Dockerfile; verificar se não foi removido) |
| `npm ci` falha no build | `prisma/` copiado depois do `npm ci` (o `postinstall` roda `prisma generate`) |
| `ECONNREFUSED` na `DATABASE_URL` | `listen_addresses` do Postgres restrito a localhost, `pg_hba.conf` sem a subnet do Docker, ou uso de `localhost` em vez de `host.docker.internal` |
| `invalid port number in database URL` | Senha com caractere especial não URL-encoded |
| Nginx retorna `502` só em `/api/*` | Container da API fora do ar — App_Web continua servido normalmente |
| Rate limit bloqueando gente legítima | Confirmar que o limite de auth está por e-mail (`authRateLimiter`) e que `trust proxy` está configurado — sem isso todo mundo aparenta vir do mesmo IP (o do Nginx) |