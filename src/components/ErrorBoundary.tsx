import { Component, type ReactNode } from "react";
import { t } from "../i18n";
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <main className="library">
          <h1>{t("common.error")}</h1>
          <p>{t("common.corrupt")}</p>
          <button onClick={() => location.reload()}>{t("common.retry")}</button>
        </main>
      );
    return this.props.children;
  }
}
