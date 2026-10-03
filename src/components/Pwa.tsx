import { useEffect, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { t } from "../i18n";
interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}
export function Pwa() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  const [install, setInstall] = useState<InstallEvent | null>(null);
  const [offline, setOffline] = useState(!navigator.onLine);
  useEffect(() => {
    const listener = (event: Event) => {
      event.preventDefault();
      setInstall(event as InstallEvent);
    };
    const connectivity = () => setOffline(!navigator.onLine);
    window.addEventListener("beforeinstallprompt", listener);
    window.addEventListener("online", connectivity);
    window.addEventListener("offline", connectivity);
    return () => {
      window.removeEventListener("beforeinstallprompt", listener);
      window.removeEventListener("online", connectivity);
      window.removeEventListener("offline", connectivity);
    };
  }, []);
  const ios =
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !window.matchMedia("(display-mode: standalone)").matches;
  return (
    <div className="pwa-notice">
      {offline && <span role="status">{t("app.offline")}</span>}
      {install && (
        <button
          onClick={async () => {
            await install.prompt();
            await install.userChoice;
            setInstall(null);
          }}
        >
          {t("app.install")}
        </button>
      )}
      {ios && <small>{t("app.ios")}</small>}
      {needRefresh && (
        <span>
          {t("app.update")}{" "}
          <button onClick={() => void updateServiceWorker(true)}>
            {t("app.reload")}
          </button>
        </span>
      )}
    </div>
  );
}
