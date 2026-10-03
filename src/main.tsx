import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource/manrope/latin-400.css";
import "@fontsource/manrope/latin-600.css";
import "@fontsource/bodoni-moda/latin-500.css";
import "@fontsource/manrope/latin-ext-400.css";
import "@fontsource/manrope/latin-ext-600.css";
import "@fontsource/bodoni-moda/latin-ext-500.css";
import "@fontsource/literata/latin-400.css";
import "@fontsource/literata/latin-ext-400.css";
import "@fontsource/nunito-sans/latin-400.css";
import "@fontsource/nunito-sans/latin-ext-400.css";
import "@fontsource/source-serif-4/latin-400.css";
import "@fontsource/source-serif-4/latin-ext-400.css";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { t } from "./i18n";
import "./styles.css";
document.documentElement.lang = "sk";
document.title = t("app.name");
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
