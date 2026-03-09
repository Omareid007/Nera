# Nera Trading Platform — Replit Import Guide

## Quick Summary

Nera is a pre-built, production-ready algorithmic trading platform. This guide walks you through
importing it into Replit and getting it running with **zero Replit Agent token consumption** for setup.

---

## Step 1: Import Method (Choose One)

### Option A: Import from GitHub (Recommended)

1. Go to [replit.com/import/github](https://replit.com/import/github)
2. Select your account → Select **Nera** repository
3. Set **Privacy** to **Private**
4. Click **Import from GitHub**

### Option B: Import from Zip

1. On your local machine, download the repo as zip from GitHub
2. Go to [replit.com/import/zip](https://replit.com/import/zip)
3. Upload the zip file
4. Set **Privacy** to **Private**
5. Click **Import from zip**

**GitHub import is preferred** — it preserves git history and allows syncing later.

---

## Step 2: Wait for Auto-Detection

When Replit imports the project, it will detect the `.replit` and `replit.nix` files automatically.
These are pre-configured. **Do NOT let Replit Agent modify these files.**

The `.replit` file configures:
- **Run command**: `npx tsx replit-server.ts`
- **Port**: 5000 → external port 80
- **Build**: `cd trading && npm install && npm run build`

---

## Step 3: Set Up Secrets (Environment Variables)

Go to **Tools → Secrets** (lock icon in sidebar) and add:

### Required Secrets

| Key | Value | Where to Get |
|-----|-------|--------------|
| `UPSTASH_REDIS_REST_URL` | `https://your-db.upstash.io` | [console.upstash.com](https://console.upstash.com) → Create Redis DB → REST API tab |
| `UPSTASH_REDIS_REST_TOKEN` | `AXxx...` | Same page as URL |

### Optional Secrets

| Key | Value | Purpose |
|-----|-------|---------|
| `TRADING_API_KEY` | Any string (e.g. `nera_dev_123`) | Protects POST mutation endpoints |
| `GROQ_API_KEY` | Groq API key | AI strategy interpretation |
| `OPENROUTER_API_KEY` | OpenRouter key | Fallback LLM |

**Free Upstash Redis**: Go to [console.upstash.com](https://console.upstash.com), create a free
Redis database (256MB, 10K commands/day free). Copy the REST URL and token.

---

## Step 4: Install Dependencies

Open the **Shell** tab and run:

```bash
npm install
cd trading && npm install && cd ..
```

This installs both root (server) and trading (frontend) dependencies.

---

## Step 5: Build the Trading Frontend

```bash
cd trading && npm run build && cd ..
```

This compiles the React SPA to `public/trading/`. Takes ~10 seconds.

---

## Step 6: Click Run

Press the green **Run** button (or Ctrl+Enter). The server starts on port 5000.

The Replit webview will open showing the trading platform at `/trading/`.

**That's it — the app is running.**

---

## Step 7: Verify It Works

In the webview or browser, check:
- `/trading/` — Trading platform UI (Dashboard, Strategies, Backtests, etc.)
- `/api/trading/v1/list-templates` — Should return JSON with 8 algorithm templates
- `/api/trading/v1/list-strategies` — Should return `{ strategies: [] }` (empty initially)

---

## Step 8: Deploy (Optional)

1. Click **Deploy** button in the top bar
2. Choose **Autoscale** deployment
3. Set machine power to minimum (0.25 vCPU, 256MB RAM is sufficient)
4. The build command is pre-configured: `cd trading && npm install && npm run build`
5. The run command is pre-configured: `npx tsx replit-server.ts`
6. Click **Deploy**

Your app gets a `*.replit.app` URL.

---

## Replit Agent Tips (Save Tokens)

### What NOT to ask the Agent

- "Set up the project" — it's already configured
- "Install dependencies" — just run `npm install` in Shell
- "Configure the database" — it uses external Upstash Redis (HTTP API)
- "Add a framework" — the server is intentionally framework-free
- "Fix the imports" — all imports work with tsx/TypeScript

### What TO ask the Agent

- "Add a new page to the trading UI" — give it the feature description
- "Add a new API endpoint" — describe the data model
- "Modify the Dashboard layout" — be specific about changes
- "Add a new chart type" — Recharts is already installed

### How to Guide the Agent Efficiently

1. **Be specific**: "Add a 'News Feed' tab to AdminPage.tsx that fetches from /api/trading/v1/list-news"
2. **Reference existing patterns**: "Follow the same pattern as AlertsPage.tsx"
3. **Tell it to rebuild**: "After making changes, run `cd trading && npm run build`"
4. **Read `replit.md`**: Tell the agent "Read replit.md for project context before starting"

---

## Architecture Overview

```
replit-server.ts              ← Entry point (Node.js HTTP server)
│
├── /api/trading/v1/*         ← 60+ API endpoints
│   ├── handler.ts            ← Route definitions
│   ├── trading-store.ts      ← Redis persistence
│   ├── create-strategy.ts    ← Individual handlers
│   └── ... (40+ files)
│
├── /trading/                 ← Pre-built React SPA
│   └── index.html           ← SPA entry
│
├── trading/src/              ← React source code
│   ├── pages/               ← 20 page components
│   ├── components/          ← Shared UI components
│   ├── lib/api.ts           ← Typed API client
│   └── App.tsx              ← Router
│
├── .replit                   ← Replit configuration
├── replit.nix                ← Nix dependencies
└── replit.md                 ← Agent instructions
```

---

## Troubleshooting

### "Module not found" errors
```bash
npm install
cd trading && npm install && cd ..
```

### Trading UI shows blank page
```bash
cd trading && npm run build && cd ..
```

### API returns empty data
Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in Secrets.

### Port not accessible
The server must bind to `0.0.0.0:5000`. Check that `replit-server.ts` has:
```typescript
const HOST = '0.0.0.0';
const PORT = parseInt(process.env.PORT || '5000', 10);
```

### TypeScript errors
```bash
cd trading && npx tsc --noEmit  # Check frontend
```

### "TRADING_API_KEY not configured" on POST requests
Either:
- Set `TRADING_API_KEY` in Secrets, or
- Remove `NODE_ENV=production` (dev mode allows open mutations)

---

## Resource Usage Optimization

### Replit Plan Considerations

- **Free plan**: Development works fine. Deploy is limited.
- **Hacker/Pro plan**: Full deployment with custom domains.
- **Pay-as-you-go**: Autoscale deployment bills per compute unit.

### Minimizing Costs

1. **Use Static Deployment for frontend-only**: If you only need the trading UI,
   build and deploy `public/trading/` as a static site (cheapest option).

2. **Use Autoscale with minimum instances**: Set max machines to 1, minimum CPU.
   The server is lightweight (~30MB RAM).

3. **External Redis**: Upstash free tier handles development traffic easily.
   No need for Replit's PostgreSQL.

4. **No background workers**: The server is request-driven. Zero cost when idle
   with autoscale deployments.

---

## Development Workflow on Replit

### Making Frontend Changes

1. Edit files in `trading/src/`
2. For live development: `cd trading && npm run dev` (runs Vite dev server on port 3001)
3. When done: `cd trading && npm run build` (builds to public/trading/)
4. Restart the main server

### Making API Changes

1. Edit files in `server/worldmonitor/trading/v1/`
2. Stop and re-run the server (tsx doesn't auto-reload)
3. Test with curl or the frontend

### Adding a New API Endpoint

1. Create handler file: `server/worldmonitor/trading/v1/my-endpoint.ts`
2. Export: `export async function myEndpoint(req: Request): Promise<Response> { ... }`
3. Register in `handler.ts`: `{ method: 'GET', path: \`\${BASE}/my-endpoint\`, handler: myEndpoint }`
4. Add frontend function in `trading/src/lib/api.ts`
5. Use in a page component

### Adding a New Page

1. Create page: `trading/src/pages/MyPage.tsx`
2. Add route in `trading/src/App.tsx`
3. Add nav link in `trading/src/layout/Sidebar.tsx`
4. Build: `cd trading && npm run build`
