import { useEffect, useState } from "react";

import { Globe2, Moon, Sun } from "lucide-react";

import type { Translator } from "../../preferences/i18n";
import {
  LANGUAGES,
  type PreferenceRecord,
  type PreferenceValues,
  type SyncInfo,
} from "../../preferences/types";
import { Panel } from "../Panel";
import { formatClock } from "./format";

interface SyncLabProps {
  values: PreferenceValues;
  record: PreferenceRecord;
  syncInfo: SyncInfo;
  t: Translator;
}

export function SyncLab({ values, record, syncInfo, t }: SyncLabProps) {
  const [now, setNow] = useState(() => Date.now());
  const activeLanguage =
    LANGUAGES.find((language) => language.code === values.language) ?? LANGUAGES[0];

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const lastSyncLabel = (() => {
    if (syncInfo.lastSyncAt === null) return t("sync.never");
    const seconds = Math.max(0, Math.round((now - syncInfo.lastSyncAt) / 1000));
    if (seconds < 2) return t("sync.now");
    return `${seconds}${t("common.seconds")}`;
  })();

  return (
    <Panel className="sync-lab">
      <div className="panel-head">
        <div>
          <p className="panel-kicker">{t("sync.labKicker")}</p>
          <h2 className="panel-title">{t("sync.labTitle")}</h2>
          <p className="panel-description">{t("sync.labDescription")}</p>
        </div>
        <div className="lab-status">
          <span className="status-line">
            <span className={`dot${syncInfo.peerCount > 1 ? " is-pulsing" : ""}`} />
            {syncInfo.peerCount > 1 ? t("sync.now") : t("sync.listening")}
          </span>
          <span className="badge badge-butter mono">
            {t("sync.clock")} · {record.clock}
          </span>
        </div>
      </div>

      <div className="tab-stage">
        {[0, 1, 2].map((index) => {
          const active = index < Math.min(syncInfo.peerCount, 3);
          return (
            <div className={`tab-preview${active ? " is-active" : " is-ghost"}`} key={index}>
              <div className="tab-preview-chrome">
                <span />
                <span />
                <span />
                <small>
                  {index === 0 ? t("sync.thisTab") : `${t("sync.otherTab")} ${index + 1}`}
                </small>
              </div>
              <div className="tab-preview-body">
                <div className="tab-preview-row">
                  <span className="tab-preview-status">
                    {values.theme === "dark" ? (
                      <Moon aria-hidden="true" />
                    ) : (
                      <Sun aria-hidden="true" />
                    )}
                    {values.theme === "dark" ? t("appearance.dark") : t("appearance.light")}
                  </span>
                  <span className="tab-preview-value mono">{values.fontSize}px</span>
                </div>
                <div className="tab-preview-row">
                  <span className="tab-preview-status">
                    <Globe2 aria-hidden="true" />
                    {activeLanguage.nativeLabel}
                  </span>
                  <span className="tab-preview-value mono">
                    {values.language.toUpperCase()}
                  </span>
                </div>
                <div className="tab-preview-line" />
                <div className="tab-preview-line is-short" />
              </div>
              <div className="tab-preview-foot">
                <span className="tab-sync-dot" aria-hidden="true" />
                {active ? t("sync.listening") : t("sync.never")}
              </div>
            </div>
          );
        })}
      </div>

      <div className="sync-rail" aria-hidden="true">
        <span className="sync-rail-node is-start" />
        <span className="sync-rail-line" />
        <span className="sync-rail-node is-middle" />
        <span className="sync-rail-line" />
        <span className="sync-rail-node is-end" />
      </div>

      <div className="lab-foot">
        <span>
          {t("sync.lastSync")}: <strong>{lastSyncLabel}</strong>
        </span>
        <span className="mono">
          {t("sync.conflict")}: {t("sync.conflictValue")}
        </span>
        <span className="mono">
          {formatClock(record.stamps.theme.clock, record.stamps.theme.actor)}
        </span>
      </div>
    </Panel>
  );
}
