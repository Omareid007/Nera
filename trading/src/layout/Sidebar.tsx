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
        collapsed ? 'w-[60px]' : 'w-[220px]'
      } max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-40 ${
        collapsed ? 'max-md:-translate-x-full' : 'max-md:translate-x-0'
      }`}
    >
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 border-b border-[var(--color-border-subtle)] px-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent)] font-bold text-[#121417] text-sm shadow-[0_0_12px_rgba(90,197,58,0.25)]">
          N
        </div>
        {!collapsed && (
          <span className="text-[15px] font-semibold tracking-tight text-[var(--color-text-primary)] animate-fade-in">
            Nera
          </span>
        )}
      </div>

      {/* Nav sections */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-3">
            {!collapsed && (
              <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `group flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13px] font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-[var(--color-accent-muted)] text-[var(--color-accent)]'
                        : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)]'
                    } ${collapsed ? 'justify-center px-0' : ''}`
                  }
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon size={17} className="shrink-0 transition-transform duration-150 group-hover:scale-110" />
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
          className="flex w-full items-center justify-center rounded-lg py-1.5 text-[var(--color-text-tertiary)] transition-all duration-150 hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)] max-md:hidden"
        >
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </div>
    </aside>
  );
}
