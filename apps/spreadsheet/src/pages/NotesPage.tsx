import { GitBranch, ListTree, ScanSearch, Sigma, TriangleAlert } from "lucide-react";

import { PageHeader } from "../components/PageHeader";
import { Panel } from "../components/Panel";

const GRAMMAR = `expression   → comparison
comparison   → concat ( ("=" | "<>" | "<" | ">" | "<=" | ">=") concat )*
concat       → additive ( "&" additive )*
additive     → multiplicative ( ("+" | "-") multiplicative )*
multiplicative → power ( ("*" | "/") power )*
power        → unary ( "^" power )?
unary        → ("+" | "-") unary | postfix
postfix      → primary "%"?
primary      → number | string | boolean | cell | cell ":" cell
             | IDENT "(" arguments ")" | "(" expression ")"`;

const GRAPH = `changed cell A1
   │  after the edit, rebuild A1's outgoing dependency edges
   ▼
dependents[A1] = { A3, B1 }
   │  breadth-first walk through the reverse edges
   ▼
affected = { A1, A3, A4, B1 }        // only this set is reset
   │  evaluate each affected cell, recursing into dependencies
   ▼
values updated · report { affected: 4, recalculated: 4, ms: 0.3 }`;

const CYCLE = `evaluate(C1)
  visitState[C1] = "visiting", stack = [C1]
  → references A1 → evaluate(A1)
      visitState[A1] = "visiting", stack = [C1, A1]
      → references C1 → evaluate(C1)
          visitState[C1] === "visiting"  ← cycle detected
          path = stack.slice(indexOf(C1)) + C1 = [C1, A1, C1]
          every member is flagged with #CYCLE!`;

const DIAGNOSTIC = `Formula:  =SUM(A1, B2
Error:    Missing closing parenthesis.
          =SUM(A1, B2
                     ^
Suggestion: Add ')' at the end of the formula.`;

export function NotesPage() {
  return (
    <>
      <PageHeader
        title="How the workbook thinks."
        subtitle="A short tour of the tokenizer, recursive-descent parser, evaluator, dependency graph, and circular-reference handling — all written directly in TypeScript."
      />

      <div className="notes-grid">
        <Panel>
          <div className="note-card-top">
            <span className="note-icon">
              <Sigma aria-hidden="true" />
            </span>
          </div>
          <h2 className="panel-title">Tokenizer &amp; parser</h2>
          <p className="panel-description">
            The tokenizer turns a formula body into typed tokens (numbers, strings, cell
            references, operators, and punctuation) while preserving each token's start and end
            offset. The parser is a hand-written recursive descent parser that follows a fixed
            precedence climbing order, so operator precedence and associativity are explicit rather
            than delegated to <span className="mono">eval</span>.
          </p>
          <pre className="code-block">{GRAMMAR}</pre>
        </Panel>

        <Panel>
          <div className="note-card-top">
            <span className="note-icon is-pink">
              <GitBranch aria-hidden="true" />
            </span>
          </div>
          <h2 className="panel-title">Dependency graph</h2>
          <p className="panel-description">
            Every formula contributes forward edges (<span className="mono">development → dependents</span>)
            and reverse edges (<span className="mono">dependency → dependents</span>). When a cell
            changes, its old edges are removed, new ones are derived from the fresh AST, and a
            breadth-first walk collects the transitive dependents. Only that set is recalculated,
            which keeps a single edit proportional to the affected subgraph rather than the whole
            sheet.
          </p>
          <pre className="code-block">{GRAPH}</pre>
        </Panel>

        <Panel>
          <div className="note-card-top">
            <span className="note-icon is-pink">
              <TriangleAlert aria-hidden="true" />
            </span>
          </div>
          <h2 className="panel-title">Circular references</h2>
          <p className="panel-description">
            Evaluation keeps a <span className="mono">visiting</span> / <span className="mono">done</span>
            state per cell and an explicit call stack. Re-entering a cell that is already
            <span className="mono"> visiting</span> is a cycle: the engine records the exact loop,
            flags every member with <span className="mono">#CYCLE!</span>, and returns an error
            instead of recursing forever.
          </p>
          <pre className="code-block">{CYCLE}</pre>
        </Panel>

        <Panel>
          <div className="note-card-top">
            <span className="note-icon">
              <ScanSearch aria-hidden="true" />
            </span>
          </div>
          <h2 className="panel-title">Error diagnostics</h2>
          <p className="panel-description">
            Parse errors carry the precise source offset. The diagnostics panel rebuilds the
            offending line and places a caret under the position, then attaches a suggestion.
            Runtime errors keep the failing cell and message, and unknown functions are matched
            against the registry with a small Levenshtein distance to propose the closest function.
          </p>
          <pre className="code-block">{DIAGNOSTIC}</pre>
        </Panel>
      </div>

      <Panel className="notes-wide">
        <div className="note-card-top">
          <span className="note-icon">
            <ListTree aria-hidden="true" />
          </span>
        </div>
        <h2 className="panel-title">Virtualization and performance</h2>
        <div className="notes-columns">
          <p className="panel-description">
            The sheet models <strong>500 rows × 26 columns = 13,000 cells</strong>. Only the rows
            and columns intersecting the viewport (plus a small overscan) are rendered as DOM nodes,
            so scrolling stays cheap regardless of workbook size. Column and row headers are kept
            in sync with the scroll position through a transform, giving frozen labels without
            duplicating the grid.
          </p>
          <p className="panel-description">
            Cell values are memoized in the engine, and parsing is cached per raw string. Formulas
            are evaluated lazily for <span className="mono">IF</span>,{" "}
            <span className="mono">IFERROR</span>, and <span className="mono">IFNA</span>, so the
            untaken branch never runs — a division by zero on the other side of an{" "}
            <span className="mono">IF</span> cannot break the workbook.
          </p>
        </div>
      </Panel>
    </>
  );
}
