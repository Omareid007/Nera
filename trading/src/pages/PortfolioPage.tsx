import { useState, useEffect, useCallback } from 'react';
import { Loader2, TrendingUp, TrendingDown, ShieldAlert, BarChart3, RefreshCw, Plus, Minus } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { MetricCard } from '@/components/MetricCard';
import { StatusBadge } from '@/components/StatusBadge';
import { getPortfolio, refreshPortfolio, depositFunds, withdrawFunds, type PortfolioSnapshot, type Position } from '@/lib/api';

function fmt(n: number): string {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function AllocationBar({ positions, totalEquity }: { positions: Position[]; totalEquity: number }) {
  if (positions.length === 0) return null;
  const colors = ['bg-blue-500', 'bg-teal-500', 'bg-amber-500', 'bg-purple-500', 'bg-rose-500', 'bg-teal-500', 'bg-orange-500', 'bg-indigo-500'];
  return (
    <div>
      <div className="flex h-4 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
        {positions.map((pos, i) => {
          const pct = totalEquity > 0 ? (pos.marketValue / totalEquity) * 100 : 0;
          return <div key={pos.symbol} className={`${colors[i % colors.length]}`} style={{ width: `${pct}%` }} />;
        })}
      </div>
      <div className="mt-2 flex flex-wrap gap-3">
        {positions.map((pos, i) => (
          <div key={pos.symbol} className="flex items-center gap-1.5 text-xs">
            <div className={`h-2.5 w-2.5 rounded-full ${colors[i % colors.length]}`} />
            <span className="text-[var(--color-text-secondary)]">{pos.symbol}</span>
            <span className="text-[var(--color-text-muted)]">{totalEquity > 0 ? ((pos.marketValue / totalEquity) * 100).toFixed(1) : '0'}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RiskRow({ label, value, color }: { label: string; value: string; color: 'profit' | 'loss' | 'warning' | 'neutral' }) {
  const cls = { profit: 'text-[var(--color-profit)]', loss: 'text-[var(--color-loss)]', warning: 'text-amber-400', neutral: 'text-[var(--color-text-secondary)]' };
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-[var(--color-text-tertiary)]">{label}</span>
      <span className={`font-medium ${cls[color]}`}>{value}</span>
    </div>
  );
}

function RiskDecomposition({ portfolio }: { portfolio: PortfolioSnapshot }) {
  const grossExposure = portfolio.longExposure + portfolio.shortExposure;
  const leverage = portfolio.totalEquity > 0 ? grossExposure / portfolio.totalEquity : 0;
  const concentrationRisk = portfolio.positions.length > 0
    ? Math.max(...portfolio.positions.map((p) => (p.marketValue / portfolio.totalEquity) * 100)) : 0;
  const cashPct = portfolio.totalEquity > 0 ? (portfolio.cash / portfolio.totalEquity) * 100 : 100;

  return (
    <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-5">
      <h3 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
        <ShieldAlert size={14} /> Risk Decomposition
      </h3>
      <div className="space-y-3">
        <RiskRow label="Leverage" value={`${leverage.toFixed(2)}x`} color={leverage > 1.5 ? 'loss' : leverage > 1 ? 'warning' : 'profit'} />
        <RiskRow label="Long Exposure" value={fmt(portfolio.longExposure)} color="neutral" />
        <RiskRow label="Short Exposure" value={fmt(portfolio.shortExposure)} color="neutral" />
        <RiskRow label="Net Exposure" value={fmt(portfolio.netExposure)} color={portfolio.netExposure > portfolio.totalEquity * 0.8 ? 'warning' : 'neutral'} />
        <RiskRow label="Cash %" value={`${cashPct.toFixed(1)}%`} color={cashPct < 10 ? 'loss' : 'profit'} />
        <RiskRow label="Concentration (max)" value={`${concentrationRisk.toFixed(1)}%`} color={concentrationRisk > 30 ? 'loss' : concentrationRisk > 20 ? 'warning' : 'profit'} />
        <RiskRow label="Position Count" value={String(portfolio.positionCount)} color="neutral" />
      </div>
    </div>
  );
}

export function PortfolioPage() {
  const [portfolio, setPortfolio] = useState<PortfolioSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [fundAmount, setFundAmount] = useState('');
  const [fundAction, setFundAction] = useState<'deposit' | 'withdraw'>('deposit');
  const [fundLoading, setFundLoading] = useState(false);
  const [fundMsg, setFundMsg] = useState('');

  const load = useCallback(() => {
    getPortfolio()
      .then((r) => setPortfolio(r.portfolio))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load portfolio'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const r = await refreshPortfolio();
      setPortfolio(r.portfolio);
      setFundMsg(r.pricesUpdated ? `${r.pricesUpdated} position prices updated` : 'Portfolio up to date');
      setTimeout(() => setFundMsg(''), 3000);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to refresh'); }
    finally { setRefreshing(false); }
  };

  const handleFund = async () => {
    const amt = Number(fundAmount);
    if (!amt || amt <= 0) return;
    setFundLoading(true); setFundMsg('');
    try {
      const r = fundAction === 'deposit' ? await depositFunds(amt) : await withdrawFunds(amt);
      setPortfolio(r.portfolio);
      setFundAmount('');
      setFundMsg(`${fundAction === 'deposit' ? 'Deposited' : 'Withdrawn'} $${amt.toLocaleString()}`);
      setTimeout(() => setFundMsg(''), 3000);
    } catch (e) { setFundMsg(e instanceof Error ? e.message : 'Failed'); }
    finally { setFundLoading(false); }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[var(--color-text-muted)]" size={24} /></div>;

  if (error) return (
    <div>
      <PageHeader title="Portfolio" description="Positions, exposure, risk decomposition, and P&L tracking" />
      <div className="rounded-lg border border-[var(--color-loss)]/30 bg-[var(--color-loss)]/5 p-6 text-center">
        <p className="text-sm text-[var(--color-loss)]">{error}</p>
      </div>
    </div>
  );

  if (!portfolio) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[var(--color-text-muted)]" size={24} /></div>;

  return (
    <div>
      <PageHeader title="Portfolio" description="Positions, exposure, risk decomposition, and P&L tracking"
        actions={
          <div className="flex items-center gap-2">
            <button onClick={handleRefresh} disabled={refreshing}
              className="flex items-center gap-1.5 rounded-lg bg-[var(--color-surface-2)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-3)] disabled:opacity-50">
              {refreshing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Refresh Prices
            </button>
            <StatusBadge status="paper" label="PAPER ACCOUNT" />
          </div>
        } />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <MetricCard label="Total Equity" value={fmt(portfolio.totalEquity)} />
        <MetricCard label="Cash" value={fmt(portfolio.cash)} />
        <MetricCard label="Positions" value={String(portfolio.positionCount)} />
        <MetricCard label="Unrealized P&L" value={fmt(portfolio.unrealizedPnl)} changeType={portfolio.unrealizedPnl >= 0 ? 'profit' : 'loss'} />
        <MetricCard label="Realized P&L" value={fmt(portfolio.realizedPnl)} changeType={portfolio.realizedPnl >= 0 ? 'profit' : 'loss'} />
      </div>

      {/* Fund management */}
      <div className="mt-4 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">Action</label>
            <select value={fundAction} onChange={(e) => setFundAction(e.target.value as 'deposit' | 'withdraw')}
              className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-text-primary)]">
              <option value="deposit">Deposit</option><option value="withdraw">Withdraw</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">Amount ($)</label>
            <input type="number" value={fundAmount} onChange={(e) => setFundAmount(e.target.value)} min="1" step="1000" placeholder="10000"
              className="w-32 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-text-primary)]" />
          </div>
          <button onClick={handleFund} disabled={fundLoading || !fundAmount}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-surface-0)] disabled:opacity-50">
            {fundLoading ? <Loader2 size={14} className="animate-spin" /> : fundAction === 'deposit' ? <Plus size={14} /> : <Minus size={14} />}
            {fundAction === 'deposit' ? 'Deposit' : 'Withdraw'}
          </button>
          {fundMsg && <span className="text-xs text-[var(--color-text-secondary)]">{fundMsg}</span>}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--color-text-tertiary)]"><BarChart3 size={14} /> Open Positions</h2>
          {portfolio.positions.length === 0 ? (
            <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-8">
              <p className="text-center text-sm text-[var(--color-text-muted)]">No open positions. Execute paper trades to build your portfolio.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-[var(--color-border-subtle)]">
              <table className="w-full text-xs">
                <thead className="bg-[var(--color-surface-2)]">
                  <tr className="text-left text-[var(--color-text-tertiary)]">
                    <th className="px-4 py-2.5 font-medium">Symbol</th>
                    <th className="px-4 py-2.5 font-medium">Side</th>
                    <th className="px-4 py-2.5 font-medium text-right">Qty</th>
                    <th className="px-4 py-2.5 font-medium text-right">Avg Entry</th>
                    <th className="px-4 py-2.5 font-medium text-right">Current</th>
                    <th className="px-4 py-2.5 font-medium text-right">Mkt Value</th>
                    <th className="px-4 py-2.5 font-medium text-right">P&L</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-subtle)] bg-[var(--color-surface-1)]">
                  {portfolio.positions.map((pos) => (
                    <tr key={pos.symbol} className="hover:bg-[var(--color-surface-2)]">
                      <td className="px-4 py-2.5 font-medium text-[var(--color-text-primary)]">{pos.symbol}</td>
                      <td className="px-4 py-2.5">
                        <span className="flex items-center gap-1">
                          {pos.side === 'long' ? <TrendingUp size={12} className="text-[var(--color-profit)]" /> : <TrendingDown size={12} className="text-[var(--color-loss)]" />}
                          <span className={pos.side === 'long' ? 'text-[var(--color-profit)]' : 'text-[var(--color-loss)]'}>{pos.side.toUpperCase()}</span>
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right text-[var(--color-text-secondary)]">{pos.quantity}</td>
                      <td className="px-4 py-2.5 text-right text-[var(--color-text-secondary)]">${pos.avgEntryPrice.toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-right text-[var(--color-text-secondary)]">${pos.currentPrice.toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-right text-[var(--color-text-secondary)]">{fmt(pos.marketValue)}</td>
                      <td className={`px-4 py-2.5 text-right font-medium ${pos.unrealizedPnl >= 0 ? 'text-[var(--color-profit)]' : 'text-[var(--color-loss)]'}`}>
                        {pos.unrealizedPnl >= 0 ? '+' : ''}{fmt(pos.unrealizedPnl)}
                        <span className="ml-1 text-[10px]">({pos.unrealizedPnlPct >= 0 ? '+' : ''}{pos.unrealizedPnlPct.toFixed(2)}%)</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {portfolio.positions.length > 0 && (
            <div className="mt-6">
              <h2 className="mb-3 text-sm font-semibold text-[var(--color-text-tertiary)]">Allocation</h2>
              <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-5">
                <AllocationBar positions={portfolio.positions} totalEquity={portfolio.totalEquity} />
              </div>
            </div>
          )}
        </div>
        <div><RiskDecomposition portfolio={portfolio} /></div>
      </div>
    </div>
  );
}
