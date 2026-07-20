# Setup local — Docker + WhatsApp grátis

Tudo roda na sua máquina, custo zero: Postgres, Redis e a Evolution API
(WhatsApp self-hosted, conectado por QR code como o WhatsApp Web).
O `.env` da raiz já está pronto com segredos gerados — só troque
`AUTH_PASSWORD` pela senha que você quer usar no login do dashboard.

## 1. Instalar o Docker Desktop (uma vez)

Baixe em <https://www.docker.com/products/docker-desktop/> (Mac — chip
Apple Silicon ou Intel, conforme seu hardware), instale e abra. Espere o
ícone da baleia ficar estável na barra de menu.

## 2. Subir os containers

```bash
cd ~/estudo-audit-main
docker compose up -d        # postgres + redis + evolution
docker compose ps           # os 3 devem estar "running"
```

## 3. Criar as tabelas e importar as questões

```bash
npx pnpm@9 db:migrate
npx pnpm@9 --filter @auditor-ai/db seed
npx pnpm@9 --filter @auditor-ai/db exec tsx prisma/imports/import-questoes.ts
```

## 4. Rodar o app

```bash
npx pnpm@9 dev:web          # dashboard em http://localhost:3000
```

Login com a senha do `AUTH_PASSWORD` do `.env`. Já dá para cadastrar
disciplinas/assuntos/questões e treinar — o WhatsApp é opcional a partir
daqui.

## 5. Conectar o WhatsApp (Evolution API)

Os comandos abaixo usam os segredos do `.env` (rode a partir da raiz):

```bash
source .env

# 5.1 Criar a instância "auditor"
curl -X POST http://localhost:8080/instance/create \
  -H "apikey: $EVOLUTION_API_KEY" -H "Content-Type: application/json" \
  -d '{"instanceName":"auditor","qrcode":true,"integration":"WHATSAPP-BAILEYS"}'

# 5.2 Pegar o QR code — abra o Manager que é mais fácil:
#     http://localhost:8080/manager  (login = EVOLUTION_API_KEY)
#     Instância "auditor" → Connect → escaneie com o WhatsApp do celular
#     (Configurações → Dispositivos conectados → Conectar dispositivo)

# 5.3 Apontar o webhook para o hermes (host.docker.internal = seu Mac
#     visto de dentro do container)
curl -X POST http://localhost:8080/webhook/set/auditor \
  -H "apikey: $EVOLUTION_API_KEY" -H "Content-Type: application/json" \
  -d '{"webhook":{"enabled":true,"url":"http://host.docker.internal:3333/webhooks/evolution","headers":{"apikey":"'$EVOLUTION_WEBHOOK_TOKEN'"},"events":["MESSAGES_UPSERT"]}}'
```

## 6. Rodar o hermes (webhook + workers)

Em dois terminais:

```bash
npx pnpm@9 dev:hermes       # Fastify em :3333 (recebe o webhook)
npx pnpm@9 dev:workers      # BullMQ (envia a rodada diária, processa respostas)
```

Teste ponta a ponta: mande qualquer mensagem do seu WhatsApp para o
número conectado — o hermes deve responder (se não houver questão
pendente, responde a mensagem de "sem pendência"). A rodada diária
dispara no horário `sendHour` do usuário (seed: 8h).

## Avisos

- A Evolution API usa o protocolo do WhatsApp Web (não oficial). Para
  uso pessoal o risco é baixo, mas existe — ideal é um número/chip
  secundário, não o seu principal.
- Tudo depende do Mac ligado. Quando quiser 24h de verdade, o caminho é
  Neon (banco) + Railway/Fly (hermes + Redis + Evolution) — o código não
  muda, só as URLs do `.env`.
- `docker compose down` para tudo sem perder dados; `down -v` APAGA os
  volumes (banco e sessão do WhatsApp).
