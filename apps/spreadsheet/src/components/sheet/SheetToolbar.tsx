import { Eraser, Redo2, Rows3, Sparkles, Undo2 } from "lucide-react";

import { formatRange } from "../../spreadsheet/coordinates";
import { functionCount } from "../../spreadsheet/functions";
import { SAMPLE_CELLS, SAMPLE_TITLE } from "../../spreadsheet/sample";
import type { SheetState } from "../../spreadsheet/useSheetState";
import type { Workbook } from "../../spreadsheet/workbook";

interface SheetToolbarProps {
  workbook: Workbook;
  state: SheetState;
}

export function SheetToolbar({ workbook, state }: SheetToolbarProps) {
  const report = workbook.getReport();

  return (
    <div className="sheet-toolbar">
      <div className="sheet-toolbar-group">
        <button
          className="tool-button"
          type="button"
          disabled={!workbook.canUndo()}
          onClick={() => workbook.undo()}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 aria-hidden="true" />
          Undo
        </button>
        <button
          className="tool-button"
          type="button"
          disabled={!workbook.canRedo()}
          onClick={() => workbook.redo()}
          title="Redo (Ctrl+Y)"
        >
          <Redo2 aria-hidden="true" />
          Redo
        </button>
        <button
          className="tool-button"
          type="button"
          onClick={() => workbook.clearRange(state.selection)}
          title="Clear the selected cells"
        >
          <Eraser aria-hidden="true" />
          Clear {formatRange(state.selection)}
        </button>
      </div>

      <div className="sheet-toolbar-meta">
        <span className="toolbar-title">{SAMPLE_TITLE}</span>
        <span className="badge badge-teal mono">{functionCount()} functions</span>
        <span className="badge mono" title="Cells recalculated by the last edit">
          <Rows3 aria-hidden="true" />
          {report.recalculated} recalculated · {report.durationMs.toFixed(1)} ms
        </span>
      </div>

      <div className="sheet-toolbar-group">
        <button
          className="tool-button"
          type="button"
          onClick={() => workbook.replaceAll(SAMPLE_CELLS, "Reload sample")}
        >
          <Sparkles aria-hidden="true" />
          Sample
        </button>
        <button className="tool-button is-danger" type="button" onClick={() => workbook.replaceAll({}, "Clear sheet")}>
          <Eraser aria-hidden="true" />
          Clear sheet
        </button>
      </div>
    </div>
  );
}
