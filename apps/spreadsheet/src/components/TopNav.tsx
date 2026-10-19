import type { LucideIcon } from "lucide-react";

import { BookOpenText, Grid3X3, Sigma } from "lucide-react";

import type { RouteId } from "./PageHeader";

interface NavItem {
  id: RouteId;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { id: "workbook", label: "Workbook", icon: Grid3X3 },
  { id: "formulas", label: "Formula Atlas", icon: Sigma },
  { id: "notes", label: "Field Notes", icon: BookOpenText },
];

interface TopNavProps {
  current: RouteId;
  onNavigate: (route: RouteId) => void;
}

export function TopNav({ current, onNavigate }: TopNavProps) {
  return (
    <header className="topnav">
      <div className="topnav-inner">
        <button className="brand" type="button" onClick={() => onNavigate("workbook")}>
          Folio
          <span className="brand-divider" aria-hidden="true">
            |
          </span>
          <span className="brand-sub">Formula Studio</span>
        </button>

        <nav className="topnav-nav" aria-label="Primary navigation">
          <ul className="nav-list">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = current === item.id;
              return (
                <li key={item.id}>
                  <button
                    className={`nav-button${active ? " is-active" : ""}`}
                    type="button"
                    aria-current={active ? "page" : undefined}
                    onClick={() => onNavigate(item.id)}
                  >
                    <Icon aria-hidden="true" />
                    <span>{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
