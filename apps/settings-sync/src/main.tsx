import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@fontsource-variable/newsreader";
import "@fontsource-variable/dm-sans";

import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/app.css";

import App from "./App";
import { PreferencesProvider } from "./preferences/PreferencesProvider";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PreferencesProvider>
      <App />
    </PreferencesProvider>
  </StrictMode>,
);
