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
  Globe,
  ChevronLeft,
  ChevronRight,
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
    label: 'Intelligence',
    items: [
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
      className={`flex flex-col border-r border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] transition-all duration-200 ${
        collapsed ? 'w-16' : 'w-56'
      } max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-40 ${
        collapsed ? 'max-md:-translate-x-full' : 'max-md:translate-x-0'
      }`}
    >
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 border-b border-[var(--color-border-subtle)] px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-accent)] text-sm font-bold text-[var(--color-surface-0)]">
          N
        </div>
        {!collapsed && (
          <span className="text-sm font-semibold tracking-wide text-[var(--color-text-primary)]">
            Nera Trading
          </span>
        )}
      </div>

      {/* Nav sections */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-4">
            {!collapsed && (
              <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">
                {section.label}
              </p>
            )}
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                    isActive
                      ? 'bg-[var(--color-accent-muted)] text-[var(--color-accent)]'
                      : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)]'
                  } ${collapsed ? 'justify-center' : ''}`
                }
                title={collapsed ? item.label : undefined}
              >
                <item.icon size={18} className="shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* World Monitor link + collapse toggle */}
      <div className="border-t border-[var(--color-border-subtle)] p-2">
        <a
          href="/"
          className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)]"
          title="World Monitor"
        >
          <Globe size={18} className="shrink-0" />
          {!collapsed && <span>World Monitor</span>}
        </a>
        <button
          onClick={onToggle}
          className="mt-1 flex w-full items-center justify-center rounded-lg py-1.5 text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)] max-md:hidden"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </aside>
  );
}
