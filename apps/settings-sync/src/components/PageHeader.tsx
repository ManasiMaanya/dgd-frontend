import type { ReactNode } from "react";

import { ArrowLeft, ArrowRight, Menu, X } from "lucide-react";

export type RouteId = "home" | "preferences" | "notes";

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

export function MobileMenuButton({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button
      className="btn btn-ghost btn-icon"
      type="button"
      aria-label={open ? "Close navigation" : "Open navigation"}
      aria-expanded={open}
      onClick={onClick}
    >
      {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
    </button>
  );
}
