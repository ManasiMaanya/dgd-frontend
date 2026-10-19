import { useMemo } from "react";

import { ExternalLink, RotateCcw } from "lucide-react";

import { PageHeader } from "../components/PageHeader";
import { AppearancePanel } from "../components/preferences/AppearancePanel";
import { ConflictPanel } from "../components/preferences/ConflictPanel";
import { LanguagePanel } from "../components/preferences/LanguagePanel";
import { SyncLab } from "../components/preferences/SyncLab";
import { SyncPanel } from "../components/preferences/SyncPanel";
import { createTranslator } from "../preferences/i18n";
import { usePreferences } from "../preferences/PreferencesContext";

export function PreferencesPage() {
  const { values, record, syncInfo, setTheme, setLanguage, setFontSize, reset } =
    usePreferences();
  const t = useMemo(() => createTranslator(values.language), [values.language]);

  const openNewTab = () => {
    const url = `${window.location.origin}${window.location.pathname}#/preferences`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const lastSyncText =
    syncInfo.lastSyncAt === null
      ? t("sync.never")
      : new Intl.DateTimeFormat(values.language, {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }).format(syncInfo.lastSyncAt);

  return (
    <>
      <PageHeader
        eyebrow={t("prefs.eyebrow")}
        title={t("prefs.title")}
        subtitle={t("prefs.subtitle")}
        actions={
          <>
            <button className="btn" type="button" onClick={reset}>
              <RotateCcw aria-hidden="true" />
              {t("common.reset")}
            </button>
            <button className="btn btn-primary" type="button" onClick={openNewTab}>
              <ExternalLink aria-hidden="true" />
              {t("common.openTab")}
            </button>
          </>
        }
      />

      <div className="settings-grid">
        <AppearancePanel
          values={values}
          t={t}
          onThemeChange={setTheme}
          onFontSizeChange={setFontSize}
        />

        <div className="settings-side">
          <LanguagePanel values={values} t={t} onChange={setLanguage} />
          <SyncPanel
            values={values}
            record={record}
            syncInfo={syncInfo}
            t={t}
            onOpenTab={openNewTab}
          />
        </div>
      </div>

      <SyncLab values={values} record={record} syncInfo={syncInfo} t={t} />
      <ConflictPanel values={values} record={record} syncInfo={syncInfo} t={t} />

      <p className="sr-only" aria-live="polite">
        {syncInfo.peerCount}{" "}
        {syncInfo.peerCount === 1 ? t("sync.tabConnected") : t("sync.tabs")}.{" "}
        {t("sync.lastSync")}: {lastSyncText}.
      </p>
    </>
  );
}
