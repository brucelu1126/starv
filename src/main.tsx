import { StrictMode, useEffect, useLayoutEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { Landing } from "./Landing.tsx";
import "./styles.css";

function path() {
  return window.location.pathname.replace(/\/+$/, "") || "/";
}

function Root() {
  const [route, setRoute] = useState(path);
  const app = route === "/app";

  useEffect(() => {
    const sync = () => setRoute(path());
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  useLayoutEffect(() => {
    document.documentElement.classList.toggle("on-app", app);
    return () => document.documentElement.classList.remove("on-app");
  }, [app]);

  function go(to: string) {
    const next = to.replace(/\/+$/, "") || "/";
    if (next === path()) return;
    window.history.pushState({}, "", next);
    setRoute(next);
    window.scrollTo(0, 0);
  }

  return app ? <App onHome={() => go("/")} /> : <Landing onLaunch={() => go("/app")} />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
