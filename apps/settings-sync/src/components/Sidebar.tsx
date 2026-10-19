import type { LucideIcon } from "lucide-react";

import { BookOpenText, LayoutDashboard, SlidersHorizontal } from "lucide-react";

import type { RouteId } from "./PageHeader";

interface NavItem {
  id: RouteId;
  label: string;
  index: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { id: "home", label: "Overview", index: "00", icon: LayoutDashboard },
  { id: "preferences", label: "Preferences", index: "01", icon: SlidersHorizontal },
  { id: "notes", label: "Field Notes", index: "02", icon: BookOpenText },
];

interface SidebarProps {
  current: RouteId;
  mobileOpen: boolean;
  onNavigate: (route: RouteId) => void;
  onClose: () => void;
}

export function Sidebar({ current, mobileOpen, onNavigate, onClose }: SidebarProps) {
  return (
    <aside
      className={`sidebar${mobileOpen ? " is-open" : ""}`}
      aria-label="Primary navigation"
    >
      <div className="sidebar-inner">
        <button className="brand" type="button" onClick={() => onNavigate("home")}>
          Atelier
          <span className="brand-divider" aria-hidden="true">
            |
          </span>
          <span className="brand-sub">Settings</span>
        </button>

        <p className="nav-label">Workspace</p>
        <nav>
          <ul className="nav-list">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <button
                    className={`nav-button${current === item.id ? " is-active" : ""}`}
                    type="button"
                    aria-current={current === item.id ? "page" : undefined}
                    onClick={() => {
                      onNavigate(item.id);
                      onClose();
                    }}
                  >
                    <Icon aria-hidden="true" />
                    <span>{item.label}</span>
                    <span className="nav-index">{item.index}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="sidebar-foot">
          <div className="sidebar-rule" />
          <div className="sidebar-meta">
            <span>Local first</span>
            <span>v1.0</span>
          </div>
          <div className="sidebar-status">
            <span className="sidebar-status-dot" aria-hidden="true" />
            <span>BroadcastChannel</span>
          </div>
          <p className="sidebar-signature">Preferences that follow you.</p>
        </div>
      </div>
    </aside>
  );
}
