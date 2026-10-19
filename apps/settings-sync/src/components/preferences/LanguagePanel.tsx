import { ChevronDown, Globe2, Languages } from "lucide-react";

import type { Translator } from "../../preferences/i18n";
import {
  LANGUAGES,
  type LanguageCode,
  type PreferenceValues,
} from "../../preferences/types";
import { Panel } from "../Panel";

interface LanguagePanelProps {
  values: PreferenceValues;
  t: Translator;
  onChange: (language: LanguageCode) => void;
}

export function LanguagePanel({ values, t, onChange }: LanguagePanelProps) {
  const activeLanguage =
    LANGUAGES.find((language) => language.code === values.language) ?? LANGUAGES[0];

  return (
    <Panel className="language-panel">
      <div className="panel-head">
        <div>
          <p className="panel-kicker">{t("language.kicker")}</p>
          <h2 className="panel-title">{t("language.title")}</h2>
        </div>
        <Globe2 className="panel-corner-icon" aria-hidden="true" />
      </div>
      <p className="panel-description">{t("language.description")}</p>

      <div className="field language-field">
        <label className="field-label" htmlFor="language-select">
          {t("language.label")}
        </label>
        <div className="select-wrap">
          <select
            id="language-select"
            className="select-input language-select"
            value={values.language}
            onChange={(event) => onChange(event.target.value as LanguageCode)}
          >
            {LANGUAGES.map((language) => (
              <option key={language.code} value={language.code}>
                {language.nativeLabel} — {language.label}
              </option>
            ))}
          </select>
          <ChevronDown aria-hidden="true" />
        </div>
      </div>

      <div className="language-current">
        <span className="language-monogram" aria-hidden="true">
          {activeLanguage.code.toUpperCase()}
        </span>
        <div>
          <strong>{activeLanguage.nativeLabel}</strong>
          <span>{t("language.hint")}</span>
        </div>
        <Languages className="language-current-icon" aria-hidden="true" />
      </div>

      <div className="language-dots" aria-hidden="true">
        {LANGUAGES.map((language) => (
          <span
            key={language.code}
            className={language.code === values.language ? "is-active" : ""}
            title={language.nativeLabel}
          >
            {language.code}
          </span>
        ))}
      </div>
    </Panel>
  );
}
