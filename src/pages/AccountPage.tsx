import { useEffect, useState } from "react";
import { CreditCard, IdCard, Loader2, LogOut, Settings, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MemberCard } from "@/components/MemberCard";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError, type MemberCard as CardData, type PublicUser } from "@/lib/api";
import { RIDING_STYLES, DISCOUNT_INTERESTS, AGE_RANGES, GROUP_NAMES } from "@/data/options";
import { cn } from "@/lib/utils";

/**
 * Pagina /account.
 *
 * Layout a sidebar come da richiesta: "Dettagli account", "La mia tessera",
 * "Il mio gruppo", "Log Out". La prima scheda è il form di modifica dati, la
 * seconda è la tessera grafica.
 *
 * Protezione: se non c'è una sessione aperta (o l'API risponde 401) la pagina
 * non mostra niente di privato, ma un invito ad accedere. Il vero controllo è
 * comunque lato server: /api/me e /api/account rifiutano chi non ha un cookie
 * valido, quindi anche andando a mano sull'URL non si legge alcun dato.
 */

type Tab = "details" | "card" | "group";

export function AccountPage() {
  const { status, user, logout, refresh } = useAuth();
  const [tab, setTab] = useState<Tab>("details");

  if (status === "loading") {
    return (
      <Shell>
        <div className="grid place-items-center gap-4 py-32 text-white/60">
          <Loader2 className="h-8 w-8 animate-spin text-racing-orange" />
          <p>Verifica della sessione in corso...</p>
        </div>
      </Shell>
    );
  }

  if (status === "anonymous" || !user) {
    return (
      <Shell>
        <div className="mx-auto max-w-lg py-32 text-center">
          <h1 className="font-display text-4xl text-white">Il tuo account</h1>
          <p className="mt-3 text-white/60">
            Devi effettuare l'accesso per vedere la tua tessera e i tuoi dati.
          </p>
          <Button className="mt-6" onClick={() => (window.location.hash = "#/")}>
            Torna alla home
          </Button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mx-auto max-w-6xl px-4 pb-24 pt-28">
        <header className="mb-8">
          <p className="text-sm font-bold uppercase tracking-wider text-racing-orange">Il mio account</p>
          <h1 className="font-display text-4xl text-white">Ciao, {user.firstName}</h1>
        </header>

        <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
          <nav className="flex gap-2 overflow-x-auto lg:flex-col" aria-label="Sezioni account">
            <TabButton active={tab === "details"} onClick={() => setTab("details")} icon={<Settings className="h-4 w-4" />}>
              Dettagli account
            </TabButton>
            <TabButton active={tab === "card"} onClick={() => setTab("card")} icon={<IdCard className="h-4 w-4" />}>
              La mia tessera
            </TabButton>
            <TabButton active={tab === "group"} onClick={() => setTab("group")} icon={<Users className="h-4 w-4" />}>
              Il mio gruppo
            </TabButton>
            <button
              type="button"
              onClick={() => {
                void logout().then(() => (window.location.hash = "#/"));
              }}
              className="mt-2 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-racing-orange/90 transition hover:bg-racing-orange/10"
            >
              <LogOut className="h-4 w-4" />
              Log Out
            </button>
          </nav>

          <section className="min-w-0 rounded-2xl border border-white/12 bg-asphalt-900/50 p-6">
            {tab === "details" ? <DetailsTab user={user} onSaved={refresh} /> : null}
            {tab === "card" ? <CardTab user={user} /> : null}
            {tab === "group" ? <GroupTab user={user} /> : null}
          </section>
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-asphalt-950 text-white">{children}</div>;
}

function TabButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition",
        active ? "bg-racing-orange text-asphalt-950 shadow-neon" : "text-white/70 hover:bg-white/8 hover:text-white",
      )}
    >
      {icon}
      {children}
    </button>
  );
}

