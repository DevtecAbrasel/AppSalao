# Requirements Document

## Introduction

O projeto AppSalao é um monorepo com um app mobile (Expo/React Native) em `/app` e uma API (Node/Express/TypeScript/Prisma/PostgreSQL) em `/api`. Atualmente a API só é executada em ambiente de desenvolvimento local (`npm run dev`), e a documentação de deploy existente (README) cobre apenas Railway.

Esta funcionalidade cobre a configuração da API para rodar em **produção** em uma máquina AWS (EC2 ou similar) que o usuário já possui, já configurada com outras aplicações e com o Nginx já instalado e em uso como proxy reverso para essas aplicações. O objetivo é colocar a API Node/Express em execução persistente nessa VM, containerizada via Docker (padrão já utilizado pelas demais aplicações do servidor), integrada ao Nginx_Existente, com as variáveis de ambiente de produção corretas e com as migrations do Prisma aplicadas contra o Banco_De_Producao.

O domínio e o certificado HTTPS já estão configurados no Nginx_Existente para esta aplicação (`https://appsalao.abrasel.xyz/`), portanto esta spec cobre apenas o encaminhamento desse domínio para o container da API, sem necessidade de emitir novo certificado ou configurar novo domínio. O Banco_De_Producao corresponde a um novo banco de dados a ser criado dentro da instância PostgreSQL já existente na VM_Producao (não é necessário provisionar uma nova instância de PostgreSQL nem um serviço externo). O deploy de novas versões, por ora, será feito por meio de `git pull` manual no servidor seguido dos passos documentados no Requisito 5; a automação desse processo (CI/CD) é uma evolução futura e está fora do escopo desta spec.

Além da API, o escopo desta spec cobre a publicação do projeto em `/app` (Expo/React Native) como App_Web: uma aplicação web estática, sem uso previsto como app de celular por enquanto. O App_Web é acessado exclusivamente pelo navegador (tela de login, marcação de eventos, agenda, etc.) e é gerado por meio do comando de exportação web já suportado pelo projeto (`npx expo export --platform web`), que produz arquivos estáticos (HTML, JavaScript, CSS e demais assets).

A API e o App_Web são servidos pelo mesmo Nginx_Existente, sob o mesmo domínio `appsalao.abrasel.xyz`, com divisão de caminhos: a raiz do domínio (`/`) serve os arquivos estáticos do App_Web, enquanto o prefixo `/api/*` é roteado pelo Nginx_Existente para o container Docker da API (com remoção do prefixo `/api` antes do encaminhamento, já que as rotas reais da API não possuem esse prefixo). O build do App_Web é gerado diretamente na VM_Producao, a partir de `git pull` na pasta `/app`, seguindo o mesmo padrão manual de deploy já adotado para a API, e não exige processo Node.js dedicado em execução contínua, pois consiste apenas em arquivos estáticos.

Esta spec **não** cobre a criação da infraestrutura AWS do zero (a VM já existe), nem o pipeline de CI/CD automatizado, salvo indicação em contrário durante o refinamento. A configuração do app para uso como aplicativo de celular nativo (build para App Store / Play Store) permanece fora de escopo, pois o projeto não será distribuído dessa forma por enquanto.

## Glossary

