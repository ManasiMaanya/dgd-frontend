import type { ReactNode } from "react";

import type { RouteId } from "./PageHeader";
import { TopNav } from "./TopNav";

interface AppShellProps {
  current: RouteId;
  onNavigate: (route: RouteId) => void;
  children: ReactNode;
}

export function AppShell({ current, onNavigate, children }: AppShellProps) {
  return (
    <div className="app-shell">
      <TopNav current={current} onNavigate={onNavigate} />

      <main className="app-main">
        <div className="app-content page-enter" key={current}>
          {children}
        </div>
      </main>
    </div>
  );
}
