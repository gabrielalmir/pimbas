# Deploy em produção

Desde a migração descrita em `docs/backend-to-nextjs-migration.md`, o Pimbas é
**um único app Next.js na raiz do repositório** — páginas e API (`app/api/v1/**`) no
mesmo deploy, mesma origem, sem CORS. Duas opções de deploy:

## Opção principal: Vercel

A plataforma nativa do Next.js. Não usa o `Dockerfile` da raiz — a Vercel builda
o app diretamente a partir da raiz do repositório (`next build`).

1. Conecte o repositório na Vercel — não é necessário configurar Root Directory,
   a raiz do repo já é a raiz do projeto Next.js.
2. Configure as variáveis de ambiente do projeto: `DATABASE_URL`,
   `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, e `NEXT_PUBLIC_API_URL=/` (para o
   app consumir os próprios Route Handlers em vez do modo mock).
3. Garanta um Postgres acessível publicamente (ex.: Neon, Supabase, ou um
   Postgres gerenciado de sua preferência) e aplique as migrações:
   ```bash
   DATABASE_URL="..." bunx prisma migrate deploy
   ```
4. Deploy via `git push` (integração automática) ou `vercel deploy`.

## Opção alternativa: self-host via Docker

Para self-host fora da Vercel (Fly.io, qualquer VPS com Docker, etc.). O
`Dockerfile` na raiz builda o app Next.js inteiro com output `standalone`
(ver `next.config.ts`) e roda com Bun.

### Pré-requisitos
- Docker, para buildar/rodar a imagem.
- Um Postgres acessível e as migrações já aplicadas (`backend/prisma/migrations`
  foi movido para `prisma/migrations`; a pasta já tem uma baseline
  (`20260626234500_initial_schema`) — rode `prisma migrate deploy` contra o
  Postgres de destino antes do primeiro deploy).

### Build e teste local
```bash
docker build -t pimbas .
docker run --rm -p 3000:3000 \
  -e DATABASE_URL="postgresql://pimbas:pimbas@host.docker.internal:5432/pimbas?schema=public" \
  -e JWT_ACCESS_SECRET=dev -e JWT_REFRESH_SECRET=dev \
  pimbas
# GET http://localhost:3000/             -> app Next.js
# GET http://localhost:3000/api/health   -> {"status":"ok"}
```

### Deploy no Fly.io
Este repositório não inclui um `fly.toml` (a opção recomendada é Vercel). Para
usar o Fly como alternativa:

```bash
fly launch --no-deploy        # gera fly.toml interativamente, usando o Dockerfile existente
fly postgres create --name pimbas-db --region gru
fly postgres attach pimbas-db --app <nome-do-app>   # injeta DATABASE_URL
fly secrets set \
  JWT_ACCESS_SECRET="$(openssl rand -hex 32)" \
  JWT_REFRESH_SECRET="$(openssl rand -hex 32)" \
  --app <nome-do-app>
fly deploy
```

Configure o `release_command` do `fly.toml` gerado para rodar
`bunx prisma migrate deploy` antes de promover cada release, e o
`internal_port` para `3000` (ver `EXPOSE`/`HEALTHCHECK` no `Dockerfile`).

### Verificação
```bash
fly status
fly logs
curl https://<app>.fly.dev/api/health     # {"status":"ok"}
```
