import type { CSSProperties } from "react";

import { Moon, Sun } from "lucide-react";

import type { Translator } from "../../preferences/i18n";
import {
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  type PreferenceValues,
  type Theme,
} from "../../preferences/types";
import { Panel } from "../Panel";
import { ThemePreview } from "./ThemePreview";

interface AppearancePanelProps {
  values: PreferenceValues;
  t: Translator;
  onThemeChange: (theme: Theme) => void;
  onFontSizeChange: (size: number) => void;
}

export function AppearancePanel({
  values,
  t,
  onThemeChange,
  onFontSizeChange,
}: AppearancePanelProps) {
  const isDark = values.theme === "dark";

  const sliderStyle = {
    "--slider-progress": `${
      ((values.fontSize - FONT_SIZE_MIN) / (FONT_SIZE_MAX - FONT_SIZE_MIN)) * 100
    }%`,
  } as CSSProperties;

  return (
    <Panel>
      <div className="panel-head">
        <div>
          <h2 className="panel-title">{t("appearance.title")}</h2>
          <p className="panel-description">{t("appearance.description")}</p>
        </div>
        <span className="badge badge-success">
          <span className="mini-pulse-dot" aria-hidden="true" />
          {t("sync.saved")}
        </span>
      </div>

      <div className="setting-row">
        <div className="setting-copy">
          <h3 className="setting-title">{t("appearance.theme")}</h3>
          <p className="setting-hint">{isDark ? t("appearance.dark") : t("appearance.light")}</p>
        </div>

        <button
          className={`theme-switch${isDark ? " is-dark" : ""}`}
          type="button"
          role="switch"
          aria-checked={isDark}
          aria-label={t("appearance.theme")}
          onClick={() => onThemeChange(isDark ? "light" : "dark")}
        >
          <span className="theme-switch-icon">
            {isDark ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}
          </span>
          <span className="theme-switch-label">
            {isDark ? t("appearance.dark") : t("appearance.light")}
          </span>
          <span className="theme-switch-track" aria-hidden="true">
            <span className="theme-switch-thumb" />
          </span>
        </button>
      </div>

      <div className="theme-preview-grid" role="group" aria-label={t("appearance.theme")}>
        {(["light", "dark"] as const).map((theme) => (
          <button
            key={theme}
            className="theme-preview-button"
            type="button"
            aria-pressed={values.theme === theme}
            onClick={() => onThemeChange(theme)}
          >
            <ThemePreview theme={theme} selected={values.theme === theme} />
            <span>{theme === "dark" ? t("appearance.dark") : t("appearance.light")}</span>
          </button>
        ))}
      </div>

      <hr className="rule" />

      <div className="setting-row setting-row-slider">
        <div className="setting-copy">
          <label className="setting-title" htmlFor="font-size">
            {t("appearance.fontSize")}
          </label>
          <p className="setting-hint">{t("appearance.fontHint")}</p>
        </div>
        <span className="setting-value mono">{values.fontSize}px</span>
      </div>

      <div className="slider-wrap">
        <input
          id="font-size"
          className="font-slider"
          type="range"
          min={FONT_SIZE_MIN}
          max={FONT_SIZE_MAX}
          step={1}
          value={values.fontSize}
          style={sliderStyle}
          onChange={(event) => onFontSizeChange(Number(event.target.value))}
        />
        <div className="slider-scale mono" aria-hidden="true">
          <span>{FONT_SIZE_MIN}</span>
          <span>{FONT_SIZE_MAX}</span>
        </div>
      </div>

      <div className="font-preview">
        <p style={{ fontSize: `${values.fontSize}px` }}>{t("appearance.preview")}</p>
      </div>
    </Panel>
  );
}
