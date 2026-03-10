# Nera Platform — Integration & Connector Reference

## Status Legend

| Status | Description |
|--------|-------------|
| ACTIVE | Running now, no configuration needed |
| NEEDS KEY | Requires API key registration (free tier available) |
| PAID | Requires paid subscription |
| OPTIONAL | Has working fallback if not configured |
| FALLBACK | Used automatically when primary source fails |

---

## 1. Directly Active Connectors (No Configuration Required)

These integrations work immediately with no API keys or configuration.

| Connector | Data Type | Source | Endpoint | Cache |
|-----------|-----------|--------|----------|-------|
| GDELT | Global news events, sentiment | api.gdeltproject.org | v2/doc/doc | 5 min |
| Yahoo Finance | Stock quotes, indices, ETFs, futures | query1.finance.yahoo.com | v8/finance | 5 min |
| CoinPaprika | Cryptocurrency prices | api.coinpaprika.com | v1/tickers | 5 min |
| CISA KEV | Cyber vulnerabilities | cisa.gov | known_exploited_vulnerabilities.json | 30 min |
| GDACS | Natural disaster alerts | gdacs.org | gdacsapi | 15 min |
| NHC/NOAA | Tropical cyclone tracking | nhc.noaa.gov | ArcGIS JSON | 15 min |
| USGS | Earthquake data (M4.5+) | earthquake.usgs.gov | GeoJSON feed | 5 min |
| Kalshi | Prediction markets | api.elections.kalshi.com | events, markets | 5 min |
| Polymarket | Prediction markets | gamma-api.polymarket.com | markets | 5 min |
| UNHCR | Refugee/displacement data | api.unhcr.org | population | 60 min |
| World Bank | Economic indicators | api.worldbank.org | v2/country | 24 hr |
| Open-Meteo | Climate anomaly data | archive-api.open-meteo.com | v1/era5 | 60 min |
| Alternative.me | Fear & Greed Index | api.alternative.me | fng | 15 min |
| Mempool Space | Bitcoin hash rate | mempool.space | api/v1 | 15 min |
| Google News RSS | News fallback | news.google.com | rss/search | 10 min |
| FAA | US airport status | soa.smext.faa.gov | asws | 5 min |
| Feodo Tracker | C2 botnet data | feodotracker.abuse.ch | blocklist | 60 min |
| URLhaus | Malicious URLs | urlhaus-api.abuse.ch | v1/urls | 60 min |
| C2IntelFeeds | C2 server IPs | github.com/drb-ra | raw feeds | 60 min |
| IPInfo.io | IP geolocation | ipinfo.io | json | On demand |
| FreeIPAPI | IP geo fallback | freeipapi.com | api/json | On demand |
| NASA EONET | Natural events | eonet.gsfc.nasa.gov | v3/events | 30 min |

**Total: 22 active connectors** — all running without any configuration.

---

## 2. Free Registration Required (NEEDS KEY)

These APIs have generous free tiers but require account registration to get an API key.

### Core Platform (High Priority)

| Connector | Purpose | Env Variable | Free Tier | Registration URL |
|-----------|---------|-------------|-----------|-----------------|
| Finnhub | Stock quotes, earnings calendar | `FINNHUB_API_KEY` | 60 calls/min | finnhub.io/register |
| FRED | US economic time series (GDP, CPI, rates) | `FRED_API_KEY` | 120 calls/min | fred.stlouisfed.org/docs/api/api_key.html |
| EIA | Energy prices, production, inventory | `EIA_API_KEY` | Unlimited | eia.gov/opendata/register.php |
| ACLED | Armed conflict events | `ACLED_ACCESS_TOKEN` | Academic/media free | acleddata.com/register |
| Groq | LLM for strategy interpretation | `GROQ_API_KEY` | 14,400 req/day | console.groq.com |
| OpenRouter | LLM fallback | `OPENROUTER_API_KEY` | 50 req/day free | openrouter.ai/keys |

### Extended Intelligence (Medium Priority)

| Connector | Purpose | Env Variable | Free Tier | Registration URL |
|-----------|---------|-------------|-----------|-----------------|
| CoinGecko | Crypto data (enhanced) | `COINGECKO_API_KEY` | 10K calls/month | coingecko.com/api/pricing |
| NASA FIRMS | Satellite fire detection | `NASA_FIRMS_API_KEY` | Unlimited | firms.modaps.eosdis.nasa.gov/api |
| Cloudflare Radar | Internet outage monitoring | `CLOUDFLARE_API_TOKEN` | Free tier | dash.cloudflare.com/profile/api-tokens |
| AlienVault OTX | Threat intelligence | `OTX_API_KEY` | Free | otx.alienvault.com |
| AbuseIPDB | IP reputation | `ABUSEIPDB_API_KEY` | 1000 checks/day | abuseipdb.com/register |
| UCDP | Uppsala conflict data | `UCDP_ACCESS_TOKEN` | Academic free | ucdp.uu.se |
| OpenSky | Aircraft tracking | `OPENSKY_CLIENT_ID`, `OPENSKY_CLIENT_SECRET` | Higher rate limits | opensky-network.org/register |
| AviationStack | Live flight data | `AVIATIONSTACK_API` | 100 calls/month | aviationstack.com/signup |

### Configuration

Add keys to your `.env` file at the project root:

