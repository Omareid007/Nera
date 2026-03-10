import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ListChecks,
  PlusCircle,
  FlaskConical,
  Play,
  ArrowRightLeft,
  PieChart,
  ScrollText,
  Brain,
  Search,
  FileCheck,
  Shield,
  Settings,
  ChevronLeft,
  ChevronRight,
  Activity,
  AlertTriangle,
  Bell,
  Eye,
  GitCompare,
  Target,
  Globe,
} from 'lucide-react';

const NAV_SECTIONS = [
  {
    label: 'Core',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
      { to: '/strategies', icon: ListChecks, label: 'Strategies' },
      { to: '/create', icon: PlusCircle, label: 'Create Strategy' },
    ],
  },
  {
    label: 'Trading',
    items: [
      { to: '/backtests', icon: FlaskConical, label: 'Backtests' },
      { to: '/forward', icon: Play, label: 'Forward Runner' },
      { to: '/execution', icon: ArrowRightLeft, label: 'Execution' },
      { to: '/portfolio', icon: PieChart, label: 'Portfolio' },
      { to: '/ledger', icon: ScrollText, label: 'Ledger' },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { to: '/analytics', icon: Activity, label: 'Charts' },
      { to: '/watchlist', icon: Eye, label: 'Watchlist' },
      { to: '/risk', icon: AlertTriangle, label: 'Risk Matrix' },
      { to: '/compare', icon: GitCompare, label: 'Compare' },
      { to: '/attribution', icon: Target, label: 'Attribution' },
      { to: '/alerts', icon: Bell, label: 'Alerts' },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { to: '/geo-signals', icon: Globe, label: 'Geo Signals' },
      { to: '/ai', icon: Brain, label: 'AI Pulse' },
      { to: '/research', icon: Search, label: 'Research' },
      { to: '/evidence', icon: FileCheck, label: 'Evidence' },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/admin', icon: Shield, label: 'Admin' },
      { to: '/settings', icon: Settings, label: 'Settings' },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  return (
    <aside
      className={`flex flex-col border-r border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
        collapsed ? 'w-[56px]' : 'w-[216px]'
      } max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-40 ${
        collapsed ? 'max-md:-translate-x-full' : 'max-md:translate-x-0'
      }`}
    >
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 border-b border-[var(--color-border-subtle)] px-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--color-accent)] to-[#c4872e] text-xs font-bold text-[#0c0e12] shadow-[0_1px_6px_rgba(226,168,75,0.2)]">
          N
        </div>
        {!collapsed && (
          <span className="text-[14px] font-semibold tracking-[-0.01em] text-[var(--color-text-primary)] animate-fade-in">
            Nera
          </span>
        )}
      </div>

      {/* Nav sections */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-4">
            {!collapsed && (
              <p className="mb-1 px-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                {section.label}
              </p>
            )}
            <div className="space-y-px">
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `group flex items-center gap-2 rounded-md px-2 py-[6px] text-[12.5px] font-medium transition-colors duration-100 ${
                      isActive
                        ? 'bg-[var(--color-accent-muted)] text-[var(--color-accent)] border-l-2 border-[var(--color-accent)]'
                        : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)] border-l-2 border-transparent'
                    } ${collapsed ? 'justify-center px-0 !border-l-0' : ''}`
                  }
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon size={16} className="shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-[var(--color-border-subtle)] p-2">
        <button
          onClick={onToggle}
          className="flex w-full items-center justify-center rounded-md py-1 text-[var(--color-text-muted)] transition-colors duration-100 hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-secondary)] max-md:hidden"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>
    </aside>
  );
}
