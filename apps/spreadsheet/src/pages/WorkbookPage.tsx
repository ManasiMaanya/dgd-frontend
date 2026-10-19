import { ArrowRight, Sigma } from "lucide-react";

import { PageHeader } from "../components/PageHeader";
import type { RouteId } from "../components/PageHeader";
import { Panel } from "../components/Panel";

interface WorkbookPageProps {
  onNavigate: (route: RouteId) => void;
}

export function WorkbookPage({ onNavigate }: WorkbookPageProps) {
  return (
    <>
      <PageHeader
        eyebrow="Task 02 · Spreadsheet engine"
        title="Formula Studio."
        subtitle="A virtualized workbook with a hand-built parser, dependency-aware recalculation, and diagnostics that explain themselves."
        actions={
          <button className="btn btn-pink" type="button" onClick={() => onNavigate("formulas")}>
            <Sigma aria-hidden="true" />
            Formula Atlas
            <ArrowRight aria-hidden="true" />
          </button>
        }
      />

      <Panel>
        <p className="panel-kicker">Workbook foundation</p>
        <h2 className="panel-title">The grid is being prepared.</h2>
        <p className="panel-description">
          The interactive 13,000-cell sheet, formula engine, and dependency graph arrive in
          the next phase.
        </p>
      </Panel>
    </>
  );
}
