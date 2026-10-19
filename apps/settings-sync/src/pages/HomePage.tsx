import { ArrowRight, Database, Languages, Radio, Zap } from "lucide-react";

import { PageHeader } from "../components/PageHeader";
import type { RouteId } from "../components/PageHeader";

interface HomePageProps {
  onNavigate: (route: RouteId) => void;
}

export function HomePage({ onNavigate }: HomePageProps) {
  return (
    <>
      <PageHeader
        eyebrow="GDG Tech Wildcard · Frontend"
        title="Preferences, in perfect step."
        subtitle="A small settings desk with a serious synchronization engine. Change a preference once and every open tab follows — instantly, deterministically, and without a flash of the wrong theme."
        actions={
          <button className="btn btn-primary" type="button" onClick={() => onNavigate("preferences")}>
            Open settings
            <ArrowRight aria-hidden="true" />
          </button>
        }
      />

      <div className="home-grid">
        <article
          className="panel task-card"
          role="button"
          tabIndex={0}
          onClick={() => onNavigate("preferences")}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onNavigate("preferences");
            }
          }}
        >
          <div className="task-card-top">
            <span className="badge badge-blue">
              <Radio aria-hidden="true" size={11} />
              Live state
            </span>
            <span className="task-card-index">TASK / 01</span>
          </div>

          <h2>One setting. Every tab.</h2>
          <p>
            Dark mode, language, and reading size stay in sync across every window. No
            refresh. No stale state. No visible theme flicker.
          </p>

          <div className="task-card-visual" aria-hidden="true">
            <div className="mini-tabs">
              {["Aa", "Aa", "Aa"].map((label, index) => (
                <div className="mini-tab" key={index}>
                  <div className="mini-tab-bar">
                    <span />
                    <span />
                    <span />
                  </div>
                  <div className="mini-tab-line is-blue" style={{ width: `${58 + index * 9}%` }} />
                  <div className="mini-tab-line" />
                  <div className="mini-tab-line is-short" />
                  <span className="mini-tab-type">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <span className="task-link">
            Explore the settings desk
            <ArrowRight aria-hidden="true" />
          </span>
        </article>

        <article
          className="panel task-card"
          role="button"
          tabIndex={0}
          onClick={() => onNavigate("notes")}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onNavigate("notes");
            }
          }}
        >
          <div className="task-card-top">
            <span className="badge badge-butter">Under the hood</span>
            <span className="task-card-index">READ / 02</span>
          </div>

          <h2>Deterministic by design.</h2>
          <p>
            Lamport-stamped preferences, field-level last-write-wins, and a browser-native
            message bus. Simultaneous edits always converge on the same answer.
          </p>

          <div className="task-card-visual sync-visual" aria-hidden="true">
            <div className="sync-orbit">
              <div className="sync-node">
                <span className="sync-node-dot" />
                Tab A
              </div>
              <div className="sync-core">
                <span>BC</span>
                <small>sync</small>
              </div>
              <div className="sync-node sync-node-b">
                <span className="sync-node-dot" />
                Tab B
              </div>
              <div className="sync-node sync-node-c">
                <span className="sync-node-dot" />
                Tab C
              </div>
            </div>
          </div>

          <span className="task-link">
            Read the technical notes
            <ArrowRight aria-hidden="true" />
          </span>
        </article>
      </div>

      <div className="home-strip panel" aria-label="Feature highlights">
        <div className="home-strip-item">
          <Zap aria-hidden="true" />
          <div className="home-strip-copy">
            <strong>Sub-100 ms</strong>
            <span>BroadcastChannel propagation</span>
          </div>
        </div>
        <div className="home-strip-item">
          <Database aria-hidden="true" />
          <div className="home-strip-copy">
            <strong>Stored locally</strong>
            <span>Survives every tab closing</span>
          </div>
        </div>
        <div className="home-strip-item">
          <Languages aria-hidden="true" />
          <div className="home-strip-copy">
            <strong>Six languages</strong>
            <span>Including right-now updates</span>
          </div>
        </div>
      </div>
    </>
  );
}
