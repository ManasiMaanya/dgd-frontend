import { useEffect, useState } from "react";

import { AppShell } from "./components/AppShell";
import type { RouteId } from "./components/PageHeader";
import { FormulaAtlasPage } from "./pages/FormulaAtlasPage";
import { NotesPage } from "./pages/NotesPage";
import { WorkbookPage } from "./pages/WorkbookPage";

const ROUTES: RouteId[] = ["workbook", "formulas", "notes"];

const PAGE_TITLES: Record<RouteId, string> = {
  workbook: "Workbook · Folio",
  formulas: "Formula Atlas · Folio",
  notes: "Field Notes · Folio",
};

function routeFromHash(): RouteId {
  const candidate = window.location.hash.replace(/^#\/?/, "").split("?")[0];
  return ROUTES.includes(candidate as RouteId) ? (candidate as RouteId) : "workbook";
}

export default function App() {
  const [route, setRoute] = useState<RouteId>(routeFromHash);

  useEffect(() => {
    const onHashChange = () => setRoute(routeFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    document.title = PAGE_TITLES[route];
  }, [route]);

  const navigate = (nextRoute: RouteId) => {
    if (nextRoute === route) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setRoute(nextRoute);
    window.location.hash = `/${nextRoute}`;
    window.scrollTo({ top: 0 });
  };

  return (
    <AppShell current={route} onNavigate={navigate}>
      {route === "workbook" && <WorkbookPage onNavigate={navigate} />}
      {route === "formulas" && <FormulaAtlasPage />}
      {route === "notes" && <NotesPage />}
    </AppShell>
  );
}
