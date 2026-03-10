# Nera Trading Platform — Replit Agent Guide

## Project Overview

Nera is a full-stack algorithmic trading platform with:
- **Frontend**: React 19 SPA (Vite + Tailwind CSS 4) in `/trading/`
- **Backend**: Node.js API server using Web Standard Request/Response APIs
- **Storage**: Redis via Upstash REST API (HTTP-based, no TCP connections needed)
- **Server Entry**: `replit-server.ts` — unified server serving both API and static files

## Architecture (IMPORTANT — Read First)

```
replit-server.ts          ← Node.js HTTP server (entry point)
  ├── /api/trading/v1/*   ← 60+ RPC endpoints (GET/POST)
  │   └── server/worldmonitor/trading/v1/handler.ts  ← Route definitions
  │       └── server/worldmonitor/trading/v1/*.ts     ← Individual handlers
  ├── /trading/*          ← React SPA (pre-built in public/trading/)
  └── /*                  ← Main app (pre-built in public/)

server/_shared/redis.ts   ← Upstash Redis REST client (HTTP fetch, no TCP)
server/router.ts          ← O(1) Map-based route matcher
trading/src/              ← React source code (Vite builds to public/trading/)
trading/src/lib/api.ts    ← Frontend API client (879 lines, all typed)
```

## How to Run

```bash
# Install dependencies (both root and trading)
npm install
cd trading && npm install && cd ..

# Build the trading frontend
cd trading && npm run build && cd ..

# Start the server
npx tsx replit-server.ts
```

The server runs on port 5000 (configurable via PORT env var) and binds to 0.0.0.0.

## Key Technical Details

### API Pattern
All API endpoints follow RPC-style: `/api/trading/v1/{action-name}`
- GET endpoints: read data, pass params as query strings
- POST endpoints: mutations, pass JSON body
- Auth: `X-Nera-Key` header or `Authorization: Bearer` for POST mutations

### Handler Signature
Every handler is `(req: Request) => Promise<Response>` using Web Standard APIs.
Node.js 20+ supports Request/Response natively. The server adapter in `replit-server.ts`
converts `http.IncomingMessage` to `Request` and pipes `Response` back.

### Redis (Upstash)
- Uses HTTP REST API, NOT TCP connections
- Environment variables: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- All trading data stored as JSON with key pattern: `trading:{entity}:v1:{id}`
- Works without Redis (handlers gracefully degrade or return empty data)

### Frontend (Trading SPA)
- Source: `trading/src/` — React 19 + TypeScript + Tailwind CSS 4
- Build: `cd trading && npm run build` → outputs to `public/trading/`
- Base path: `/trading/` (configured in `trading/vite.config.ts`)
- API calls go to `/api/trading/v1/` (same origin, no proxy needed in production)
- Dev proxy configured in vite.config.ts for `/api` → `http://localhost:5000`

## Environment Variables (Secrets)

Set these in Replit Secrets panel:

| Variable | Required | Description |
|----------|----------|-------------|
| `UPSTASH_REDIS_REST_URL` | Yes | Upstash Redis REST endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | Yes | Upstash Redis auth token |
| `TRADING_API_KEY` | No | Protects mutation endpoints (POST). If unset in dev, mutations are open |
| `GROQ_API_KEY` | No | AI strategy interpretation (Groq LLM) |
| `OPENROUTER_API_KEY` | No | Fallback LLM provider |
| `NODE_ENV` | No | Set to "production" for production mode |

## Coding Standards

- TypeScript strict mode everywhere
- ES modules (`"type": "module"` in package.json)
- No semicolons in frontend code (Prettier default)
- Tailwind CSS 4 with CSS custom properties for theming
- Design system colors: `--color-accent`, `--color-surface-0/1/2/3`, `--color-profit`, `--color-loss`
- All API functions return typed objects (see `trading/src/lib/api.ts`)
- Use `useCallback` for data-fetching functions in React components
- Component structure: `PageHeader` + `MetricCard` + `StatusBadge` design system

## File Structure for Agent

### If modifying the trading UI:
- Pages: `trading/src/pages/*.tsx` (20 pages)
- Components: `trading/src/components/*.tsx`
- API client: `trading/src/lib/api.ts`
- Utilities: `trading/src/lib/utils.ts`
- Layout: `trading/src/layout/Sidebar.tsx`, `TopBar.tsx`
- Routing: `trading/src/App.tsx`
- After changes: `cd trading && npm run build`

### If modifying the API:
- Route definitions: `server/worldmonitor/trading/v1/handler.ts`
- Individual handlers: `server/worldmonitor/trading/v1/*.ts`
- Shared helpers: `server/worldmonitor/trading/v1/_shared.ts`
- Data persistence: `server/worldmonitor/trading/v1/trading-store.ts`
- Redis client: `server/_shared/redis.ts`
- No rebuild needed — tsx watches for changes

### If modifying the server:
- Entry point: `replit-server.ts`
- Port: 5000 (env PORT)
- Host: 0.0.0.0 (required by Replit)

## Non-Negotiable Rules

1. **Never** remove or rename existing API endpoints — the frontend depends on them
2. **Never** change the Redis key patterns — existing data would be orphaned
3. **Always** use Web Standard Request/Response in handlers (not Express req/res)
4. **Always** rebuild trading SPA after frontend changes: `cd trading && npm run build`
5. **Always** bind to 0.0.0.0 (not localhost) for Replit compatibility
6. **Never** install Express, Fastify, or other frameworks — the server is intentionally lightweight
7. **Keep** the existing `withAuth()` and `withAudit()` wrapper patterns for mutations

## Testing

```bash
# TypeScript check (trading frontend)
cd trading && npx tsc --noEmit

# Build check (trading frontend)
cd trading && npm run build

# Manual API test
curl http://localhost:5000/api/trading/v1/list-templates
curl http://localhost:5000/api/trading/v1/list-strategies
```

## Deployment on Replit

The `.replit` file is pre-configured:
- **Run**: `npx tsx replit-server.ts`
- **Build**: `cd trading && npm install && npm run build`
- **Port**: 5000 → external port 80
- **Deploy target**: Autoscale deployment (cloudrun)

For deployment, use Replit's "Deploy" button. The build command will rebuild the frontend,
and the run command starts the unified server.
