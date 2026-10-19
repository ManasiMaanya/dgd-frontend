import { ArrowRight, Clock3, Database, GitMerge, RadioTower } from "lucide-react";

import { PageHeader } from "../components/PageHeader";
import type { RouteId } from "../components/PageHeader";

interface NotesPageProps {
  onNavigate: (route: RouteId) => void;
}

const NOTES = [
  {
    icon: RadioTower,
    title: "Two lanes, one source of truth",
    body: "BroadcastChannel carries updates between tabs in well under 100 ms. The storage event is the fallback when a channel cannot be opened, and every merge is persisted before it is rendered.",
  },
  {
    icon: Clock3,
    title: "Lamport clocks, field by field",
    body: "Each preference owns a logical timestamp. A local edit advances the clock; an incoming edit only wins when its stamp is greater. Ties resolve by actor ID, so every tab makes the same decision.",
  },
  {
    icon: GitMerge,
    title: "Last writer wins, deterministically",
    body: "Concurrent edits to different fields both survive. Concurrent edits to the same field compare (clock, actor) pairs. There is no server to arbitrate and no dependence on wall-clock time.",
  },
  {
    icon: Database,
    title: "No flash, even on a cold start",
    body: "A tiny pre-paint script reads localStorage and applies theme, language, and type size before React mounts. New tabs arrive in the correct state on their very first frame.",
  },
];

export function NotesPage({ onNavigate }: NotesPageProps) {
  return (
    <>
      <PageHeader
        title="How the sync engine thinks."
        subtitle="The short version of the architecture behind the settings desk: browser-native transport, logical ordering, field-level merging, and a boot path designed around the first painted frame."
        actions={
          <button className="btn" type="button" onClick={() => onNavigate("preferences")}>
            See it in action
            <ArrowRight aria-hidden="true" />
          </button>
        }
      />

      <div className="notes-grid">
        {NOTES.map((note) => {
          const Icon = note.icon;
          return (
            <article className="panel note-card" key={note.title}>
              <div className="note-card-top">
                <span className="note-icon">
                  <Icon aria-hidden="true" />
                </span>
              </div>
              <h2 className="panel-title">{note.title}</h2>
              <p className="panel-description">{note.body}</p>
            </article>
          );
        })}
      </div>

      <section className="panel merge-panel">
        <div className="panel-head">
          <div>
            <h2 className="panel-title">A worked example</h2>
          </div>
          <span className="badge badge-butter">LWW / field</span>
        </div>

        <div className="stamp-table" role="table" aria-label="Concurrent edit resolution example">
          <div className="stamp-row stamp-head" role="row">
            <span role="columnheader">Field</span>
            <span role="columnheader">Tab A writes</span>
            <span role="columnheader">Tab B writes</span>
            <span role="columnheader">Winner</span>
          </div>
          <div className="stamp-row" role="row">
            <span role="cell">Theme</span>
            <span role="cell" className="mono">[8, “tab-a”]</span>
            <span role="cell" className="mono">[8, “tab-b”]</span>
            <span role="cell" className="badge badge-blue">tab-b · clock tie</span>
          </div>
          <div className="stamp-row" role="row">
            <span role="cell">Language</span>
            <span role="cell" className="mono">[9, “tab-a”]</span>
            <span role="cell" className="mono">—</span>
            <span role="cell" className="badge badge-success">tab-a · only writer</span>
          </div>
          <div className="stamp-row" role="row">
            <span role="cell">Font size</span>
            <span role="cell" className="mono">[7, “tab-b”]</span>
            <span role="cell" className="mono">—</span>
            <span role="cell" className="badge badge-success">tab-b · latest</span>
          </div>
        </div>
      </section>
    </>
  );
}
