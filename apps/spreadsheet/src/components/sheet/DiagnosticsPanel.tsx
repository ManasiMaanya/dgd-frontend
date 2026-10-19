import { AlertTriangle, CircleCheck, Lightbulb, ListTree } from "lucide-react";

import { caretLine } from "../../spreadsheet/diagnostics";
import { parseCellKey } from "../../spreadsheet/coordinates";
import type { SheetState } from "../../spreadsheet/useSheetState";
import type { Workbook } from "../../spreadsheet/workbook";

interface DiagnosticsPanelProps {
  workbook: Workbook;
  state: SheetState;
}

export function DiagnosticsPanel({ workbook, state }: DiagnosticsPanelProps) {
  const active = workbook.getDiagnostic(state.activeKey);
  const all = workbook.getAllDiagnostics();
  const formula = workbook.getRaw(state.activeKey);

  return (
    <section className="panel diagnostics-panel">
      <div className="panel-head">
        <div>
          <h2 className="panel-title">
            {active ? "Something needs attention." : "Every formula reads cleanly."}
          </h2>
          <p className="panel-description">
            Parse errors point at the exact character, runtime errors carry the failing cell, and
            circular references list the full loop.
          </p>
        </div>
        <span className={`badge ${all.length > 0 ? "badge-danger" : "badge-success"}`}>
          {all.length > 0 ? (
            <>
              <AlertTriangle aria-hidden="true" />
              {all.length} issue{all.length === 1 ? "" : "s"}
            </>
          ) : (
            <>
              <CircleCheck aria-hidden="true" />
              No issues
            </>
          )}
        </span>
      </div>

      <div className="diagnostics-body">
        <div className="diagnostic-detail">
          {active ? (
            <>
              <div className="diagnostic-formula-row">
                <span className={`badge badge-danger mono`}>{active.code}</span>
                <span className="mono diagnostic-cell">{state.activeKey}</span>
              </div>
              <pre className="diagnostic-formula mono">
                <div>{active.formula || "(empty)"}</div>
                <div className="diagnostic-caret">{caretLine(active.formula, active.position)}</div>
              </pre>
              <p className="diagnostic-message">{active.message}</p>
              {active.suggestion ? (
                <p className="diagnostic-suggestion">
                  <Lightbulb aria-hidden="true" />
                  <span>
                    <strong>Suggestion:</strong> {active.suggestion}
                  </span>
                </p>
              ) : null}
            </>
          ) : (
            <div className="diagnostic-empty">
              <p className="diagnostic-empty-title">
                {formula ? "This formula is valid." : "Select a cell to inspect its formula."}
              </p>
              <ul className="diagnostic-tips">
                <li>
                  Write <span className="mono">=SUM(D2:D7)</span> to total a column.
                </li>
                <li>
                  Nest calls like <span className="mono">=IF(AVERAGE(B2:B7)&gt;1000, "high", "low")</span>.
                </li>
                <li>
                  Type <span className="mono">=SUM(A1, B2</span> to see the missing-parenthesis
                  diagnostic.
                </li>
              </ul>
            </div>
          )}
        </div>

        <div className="diagnostic-list">
          <div className="diagnostic-list-head">
            <ListTree aria-hidden="true" />
            <span>All diagnostics</span>
          </div>
          {all.length === 0 ? (
            <p className="diagnostic-list-empty">The dependency graph is fully healthy.</p>
          ) : (
            <ul>
              {all.slice(0, 20).map(({ key, diagnostic }) => (
                <li key={key}>
                  <button
                    type="button"
                    className="diagnostic-list-item"
                    onClick={() => state.setSelection(parseAddress(key), parseAddress(key))}
                  >
                    <span className="mono diagnostic-list-cell">{key}</span>
                    <span className="badge badge-danger mono">{diagnostic.code}</span>
                    <span className="diagnostic-list-message">{diagnostic.message}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

function parseAddress(key: string): { row: number; col: number } {
  return parseCellKey(key) ?? { row: 0, col: 0 };
}
