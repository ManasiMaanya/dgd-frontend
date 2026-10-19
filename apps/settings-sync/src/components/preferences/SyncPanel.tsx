import { ExternalLink, Radio, Save, Timer, Zap } from "lucide-react";

import type { Translator } from "../../preferences/i18n";
import type {
  PreferenceRecord,
  PreferenceValues,
  SyncInfo,
} from "../../preferences/types";
import { Panel } from "../Panel";

interface SyncPanelProps {
  values: PreferenceValues;
  record: PreferenceRecord;
  syncInfo: SyncInfo;
  t: Translator;
  onOpenTab: () => void;
}

export function SyncPanel({ values, record, syncInfo, t, onOpenTab }: SyncPanelProps) {
  const transportLabel =
    syncInfo.transport === "broadcast-channel"
      ? t("sync.broadcast")
      : syncInfo.transport === "storage"
        ? t("sync.storage")
        : t("sync.local");

  const latencyLabel = syncInfo.latencyMs === null ? "—" : `${syncInfo.latencyMs} ms`;

  const savedLabel = new Intl.DateTimeFormat(values.language, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(record.savedAt);

  return (
    <Panel className="sync-panel">
      <div className="panel-head">
        <div>
          <p className="panel-kicker">{t("sync.kicker")}</p>
          <h2 className="panel-title">{t("sync.title")}</h2>
        </div>
        <span className="live-pill">
          <span className="is-live" aria-hidden="true" />
          {t("nav.live")}
        </span>
      </div>
      <p className="panel-description">{t("sync.description")}</p>

      <div className="sync-hero">
        <div className="sync-count">
          <strong className="mono">{syncInfo.peerCount}</strong>
          <span>
            {syncInfo.peerCount === 1 ? t("sync.tabConnected") : t("sync.tabs")}
          </span>
        </div>
        <div className={`sync-signal${syncInfo.peerCount > 1 ? " is-connected" : ""}`}>
          <Radio aria-hidden="true" />
        </div>
      </div>

      <div className="sync-metrics">
        <div className="sync-metric">
          <span className="sync-metric-label">
            <Timer aria-hidden="true" />
            {t("sync.latency")}
          </span>
          <strong className="mono">{latencyLabel}</strong>
          <span className="sync-target">
            <Zap aria-hidden="true" />
            {t("sync.target")}
          </span>
        </div>
        <div className="sync-metric">
          <span className="sync-metric-label">
            <Save aria-hidden="true" />
            {t("sync.saved")}
          </span>
          <strong className="mono">{savedLabel}</strong>
          <span className="sync-target">{t("conflict.noFlash")}</span>
        </div>
      </div>

      <div className="sync-transport">
        <span>{t("sync.transport")}</span>
        <strong>{transportLabel}</strong>
      </div>

      <button className="btn btn-blue sync-open" type="button" onClick={onOpenTab}>
        <ExternalLink aria-hidden="true" />
        {t("common.openTab")}
      </button>
      <p className="sync-hint">{t("sync.openHint")}</p>
    </Panel>
  );
}
