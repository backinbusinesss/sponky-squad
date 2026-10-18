import { useEffect, useMemo, useState } from "react";
import { Loader2, X, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { RIDING_STYLES, DISCOUNT_INTERESTS, AGE_RANGES, GROUP_NAMES, CARD_MIN, CARD_MAX } from "@/data/options";

/**
 * Modale di iscrizione.
 *
 * Campi e ordine identici al vecchio form di sponkysquad.it (form 174):
 * Nome, Cognome, Email, Password, CAP, età, tessera, stili di guida,
 * sconti, gruppo, newsletter, privacy. Non c'e' conferma email: la registrazione
 * autentica subito l'utente e lo porta su /account.
 */

interface RegisterModalProps {
  open: boolean;
  onClose: () => void;
  onSwitchToLogin: () => void;
}

export function RegisterModal({ open, onClose, onSwitchToLogin }: RegisterModalProps) {
  const { register } = useAuth();
  const [form, setForm] = useState(() => ({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    cap: "",
    age_range: "25-35",
    group_name: "Nessun gruppo",
    card_number: "",
    riding_styles: [] as string[],
    discount_interests: [] as string[],
    newsletter: false,
    privacy_accepted: false,
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (open) {
      setErrors({});
      setFormError(null);
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

  function toggleIn(key: "riding_styles" | "discount_interests", value: string) {
    setForm((prev) => {
      const list = prev[key];
      const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
      return { ...prev, [key]: next };
    });
  }

  const cardNumber = Number(form.card_number);
  const cardValid = Number.isInteger(cardNumber) && cardNumber >= CARD_MIN && cardNumber <= CARD_MAX;

  const clientErrors = useMemo(() => {
    const list: Record<string, string> = {};
    if (form.first_name.trim().length < 2) list.first_name = "Inserisci il nome.";
    if (form.last_name.trim().length < 2) list.last_name = "Inserisci il cognome.";
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(form.email.trim())) list.email = "Indirizzo email non valido.";
    if (form.password.length < 8) list.password = "Almeno 8 caratteri.";
    if (!/^\d{5}$/.test(form.cap.trim())) list.cap = "Il CAP deve avere 5 cifre.";
    if (!cardValid) list.card_number = `Da ${CARD_MIN} a ${CARD_MAX}.`;
    if (!form.privacy_accepted) list.privacy_accepted = "Devi accettare la Privacy Policy.";
    return list;
  }, [form, cardValid]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (loading) return;
    setErrors(clientErrors);
    setFormError(null);
    if (Object.keys(clientErrors).length > 0) return;

    setLoading(true);
    try {
      await register({
        ...form,
        email: form.email.trim().toLowerCase(),
        cap: form.cap.trim(),
        card_number: cardNumber,
      });
      onClose();
      window.location.hash = "#/account";
    } catch (err) {
      if (err instanceof ApiError && err.errors && Object.keys(err.errors).length > 0) {
        setErrors(err.errors);
      } else if (err instanceof ApiError) {
        setFormError(err.message);
      } else {
        setFormError("Registrazione non riuscita. Riprova.");
      }
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  const field = (key: string) => (errors[key] ? "border-racing-orange/70" : "");

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto p-4" role="dialog" aria-modal="true" aria-label="Iscriviti a Sponky Squad">
      <button type="button" aria-label="Chiudi" className="fixed inset-0 bg-asphalt-950/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative my-8 w-full max-w-2xl rounded-2xl border border-white/12 bg-asphalt-900/95 p-7 shadow-2xl backdrop-blur-xl">
        <button type="button" onClick={onClose} aria-label="Chiudi" className="absolute right-4 top-4 rounded-full p-2 text-white/50 transition hover:bg-white/10 hover:text-white">
          <X className="h-5 w-5" />
        </button>

        <h2 className="font-display text-3xl text-white">Iscriviti gratis</h2>
        <p className="mt-1 text-sm text-white/55">La tessera Sponky Squad è gratuita. Bastano un minuto e zero sbattimenti.</p>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-4" noValidate>
          {/* Nome e Cognome */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome" error={errors.first_name}>
              <Input value={form.first_name} onChange={(e) => set("first_name", e.target.value)} className={field("first_name")} autoComplete="given-name" required />
            </Field>
            <Field label="Cognome" error={errors.last_name}>
              <Input value={form.last_name} onChange={(e) => set("last_name", e.target.value)} className={field("last_name")} autoComplete="family-name" required />
            </Field>
          </div>

          {/* Email */}
          <Field label="Email" error={errors.email}>
            <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={field("email")} autoComplete="email" required />
          </Field>

          {/* Password e CAP */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Password" hint="Almeno 8 caratteri" error={errors.password}>
              <div className="relative">
                <Input type={showPassword ? "text" : "password"} value={form.password} onChange={(e) => set("password", e.target.value)} className={field("password")} autoComplete="new-password" required />
                <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white" aria-label={showPassword ? "Nascondi password" : "Mostra password"}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>
            <Field label="CAP" error={errors.cap}>
              <Input inputMode="numeric" maxLength={5} value={form.cap} onChange={(e) => set("cap", e.target.value)} className={field("cap")} autoComplete="postal-code" required />
            </Field>
          </div>

          {/* Età e Tessera */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Seleziona la tua età" error={errors.age_range}>
              <select
                value={form.age_range}
                onChange={(e) => set("age_range", e.target.value)}
                className="flex h-12 w-full rounded-lg border border-white/12 bg-white/8 px-4 py-3 text-sm text-white outline-none transition focus:border-racing-cyan/70 focus:ring-2 focus:ring-racing-cyan/20 [&>option]:bg-asphalt-900"
              >
                {AGE_RANGES.map((a) => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Personalizza la tua Tessera" hint={`Numero da ${CARD_MIN} a ${CARD_MAX}`} error={errors.card_number}>
              <Input
                inputMode="numeric"
                value={form.card_number}
                onChange={(e) => set("card_number", e.target.value.replace(/[^\d]/g, ""))}
                className={field("card_number")}
                required
              />
            </Field>
          </div>

          {/* Stili di guida */}
          <CheckboxGroup
            legend="Lo stile di motociclista che ti descrive meglio"
            options={RIDING_STYLES}
            selected={form.riding_styles}
            onToggle={(v) => toggleIn("riding_styles", v)}
          />

          {/* Interessi per sconti */}
          <CheckboxGroup
            legend="Quali sconti ti interessano di più?"
            options={DISCOUNT_INTERESTS}
            selected={form.discount_interests}
            onToggle={(v) => toggleIn("discount_interests", v)}
          />

          {/* Gruppo */}
          <Field label="Fai parte di un gruppo?">
            <select
              value={form.group_name}
              onChange={(e) => set("group_name", e.target.value)}
              className="flex h-12 w-full rounded-lg border border-white/12 bg-white/8 px-4 py-3 text-sm text-white outline-none transition focus:border-racing-cyan/70 focus:ring-2 focus:ring-racing-cyan/20 [&>option]:bg-asphalt-900"
            >
              {GROUP_NAMES.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </Field>

          {/* Newsletter */}
          <label className="flex items-start gap-3 text-sm text-white/70">
            <input
              type="checkbox"
              checked={form.newsletter}
              onChange={(e) => set("newsletter", e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-racing-orange"
            />
            Iscrivimi alla newsletter
          </label>

          {/* Privacy Policy */}
          <label className={errors.privacy_accepted ? "rounded-lg border border-racing-orange/50 bg-racing-orange/10 p-3" : "flex items-start gap-3 text-sm text-white/70"}>
            <input
              type="checkbox"
              checked={form.privacy_accepted}
              onChange={(e) => set("privacy_accepted", e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-racing-orange"
            />
            <span>
              Accetta la{" "}
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
            {loading ? "Creazione in corso..." : "Crea il mio account"}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-white/55">
          Hai già un account?{" "}
          <button type="button" onClick={() => { onClose(); onSwitchToLogin(); }} className="font-bold text-racing-orange underline-offset-2 hover:underline">
            Accedi
          </button>
        </p>
      </div>
    </div>
  );
}

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <span className="text-sm font-bold text-white/76">{label}</span>
      {children}
      {hint && !error ? <span className="text-xs text-white/42">{hint}</span> : null}
      {error ? <span className="text-sm font-bold text-racing-orange">{error}</span> : null}
    </div>
  );
}

function CheckboxGroup({
  legend,
  options,
  selected,
  onToggle,
}: {
  legend: string;
  options: readonly { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <fieldset className="grid gap-2">
      <legend className="text-sm font-bold text-white/76">{legend}</legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {options.map((option) => {
          const checked = selected.includes(option.value);
          return (
            <label
              key={option.value}
              className={
                checked
                  ? "flex cursor-pointer items-center gap-2 rounded-lg border border-racing-orange/60 bg-racing-orange/10 px-3 py-2.5 text-sm font-bold text-white"
                  : "flex cursor-pointer items-center gap-2 rounded-lg border border-white/12 bg-white/5 px-3 py-2.5 text-sm text-white/70 transition hover:bg-white/10"
              }
            >
              <input type="checkbox" checked={checked} onChange={() => onToggle(option.value)} className="h-4 w-4 accent-racing-orange" />
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
