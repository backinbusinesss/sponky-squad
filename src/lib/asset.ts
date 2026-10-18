/**
 * Percorso asset che rispetta il base path di Vite.
 * In locale BASE_URL = "/", su GitHub Pages = "/sponky-squad/".
 * Usare sempre asset("/assets/foo.svg") invece di "/assets/foo.svg".
 */
export function asset(path: string): string {
  const base = import.meta.env.BASE_URL ?? "/";
  // path deve iniziare con "/" e base finisce con "/": evitiamo il doppio slash
  return `${base.replace(/\/$/, "")}${path}`;
}
