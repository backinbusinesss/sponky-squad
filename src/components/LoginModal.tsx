import { useEffect, useRef, useState } from "react";
import { Loader2, Gauge, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

/**
 * Messaggi d'errore in tono da motociclista, usati al posto del solito
 * "credenziali errate". Il server ne restituisce uno generico (non rivela se
 * l'email esiste); qui lo rendiamo piu' divertente senza aggiungere informazioni.
 */
const RACING_ERRORS = [
  "Curva sbagliata, riprova!",
  "Motore in stallo: credenziali errate",
];

function pickRacingError() {
  return RACING_ERRORS[Math.floor(Math.random() * RACING_ERRORS.length)];
}

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
  onSwitchToRegister: () => void;
}

/**
 * Modale di accesso.
 *
 * L'easter egg: premendo "Accedi" (o inviando il form) la lancetta del contagiri
 * fa un rapido giro pieno prima che la richiesta parta. E' solo animazione, non
 * ritarda la chiamata: la promise parte subito, il giro della lancetta continua
 * in parallelo.
 */
export function LoginModal({ open, onClose, onSwitchToRegister }: LoginModalProps) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [revving, setRevving] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  // chiude con Esc
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // reset quando si riapre
  useEffect(() => {
    if (open) {
      setError(null);
      setLoading(false);
      setRevving(false);
    }
  }, [open]);

  // focus sul primo campo
  useEffect(() => {
    if (open) dialogRef.current?.querySelector<HTMLInputElement>("input")?.focus();
  }, [open]);

  function handleRev() {
    setRevving(true);
    window.setTimeout(() => setRevving(false), 700);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (loading) return;
    setError(null);
    handleRev();
    setLoading(true);
    try {
      await login(email.trim(), password);
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setError(err.message);
      } else {
        setError(pickRacingError());
      }
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Accedi al tuo account"
    >
      {/* sfondo scuro */}
      <button
        type="button"
        aria-label="Chiudi"
        className="absolute inset-0 bg-asphalt-950/80 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        ref={dialogRef}
        className="relative w-full max-w-md rounded-2xl border border-white/12 bg-asphalt-900/95 p-7 shadow-2xl backdrop-blur-xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Chiudi"
          className="absolute right-4 top-4 rounded-full p-2 text-white/50 transition hover:bg-white/10 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-6 flex items-center gap-3">
          {/* contagiri: la lancetta gira a pieno regime quando si preme Accedi */}
          <span
            className={cn(
              "grid h-12 w-12 place-items-center rounded-full border border-white/15 bg-white/8",
              revving && "shadow-[0_0_30px_rgba(255,110,26,.55)]",
            )}
          >
            <Gauge
              className={cn(
                "h-6 w-6 text-racing-orange transition-transform duration-700 ease-out",
                revving && "rotate-[720deg]",
              )}
            />
          </span>
          <div>
            <h2 className="font-display text-2xl text-white">Accedi</h2>
            <p className="text-sm text-white/55">Entra nella community Sponky Squad</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
          <div className="grid gap-1.5">
            <label htmlFor="login-email" className="text-sm font-bold text-white/76">
              Email
            </label>
            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-1.5">
            <label htmlFor="login-password" className="text-sm font-bold text-white/76">
              Password
            </label>
            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error ? (
            <p
              role="alert"
              className="rounded-lg border border-racing-orange/40 bg-racing-orange/10 px-4 py-3 text-sm font-bold text-racing-orange"
            >
              {error}
            </p>
          ) : null}

          <Button type="submit" disabled={loading} className="mt-2 w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {loading ? "In partenza..." : "Accedi"}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-white/55">
          Non hai ancora un account?{" "}
          <button
            type="button"
            onClick={() => {
              onClose();
              onSwitchToRegister();
            }}
            className="font-bold text-racing-orange underline-offset-2 hover:underline"
          >
            Iscriviti gratis
          </button>
        </p>
      </div>
    </div>
  );
}
