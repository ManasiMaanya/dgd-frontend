import { Check, FunctionSquare, X } from "lucide-react";

import type { SheetState } from "../../spreadsheet/useSheetState";
import type { Workbook } from "../../spreadsheet/workbook";

interface FormulaBarProps {
  workbook: Workbook;
  state: SheetState;
  selectionLabel: string;
}

export function FormulaBar({ workbook, state, selectionLabel }: FormulaBarProps) {
  const value = state.editing ? state.editing.value : workbook.getRaw(state.activeKey);

  return (
    <div className="formula-bar">
      <div className="name-box mono" title="Active cell or selection">
        {selectionLabel}
      </div>
      <div className="fx-symbol" aria-hidden="true">
        <FunctionSquare />
      </div>
      <input
        className="formula-input mono"
        aria-label="Formula input"
        spellCheck={false}
        value={value}
        placeholder="Enter a value or start with = to write a formula"
        onChange={(event) => {
          const next = event.target.value;
          if (state.editing) state.updateEditing(next);
          else state.beginEdit("bar", next);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            state.commitEdit([1, 0]);
          } else if (event.key === "Escape") {
            event.preventDefault();
            state.cancelEdit();
          } else if (event.key === "Tab") {
            event.preventDefault();
            state.commitEdit([0, event.shiftKey ? -1 : 1]);
          }
        }}
      />
      {state.editing ? (
        <div className="formula-actions">
          <button className="formula-action" type="button" aria-label="Cancel edit" onClick={() => state.cancelEdit()}>
            <X aria-hidden="true" />
          </button>
          <button
            className="formula-action is-confirm"
            type="button"
            aria-label="Confirm edit"
            onClick={() => state.commitEdit()}
          >
            <Check aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