- **API**: A aplicação Node/Express/TypeScript/Prisma localizada em `/api`, responsável por servir os dados de eventos, autenticação, favoritos e notificações para uso web.
- **VM_Producao**: A máquina virtual AWS (EC2 ou equivalente) já existente e já em uso pelo usuário, onde a API será implantada.
- **Gerenciador_De_Processos**: O mecanismo de containerização (Docker, incluindo Docker Compose quando aplicável) usado para manter o processo da API em execução contínua na VM_Producao, reiniciando o container automaticamente em caso de falha ou reinicialização do servidor por meio de sua política de restart (ex.: `restart: always` ou `restart: unless-stopped`), seguindo o mesmo padrão já utilizado pelas demais aplicações do servidor.
- **Nginx_Existente**: A instância do Nginx já configurada na VM_Producao, atualmente utilizada como proxy reverso para outras aplicações do usuário, incluindo o domínio e o certificado HTTPS já configurados para esta aplicação (`https://appsalao.abrasel.xyz/`).
- **Banco_De_Producao**: Um novo banco de dados a ser criado dentro da instância PostgreSQL já existente na VM_Producao, utilizado exclusivamente pela API em produção.
- **Variaveis_De_Ambiente_De_Producao**: O conjunto de variáveis (`DATABASE_URL`, `APP_API_KEY`, `ADMIN_API_KEY`, `JWT_SECRET`, `PORT`, `RESEND_API_KEY`, `EMAIL_FROM`) configuradas para o ambiente de produção da API, distintas dos valores usados em desenvolvimento local.
- **Migration**: Uma alteração de esquema do banco de dados gerenciada pelo Prisma Migrate.
- **Administrador**: A pessoa responsável por operar e manter a VM_Producao, com acesso de linha de comando ao servidor.
- **App_Web**: A versão do projeto em `/app` (Expo/React Native) exportada como aplicação web estática por meio do comando `npx expo export --platform web`, composta por arquivos estáticos (HTML, JavaScript, CSS e demais assets), servida diretamente pelo Nginx_Existente na raiz do domínio `appsalao.abrasel.xyz`, sem processo Node.js dedicado em execução contínua.
- **Pasta_De_Build_Do_App_Web**: O diretório de saída (`dist/`) gerado pelo comando `npx expo export --platform web` na VM_Producao, contendo os arquivos estáticos do App_Web publicados para o Nginx_Existente servir.

## Requirements

### Requisito 1: Execução persistente da API em produção

**User Story:** Como administrador do servidor, eu quero que a API rode de forma persistente na VM_Producao dentro de um container Docker, para que ela continue disponível após falhas do processo ou reinicializações do servidor.

#### Critérios de Aceitação

1. THE Gerenciador_De_Processos SHALL manter continuamente pelo menos um container em execução com o processo Node.js da API na VM_Producao enquanto o serviço não for explicitamente parado pelo Administrador (por exemplo, via `docker stop` ou `docker compose down`).
2. WHEN o container da API encerra de forma inesperada (definido como: o processo Node.js dentro do container termina com código de saída diferente de zero, ou o container é finalizado sem que o Administrador tenha executado o comando de parada do Gerenciador_De_Processos), THE Gerenciador_De_Processos SHALL reiniciar o container automaticamente em até 10 segundos após a detecção do encerramento, por meio de sua política de restart (ex.: `restart: unless-stopped` ou `restart: always`).
3. WHEN a VM_Producao é reinicializada, THE Gerenciador_De_Processos SHALL iniciar o container da API automaticamente, sem intervenção manual, em até 60 segundos após o sistema operacional concluir o boot e o serviço Docker estar disponível.
4. THE imagem Docker da API SHALL executar a partir do artefato compilado gerado pelo comando de build (`npm run build`), correspondente ao arquivo de entrada `dist/index.js`, e não a partir do modo de desenvolvimento (`ts-node-dev`).
5. IF o container da API for reiniciado pelo Gerenciador_De_Processos por mais de 5 vezes consecutivas dentro de um intervalo de 60 segundos, THEN THE Gerenciador_De_Processos SHALL interromper as tentativas automáticas de reinício (comportamento de backoff do Docker) e o estado de falha do container SHALL ficar acessível para consulta pelo Administrador (por exemplo, via `docker ps` e `docker inspect`).

### Requisito 2: Integração com o Nginx existente

**User Story:** Como administrador do servidor, eu quero que o Nginx_Existente encaminhe requisições externas para a API, para que a API seja acessível publicamente sem expor a porta interna do Node.js diretamente.

#### Critérios de Aceitação

