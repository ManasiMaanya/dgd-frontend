import { useEffect, useState } from "react";

import { AppShell } from "./components/AppShell";
import type { RouteId } from "./components/PageHeader";
import { HomePage } from "./pages/HomePage";
import { NotesPage } from "./pages/NotesPage";
import { PreferencesPage } from "./pages/PreferencesPage";

const ROUTES: RouteId[] = ["home", "preferences", "notes"];

const PAGE_TITLES: Record<RouteId, string> = {
  home: "Atelier · Settings",
  preferences: "Preferences · Atelier",
  notes: "Field Notes · Atelier",
};

function routeFromHash(): RouteId {
  const candidate = window.location.hash.replace(/^#\/?/, "").split("?")[0];
  return ROUTES.includes(candidate as RouteId) ? (candidate as RouteId) : "home";
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
      {route === "home" && <HomePage onNavigate={navigate} />}
      {route === "preferences" && <PreferencesPage />}
      {route === "notes" && <NotesPage onNavigate={navigate} />}
    </AppShell>
  );
}
