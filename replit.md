# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Telegram Bots

### Bot 1: Ani Netflix Bot (`artifacts/telegram-bot`)
- **Username**: @netflixfilexfiri_bot
- **Token**: hardcoded in `src/bot.ts`
- **Features**: NF Token Checker, points/rewards shop, games, referrals, giveaways, lottery, Animatrix accounts, admin panel, VIP checker, force-join channels, daily spin
- **Storage**: JSON files in `.data/`
- **Owner ID**: 7606499525 (@XK6271)
- **Port**: 3000 (health check)

### Bot 2: Cookie Checker Bot (`artifacts/checker-bot`)
- **Username**: @heieiwjwnsk_bot
- **Token**: hardcoded in `src/bot.ts`
- **Features**: Netflix cookie checker with token extraction, Prime Video cookie checker, force-join channels, daily usage limit (500/day), VIP system, admin panel
- **Storage**: JSON files in `.data/`
- **Owner ID**: 7606499525 (@XK6271)
- **Port**: 3001 (health check)
- **Channels**: ThunderVault8, netflixhivea, allichetools, +9njmxL1yJuA4YjE6

**IMPORTANT**: Never run both the deployed version and local version of the same bot simultaneously — causes 409 Conflict errors and button issues.