1. WHEN o Nginx_Existente recebe uma requisição destinada ao domínio `appsalao.abrasel.xyz` com caminho iniciado por `/api/`, THE Nginx_Existente SHALL encaminhar essa requisição, com o prefixo `/api` removido, para a porta publicada pelo container Docker da API na VM_Producao, preservando o método, o corpo e os cabeçalhos que identificam o host e o protocolo original da requisição.
2. THE Nginx_Existente SHALL disponibilizar a API via HTTPS na porta 443 utilizando o certificado TLS já configurado, válido e não expirado, para o domínio `appsalao.abrasel.xyz`.
3. WHEN o Nginx_Existente recebe uma requisição para o domínio `appsalao.abrasel.xyz` na porta HTTP (80), THE Nginx_Existente SHALL redirecionar a requisição para o endereço HTTPS equivalente.
4. IF a porta publicada pelo container da API não responde a uma requisição encaminhada pelo Nginx_Existente, THEN THE Nginx_Existente SHALL retornar ao cliente uma resposta de erro indicando indisponibilidade do serviço, sem interromper o funcionamento das demais aplicações configuradas.
5. IF a configuração do Nginx_Existente adicionada para a API contém erro de sintaxe, THEN THE Administrador SHALL ser capaz de detectar o erro através do comando de teste de configuração do Nginx antes de recarregar o serviço.
6. WHEN a configuração da API é adicionada ao Nginx_Existente, THE Nginx_Existente SHALL continuar servindo as demais aplicações já configuradas sem interrupção.

### Requisito 3: Variáveis de ambiente de produção

**User Story:** Como administrador do servidor, eu quero configurar as variáveis de ambiente de produção da API separadamente das variáveis de desenvolvimento, para que segredos de produção não sejam misturados com valores de desenvolvimento local nem versionados no repositório.

#### Critérios de Aceitação

1. THE API SHALL carregar Variaveis_De_Ambiente_De_Producao a partir de um arquivo de ambiente presente apenas na VM_Producao, não commitado no repositório.
2. WHEN a API recebe uma requisição na rota `/health` e as Variaveis_De_Ambiente_De_Producao obrigatórias estão presentes e válidas, THE API SHALL responder com sucesso.
3. IF uma ou mais variáveis de ambiente obrigatórias (`DATABASE_URL`, `APP_API_KEY`, `ADMIN_API_KEY` ou `JWT_SECRET`) estão ausentes ou vazias na inicialização, THEN THE API SHALL encerrar o processo com um código de saída de erro, sem entrar em estado de escuta, e registrar uma mensagem de erro identificando todas as variáveis ausentes.
4. THE Administrador SHALL configurar as Variaveis_De_Ambiente_De_Producao com valores distintos dos valores de desenvolvimento local para `APP_API_KEY`, `ADMIN_API_KEY` e `JWT_SECRET`.

### Requisito 4: Migrations do banco de dados em produção

**User Story:** Como administrador do servidor, eu quero aplicar as migrations do Prisma contra o Banco_De_Producao, para que o esquema do banco de produção corresponda ao esquema esperado pela API antes de cada deploy.

#### Critérios de Aceitação

1. THE Administrador SHALL aplicar as migrations pendentes no Banco_De_Producao utilizando o comando de deploy do Prisma (`prisma migrate deploy`), e não o comando de desenvolvimento (`prisma migrate dev`).
2. WHEN uma nova versão do código introduz migrations adicionais, THE Administrador SHALL aplicar essas migrations no Banco_De_Producao antes de a nova versão da API entrar em operação.
3. THE Administrador SHALL realizar um backup completo do Banco_De_Producao imediatamente antes de executar qualquer comando de migration em produção.
4. THE sistema SHALL considerar a execução do comando `prisma migrate deploy` como bem-sucedida somente quando o código de saída do comando for igual a zero e nenhum erro for reportado pelo Prisma.
5. IF o comando `prisma migrate deploy` retornar um código de saída diferente de zero ou reportar um erro, THEN THE sistema SHALL considerar a aplicação da migration como falha.
6. IF a aplicação de uma migration falha, THEN THE API SHALL permanecer na versão anterior em execução até que a falha seja resolvida.
7. IF a aplicação de uma migration falha, THEN THE sistema SHALL preservar o Banco_De_Producao no último estado migrado com sucesso, sem aplicar alterações parciais adicionais.
8. IF a aplicação de uma migration falha, THEN THE sistema SHALL notificar o Administrador sobre a falha, indicando que a migration não foi concluída e que a versão anterior permanece em execução.

### Requisito 5: Processo repetível de deploy de uma nova versão

**User Story:** Como administrador do servidor, eu quero um processo documentado e repetível para publicar uma nova versão da API, para que atualizações futuras possam ser aplicadas de forma consistente.

#### Critérios de Aceitação

