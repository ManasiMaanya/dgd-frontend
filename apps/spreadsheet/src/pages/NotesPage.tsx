import { PageHeader } from "../components/PageHeader";
import { Panel } from "../components/Panel";

export function NotesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Task 02 · Technical notes"
        title="How the workbook thinks."
        subtitle="A short tour of the tokenizer, parser, evaluator, dependency graph, and circular-reference handling."
      />
      <Panel>
        <p className="panel-kicker">Architecture</p>
        <h2 className="panel-title">Technical notes land with the engine.</h2>
        <p className="panel-description">
          The parser, evaluator, dependency graph, and diagnostics are being built in the
          following phases.
        </p>
      </Panel>
    </>
  );
}
