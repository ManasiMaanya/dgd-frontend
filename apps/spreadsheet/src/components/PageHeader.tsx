import type { ReactNode } from "react";

export type RouteId = "workbook" | "formulas" | "notes";

export interface PageHeaderProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  actions?: ReactNode;
}

export function PageHeader({ eyebrow, title, subtitle, actions }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className="page-header-copy">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="page-title">{title}</h1>
        <p className="page-subtitle">{subtitle}</p>
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </header>
  );
}
