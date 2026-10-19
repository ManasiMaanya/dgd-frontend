import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@fontsource-variable/newsreader";
import "@fontsource-variable/dm-sans";

import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/app.css";

import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
