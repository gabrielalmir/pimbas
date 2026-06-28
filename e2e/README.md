# E2E

Suite e2e inicial com Playwright, focada em fluxos reais do app contra a API embutida.

## Requisitos

- `DATABASE_URL` apontando para um banco descartavel de teste
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- browsers do Playwright instalados via `bun run test:e2e:install`

## Comandos

```bash
bun run test:e2e:prepare
bun run test:e2e
```

Para reaproveitar um banco ja preparado:

```bash
PIMBAS_E2E_SKIP_DB_SETUP=1 bun run test:e2e
```