1. THE Administrador SHALL dispor de um conjunto documentado de passos executáveis (script ou lista sequencial de comandos) que cubra, no mínimo, as seguintes etapas na VM_Producao: obter o código atualizado via `git pull`, instalar dependências, compilar/buildar, reconstruir a imagem Docker, aplicar migrations pendentes no banco de dados e reiniciar o container da API.
2. WHEN o processo de deploy documentado é executado sem erros em nenhuma etapa, THE API SHALL retomar a operação com a nova versão do código em, no máximo, 60 segundos após o reinício do container, sem exigir reconfiguração manual do Nginx_Existente.
3. WHEN o deploy é concluído, THE Administrador SHALL ser capaz de verificar, por meio de uma informação de versão exposta pela API (por exemplo, em resposta a uma requisição ou em log de inicialização), que a versão em execução corresponde à versão publicada.
4. IF qualquer etapa do processo de deploy falhar (por exemplo, erro ao instalar dependências, erro de build, ou falha ao aplicar migrations), THEN THE Administrador SHALL reverter a API em execução para a versão anterior, preservando os dados existentes no banco de dados, em no máximo 15 minutos após a detecção da falha, com a API voltando a responder utilizando o código da versão anterior.

### Requisito 6: Verificação e observabilidade básica

**User Story:** Como administrador do servidor, eu quero verificar que a API está saudável e observar seus logs em produção, para que eu possa diagnosticar problemas rapidamente.

#### Critérios de Aceitação

1. WHEN o Administrador acessa a rota `/health` da API através do domínio público configurado no Nginx_Existente, THE API SHALL responder em até 5 segundos com um código de status HTTP de sucesso e um corpo indicando que o processo está em execução.
2. THE Gerenciador_De_Processos SHALL registrar a saída padrão e de erro do container da API em um log persistente na VM_Producao, consultável pelo Administrador por linha de comando (por exemplo, via `docker logs`) e mantendo o histórico de, no mínimo, os 7 dias mais recentes.
3. WHEN o container da API é reiniciado pelo Gerenciador_De_Processos, THE Gerenciador_De_Processos SHALL registrar um timestamp e a causa da reinicialização de forma consultável pelo Administrador (por exemplo, via `docker inspect` ou `docker events`), distinguindo entre falha do processo dentro do container, reinicialização da VM_Producao e reinicialização manual solicitada pelo Administrador.
4. IF a rota `/health` não responder dentro de 5 segundos ou responder com um código de status de erro, THEN THE Administrador SHALL ser capaz de identificar, a partir do log e do estado do container registrados pelo Gerenciador_De_Processos, se o processo da API está em execução no momento da consulta.

### Requisito 7: Build do App_Web na VM_Producao

**User Story:** Como administrador do servidor, eu quero gerar o build estático do App_Web diretamente na VM_Producao a partir do código atualizado, para que a versão publicada reflita o código do repositório sem depender de um build feito localmente.

#### Critérios de Aceitação

1. THE Administrador SHALL obter o código atualizado do App_Web na VM_Producao por meio de `git pull` na pasta `/app`, antes de gerar um novo build.
2. WHEN o Administrador executa o processo de build do App_Web na VM_Producao, THE Administrador SHALL configurar a variável `EXPO_PUBLIC_API_BASE_URL` com o valor `https://appsalao.abrasel.xyz/api` (ou o caminho relativo `/api`) antes da execução do comando `npx expo export --platform web`.
3. THE comando `npx expo export --platform web` executado na VM_Producao SHALL gerar a Pasta_De_Build_Do_App_Web contendo os arquivos estáticos do App_Web com a URL configurada na Variaveis_De_Ambiente_De_Producao do App_Web já embutida no bundle gerado.
4. THE sistema SHALL considerar a execução do comando `npx expo export --platform web` como bem-sucedida somente quando o código de saída do comando for igual a zero e a Pasta_De_Build_Do_App_Web for gerada com um arquivo `index.html` na sua raiz.
5. IF o comando `npx expo export --platform web` retornar um código de saída diferente de zero, THEN THE sistema SHALL considerar o build do App_Web como falho, e a versão anteriormente publicada do App_Web SHALL permanecer acessível através do domínio público sem alteração.

### Requisito 8: Nginx servindo o App_Web e roteando a API por caminho

