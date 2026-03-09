import { useState, useEffect } from 'react';
import { ArrowRightLeft, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { listOrders, submitOrder, type OrderEntry } from '@/lib/api';
import { timeAgo } from '@/lib/utils';

export function ExecutionPage() {
  const [orders, setOrders] = useState<OrderEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [symbol, setSymbol] = useState('');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [quantity, setQuantity] = useState('10');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [limitPrice, setLimitPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    try { const res = await listOrders(); setOrders(res.orders); } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load orders'); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async () => {
    if (!symbol.trim()) return;
    setSubmitting(true); setError(''); setMessage('');
    try {
      const data: Parameters<typeof submitOrder>[0] = { symbol: symbol.toUpperCase(), side, quantity: Number(quantity), type: orderType };
      if (orderType === 'limit' && limitPrice) data.limitPrice = Number(limitPrice);
      const res = await submitOrder(data);
      if (res.message) setMessage(res.message);
      setSymbol(''); setLimitPrice(''); await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Order failed'); } finally { setSubmitting(false); }
  };

  const tabs = ['All', 'Orders', 'Fills'];
  const filtered = tab === 0 ? orders : orders.filter((o) => tab === 1 ? o.type === 'order' : o.type === 'fill');

  return (
    <div>
      <PageHeader title="Execution Center" description="Paper order submission, fills, and execution history"
        actions={<StatusBadge status="paper" label="PAPER MODE" />} />

      <div className="mb-6 rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Quick Order (Paper)</h3>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">Symbol</label>
            <input value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="AAPL"
              className="w-28 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-text-primary)]" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">Side</label>
            <select value={side} onChange={(e) => setSide(e.target.value as 'buy' | 'sell')}
              className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-text-primary)]">
              <option value="buy">Buy</option><option value="sell">Sell</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">Quantity</label>
            <input value={quantity} onChange={(e) => setQuantity(e.target.value)} type="number" min="1"
              className="w-24 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-text-primary)]" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">Type</label>
            <select value={orderType} onChange={(e) => setOrderType(e.target.value as 'market' | 'limit')}
              className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-text-primary)]">
              <option value="market">Market</option><option value="limit">Limit</option>
            </select>
          </div>
          {orderType === 'limit' && (
            <div>
              <label className="mb-1 block text-xs text-[var(--color-text-secondary)]">Limit Price</label>
              <input value={limitPrice} onChange={(e) => setLimitPrice(e.target.value)} type="number" min="0.01" step="0.01"
                placeholder="$0.00"
                className="w-28 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-text-primary)]" />
            </div>
          )}
          <button onClick={handleSubmit} disabled={submitting || !symbol.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-surface-0)] disabled:opacity-50">
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <ArrowRightLeft size={14} />}
            {submitting ? 'Submitting...' : 'Submit Order'}
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-[var(--color-loss)]">{error}</p>}
        {message && <p className="mt-2 text-xs text-[var(--color-info)]">{message}</p>}
      </div>

      <div className="mb-4 flex gap-1 rounded-lg bg-[var(--color-surface-1)] p-1">
        {tabs.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            className={`rounded-md px-4 py-2 text-xs font-medium transition-colors ${
              i === tab ? 'bg-[var(--color-surface-3)] text-[var(--color-text-primary)]' : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'
            }`}>
            {t} ({(i === 0 ? orders : orders.filter((o) => i === 1 ? o.type === 'order' : o.type === 'fill')).length})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[var(--color-text-muted)]" size={20} /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <ArrowRightLeft size={28} className="mb-3 text-[var(--color-text-muted)]" />
            <p className="text-sm text-[var(--color-text-secondary)]">No execution activity. Submit a paper order above or use the Forward Runner.</p>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--color-border-subtle)]">
          <table className="w-full text-xs">
            <thead className="bg-[var(--color-surface-2)]">
              <tr className="text-left text-[var(--color-text-tertiary)]">
                <th className="px-4 py-2.5 font-medium">Time</th>
                <th className="px-4 py-2.5 font-medium">Type</th>
                <th className="px-4 py-2.5 font-medium">Symbol</th>
                <th className="px-4 py-2.5 font-medium">Side</th>
                <th className="px-4 py-2.5 font-medium text-right">Qty</th>
                <th className="px-4 py-2.5 font-medium text-right">Price</th>
                <th className="px-4 py-2.5 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-subtle)] bg-[var(--color-surface-1)]">
              {filtered.map((entry) => (
                <tr key={entry.id} className="hover:bg-[var(--color-surface-2)]">
                  <td className="px-4 py-2.5 text-[var(--color-text-muted)]">{timeAgo(entry.timestamp)}</td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                      entry.type === 'fill' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'
                    }`}>{entry.type}</span>
                  </td>
                  <td className="px-4 py-2.5 font-medium text-[var(--color-text-primary)]">{entry.symbol ?? '-'}</td>
                  <td className="px-4 py-2.5"><span className={entry.side === 'buy' ? 'text-[var(--color-profit)]' : 'text-[var(--color-loss)]'}>{entry.side?.toUpperCase() ?? '-'}</span></td>
                  <td className="px-4 py-2.5 text-right text-[var(--color-text-secondary)]">{entry.quantity ?? '-'}</td>
                  <td className="px-4 py-2.5 text-right text-[var(--color-text-secondary)]">{entry.price ? `$${entry.price.toFixed(2)}` : '-'}</td>
                  <td className={`px-4 py-2.5 text-right font-medium ${entry.amount < 0 ? 'text-[var(--color-loss)]' : 'text-[var(--color-profit)]'}`}>
                    ${Math.abs(entry.amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
