import { Panel } from "../components/Panel";

export function PreferencesPage() {
  return (
    <>
      <header className="page-header">
        <div className="page-header-copy">
          <p className="eyebrow">Task 01 · Realtime preferences</p>
          <h1 className="page-title">A settings desk that travels.</h1>
          <p className="page-subtitle">
            Dark mode, language, and reading size — synchronized across every tab the
            moment you change them.
          </p>
        </div>
      </header>

      <div className="settings-grid">
        <Panel>
          <h2 className="panel-title">Preferences are being wired.</h2>
          <p className="panel-description">
            The synchronization engine and final controls arrive in the next phase.
          </p>
        </Panel>
      </div>
    </>
  );
}
