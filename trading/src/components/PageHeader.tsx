import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4 animate-fade-in">
      <div>
        <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-[var(--color-text-primary)]">{title}</h1>
        {description && (
          <p className="mt-0.5 text-[12px] text-[var(--color-text-tertiary)]">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
