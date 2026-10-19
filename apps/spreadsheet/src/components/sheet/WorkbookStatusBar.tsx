import { formatRange } from "../../spreadsheet/coordinates";
import type { SheetState } from "../../spreadsheet/useSheetState";
import type { Workbook } from "../../spreadsheet/workbook";

interface WorkbookStatusBarProps {
  workbook: Workbook;
  state: SheetState;
}

function formatStat(value: number | null): string {
  if (value === null) return "—";
  if (Number.isInteger(value)) return value.toLocaleString("en-US");
  return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export function WorkbookStatusBar({ workbook, state }: WorkbookStatusBarProps) {
  const stats = workbook.getSelectedStats(state.selection);

  return (
    <div className="sheet-status">
      <span className="status-item mono">{formatRange(state.selection)}</span>
      <span className="status-item">
        {stats.count.toLocaleString("en-US")} cell{stats.count === 1 ? "" : "s"}
      </span>
      <span className="status-item">
        Sum <strong className="mono">{formatStat(stats.numericCount ? stats.sum : null)}</strong>
      </span>
      <span className="status-item">
        Avg <strong className="mono">{formatStat(stats.average)}</strong>
      </span>
      <span className="status-item">
        Min <strong className="mono">{formatStat(stats.min)}</strong>
      </span>
      <span className="status-item">
        Max <strong className="mono">{formatStat(stats.max)}</strong>
      </span>
    </div>
  );
}
