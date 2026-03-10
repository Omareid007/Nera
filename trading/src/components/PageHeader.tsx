import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4 animate-fade-in">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-[var(--color-text-primary)]">{title}</h1>
        {description && (
          <p className="mt-0.5 text-[13px] text-[var(--color-text-secondary)]">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
