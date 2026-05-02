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

## Artifacts

### TradeX Trading Platform (`artifacts/tradex`)
- React + Vite + Tailwind CSS v4 SPA, port 24753, preview path `/`
- Deriv App ID: `339IyLjCcUmBEXEzG6tsS` (defined in `AuthContext.tsx`)
- Pages: Dashboard, Bot Builder, Manual Traders, Charts, Trading Bots, Analysis Tool, Strategies, Copy Trading
- Charts & Analysis Tool use `fetch + EventSource` (NOT browser WebSocket) → server-side proxy at `/api/ticks/*`
- Other pages (Strategies, BottomBar run button) still use direct browser WebSocket to Deriv for trade execution

### API Server (`artifacts/api-server`)
- Express 5 server, port 8080, preview path `/api`
- Key routes:
  - `GET /api/ticks/:symbol?count=N` — returns last N tick prices+times as JSON (tries Deriv live → falls back to realistic simulation if app_id is rejected)
  - `GET /api/ticks/stream/:symbol` — SSE stream sending one tick/second (tries Deriv live → falls back to simulation)
- WebSocket proxy uses `ws` npm package with proper Origin headers
- Tick simulation uses Box-Muller random walk matching each Volatility index's statistical properties

### Deriv WebSocket Note
- Cloudflare on `ws.binaryws.com` validates the app_id at HTTP level (returns 401 `{"error":"InvalidAppID"}`)
- Server-side connections automatically fall back to realistic tick simulation
- Simulation params per symbol: R_10 (±0.01%/tick), R_25 (±0.025%/tick), R_50 (±0.05%/tick), R_75 (±0.075%/tick), R_100 (±0.1%/tick)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
