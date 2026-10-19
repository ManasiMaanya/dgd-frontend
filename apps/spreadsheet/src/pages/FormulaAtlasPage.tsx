import { PageHeader } from "../components/PageHeader";
import { Panel } from "../components/Panel";

export function FormulaAtlasPage() {
  return (
    <>
      <PageHeader
        eyebrow="Task 02 · Reference"
        title="Formula Atlas."
        subtitle="Every function supported by the custom engine, with its signature and behavior."
      />
      <Panel>
        <p className="panel-kicker">Function library</p>
        <h2 className="panel-title">The catalog is being indexed.</h2>
        <p className="panel-description">
          Searchable function documentation is added alongside the formula engine.
        </p>
      </Panel>
    </>
  );
}
