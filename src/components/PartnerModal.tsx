import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, X, ChevronDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

/**
 * Prefissi telefonici per nazione. L'utente puo' cercare per nome del paese
 * o per il codice numerico. L'Italia (+39) e' il default, come richiesto.
 */
const COUNTRY_CODES = [
  { code: "+39", country: "Italia" },
  { code: "+1", country: "Stati Uniti / Canada" },
  { code: "+44", country: "Regno Unito" },
  { code: "+33", country: "Francia" },
  { code: "+49", country: "Germania" },
  { code: "+34", country: "Spagna" },
  { code: "+41", country: "Svizzera" },
  { code: "+43", country: "Austria" },
  { code: "+32", country: "Belgio" },
  { code: "+31", country: "Paesi Bassi" },
  { code: "+351", country: "Portogallo" },
  { code: "+30", country: "Grecia" },
  { code: "+46", country: "Svezia" },
  { code: "+47", country: "Norvegia" },
  { code: "+45", country: "Danimarca" },
  { code: "+358", country: "Finlandia" },
  { code: "+48", country: "Polonia" },
  { code: "+420", country: "Repubblica Ceca" },
  { code: "+421", country: "Slovacchia" },
  { code: "+36", country: "Ungheria" },
  { code: "+40", country: "Romania" },
  { code: "+359", country: "Bulgaria" },
  { code: "+385", country: "Croazia" },
  { code: "+386", country: "Slovenia" },
  { code: "+381", country: "Serbia" },
  { code: "+382", country: "Montenegro" },
  { code: "+387", country: "Bosnia ed Erzegovina" },
  { code: "+389", country: "Macedonia del Nord" },
  { code: "+355", country: "Albania" },
  { code: "+370", country: "Lituania" },
  { code: "+371", country: "Lettonia" },
  { code: "+372", country: "Estonia" },
  { code: "+380", country: "Ucraina" },
  { code: "+7", country: "Russia" },
  { code: "+90", country: "Turchia" },
  { code: "+20", country: "Egitto" },
  { code: "+212", country: "Marocco" },
  { code: "+213", country: "Algeria" },
  { code: "+216", country: "Tunisia" },
  { code: "+27", country: "Sudafrica" },
  { code: "+234", country: "Nigeria" },
  { code: "+254", country: "Kenya" },
  { code: "+91", country: "India" },
  { code: "+86", country: "Cina" },
  { code: "+81", country: "Giappone" },
  { code: "+82", country: "Corea del Sud" },
  { code: "+65", country: "Singapore" },
  { code: "+60", country: "Malesia" },
  { code: "+66", country: "Thailandia" },
  { code: "+84", country: "Vietnam" },
  { code: "+62", country: "Indonesia" },
  { code: "+63", country: "Filippine" },
  { code: "+61", country: "Australia" },
  { code: "+64", country: "Nuova Zelanda" },
  { code: "+55", country: "Brasile" },
  { code: "+54", country: "Argentina" },
  { code: "+56", country: "Cile" },
  { code: "+57", country: "Colombia" },
  { code: "+52", country: "Messico" },
  { code: "+51", country: "Perù" },
  { code: "+58", country: "Venezuela" },
  { code: "+507", country: "Panama" },
  { code: "+506", country: "Costa Rica" },
  { code: "+503", country: "El Salvador" },
  { code: "+502", country: "Guatemala" },
  { code: "+504", country: "Honduras" },
  { code: "+505", country: "Nicaragua" },
  { code: "+509", country: "Haiti" },
  { code: "+53", country: "Cuba" },
  { code: "+1", country: "Portorico" },
  { code: "+971", country: "Emirati Arabi Uniti" },
  { code: "+966", country: "Arabia Saudita" },
  { code: "+972", country: "Israele" },
  { code: "+962", country: "Giordania" },
  { code: "+961", country: "Libano" },
  { code: "+965", country: "Kuwait" },
  { code: "+974", country: "Qatar" },
  { code: "+973", country: "Bahrein" },
  { code: "+968", country: "Oman" },
  { code: "+963", country: "Siria" },
  { code: "+964", country: "Iraq" },
  { code: "+98", country: "Iran" },
  { code: "+93", country: "Afghanistan" },
  { code: "+92", country: "Pakistan" },
  { code: "+880", country: "Bangladesh" },
  { code: "+94", country: "Sri Lanka" },
  { code: "+977", country: "Nepal" },
  { code: "+975", country: "Bhutan" },
  { code: "+960", country: "Maldive" },
  { code: "+95", country: "Myanmar" },
  { code: "+855", country: "Cambogia" },
  { code: "+856", country: "Laos" },
  { code: "+673", country: "Brunei" },
  { code: "+670", country: "Timor Est" },
  { code: "+675", country: "Papua Nuova Guinea" },
  { code: "+679", country: "Figi" },
  { code: "+685", country: "Samoa" },
  { code: "+676", country: "Tonga" },
  { code: "+687", country: "Nuova Caledonia" },
  { code: "+689", country: "Polinesia Francese" },
].sort((a, b) => a.country.localeCompare(b.country, "it"));

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
    phonePrefix: "+39",
    phoneNumber: "",
    message: "",
    privacy_accepted: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [prefixOpen, setPrefixOpen] = useState(false);
  const [prefixSearch, setPrefixSearch] = useState("");
  const prefixRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setErrors({});
      setFormError(null);
      setSent(false);
      setLoading(false);
      setPrefixOpen(false);
      setPrefixSearch("");
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

  // Chiude il dropdown del prefisso se si clicca fuori
  useEffect(() => {
    if (!prefixOpen) return;
    const onClick = (e: MouseEvent) => {
      if (prefixRef.current && !prefixRef.current.contains(e.target as Node)) {
        setPrefixOpen(false);
        setPrefixSearch("");
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [prefixOpen]);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key] && !prev.phone) return prev;
      const next = { ...prev };
      delete next[key];
      delete next.phone;
      return next;
    });
  }

  const filteredPrefixes = useMemo(() => {
    const q = prefixSearch.trim().toLowerCase();
    if (!q) return COUNTRY_CODES;
    return COUNTRY_CODES.filter(
      (c) => c.country.toLowerCase().includes(q) || c.code.includes(q),
    );
  }, [prefixSearch]);

  const selectedPrefix = COUNTRY_CODES.find((c) => c.code === form.phonePrefix) ?? COUNTRY_CODES[0];

  function clientErrors() {
    const list: Record<string, string> = {};
    if (form.first_name.trim().length < 2) list.first_name = "Inserisci il nome.";
    if (form.last_name.trim().length < 2) list.last_name = "Inserisci il cognome.";
    if (form.company.trim().length < 2) list.company = "Inserisci il nome dell'azienda.";
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(form.email.trim())) list.email = "Indirizzo email non valido.";
    const fullPhone = `${form.phonePrefix} ${form.phoneNumber}`.trim();
    if (!/^[+\d][\d\s()-]{5,}$/.test(fullPhone)) list.phone = "Numero di telefono non valido.";
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
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        company: form.company.trim(),
        email: form.email.trim().toLowerCase(),
        phone: `${form.phonePrefix} ${form.phoneNumber}`.trim(),
        message: form.message.trim(),
        privacy_accepted: true,
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

            <Label text="Email" error={errors.email}>
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={field("email")} autoComplete="email" required />
            </Label>

            {/* Telefono con prefisso cercabile per nazione */}
            <Label text="Telefono" error={errors.phone}>
              <div className="flex gap-2">
                <div ref={prefixRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setPrefixOpen((v) => !v)}
                    className="flex h-12 items-center gap-1.5 rounded-lg border border-white/12 bg-white/8 px-3 text-sm text-white outline-none transition hover:bg-white/12 focus:border-racing-cyan/70 focus:ring-2 focus:ring-racing-cyan/20"
                  >
                    <span className="font-bold">{selectedPrefix.code}</span>
                    <ChevronDown className="h-4 w-4 text-white/40" />
                  </button>
                  {prefixOpen ? (
                    <div className="absolute left-0 top-14 z-50 w-72 rounded-xl border border-white/12 bg-asphalt-900/98 p-2 shadow-2xl backdrop-blur-xl">
                      <div className="relative mb-2">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                        <input
                          type="text"
                          value={prefixSearch}
                          onChange={(e) => setPrefixSearch(e.target.value)}
                          placeholder="Cerca paese o prefisso..."
                          className="flex h-10 w-full rounded-lg border border-white/12 bg-white/8 pl-9 pr-3 text-sm text-white outline-none transition placeholder:text-white/42 focus:border-racing-cyan/70 focus:ring-2 focus:ring-racing-cyan/20"
                          autoFocus
                        />
                      </div>
                      <ul className="max-h-52 overflow-y-auto">
                        {filteredPrefixes.length === 0 ? (
                          <li className="px-3 py-2 text-sm text-white/40">Nessun risultato</li>
                        ) : (
                          filteredPrefixes.map((c) => (
                            <li key={c.code + c.country}>
                              <button
                                type="button"
                                onClick={() => {
                                  set("phonePrefix", c.code);
                                  setPrefixOpen(false);
                                  setPrefixSearch("");
                                }}
                                className={cn(
                                  "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition hover:bg-white/10",
                                  form.phonePrefix === c.code ? "bg-racing-orange/10 text-racing-orange" : "text-white/70",
                                )}
                              >
                                <span>{c.country}</span>
                                <span className="font-bold">{c.code}</span>
                              </button>
                            </li>
                          ))
                        )}
                      </ul>
                    </div>
                  ) : null}
                </div>
                <Input
                  type="tel"
                  value={form.phoneNumber}
                  onChange={(e) => set("phoneNumber", e.target.value)}
                  className={field("phone")}
                  placeholder="333 123 4567"
                  autoComplete="tel-national"
                  required
                />
              </div>
            </Label>

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
