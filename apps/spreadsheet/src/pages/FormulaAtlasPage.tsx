import { useMemo, useState } from "react";

import { Search, Sigma } from "lucide-react";

import { PageHeader } from "../components/PageHeader";
import {
  FUNCTION_CATEGORIES,
  FUNCTION_LIST,
  type FunctionCategory,
} from "../spreadsheet/functions";

type Filter = "All" | FunctionCategory;

const FILTERS: Filter[] = ["All", ...FUNCTION_CATEGORIES];

export function FormulaAtlasPage() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("All");

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return FUNCTION_LIST.filter((definition) => {
      const matchesFilter = filter === "All" || definition.category === filter;
      const matchesQuery =
        needle === "" ||
        `${definition.name} ${definition.signature} ${definition.description}`
          .toLowerCase()
          .includes(needle);
      return matchesFilter && matchesQuery;
    });
  }, [filter, query]);

  return (
    <>
      <PageHeader
        title="Formula Atlas."
        subtitle={`Every function implemented by the custom engine, with its signature and behaviour. ${FUNCTION_LIST.length} functions across ${FUNCTION_CATEGORIES.length} categories.`}
        actions={
          <span className="badge badge-pink">
            <Sigma aria-hidden="true" />
            {results.length} shown
          </span>
        }
      />

      <div className="atlas-controls panel">
        <label className="atlas-search">
          <Search aria-hidden="true" />
          <input
            type="search"
            value={query}
            placeholder="Search by name, signature, or description"
            aria-label="Search functions"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div className="atlas-filters">
          {FILTERS.map((option) => (
            <button
              key={option}
              type="button"
              className={`filter-chip${filter === option ? " is-active" : ""}`}
              onClick={() => setFilter(option)}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="atlas-grid">
        {results.map((definition) => (
          <article className="function-card" key={definition.name}>
            <header className="function-card-head">
              <h2 className="function-name mono">{definition.name}</h2>
              <span className="badge badge-teal">{definition.category}</span>
            </header>
            <p className="function-signature mono">{definition.signature}</p>
            <p className="function-description">{definition.description}</p>
            {definition.example ? (
              <p className="function-example mono">{definition.example}</p>
            ) : null}
          </article>
        ))}
        {results.length === 0 ? (
          <p className="atlas-empty">No functions match “{query}”.</p>
        ) : null}
      </div>
    </>
  );
}
