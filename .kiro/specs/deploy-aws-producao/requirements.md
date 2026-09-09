# Requirements Document

## Introduction

O projeto AppSalao é um monorepo com um app mobile (Expo/React Native) em `/app` e uma API (Node/Express/TypeScript/Prisma/PostgreSQL) em `/api`. Atualmente a API só é executada em ambiente de desenvolvimento local (`npm run dev`), e a documentação de deploy existente (README) cobre apenas Railway.

Esta funcionalidade cobre a configuração da API para rodar em **produção** em uma máquina AWS (EC2 ou similar) que o usuário já possui, já configurada com outras aplicações e com o Nginx já instalado e em uso como proxy reverso para essas aplicações. O objetivo é colocar a API Node/Express em execução persistente nessa VM, containerizada via Docker (padrão já utilizado pelas demais aplicações do servidor), integrada ao Nginx_Existente, com as variáveis de ambiente de produção corretas e com as migrations do Prisma aplicadas contra o Banco_De_Producao.

O domínio e o certificado HTTPS já estão configurados no Nginx_Existente para esta aplicação (`https://appsalao.abrasel.xyz/`), portanto esta spec cobre apenas o encaminhamento desse domínio para o container da API, sem necessidade de emitir novo certificado ou configurar novo domínio. O Banco_De_Producao corresponde a um novo banco de dados a ser criado dentro da instância PostgreSQL já existente na VM_Producao (não é necessário provisionar uma nova instância de PostgreSQL nem um serviço externo). O deploy de novas versões, por ora, será feito por meio de `git pull` manual no servidor seguido dos passos documentados no Requisito 5; a automação desse processo (CI/CD) é uma evolução futura e está fora do escopo desta spec.

O foco desta spec é exclusivamente a API para uso via web. A configuração do app mobile (Expo/React Native, em `/app`) para apontar para a URL de produção está fora de escopo por enquanto, pois não haverá uso do app mobile em produção neste momento.

Esta spec **não** cobre a criação da infraestrutura AWS do zero (a VM já existe), nem o pipeline de CI/CD automatizado, salvo indicação em contrário durante o refinamento.

## Glossary

- **API**: A aplicação Node/Express/TypeScript/Prisma localizada em `/api`, responsável por servir os dados de eventos, autenticação, favoritos e notificações para uso web.
- **VM_Producao**: A máquina virtual AWS (EC2 ou equivalente) já existente e já em uso pelo usuário, onde a API será implantada.
- **Gerenciador_De_Processos**: O mecanismo de containerização (Docker, incluindo Docker Compose quando aplicável) usado para manter o processo da API em execução contínua na VM_Producao, reiniciando o container automaticamente em caso de falha ou reinicialização do servidor por meio de sua política de restart (ex.: `restart: always` ou `restart: unless-stopped`), seguindo o mesmo padrão já utilizado pelas demais aplicações do servidor.
- **Nginx_Existente**: A instância do Nginx já configurada na VM_Producao, atualmente utilizada como proxy reverso para outras aplicações do usuário, incluindo o domínio e o certificado HTTPS já configurados para esta aplicação (`https://appsalao.abrasel.xyz/`).
- **Banco_De_Producao**: Um novo banco de dados a ser criado dentro da instância PostgreSQL já existente na VM_Producao, utilizado exclusivamente pela API em produção.
- **Variaveis_De_Ambiente_De_Producao**: O conjunto de variáveis (`DATABASE_URL`, `APP_API_KEY`, `ADMIN_API_KEY`, `JWT_SECRET`, `PORT`, `RESEND_API_KEY`, `EMAIL_FROM`) configuradas para o ambiente de produção da API, distintas dos valores usados em desenvolvimento local.
- **Migration**: Uma alteração de esquema do banco de dados gerenciada pelo Prisma Migrate.
- **Administrador**: A pessoa responsável por operar e manter a VM_Producao, com acesso de linha de comando ao servidor.

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

1. WHEN o Nginx_Existente recebe uma requisição destinada ao domínio `appsalao.abrasel.xyz`, THE Nginx_Existente SHALL encaminhar essa requisição para a porta publicada pelo container Docker da API na VM_Producao, preservando o método, o corpo e os cabeçalhos que identificam o host e o protocolo original da requisição.
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
