import { useMemo } from "react";

import type { LucideIcon } from "lucide-react";
import { BookOpenText, LayoutDashboard, SlidersHorizontal } from "lucide-react";

import { createTranslator, type TranslationKey } from "../preferences/i18n";
import { usePreferences } from "../preferences/PreferencesContext";
import type { RouteId } from "./PageHeader";

interface NavItem {
  id: RouteId;
  labelKey: TranslationKey;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { id: "home", labelKey: "nav.overview", icon: LayoutDashboard },
  { id: "preferences", labelKey: "nav.preferences", icon: SlidersHorizontal },
  { id: "notes", labelKey: "nav.notes", icon: BookOpenText },
];

interface TopNavProps {
  current: RouteId;
  onNavigate: (route: RouteId) => void;
}

export function TopNav({ current, onNavigate }: TopNavProps) {
  const { values } = usePreferences();
  const t = useMemo(() => createTranslator(values.language), [values.language]);

  return (
    <header className="topnav">
      <div className="topnav-inner">
        <button className="brand" type="button" onClick={() => onNavigate("home")}>
          Atelier
          <span className="brand-divider" aria-hidden="true">
            |
          </span>
          <span className="brand-sub">Settings</span>
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
                    <span>{t(item.labelKey)}</span>
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