```env
# Core (High Priority)
FINNHUB_API_KEY=your_key_here
FRED_API_KEY=your_key_here
EIA_API_KEY=your_key_here
ACLED_ACCESS_TOKEN=your_token_here
GROQ_API_KEY=your_key_here
OPENROUTER_API_KEY=your_key_here

# Extended Intelligence
COINGECKO_API_KEY=your_key_here
NASA_FIRMS_API_KEY=your_key_here
CLOUDFLARE_API_TOKEN=your_token_here
OTX_API_KEY=your_key_here
ABUSEIPDB_API_KEY=your_key_here
UCDP_ACCESS_TOKEN=your_token_here
OPENSKY_CLIENT_ID=your_id_here
OPENSKY_CLIENT_SECRET=your_secret_here
AVIATIONSTACK_API=your_key_here
```

---

## 3. Paid Services (PAID)

| Connector | Purpose | Env Variable | Pricing |
|-----------|---------|-------------|---------|
| Upstash Redis | Caching and state store | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Free tier: 10K commands/day; Pro: $0.2/100K |
| Convex | Backend database | `CONVEX_URL` | Free tier available; Pro: $25/month |
| Tavily | News search | `TAVILY_API_KEYS` | 1K free calls, then paid |
| Brave Search | News search | `BRAVE_API_KEYS` | 2K free/month |
| SerpAPI | Google results | `SERPAPI_API_KEYS` | 100 free/month |
| Wingbits | Aircraft intelligence | `WINGBITS_API_KEY` | Commercial pricing |
| ICAO NOTAM | Airport notices | `ICAO_API_KEY` | Commercial pricing |
| Travelpayouts | Flight pricing | `TRAVELPAYOUTS_API_TOKEN` | Affiliate program |
| WTO | Trade statistics | `WTO_API_KEY` | Application required |

**Note:** The platform runs fully without paid services. Upstash Redis has an in-memory fallback. Convex is only used for interest registration. News search falls back to Google News RSS.

---

## 4. Self-Hosted / Local (No External Dependency)

| Service | Purpose | Env Variable | Setup |
|---------|---------|-------------|-------|
| Ollama | Local LLM inference | `OLLAMA_API_URL`, `OLLAMA_MODEL` | Install ollama, run `ollama pull llama3` |

---

## 5. Architecture Summary

### Data Flow

```
External APIs → Server Handlers → Redis Cache → Edge Functions → Trading UI
                                  (5min TTL)     (Vercel Edge)   (React 19)
```

### Module Structure

```
server/worldmonitor/
├── trading/v1/        # Trading signals, GTI, geo-signals, backtests
├── market/v1/         # Stock quotes, crypto, ETF flows, commodities
├── economic/v1/       # FRED, EIA, World Bank, macro signals
├── intelligence/v1/   # CII scores, event classification, GDELT
├── conflict/v1/       # ACLED, UCDP conflict events
├── unrest/v1/         # Protests, riots, civil unrest
├── cyber/v1/          # Threat intel, C2 tracking, IP reputation
├── supply-chain/v1/   # Chokepoints, minerals, shipping
├── climate/v1/        # Climate anomalies, weather events
├── natural/v1/        # Earthquakes, volcanoes, disasters
├── wildfire/v1/       # Fire detection (NASA FIRMS)
├── aviation/v1/       # Flight tracking, airports, NOTAM
├── military/v1/       # Aircraft identification, theater posture
├── displacement/v1/   # Refugee flows, UNHCR data
├── seismology/v1/     # Earthquake monitoring
├── news/v1/           # News aggregation, HackerNews
├── trade/v1/          # WTO, trade flows
└── prediction/v1/     # Prediction markets
```

### Trading Platform Endpoints (13 Sources for Geo-Signals)

| Endpoint | Source | Refresh |
|----------|--------|---------|
| `GET /api/trading/v1/get-tension-index` | GDELT + CISA + GDACS (6 components) | 5 min |
| `GET /api/trading/v1/list-geo-signals` | GDELT (34 global categories) | 5 min |
| `GET /api/trading/v1/list-prediction-markets` | Kalshi + Polymarket | 5 min |
| `GET /api/trading/v1/list-earnings` | Finnhub + Yahoo Finance | 30 min |
| `GET /api/trading/v1/list-cyclones` | NHC + GDACS | 15 min |
| `GET /api/trading/v1/list-cyber-threats` | CISA KEV | 30 min |
| `GET /api/trading/v1/intel-status` | All sources (health check) | On demand |

### Geo-Signals Coverage (34 Categories)

**Geographic (18):** Middle East, Ukraine/Russia, China/Taiwan, Latin America/Brazil, Mexico/Central America, Argentina/Chile/Andes, India/South Asia, Southeast Asia, Japan/Korea, Oceania/Pacific, Sub-Saharan Africa, North Africa, Central Asia, Western Europe, Central/Eastern Europe, Arctic/Nordic

**Thematic (16):** Recession/Macro, Cybersecurity, Energy Transition, Agriculture/Food, Supply Chain/Shipping, Public Health, Elections, Trade Policy, Natural Disasters, Tech Regulation, Mining/Minerals, Banking, Infrastructure, Labor/Unrest, Terrorism, Nuclear Proliferation, Space/Satellite, Organized Crime

### Global Tension Index Components (6)

| Component | Weight | Source | Query Terms |
|-----------|--------|--------|-------------|
| Conflict | 25% | GDELT | conflict, war, attack, missile, escalation, coup, insurgency, bombing, militia, terrorism, invasion |
| Sentiment | 20% | GDELT | sanctions, tariff, recession, crisis, default, inflation, bank failure, election, protest, famine, pandemic, drought, blackout |
| Cyber | 15% | CISA KEV | Known exploited vulnerabilities (7-day window) |
| Natural | 15% | GDACS | Active tropical cyclones by alert level |
| Political | 15% | GDELT | election, coup, protest, regime change, impeachment, martial law |
| Supply Chain | 10% | GDELT | earthquake, tsunami, drought, flood, wildfire, shipping disruption, port strike, pipeline |
