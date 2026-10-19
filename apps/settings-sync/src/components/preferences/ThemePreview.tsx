import { Check } from "lucide-react";

import type { Theme } from "../../preferences/types";

interface ThemePreviewProps {
  theme: Theme;
  selected: boolean;
}

export function ThemePreview({ theme, selected }: ThemePreviewProps) {
  const isDark = theme === "dark";

  return (
    <div className={`theme-preview theme-preview-${theme}${selected ? " is-selected" : ""}`}>
      <div className="theme-preview-rail">
        <span />
        <span />
        <span />
      </div>
      <div className="theme-preview-body">
        <div className="theme-preview-bar" />
        <div className="theme-preview-line" />
        <div className="theme-preview-line is-short" />
        <div className="theme-preview-card">
          <span className={isDark ? "is-blue" : "is-butter"} />
        </div>
      </div>
      {selected ? (
        <span className="theme-preview-check">
          <Check aria-hidden="true" />
        </span>
      ) : null}
    </div>
  );
}
