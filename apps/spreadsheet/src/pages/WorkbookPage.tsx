import { ArrowRight, Sigma } from "lucide-react";

import { PageHeader, type RouteId } from "../components/PageHeader";
import { DiagnosticsPanel } from "../components/sheet/DiagnosticsPanel";
import { FormulaBar } from "../components/sheet/FormulaBar";
import { SheetGrid } from "../components/sheet/SheetGrid";
import { SheetToolbar } from "../components/sheet/SheetToolbar";
import { WorkbookStatusBar } from "../components/sheet/WorkbookStatusBar";
import { formatRange } from "../spreadsheet/coordinates";
import { useSheetState } from "../spreadsheet/useSheetState";
import { useWorkbook } from "../spreadsheet/useWorkbook";

interface WorkbookPageProps {
  onNavigate: (route: RouteId) => void;
}

const SHORTCUTS: { keys: string; label: string }[] = [
  { keys: "↵", label: "Commit and move down" },
  { keys: "F2", label: "Edit the active cell" },
  { keys: "Tab", label: "Move right" },
  { keys: "⇧ ←↑↓→", label: "Extend the selection" },
  { keys: "⌘/Ctrl C", label: "Copy the selection" },
  { keys: "⌘/Ctrl V", label: "Paste at the active cell" },
  { keys: "⌘/Ctrl Z", label: "Undo" },
  { keys: "⌘/Ctrl Y", label: "Redo" },
  { keys: "Del", label: "Clear the selection" },
  { keys: "▦ drag", label: "Drag the fill handle to continue a series" },
];

export function WorkbookPage({ onNavigate }: WorkbookPageProps) {
  const workbook = useWorkbook();
  const state = useSheetState(workbook);

  return (
    <>
      <PageHeader
        title="Formula Studio."
        subtitle="A 13,000-cell virtualized workbook with a hand-written parser, dependency-aware recalculation, and diagnostics that point at the exact character."
        actions={
          <button className="btn btn-pink" type="button" onClick={() => onNavigate("formulas")}>
            <Sigma aria-hidden="true" />
            Formula Atlas
            <ArrowRight aria-hidden="true" />
          </button>
        }
      />

      <section className="workbook-panel panel">
        <SheetToolbar workbook={workbook} state={state} />
        <FormulaBar workbook={workbook} state={state} selectionLabel={formatRange(state.selection)} />
        <SheetGrid workbook={workbook} state={state} />
        <WorkbookStatusBar workbook={workbook} state={state} />
      </section>

      <div className="workbook-lower">
        <DiagnosticsPanel workbook={workbook} state={state} />

        <section className="panel shortcuts-panel">
          <div className="panel-head">
            <div>
              <h2 className="panel-title">Keyboard and pointer.</h2>
              <p className="panel-description">
                The grid is fully keyboard navigable, and the fill handle continues numeric series
                and re-bases relative references.
              </p>
            </div>
          </div>
          <ul className="shortcut-list">
            {SHORTCUTS.map((shortcut) => (
              <li key={shortcut.label}>
                <span className="kbd">{shortcut.keys}</span>
                <span>{shortcut.label}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
