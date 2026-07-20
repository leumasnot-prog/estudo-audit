# Auditor-AI

Ecossistema de estudos e repetição espaçada para concursos de Ciências
Contábeis (RFB, TCU, TCEs), com agente ativo de revisão via WhatsApp.

## Estrutura

```
apps/
  web/     → Next.js 15 (dashboard) — Shadcn/ui + Tremor
  hermes/  → Fastify (webhooks Evolution API) + workers BullMQ
packages/
  db/      → Prisma schema + client compartilhado
```

Arquitetura do agente: [hermes-architecture.md](./hermes-architecture.md)

## Setup

```bash
pnpm install
cp .env.example .env          # preencher DATABASE_URL, REDIS_URL, EVOLUTION_*
pnpm db:migrate               # aplica migrations (usa DIRECT_URL)
pnpm --filter @auditor-ai/db seed
pnpm dev:web                  # dashboard em http://localhost:3000
pnpm dev:hermes               # webhook em http://localhost:3333
pnpm dev:workers              # workers BullMQ
```

Banco: **Neon** (Vercel Marketplace) — free tier serve dev e produção
inicial. Alternativa local: `docker compose up -d` (Postgres + Redis) usando a
mesma URL em `DATABASE_URL` e `DIRECT_URL`.

## Deploy

| Peça | Onde | Por quê |
|---|---|---|
| `apps/web` | **Vercel** | Next.js nativo; Root Directory = `apps/web` |
| Postgres | **Neon** (marketplace Vercel) | Compartilhado por web e hermes |
| `apps/hermes` + Redis | **Railway / Fly.io** | Workers BullMQ são long-lived — incompatíveis com serverless |
| Evolution API | Railway / Fly.io (container) | Self-hosted, precisa de processo persistente |

Na Vercel: importar o repo, Root Directory `apps/web` (o preset do Next.js
detecta o workspace pnpm), e instalar a integração Neon — ela injeta
`DATABASE_URL`/`DIRECT_URL` no projeto. As mesmas duas URLs vão no `.env`
local e nas variáveis do serviço hermes.

Componentes Shadcn são adicionados sob demanda em `apps/web`:

```bash
cd apps/web && pnpm dlx shadcn@latest add card button table
```
