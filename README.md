# Salão Abrasel — App

Monorepo com o app mobile (Expo/React Native) e a API (Node/Express/Prisma/MySQL) do app de agenda do Salão Abrasel.

```
/app   → Expo (React Native + TypeScript) — app mobile
/api   → Node + Express + TypeScript + Prisma — API própria
```

## 1. API (`/api`)

### 1.1 Configurar ambiente

```bash
cd api
cp .env.example .env
```

Edite `.env`:
- `DATABASE_URL`: string de conexão MySQL (Railway ou local).
- `APP_API_KEY`: chave que o app mobile vai usar (header `x-api-key`).
- As rotas administrativas **não usam chave compartilhada**: exigem login de uma conta com papel `ADMIN` (ver 1.4).
- `JWT_SECRET`: segredo usado para assinar os tokens de login (gere um valor aleatório longo, ex: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).

### 1.2 Instalar, migrar e popular com a programação

```bash
npm install
npx prisma migrate dev
npx prisma db seed
```

O seed popula a programação oficial do Salão Abrasel (Arena 1 e Arena 2, 15 e 16/09). Para editar eventos depois, use `POST/PUT/DELETE /events` (rota admin) ou o banco diretamente.

### 1.3 Rodar em desenvolvimento

```bash
npm run dev
```

API sobe em `http://localhost:3333` (ou a porta definida em `PORT`). Teste com:

```bash
curl http://localhost:3333/health
curl http://localhost:3333/events -H "x-api-key: SUA_APP_API_KEY"
```

### 1.4 Endpoints

| Método | Rota                    | Auth          | Descrição                                    |
|--------|--------------------------|---------------|-----------------------------------------------|
| GET    | `/health`                | —             | Healthcheck                                    |
| GET    | `/events`                | `x-api-key`   | Lista eventos (`?date=YYYY-MM-DD&category=`)   |
| GET    | `/events/:id`            | `x-api-key`   | Detalhe de um evento                           |
| POST   | `/auth/register`         | —             | `{ email, password }` → `{ token, user }`      |
| POST   | `/auth/login`            | —             | `{ email, password }` → `{ token, user }`      |
| GET    | `/auth/me`               | Bearer token  | Retorna o usuário do token atual               |
| POST   | `/favorites`             | Bearer token  | `{ event_id }` — favorita pro usuário do token |
| DELETE | `/favorites`             | Bearer token  | `{ event_id }`                                 |
| GET    | `/favorites`             | Bearer token  | Eventos favoritados pelo usuário do token      |
| GET    | `/notifications`         | Bearer token  | Avisos do usuário + `unreadCount`              |
| POST   | `/notifications/:id/read`| Bearer token  | Marca um aviso como lido                       |
| POST   | `/notifications/read-all`| Bearer token  | Marca todos como lidos                         |
| POST   | `/events`                | Bearer **ADMIN** | Cria evento                                 |
| PUT    | `/events/:id`            | Bearer **ADMIN** | Edita evento                                |
| DELETE | `/events/:id`            | Bearer **ADMIN** | Remove evento                               |
| GET    | `/admin/users`           | Bearer **ADMIN** | Lista as contas cadastradas                 |
| DELETE | `/admin/users/:id`       | Bearer **ADMIN** | Remove uma conta                            |

O app exige login (e-mail/senha) para tudo — não há mais o modo anônimo por `device_id` que existia antes. Crie uma conta pela própria tela de cadastro do app.

### 1.4 Conta de administrador

O papel fica na coluna `users.role` (`USER` ou `ADMIN`). Rotas marcadas como **ADMIN**
acima passam por `requireAuth` + `requireAdmin`, que relê o papel no banco a cada
requisição — rebaixar alguém tem efeito imediato, sem esperar o token de 30 dias expirar.
Um usuário comum que monte a requisição na mão recebe **403**.

Para criar ou promover um administrador (as credenciais vêm do ambiente, nunca do
código-fonte):

```bash
cd api
ADMIN_EMAIL=voce@exemplo.com ADMIN_PASSWORD='senha-forte' npm run admin:create
```

Se a conta já existir, ela é promovida (informe `ADMIN_PASSWORD` para trocar a senha
também). Feito isso, basta entrar normalmente no app com esse e-mail: a aba
**⚙️ Admin** aparece para contas com o papel.

### 1.5 Deploy (Railway) — passo manual

Não incluído automaticamente nesta sessão (requer login na sua conta):

1. Crie um projeto no [Railway](https://railway.app), adicione um plugin MySQL.
2. Adicione um serviço apontando para a pasta `/api` deste repositório (deploy via GitHub) ou rode `railway up` a partir de `/api` com o Railway CLI já logado.
3. Configure as variáveis de ambiente do serviço (`DATABASE_URL` já vem pronta do plugin MySQL; adicione `APP_API_KEY` e `JWT_SECRET`).
4. Rode a migration em produção: `railway run npx prisma migrate deploy`.

## 2. App mobile (`/app`)

### 2.1 Configurar ambiente

```bash
cd app
cp .env.example .env
```

Edite `.env`:
- `EXPO_PUBLIC_API_BASE_URL`: URL da API (em dev, use o IP da sua máquina na rede local se for testar em device físico — `localhost` só funciona em emulador/simulador).
- `EXPO_PUBLIC_API_KEY`: mesma chave configurada em `APP_API_KEY` na API.

### 2.2 Rodar em desenvolvimento

```bash
npm install
npx expo start
```

Abra no Expo Go (Android/iOS) ou em um emulador.

### 2.3 Build de produção (EAS) — passo manual

Requer login (`eas login`) na sua conta Expo:

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android
eas build --platform ios
```

## 3. Pendências / próximos passos

- **Planta do local**: o mapa usa um placeholder ilustrativo (`src/features/map/PlantaPlaceholder.tsx`). Assim que a planta real (PNG/SVG) for enviada, trocar por um `<Image>` do mesmo componente.
- **Identidade visual Abrasel**: `src/constants/theme.ts` usa uma paleta neutra placeholder. Trocar pelas cores/logo oficiais quando fornecidos.
- **Deploy Railway e build EAS**: passos manuais descritos acima (exigem login nas suas contas).
- **Recuperação de senha / verificação de e-mail**: não implementado (exigiria infra de envio de e-mail) — fora do escopo atual.
