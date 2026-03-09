/**
 * Trading handler tests — route parity, cache tiers, handler structure, and math validation.
 *
 * Inspired by upstream PR #820 (server-handlers.test.mjs) and
 * route-cache-tier.test.mjs patterns.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const readSrc = (relPath) => readFileSync(resolve(root, relPath), 'utf-8');

// ========================================================================
// 1. Route ↔ Cache Tier Parity
// ========================================================================

describe('Trading route ↔ cache tier parity', () => {
  const handlerSrc = readSrc('server/worldmonitor/trading/v1/handler.ts');
  const gatewaySrc = readSrc('server/gateway.ts');

  // Extract routes from handler.ts
  const routePattern = /path:\s*`\$\{BASE\}\/([^`]+)`/g;
  const routes = [];
  let m;
  while ((m = routePattern.exec(handlerSrc)) !== null) routes.push(m[1]);

  // Extract cache tier entries for trading
  const cachePattern = /'\/api\/trading\/v1\/([^']+)':\s*'([^']+)'/g;
  const cacheTiers = {};
  while ((m = cachePattern.exec(gatewaySrc)) !== null) cacheTiers[m[1]] = m[2];

  it('finds at least 28 trading routes in handler.ts', () => {
    assert.ok(routes.length >= 28, `Expected ≥28 routes, found ${routes.length}`);
  });

  it('every trading route has a cache tier entry in gateway.ts', () => {
    const missing = routes.filter((r) => !(r in cacheTiers));
    assert.deepStrictEqual(
      missing,
      [],
      `Missing cache tier entries:\n  ${missing.join('\n  ')}`,
    );
  });

  it('every trading cache tier key maps to a real route', () => {
    const stale = Object.keys(cacheTiers).filter((k) => !routes.includes(k));
    assert.deepStrictEqual(
      stale,
      [],
      `Stale cache tier entries (no matching route):\n  ${stale.join('\n  ')}`,
    );
  });

  it('POST (mutation) routes use no-store cache tier', () => {
    const postPattern = /method:\s*'POST',\s*path:\s*`\$\{BASE\}\/([^`]+)`/g;
    const postRoutes = [];
    let pm;
    while ((pm = postPattern.exec(handlerSrc)) !== null) postRoutes.push(pm[1]);

    const wrongTier = postRoutes.filter((r) => cacheTiers[r] && cacheTiers[r] !== 'no-store');
    assert.deepStrictEqual(
      wrongTier,
      [],
      `POST routes should use 'no-store' cache tier:\n  ${wrongTier.map((r) => `${r}: ${cacheTiers[r]}`).join('\n  ')}`,
    );
  });

  it('GET (read) routes use fast or static cache tier', () => {
    const getPattern = /method:\s*'GET',\s*path:\s*`\$\{BASE\}\/([^`]+)`/g;
    const getRoutes = [];
    let gm;
    while ((gm = getPattern.exec(handlerSrc)) !== null) getRoutes.push(gm[1]);

    const wrongTier = getRoutes.filter((r) => cacheTiers[r] && !['fast', 'static', 'medium'].includes(cacheTiers[r]));
    assert.deepStrictEqual(
      wrongTier,
      [],
      `GET routes should use 'fast', 'static', or 'medium' cache tier:\n  ${wrongTier.map((r) => `${r}: ${cacheTiers[r]}`).join('\n  ')}`,
    );
  });
});

// ========================================================================
// 2. Handler File Structure
// ========================================================================

describe('Trading handler file structure', () => {
  const handlerDir = join(root, 'server', 'worldmonitor', 'trading', 'v1');
  const files = readdirSync(handlerDir).filter((f) => f.endsWith('.ts'));

  it('has all expected handler files', () => {
    const expected = [
      'handler.ts',
      'trading-store.ts',
      'create-strategy.ts',
      'get-strategy.ts',
      'list-strategies.ts',
      'update-strategy.ts',
      'delete-strategy.ts',
      'list-templates.ts',
      'run-backtest.ts',
      'get-backtest-run.ts',
      'list-backtest-runs.ts',
      'start-forward-run.ts',
      'stop-forward-run.ts',
      'evaluate-forward-run.ts',
      'list-forward-runs.ts',
      'get-forward-run.ts',
      'submit-order.ts',
      'list-orders.ts',
      'get-portfolio.ts',
      'list-ledger.ts',
      'list-evidence.ts',
      'interpret-strategy.ts',
      'list-ai-events.ts',
      'get-ai-event.ts',
      'get-market-data.ts',
      'get-watchlist-quotes.ts',
      'get-risk-analytics.ts',
      'alerts.ts',
    ];
    const missing = expected.filter((f) => !files.includes(f));
    assert.deepStrictEqual(missing, [], `Missing handler files:\n  ${missing.join('\n  ')}`);
  });

  it('every handler file exports at least one function', () => {
    for (const file of files) {
      if (file === 'trading-store.ts' || file === 'types.ts') continue; // data/type modules
      const src = readFileSync(join(handlerDir, file), 'utf-8');
      assert.match(src, /export\s+(async\s+)?function/,
        `${file} does not export a function`);
    }
  });
});

// ========================================================================
// 3. Safety: All Yahoo Finance fetches have timeouts
// ========================================================================

describe('Trading Yahoo Finance fetch safety', () => {
  const handlerDir = join(root, 'server', 'worldmonitor', 'trading', 'v1');
  const files = readdirSync(handlerDir).filter((f) => f.endsWith('.ts'));

  for (const file of files) {
    const src = readFileSync(join(handlerDir, file), 'utf-8');
    const hasFetch = src.includes('fetch(');
    if (!hasFetch) continue;

    it(`${file}: every fetch has an AbortSignal timeout`, () => {
      // Count fetch calls and timeout signals
      const fetchCount = (src.match(/await\s+fetch\(/g) || []).length;
      const timeoutCount = (src.match(/AbortSignal\.timeout|controller\.abort/g) || []).length;
      assert.ok(
        timeoutCount >= fetchCount,
        `${file}: has ${fetchCount} fetch calls but only ${timeoutCount} timeout mechanisms`,
      );
    });
  }
});

// ========================================================================
// 4. Safety: No hardcoded API keys or secrets
// ========================================================================

describe('Trading handler security', () => {
  const handlerDir = join(root, 'server', 'worldmonitor', 'trading', 'v1');
  const files = readdirSync(handlerDir).filter((f) => f.endsWith('.ts'));

  for (const file of files) {
    const src = readFileSync(join(handlerDir, file), 'utf-8');

    it(`${file}: no hardcoded API keys or tokens`, () => {
      assert.doesNotMatch(src, /['"]sk-[a-zA-Z0-9]{20,}['"]/,
        `${file} contains what looks like a hardcoded API key`);
      assert.doesNotMatch(src, /['"]Bearer\s+[a-zA-Z0-9]{20,}['"]/,
        `${file} contains what looks like a hardcoded bearer token`);
    });
  }
});

// ========================================================================
// 5. Client ↔ Server API surface parity
// ========================================================================

describe('Trading client API parity', () => {
  const apiSrc = readSrc('trading/src/lib/api.ts');
  const handlerSrc = readSrc('server/worldmonitor/trading/v1/handler.ts');

  // Extract route names from handler
  const routePattern = /path:\s*`\$\{BASE\}\/([^`]+)`/g;
  const serverRoutes = [];
  let m;
  while ((m = routePattern.exec(handlerSrc)) !== null) serverRoutes.push(m[1]);

  // Extract RPC names called by client — pattern: rpc('GET', 'route-name') or rpc('POST', 'route-name')
  const clientCallPattern = /rpc(?:<[^>]+>)?\(\s*'(?:GET|POST)',\s*'([^']+)'/g;
  const clientCalls = new Set();
  while ((m = clientCallPattern.exec(apiSrc)) !== null) clientCalls.add(m[1]);

  it('client calls at least 15 unique RPCs', () => {
    assert.ok(clientCalls.size >= 15, `Expected ≥15 client RPC calls, found ${clientCalls.size}`);
  });

  it('every client RPC call maps to a server route', () => {
    const invalid = [...clientCalls].filter((c) => !serverRoutes.includes(c));
    assert.deepStrictEqual(
      invalid,
      [],
      `Client calls RPCs with no server route:\n  ${invalid.join('\n  ')}`,
    );
  });
});

// ========================================================================
// 6. Risk analytics math validation (pure function tests)
// ========================================================================

describe('Risk analytics math correctness', () => {
  const src = readSrc('server/worldmonitor/trading/v1/get-risk-analytics.ts');

  it('uses sample standard deviation (divides by n-1)', () => {
    assert.match(src, /arr\.length\s*-\s*1/,
      'computeStdDev should use n-1 (sample variance)');
  });

  it('handles edge case of < 2 data points for std dev', () => {
    assert.match(src, /if\s*\(\s*arr\.length\s*<\s*2\s*\)\s*return\s+0/,
      'computeStdDev should return 0 for < 2 data points');
  });

  it('handles edge case of < 5 data points for correlation', () => {
    assert.match(src, /if\s*\(\s*n\s*<\s*5\s*\)\s*return\s+0/,
      'computeCorrelation should return 0 for < 5 data points');
  });

  it('max drawdown uses cumulative return tracking (not starting from 0)', () => {
    assert.match(src, /cumReturn\s*\*=\s*\(\s*1\s*\+\s*r\s*\)/,
      'Max drawdown should use cumReturn *= (1 + r)');
    assert.match(src, /peak\s*=\s*Math\.max\s*\(\s*peak\s*,\s*cumReturn\s*\)/,
      'Max drawdown should track peak correctly');
  });

  it('initializes cumReturn and peak to 1 (not 0)', () => {
    assert.match(src, /cumReturn\s*=\s*1/,
      'cumReturn should start at 1');
    assert.match(src, /peak\s*=\s*1/,
      'peak should start at 1');
  });

  it('uses 1.645 z-score for 95% parametric VaR', () => {
    assert.match(src, /1\.645/,
      'Should use 1.645 z-score for 95% VaR');
  });

  it('uses 2.326 z-score for 99% parametric VaR', () => {
    assert.match(src, /2\.326/,
      'Should use 2.326 z-score for 99% VaR');
  });

  it('annualizes volatility with sqrt(252)', () => {
    assert.match(src, /Math\.sqrt\(\s*252\s*\)/,
      'Should annualize volatility using sqrt(252)');
  });

  it('guards against empty validLengths before Math.min', () => {
    assert.match(src, /validLengths\.length\s*>\s*0/,
      'Must guard validLengths before Math.min to avoid Infinity');
  });
});

// ========================================================================
// 7. Client page routing parity
// ========================================================================

describe('Trading client routing completeness', () => {
  const appSrc = readSrc('trading/src/App.tsx');
  const sidebarSrc = readSrc('trading/src/layout/Sidebar.tsx');

  // Extract routes from App.tsx
  const routePattern = /path="([^"]+)"/g;
  const appRoutes = new Set();
  let m;
  while ((m = routePattern.exec(appSrc)) !== null) {
    if (m[1] !== '*') appRoutes.add(m[1]);
  }

  // Extract sidebar links
  const linkPattern = /to:\s*'([^']+)'/g;
  const sidebarLinks = new Set();
  while ((m = linkPattern.exec(sidebarSrc)) !== null) sidebarLinks.add(m[1]);

  it('has at least 18 routes in App.tsx', () => {
    assert.ok(appRoutes.size >= 18, `Expected ≥18 routes, found ${appRoutes.size}`);
  });

  it('every sidebar link has a matching route', () => {
    const unrouted = [...sidebarLinks].filter((l) => !appRoutes.has(l));
    assert.deepStrictEqual(unrouted, [], `Sidebar links without routes:\n  ${unrouted.join('\n  ')}`);
  });

  it('App.tsx wraps routes in ErrorBoundary', () => {
    assert.match(appSrc, /ErrorBoundary/,
      'App.tsx should use ErrorBoundary');
  });
});

// ========================================================================
// 8. Shared utils deduplication
// ========================================================================

describe('Trading shared utils deduplication', () => {
  const pagesDir = join(root, 'trading', 'src', 'pages');
  const pages = readdirSync(pagesDir).filter((f) => f.endsWith('.tsx'));

  it('no page defines its own timeAgo function', () => {
    const violations = [];
    for (const page of pages) {
      const src = readFileSync(join(pagesDir, page), 'utf-8');
      if (src.match(/^function\s+timeAgo\b/m) || src.match(/^const\s+timeAgo\s*=/m)) {
        violations.push(page);
      }
    }
    assert.deepStrictEqual(violations, [],
      `Pages with duplicate timeAgo:\n  ${violations.join('\n  ')}\n\nImport from @/lib/utils instead.`);
  });

  it('shared utils.ts exists and exports timeAgo', () => {
    const utilsPath = join(root, 'trading', 'src', 'lib', 'utils.ts');
    assert.ok(existsSync(utilsPath), 'trading/src/lib/utils.ts does not exist');
    const src = readFileSync(utilsPath, 'utf-8');
    assert.match(src, /export\s+function\s+timeAgo/,
      'utils.ts should export timeAgo');
  });
});

// ========================================================================
// 9. ErrorBoundary component exists
// ========================================================================

describe('Trading ErrorBoundary component', () => {
  const ebPath = join(root, 'trading', 'src', 'components', 'ErrorBoundary.tsx');

  it('ErrorBoundary.tsx exists', () => {
    assert.ok(existsSync(ebPath), 'ErrorBoundary.tsx does not exist');
  });

  it('extends React.Component (class component required for error boundaries)', () => {
    const src = readFileSync(ebPath, 'utf-8');
    assert.match(src, /extends\s+Component/,
      'ErrorBoundary must be a class component');
  });

  it('implements getDerivedStateFromError', () => {
    const src = readFileSync(ebPath, 'utf-8');
    assert.match(src, /getDerivedStateFromError/,
      'ErrorBoundary must implement getDerivedStateFromError');
  });
});