**User Story:** Como administrador do servidor, eu quero que o Nginx_Existente sirva o App_Web na raiz do domínio e encaminhe apenas o caminho `/api/*` para a API, para que ambos coexistam sob o mesmo domínio sem conflito de rotas.

#### Critérios de Aceitação

1. WHEN o Nginx_Existente recebe uma requisição destinada ao domínio `appsalao.abrasel.xyz` com caminho que corresponde a um arquivo existente dentro da Pasta_De_Build_Do_App_Web, THE Nginx_Existente SHALL responder com o conteúdo desse arquivo estático.
2. WHEN o Nginx_Existente recebe uma requisição destinada ao domínio `appsalao.abrasel.xyz` com caminho que não corresponde a um arquivo existente dentro da Pasta_De_Build_Do_App_Web e que não começa com o prefixo `/api/`, THE Nginx_Existente SHALL responder com o conteúdo do arquivo `index.html` da Pasta_De_Build_Do_App_Web, preservando o código de status HTTP 200 (comportamento de fallback de SPA).
3. THE Nginx_Existente SHALL disponibilizar o App_Web via HTTPS na porta 443 utilizando o mesmo certificado TLS já configurado, válido e não expirado, para o domínio `appsalao.abrasel.xyz`.
4. WHEN a configuração de roteamento do App_Web e do prefixo `/api/*` é adicionada ao Nginx_Existente, THE Nginx_Existente SHALL continuar servindo as demais aplicações já configuradas sem interrupção, incluindo o comportamento descrito no Requisito 2.
5. IF a configuração do Nginx_Existente adicionada para servir o App_Web contém erro de sintaxe, THEN THE Administrador SHALL ser capaz de detectar o erro através do comando de teste de configuração do Nginx antes de recarregar o serviço.

### Requisito 9: Processo repetível de deploy de uma nova versão do App_Web

**User Story:** Como administrador do servidor, eu quero um processo documentado e repetível para publicar uma nova versão do App_Web, para que atualizações futuras da interface possam ser aplicadas de forma consistente, sem exigir reconfiguração manual do Nginx a cada deploy.

#### Critérios de Aceitação

1. THE Administrador SHALL dispor de um conjunto documentado de passos executáveis (script ou lista sequencial de comandos) que cubra, no mínimo, as seguintes etapas na VM_Producao: obter o código atualizado via `git pull` na pasta `/app`, instalar dependências, executar `npx expo export --platform web` com a variável `EXPO_PUBLIC_API_BASE_URL` configurada para o caminho de produção, e publicar o conteúdo gerado como a Pasta_De_Build_Do_App_Web servida pelo Nginx_Existente.
2. WHEN o processo de deploy documentado do App_Web é executado sem erros em nenhuma etapa, THE App_Web SHALL ficar disponível através do domínio público com a nova versão, sem exigir reconfiguração manual do Nginx_Existente.
3. IF qualquer etapa do processo de deploy do App_Web falhar (por exemplo, erro ao instalar dependências ou erro durante `npx expo export --platform web`), THEN THE Administrador SHALL manter a versão anterior da Pasta_De_Build_Do_App_Web acessível através do domínio público até que uma nova build seja concluída com sucesso.

### Requisito 10: Verificação básica do App_Web em produção

**User Story:** Como administrador do servidor, eu quero verificar que o App_Web carrega corretamente através do domínio público, para que eu possa confirmar que a publicação foi concluída com sucesso.

#### Critérios de Aceitação

1. WHEN o Administrador acessa a raiz do domínio `https://appsalao.abrasel.xyz/`, THE Nginx_Existente SHALL responder com o código de status HTTP 200 e um corpo contendo o `index.html` do App_Web.
2. WHEN o `index.html` retornado pelo acesso à raiz do domínio referencia os arquivos de bundle JavaScript gerados pelo build do App_Web, THE Nginx_Existente SHALL responder a requisições subsequentes para esses arquivos de bundle com o código de status HTTP 200.
3. IF o acesso à raiz do domínio `https://appsalao.abrasel.xyz/` não retornar o código de status HTTP 200 ou não contiver o conteúdo esperado do App_Web, THEN THE Administrador SHALL ser capaz de identificar, a partir dos logs do Nginx_Existente e da presença dos arquivos na Pasta_De_Build_Do_App_Web, a causa da falha.
