import { useMemo } from "react";

import type { LucideIcon } from "lucide-react";
import { BookOpenText, LayoutDashboard, SlidersHorizontal } from "lucide-react";

import { createTranslator, type TranslationKey } from "../preferences/i18n";
import { usePreferences } from "../preferences/PreferencesProvider";
import type { RouteId } from "./PageHeader";

interface NavItem {
  id: RouteId;
  labelKey: TranslationKey;
  index: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { id: "home", labelKey: "nav.overview", index: "00", icon: LayoutDashboard },
  { id: "preferences", labelKey: "nav.preferences", index: "01", icon: SlidersHorizontal },
  { id: "notes", labelKey: "nav.notes", index: "02", icon: BookOpenText },
];

interface SidebarProps {
  current: RouteId;
  mobileOpen: boolean;
  onNavigate: (route: RouteId) => void;
  onClose: () => void;
}

export function Sidebar({ current, mobileOpen, onNavigate, onClose }: SidebarProps) {
  const { values, syncInfo } = usePreferences();
  const t = useMemo(() => createTranslator(values.language), [values.language]);

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

        <p className="nav-label">{t("nav.workspace")}</p>
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
                    <span>{t(item.labelKey)}</span>
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
            <span>{t("sidebar.localFirst")}</span>
            <span>v1.0</span>
          </div>
          <div className="sidebar-status">
            <span
              className={`sidebar-status-dot${syncInfo.peerCount > 1 ? " is-pulsing" : ""}`}
              aria-hidden="true"
            />
            <span>
              {t("nav.live")} · {syncInfo.peerCount}
            </span>
          </div>
          <p className="sidebar-signature">{t("sidebar.tagline")}</p>
        </div>
      </div>
    </aside>
  );
}