/** Scheda "Dettagli account": form di modifica dei dati personali. */
function DetailsTab({ user, onSaved }: { user: PublicUser; onSaved: () => Promise<void> }) {
  const [form, setForm] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    cap: user.cap,
    ageRange: user.ageRange,
    groupName: user.groupName,
    ridingStyles: user.ridingStyles,
    discountInterests: user.discountInterests,
    newsletter: user.newsletter,
  });
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleIn(key: "ridingStyles" | "discountInterests", value: string) {
    setForm((prev) => {
      const list = prev[key];
      return { ...prev, [key]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value] };
    });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    setErrors({});
    setNotice(null);
    setSaving(true);
    try {
      await api.updateAccount({
        ...form,
        currentPassword: currentPassword || undefined,
        newPassword: newPassword || undefined,
      });
      setCurrentPassword("");
      setNewPassword("");
      setNotice({ kind: "ok", text: "Dati salvati." });
      await onSaved();
    } catch (err) {
      if (err instanceof ApiError && err.errors && Object.keys(err.errors).length > 0) {
        setErrors(err.errors);
      } else {
        setNotice({ kind: "err", text: err instanceof ApiError ? err.message : "Salvataggio non riuscito." });
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5" noValidate>
      <h2 className="font-display text-2xl text-white">Dettagli account</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <Labeled label="Nome" error={errors.firstName}>
          <Input value={form.firstName} onChange={(e) => set("firstName", e.target.value)} />
        </Labeled>
        <Labeled label="Cognome" error={errors.lastName}>
          <Input value={form.lastName} onChange={(e) => set("lastName", e.target.value)} />
        </Labeled>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Labeled label="Email" hint="L'email non è modificabile: è la tua credenziale di accesso.">
          <Input value={user.email} disabled />
        </Labeled>
        <Labeled label="Numero tessera" hint={`N° ${user.cardNumber} · non modificabile`}>
          <Input value={String(user.cardNumber)} disabled />
        </Labeled>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Labeled label="CAP" error={errors.cap}>
          <Input inputMode="numeric" maxLength={5} value={form.cap} onChange={(e) => set("cap", e.target.value)} />
        </Labeled>
        <Labeled label="Fascia d'età" error={errors.ageRange}>
          <select
            value={form.ageRange}
            onChange={(e) => set("ageRange", e.target.value)}
            className="flex h-12 w-full rounded-lg border border-white/12 bg-white/8 px-4 py-3 text-sm text-white outline-none transition focus:border-racing-cyan/70 focus:ring-2 focus:ring-racing-cyan/20 [&>option]:bg-asphalt-900"
          >
            {AGE_RANGES.map((a) => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
        </Labeled>
      </div>

      <Labeled label="Gruppo" error={errors.groupName}>
        <select
          value={form.groupName}
          onChange={(e) => set("groupName", e.target.value)}
          className="flex h-12 w-full rounded-lg border border-white/12 bg-white/8 px-4 py-3 text-sm text-white outline-none transition focus:border-racing-cyan/70 focus:ring-2 focus:ring-racing-cyan/20 [&>option]:bg-asphalt-900"
        >
          {GROUP_NAMES.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </Labeled>

      <MiniGroup legend="Stili di guida" options={RIDING_STYLES} selected={form.ridingStyles} onToggle={(v) => toggleIn("ridingStyles", v)} />
      <MiniGroup legend="Interessi per gli sconti" options={DISCOUNT_INTERESTS} selected={form.discountInterests} onToggle={(v) => toggleIn("discountInterests", v)} />

      <label className="flex items-center gap-3 text-sm text-white/70">
        <input type="checkbox" checked={form.newsletter} onChange={(e) => set("newsletter", e.target.checked)} className="h-4 w-4 accent-racing-orange" />
        Voglio ricevere news su raduni, sconti ed eventi
      </label>

      <div className="mt-2 rounded-xl border border-white/12 bg-white/5 p-4">
        <p className="text-sm font-bold text-white/76">Cambia password</p>
        <p className="mt-1 text-xs text-white/45">Lascia vuoto per non modificare. Serve la password attuale.</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <Labeled label="Password attuale" error={errors.currentPassword}>
            <Input type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </Labeled>
          <Labeled label="Nuova password" error={errors.newPassword}>
            <Input type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </Labeled>
        </div>
      </div>

      {notice ? (
        <p
          role="status"
          className={cn(
            "rounded-lg px-4 py-3 text-sm font-bold",
            notice.kind === "ok" ? "border border-racing-cyan/40 bg-racing-cyan/10 text-racing-cyan" : "border border-racing-orange/40 bg-racing-orange/10 text-racing-orange",
          )}
        >
          {notice.text}
        </p>
      ) : null}

      <Button type="submit" disabled={saving} className="justify-self-start">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {saving ? "Salvataggio..." : "Salva modifiche"}
      </Button>
    </form>
  );
}

/** Scheda "La mia tessera". */
function CardTab({ user }: { user: PublicUser }) {
  const card: CardData = {
    cardNumber: user.cardNumber,
    memberId: user.memberId,
    holderName: `${user.firstName} ${user.lastName}`.trim(),
    group: user.groupName,
    ageRange: user.ageRange,
    ridingStyles: user.ridingStyles,
    discountInterests: user.discountInterests,
    cap: user.cap,
    issuedAt: user.createdAt,
  };

  return (
    <div className="grid gap-5">
      <h2 className="font-display text-2xl text-white">La mia tessera</h2>
      <p className="-mt-2 text-sm text-white/55">La tua tessera ufficiale Sponky Squad. Portala ai raduni e agli eventi partner.</p>
      <MemberCard card={card} />
      <p className="flex items-center gap-2 text-xs text-white/40">
        <CreditCard className="h-4 w-4" />
        Mostra questa tessera per accedere agli sconti dei partner.
      </p>
    </div>
  );
}

/** Scheda "Il mio gruppo". */
function GroupTab({ user }: { user: PublicUser }) {
  return (
    <div className="grid gap-5">
      <h2 className="font-display text-2xl text-white">Il mio gruppo</h2>
      <div className="rounded-xl border border-white/12 bg-white/5 p-6">
        <p className="text-xs uppercase tracking-wider text-white/45">Gruppo attuale</p>
        <p className="mt-1 font-display text-3xl text-racing-orange">{user.groupName || "Nessun gruppo"}</p>
        <p className="mt-3 text-sm text-white/55">
          Il gruppo compare sulla tua tessera. Puoi cambiarlo in qualsiasi momento dalla scheda "Dettagli account".
        </p>
      </div>
      <div className="rounded-xl border border-white/12 bg-white/5 p-6">
        <p className="text-xs uppercase tracking-wider text-white/45">I tuoi stili di guida</p>
        {user.ridingStyles.length > 0 ? (
          <ul className="mt-2 flex flex-wrap gap-2">
            {user.ridingStyles.map((value) => (
              <li key={value} className="rounded-full border border-racing-cyan/40 bg-racing-cyan/10 px-3 py-1 text-xs font-bold text-racing-cyan">
                {value}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-white/55">Nessuno stile selezionato.</p>
        )}
      </div>
    </div>
  );
}

function Labeled({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <span className="text-sm font-bold text-white/76">{label}</span>
      {children}
      {hint && !error ? <span className="text-xs text-white/42">{hint}</span> : null}
      {error ? <span className="text-sm font-bold text-racing-orange">{error}</span> : null}
    </div>
  );
}

function MiniGroup({ legend, options, selected, onToggle }: { legend: string; options: readonly { value: string; label: string }[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <fieldset className="grid gap-2">
      <legend className="text-sm font-bold text-white/76">{legend}</legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {options.map((option) => {
          const checked = selected.includes(option.value);
          return (
            <label
              key={option.value}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition",
                checked ? "border-racing-orange/60 bg-racing-orange/10 font-bold text-white" : "border-white/12 bg-white/5 text-white/70 hover:bg-white/10",
              )}
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
