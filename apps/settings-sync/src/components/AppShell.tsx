import { useEffect, useState, type ReactNode } from "react";

import { Menu, X } from "lucide-react";

import { Sidebar } from "./Sidebar";
import type { RouteId } from "./PageHeader";

interface AppShellProps {
  current: RouteId;
  onNavigate: (route: RouteId) => void;
  children: ReactNode;
}

export function AppShell({ current, onNavigate, children }: AppShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [current]);

  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <div className="app-shell">
      <Sidebar
        current={current}
        onNavigate={onNavigate}
        onClose={() => setMenuOpen(false)}
        mobileOpen={menuOpen}
      />

      <button
        className={`sidebar-scrim${menuOpen ? " is-visible" : ""}`}
        type="button"
        aria-label="Close navigation"
        tabIndex={menuOpen ? 0 : -1}
        onClick={() => setMenuOpen(false)}
      />

      <main className="app-main">
        <div className="mobile-bar">
          <button className="mobile-brand" type="button" onClick={() => onNavigate("home")}>
            Atelier
            <span>Settings</span>
          </button>
          <button
            className="btn btn-ghost btn-icon"
            type="button"
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((value) => !value)}
          >
            {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
        </div>

        <div className="app-content page-enter" key={current}>
          {children}
        </div>
      </main>
    </div>
  );
}
