import type { ReactNode } from "react";

import { ArrowLeft, ArrowRight } from "lucide-react";

export type RouteId = "home" | "preferences" | "notes";

export interface PageHeaderProps {
  title: string;
  subtitle: string;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className="page-header-copy">
        <h1 className="page-title">{title}</h1>
        <p className="page-subtitle">{subtitle}</p>
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </header>
  );
}

export interface BackLinkProps {
  label: string;
  onClick: () => void;
}

export function BackLink({ label, onClick }: BackLinkProps) {
  return (
    <button className="btn btn-ghost btn-small" type="button" onClick={onClick}>
      <ArrowLeft aria-hidden="true" />
      {label}
    </button>
  );
}

export function ForwardLabel({ children }: { children: ReactNode }) {
  return (
    <span className="task-link">
      {children}
      <ArrowRight aria-hidden="true" />
    </span>
  );
}
