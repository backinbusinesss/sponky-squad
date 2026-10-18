import { useEffect, useState } from "react";

/**
 * true quando la finestra e' stretta (telefono).
 * Serve dove una sola classe non basta: le posizioni dei marker sulla
 * mappa o la didascalia che con 200px di altezza non puo' stare sopra.
 */
export function useIsCompact(query = "(max-width: 640px)") {
  const [compact, setCompact] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia(query).matches,
  );

  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setCompact(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);

  return compact;
}
