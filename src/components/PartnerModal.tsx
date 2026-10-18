import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api, ApiError } from "@/lib/api";

/**
 * Modale di richiesta partnership.
 *
 * La markup dell'immagine è quella esatta del vecchio sito WordPress, perche' è
 * un asset che il cliente ha gia' e vuole rivedere identico. Il form non richiede
 * un account: un'azienda che vuole diventare partner non ha ancora uno.
 */

interface PartnerModalProps {
  open: boolean;
  onClose: () => void;
}

export function PartnerModal({ open, onClose }: PartnerModalProps) {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    company: "",
    email: "",
    phone: "",
    message: "",
    privacy_accepted: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setErrors({});
      setFormError(null);
      setSent(false);
      setLoading(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  // verifica client-side minima, come nella registrazione: la decisione finale
  // spetta sempre al server.
  function clientErrors() {
    const list: Record<string, string> = {};
    if (form.first_name.trim().length < 2) list.first_name = "Inserisci il nome.";
    if (form.last_name.trim().length < 2) list.last_name = "Inserisci il cognome.";
    if (form.company.trim().length < 2) list.company = "Inserisci il nome dell'azienda.";
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(form.email.trim())) list.email = "Indirizzo email non valido.";
    if (!/^[+\d][\d\s()-]{5,}$/.test(form.phone.trim())) list.phone = "Numero di telefono non valido.";
    if (form.message.trim().length < 10) list.message = "Scrivi qualcosa di più dettagliato.";
    if (!form.privacy_accepted) list.privacy_accepted = "Devi accettare la Privacy Policy.";
    return list;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (loading) return;
    const local = clientErrors();
    setErrors(local);
    setFormError(null);
    if (Object.keys(local).length > 0) return;

    setLoading(true);
    try {
      await api.partner({
        ...form,
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        message: form.message.trim(),
      });
      setSent(true);
    } catch (err) {
      if (err instanceof ApiError && err.errors && Object.keys(err.errors).length > 0) {
        setErrors(err.errors);
      } else if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError("Invio non riuscito. Riprova.");
      }
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  const field = (key: string) => (errors[key] ? "border-racing-orange/70" : "");

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto p-4" role="dialog" aria-modal="true" aria-label="Richiesta partnership">
      <button type="button" aria-label="Chiudi" className="fixed inset-0 bg-asphalt-950/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative my-8 w-full max-w-xl rounded-2xl border border-white/12 bg-asphalt-900/95 p-7 shadow-2xl backdrop-blur-xl">
        <button type="button" onClick={onClose} aria-label="Chiudi" className="absolute right-4 top-4 rounded-full p-2 text-white/50 transition hover:bg-white/10 hover:text-white">
          <X className="h-5 w-5" />
        </button>

        {/* Immagine del form partner, identica al vecchio sito WordPress. */}
        <img
          className="form_logo"
          src="https://www.sponkysquad.it/wp-content/themes/foundation/library/images/webp/sponky-mail.webp"
          alt="sponky-mail.webp"
        />

        <h2 className="font-display text-3xl text-white">Diventa Partner</h2>
        <p className="mt-1 text-sm text-white/55">
          Vuoi offrire sconti ai soci Sponky Squad? Raccontaci la tua attività: ti ricontattiamo appena possibile.
        </p>

        {sent ? (
          <div className="mt-6 rounded-xl border border-racing-cyan/40 bg-racing-cyan/10 p-6 text-center">
            <p className="font-display text-2xl text-white">Richiesta inviata</p>
            <p className="mt-2 text-sm text-white/70">
              Grazie! Abbiamo ricevuto la tua richiesta di partnership. Ti contatteremo al più presto.
            </p>
            <Button className="mt-5" onClick={onClose}>Chiudi</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 grid gap-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <Label text="Nome" error={errors.first_name}>
                <Input value={form.first_name} onChange={(e) => set("first_name", e.target.value)} className={field("first_name")} autoComplete="given-name" required />
              </Label>
              <Label text="Cognome" error={errors.last_name}>
                <Input value={form.last_name} onChange={(e) => set("last_name", e.target.value)} className={field("last_name")} autoComplete="family-name" required />
              </Label>
            </div>

            <Label text="Azienda" error={errors.company}>
              <Input value={form.company} onChange={(e) => set("company", e.target.value)} className={field("company")} autoComplete="organization" required />
            </Label>

            <div className="grid gap-4 sm:grid-cols-2">
              <Label text="Email" error={errors.email}>
                <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={field("email")} autoComplete="email" required />
              </Label>
              <Label text="Telefono" error={errors.phone}>
                <Input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} className={field("phone")} autoComplete="tel" required />
              </Label>
            </div>

            <Label text="Messaggio" error={errors.message}>
              <Textarea value={form.message} onChange={(e) => set("message", e.target.value)} className={field("message")} rows={4} required />
            </Label>

            <label className={errors.privacy_accepted ? "rounded-lg border border-racing-orange/50 bg-racing-orange/10 p-3" : "flex items-start gap-3 text-sm text-white/70"}>
              <input
                type="checkbox"
                checked={form.privacy_accepted}
                onChange={(e) => set("privacy_accepted", e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-racing-orange"
              />
              <span>
                Ho letto e accetto la{" "}
                <a href="https://www.sponkysquad.it/wp-content/themes/foundation/documents/termini-condizioni-sponkyquad.pdf" target="_blank" rel="noopener noreferrer" className="font-bold text-racing-orange underline-offset-2 hover:underline">
                  Privacy Policy
                </a>
              </span>
            </label>
            {errors.privacy_accepted ? <p className="-mt-2 text-sm font-bold text-racing-orange">{errors.privacy_accepted}</p> : null}

            {formError ? (
              <p role="alert" className="rounded-lg border border-racing-orange/40 bg-racing-orange/10 px-4 py-3 text-sm font-bold text-racing-orange">
                {formError}
              </p>
            ) : null}

            <Button type="submit" disabled={loading} className="mt-2 w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? "Invio in corso..." : "Invia richiesta"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

function Label({ text, error, children }: { text: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <span className="text-sm font-bold text-white/76">{text}</span>
      {children}
      {error ? <span className="text-sm font-bold text-racing-orange">{error}</span> : null}
    </div>
  );
}
