import type { Translator } from "../../preferences/i18n";
import {
  LANGUAGES,
  type PreferenceRecord,
  type PreferenceValues,
  type SyncInfo,
} from "../../preferences/types";
import { Panel } from "../Panel";
import { formatActor, formatClock } from "./format";

interface ConflictPanelProps {
  values: PreferenceValues;
  record: PreferenceRecord;
  syncInfo: SyncInfo;
  t: Translator;
}

export function ConflictPanel({ values, record, syncInfo, t }: ConflictPanelProps) {
  const activeLanguage =
    LANGUAGES.find((language) => language.code === values.language) ?? LANGUAGES[0];

  return (
    <Panel className="conflict-panel">
      <div className="panel-head">
        <div>
          <p className="panel-kicker">{t("conflict.kicker")}</p>
          <h2 className="panel-title">{t("conflict.title")}</h2>
          <p className="panel-description">{t("conflict.description")}</p>
        </div>
        <div className="conflict-badges">
          <span className="badge badge-blue">{t("sync.conflictValue")}</span>
          <span className="badge badge-success">{t("conflict.noFlash")}</span>
        </div>
      </div>

      <div className="stamp-table" role="table" aria-label={t("conflict.title")}>
        <div className="stamp-row stamp-head" role="row">
          <span role="columnheader">{t("conflict.field")}</span>
          <span role="columnheader">{t("conflict.value")}</span>
          <span role="columnheader">{t("conflict.stamp")}</span>
          <span role="columnheader">{t("conflict.localStamp")}</span>
        </div>
        <div className="stamp-row" role="row">
          <span role="cell">{t("conflict.theme")}</span>
          <span role="cell" data-label={t("conflict.value")}>
            <span className="badge badge-blue">
              {values.theme === "dark" ? t("appearance.dark") : t("appearance.light")}
            </span>
          </span>
          <span role="cell" className="mono" data-label={t("conflict.stamp")}>
            {formatClock(record.stamps.theme.clock, record.stamps.theme.actor)}
          </span>
          <span role="cell" className="mono" data-label={t("conflict.localStamp")}>
            {formatActor(syncInfo.actor)}
          </span>
        </div>
        <div className="stamp-row" role="row">
          <span role="cell">{t("conflict.language")}</span>
          <span role="cell" data-label={t("conflict.value")}>
            <span className="badge">{activeLanguage.nativeLabel}</span>
          </span>
          <span role="cell" className="mono" data-label={t("conflict.stamp")}>
            {formatClock(record.stamps.language.clock, record.stamps.language.actor)}
          </span>
          <span role="cell" className="mono" data-label={t("conflict.localStamp")}>
            {formatActor(syncInfo.actor)}
          </span>
        </div>
        <div className="stamp-row" role="row">
          <span role="cell">{t("conflict.font")}</span>
          <span role="cell" data-label={t("conflict.value")}>
            <span className="badge">{values.fontSize}px</span>
          </span>
          <span role="cell" className="mono" data-label={t("conflict.stamp")}>
            {formatClock(record.stamps.fontSize.clock, record.stamps.fontSize.actor)}
          </span>
          <span role="cell" className="mono" data-label={t("conflict.localStamp")}>
            {formatActor(syncInfo.actor)}
          </span>
        </div>
      </div>
    </Panel>
  );
}
