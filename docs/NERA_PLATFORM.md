# Nera — AI-Powered Trading Intelligence Platform

## Overview

Nera is a unified AI-powered trading intelligence platform that combines world-scale intelligence monitoring with financial research, strategy design, backtesting, paper trading, and portfolio management. Built on top of a production-grade OSINT intelligence engine, it connects global events to actionable trading workflows.

**Version**: 2.0.0
**Mode**: Paper Trading (live-ready architecture)
**Stack**: React 19 + Tailwind 4 + Vite (frontend) | Edge Functions + Redis (backend) | Yahoo Finance + LLM providers (data)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Nera Platform                            │
├──────────────┬──────────────────────────────────────────────┤
│  /trading/*  │  React 19 SPA (Tailwind 4 + Recharts)       │
│              │  20 pages, lazy-loaded, route-level splitting │
├──────────────┼──────────────────────────────────────────────┤
│  /api/       │  Vercel Edge Functions                        │
│  trading/v1/ │  60+ RPCs, Redis-backed, auth-gated          │
├──────────────┼──────────────────────────────────────────────┤
│  Storage     │  Redis (Upstash) — strategies, backtests,    │
│              │  portfolio, ledger, orders, AI events,        │
│              │  evidence, config, audit log, notifications   │
│              │  Convex — registrations, persistent data      │
├──────────────┼──────────────────────────────────────────────┤
│  Data        │  Yahoo Finance (market data + historical)     │
│              │  Finnhub, CoinGecko (supplementary)           │
│              │  ACLED, GDELT, FRED, EIA (intelligence)       │
│              │  Groq, OpenRouter (LLM providers)             │
└──────────────┴──────────────────────────────────────────────┘
```

### Data Flow

```
Intelligence Feeds (ACLED, GDELT, FRED, EIA)
    ↓
World Events / Research / News
    ↓
Strategy Universe / Watchlist Selection
    ↓
Strategy Design (Wizard + Templates + Presets)
    ↓
Validation + Risk Guardrails
    ↓
Backtest (Real Historical Data via Yahoo Finance)
    ↓
AI Interpretation + Review Checklist
    ↓
Deploy to Paper Mode
    ↓
Forward Runner (Signal Generation)
    ↓
Execution Center (Paper Orders)
    ↓
Portfolio + Ledger + Evidence + Audit Trail
```

---

## Navigation Structure

| Route | Page | Description |
|-------|------|-------------|
| `/` | Dashboard | Command center — portfolio, strategies, AI activity, market ticker |
| `/strategies` | Strategies | Strategy list with filters, status, performance |
| `/create` | Create Strategy | Multi-step wizard with 8 algorithm templates |
| `/strategy/:id` | Strategy Detail | Full strategy view with actions |
| `/backtests` | Backtests | All backtest runs, equity curves, metrics |
| `/forward` | Forward Runner | Paper signal generation and proposed actions |
| `/execution` | Execution | Paper order management (market + limit orders) |
| `/portfolio` | Portfolio | Positions, exposure, P&L, deposit/withdraw |
| `/ledger` | Ledger | Order/fill/activity audit trail |
| `/ai` | AI Pulse | AI activity timeline, interpretations |
| `/research` | Research | Universe management, intel sources |
| `/analytics` | Analytics | Technical charts and indicators |
| `/watchlist` | Watchlist | Custom watchlist management |
| `/risk` | Risk Matrix | VaR, stress tests, concentration |
| `/compare` | Compare | Side-by-side backtest comparison |
| `/attribution` | Attribution | Factor decomposition (market, sector, alpha) |
| `/alerts` | Alerts | Price/risk threshold monitoring |
| `/evidence` | Evidence | AI receipts and audit records |
| `/admin` | Admin | System health, feature flags, audit log, config |
| `/settings` | Settings | Preferences, risk guardrails, webhooks |

---

## API Reference

Base URL: `/api/trading/v1/`

### Authentication

Mutation endpoints (POST) require the `X-Nera-Key` header with the `TRADING_API_KEY` value. GET endpoints are open for convenience. In production without a configured key, mutations are blocked (fail-closed).

### Endpoints (60+ RPCs)

#### Templates
| Method | Path | Description |
|--------|------|-------------|
| GET | `/list-templates` | List all 8 algorithm templates |

#### Strategy CRUD
| Method | Path | Description |
|--------|------|-------------|
| POST | `/create-strategy` | Create a new strategy |
| GET | `/get-strategy?id=` | Get strategy by ID |
| GET | `/list-strategies` | List all strategies |
| POST | `/update-strategy` | Update strategy parameters |
| POST | `/delete-strategy` | Delete a strategy |

#### Backtests
| Method | Path | Description |
|--------|------|-------------|
| POST | `/run-backtest` | Run backtest on real historical data |
| GET | `/get-backtest-run?id=` | Get backtest results |
| GET | `/list-backtest-runs` | List all backtest runs |

#### Forward Runner
| Method | Path | Description |
|--------|------|-------------|
| POST | `/start-forward-run` | Start paper signal generation |
| POST | `/stop-forward-run` | Stop a forward run |
| POST | `/evaluate-forward-run` | Evaluate now (on-demand) |
| GET | `/list-forward-runs` | List all forward runs |
| GET | `/get-forward-run?id=` | Get forward run details |

#### Execution
| Method | Path | Description |
|--------|------|-------------|
| POST | `/submit-order` | Submit paper order (market/limit) |
| GET | `/list-orders` | List order history |

#### Portfolio
| Method | Path | Description |
|--------|------|-------------|
| GET | `/get-portfolio` | Get portfolio snapshot |
| POST | `/refresh-portfolio` | Update position prices from market |
| POST | `/deposit` | Paper account deposit |
| POST | `/withdraw` | Paper account withdrawal |

#### Market Data
| Method | Path | Description |
|--------|------|-------------|
| GET | `/get-market-data?symbol=` | OHLCV + technical indicators |
| GET | `/get-watchlist-quotes?symbols=` | Batch quotes |
| GET | `/get-risk-analytics` | Portfolio risk metrics |
| GET | `/get-attribution?backtestId=` | Factor decomposition |

#### Alerts
| Method | Path | Description |
|--------|------|-------------|
| POST | `/create-alert` | Create price/risk alert |
| GET | `/list-alerts` | List all alerts |
| POST | `/dismiss-alert` | Dismiss triggered alert |
| POST | `/delete-alert` | Delete an alert |
| POST | `/evaluate-alerts` | Evaluate all alerts now |

#### AI
| Method | Path | Description |
|--------|------|-------------|
| POST | `/interpret-strategy` | AI strategy interpretation |
| GET | `/list-ai-events` | List AI activity timeline |
| GET | `/get-ai-event?id=` | Get AI event details |

#### Notifications
| Method | Path | Description |
|--------|------|-------------|
| GET | `/get-notification-config` | Get webhook config |
| POST | `/update-notification-config` | Update webhook URL |
| GET | `/list-notifications` | Notification delivery history |
| POST | `/test-webhook` | Send test webhook |

#### Watchlists
| Method | Path | Description |
|--------|------|-------------|
| POST | `/create-watchlist` | Create custom watchlist |
| GET | `/list-watchlists` | List saved watchlists |
| GET | `/get-watchlist?id=` | Get watchlist details |
| POST | `/update-watchlist` | Update watchlist |
| POST | `/delete-watchlist` | Delete watchlist |

#### Settings & Config
| Method | Path | Description |
|--------|------|-------------|
| GET | `/get-settings` | Get user settings |
| POST | `/update-settings` | Update settings |
| GET | `/get-platform-config` | Get platform configuration |
| POST | `/update-platform-config` | Update platform config |
| POST | `/toggle-feature-flag` | Toggle a feature flag |
| POST | `/rollback-config` | Rollback to previous config |
| GET | `/list-config-history` | Config change history |

#### Data Export
| Method | Path | Description |
|--------|------|-------------|
| GET | `/export-data?entity=&format=` | Export as JSON or CSV |

#### System
| Method | Path | Description |
|--------|------|-------------|
| GET | `/provider-health` | Live provider health checks |
| GET | `/intel-status` | Intelligence feed freshness |
| GET | `/list-audit-log` | Audit log entries |
| GET | `/get-audit-entry?id=` | Audit entry details |

---

## Algorithm Templates

| Template | Difficulty | Key Parameters |
|----------|-----------|----------------|
| **Momentum** | Beginner | Lookback period, threshold %, volume confirm |
| **Mean Reversion** | Intermediate | Z-score entry/exit, holding period |
| **Breakout** | Intermediate | Consolidation period, breakout %, volume surge |
| **Trend Following** | Beginner | Fast/slow MA, signal confirmation, trailing stop |
| **ETF Rotation** | Beginner | Momentum window, top-N ETFs, rebalance freq |
| **Sector Rotation** | Intermediate | Sector momentum, relative strength |
| **Event-Driven** | Advanced | Event types, reaction window, sentiment |
| **Custom** | Advanced | User-defined entry/exit indicators |

Each template includes **Conservative**, **Balanced**, and **Aggressive** presets.

---

## Storage Model

| Entity | Store | TTL | Max Index |
|--------|-------|-----|-----------|
| Strategies | Redis | 90d | Unlimited |
| Backtests | Redis | 30d | Unlimited |
| Forward Runs | Redis | 90d | Unlimited |
| Orders | Redis | 90d | 500 |
| Portfolio | Redis | 90d | 1 (latest) |
| Ledger | Redis | 90d | 500 |
| AI Events | Redis | 30d | 200 |
| Evidence | Redis | 90d | 500 |
| Settings | Redis | 90d | 1 |
| Watchlists | Redis | 90d | 50 |
| Audit Log | Redis | 90d | 1000 |
| Notifications | Redis | 90d | 200 |
| Platform Config | Redis | 90d | 50 (history) |

Redis key pattern: `trading:{entity}:v1:{id}`

---

## Design System

### Color Palette (Dark Theme)

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-surface-0` | `#0a0e17` | Page background |
| `--color-surface-1` | `#0f1420` | Card background |
| `--color-surface-2` | `#151b2b` | Input/hover background |
| `--color-accent` | `#00d4aa` | CTA, links, primary actions |
| `--color-profit` | `#00c853` | Positive P&L, gains |
| `--color-loss` | `#ff5252` | Negative P&L, losses |
| `--color-warning` | `#ffab00` | Warnings, caution |
| `--color-info` | `#448aff` | Informational elements |

### Typography
- **Font**: System font stack (no custom fonts loaded)
- **Headings**: `text-2xl font-semibold` (page), `text-sm font-semibold` (section)
- **Body**: `text-xs` (most UI text), `text-sm` (prominent text)
- **Micro**: `text-[10px]` (timestamps, metadata)

### Components
- Cards: `rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)]`
- Buttons: `rounded-lg px-4 py-2 text-sm font-medium`
- Status badges: Colored pills with semantic colors
- Tables: Minimal borders, alternating-friendly backgrounds

---

## Security

- **API Key Auth**: Constant-time comparison, fail-closed in production
- **CORS**: Configurable origin, allow GET/POST/OPTIONS
- **CSP**: Strict Content-Security-Policy in vercel.json
- **Rate Limiting**: Upstash-based, 600 req/60s global
- **Input Validation**: Symbol format regex, body size limits (512KB)
- **Audit Trail**: All mutations logged with actor, IP, duration, status
- **Secure Headers**: HSTS, X-Content-Type-Options, X-Frame-Options

---

## Deployment

### Vercel
```bash
npm run build:trading  # Build trading sub-app
npm run build          # Build main intelligence app
```

### Environment Variables
```
UPSTASH_REDIS_REST_URL=    # Redis connection
UPSTASH_REDIS_REST_TOKEN=  # Redis auth
TRADING_API_KEY=           # API mutation auth
GROQ_API_KEY=              # LLM provider (primary)
OPENROUTER_API_KEY=        # LLM provider (fallback)
FINNHUB_API_KEY=           # Market data (supplementary)
```

### Local Development
```bash
cd trading && npm run dev   # Frontend on :3001
# Backend proxied to :3000 via Vite config
```

---

## For New Developers

### Getting Started
1. Clone the repo and install dependencies: `npm install && cd trading && npm install`
2. Copy `.env.example` to `.env.local` and fill in API keys
3. Run `cd trading && npm run dev` for the trading UI
4. The main intelligence dashboard runs from root: `npm run dev`

### Key Directories
```
trading/src/pages/      → All 20 page components
trading/src/lib/api.ts  → Frontend API client (all types + functions)
trading/src/layout/     → Shell, Sidebar, TopBar
server/worldmonitor/trading/v1/
  handler.ts            → Route registry (60+ RPCs)
  trading-store.ts      → Redis CRUD operations
  types.ts              → Canonical TypeScript types
  _shared.ts            → Utilities (parseBody, jsonResponse, generateId)
  strategy-templates.ts → 8 algorithm template definitions
  backtest-engine.ts    → Multi-symbol backtest engine
  *.ts                  → Individual RPC handlers
```

### Adding a New Feature
1. Define types in `types.ts`
2. Add store functions in `trading-store.ts`
3. Create handler file (e.g., `my-feature.ts`)
4. Register route in `handler.ts`
5. Add API client function in `trading/src/lib/api.ts`
6. Build UI in `trading/src/pages/`

---

## Non-Negotiable Rules

1. **No hallucinated capabilities** — Only claim what is actually implemented
2. **No mock data in production flows** — All data from real APIs or user input
3. **AI is advisory only** — Deterministic logic makes all trading decisions
4. **No live trading** — Paper mode only until broker integration
5. **Everything is auditable** — Every mutation logged, every AI call receipted
6. **Real data honesty** — Backtest results from actual historical bars
