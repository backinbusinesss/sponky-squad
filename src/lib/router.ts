import { useEffect, useState } from "react";

/**
 * Router minimale basato su hash.
 *
 * Il sito vive su GitHub Pages, che non ha riscritture lato server: se
 * l'utente aprisse /account in modo diretto, Pages risponderebbe 404 prima che
 * l'app possa fare qualcosa. Con il hash (#/account) l'URL cambia senza una
 * richiesta di rete, quindi la navigazione funziona ovunque, anche in locale.
 *
 * Espongo anche navigate(), usato dai pulsanti per cambiare pagina senza
 * ricaricare.
 */

export type Route = "home" | "account" | "admin";

const VALID: Route[] = ["home", "account", "admin"];

function parse(): Route {
  const raw = window.location.hash.replace(/^#\/?/, "").split("?")[0].trim().toLowerCase();
  return (VALID as string[]).includes(raw) ? (raw as Route) : "home";
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(parse);

  useEffect(() => {
    const onHash = () => setRoute(parse());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  return route;
}

export function navigate(route: Route) {
  window.location.hash = route === "home" ? "#/" : `#/${route}`;
}
