import { useCallback, useEffect, useState } from "react";
import { Building2, Check, Loader2, RefreshCw, Search, TestTube2, UserCheck, UserX, X, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MemberCard } from "@/components/MemberCard";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError, type MemberCard as CardData, type PublicUser } from "@/lib/api";
import { cn } from "@/lib/utils";

/**
 * Dashboard /admin.
 *
 * Due ingressi: la stessa sessione normale, ma solo se l'account ha il flag
 * is_admin, oppure il login admin dedicato. Il server ricontrolla il flag sul
 * database a ogni richiesta (non si fida del claim dentro il token), quindi un
 * utente normale non entra nemmeno digitando l'URL a mano.
 */

type Section = "users" | "partners" | "stats";

export function AdminPage() {
  const { status, user, logout } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [section, setSection] = useState<Section>("users");

  // decide se l'utente attuale può vedere la dashboard
  useEffect(() => {
    if (status === "anonymous") {
      setIsAdmin(false);
      return;
    }
    if (status === "authenticated" && user) {
      setIsAdmin(Boolean(user.isAdmin));
    }
  }, [status, user]);

  if (status === "loading" || isAdmin === null) {
    return (
      <Shell>
        <div className="grid place-items-center gap-4 py-32 text-white/60">
          <Loader2 className="h-8 w-8 animate-spin text-racing-orange" />
          <p>Verifica dei permessi...</p>
        </div>
      </Shell>
    );
  }

  if (!isAdmin) {
    return <AdminLogin onLoggedIn={() => setIsAdmin(true)} />;
  }

  return (
    <Shell>
      <div className="mx-auto max-w-6xl px-4 pb-24 pt-28">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-racing-orange">Pannello riservato</p>
            <h1 className="font-display text-4xl text-white">Dashboard admin</h1>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              void logout().then(() => (window.location.hash = "#/"));
            }}
          >
            Esci
          </Button>
        </header>

        <nav className="mb-6 flex gap-2" aria-label="Sezioni admin">
          <Pill active={section === "users"} onClick={() => setSection("users")}>Utenti</Pill>
          <Pill active={section === "partners"} onClick={() => setSection("partners")}>Richieste partner</Pill>
          <Pill active={section === "stats"} onClick={() => setSection("stats")}>Statistiche</Pill>
        </nav>

        <section className="rounded-2xl border border-white/12 bg-asphalt-900/50 p-6">
          {section === "users" ? <UsersSection /> : null}
          {section === "partners" ? <PartnersSection /> : null}
          {section === "stats" ? <StatsSection /> : null}
        </section>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-asphalt-950 text-white">{children}</div>;
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-4 py-2 text-sm font-bold transition",
        active ? "bg-racing-orange text-asphalt-950 shadow-neon" : "border border-white/15 bg-white/8 text-white/70 hover:bg-white/12",
      )}
    >
      {children}
    </button>
  );
}

/** Form di login admin, separato dal login normale. */
function AdminLogin({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      await api.adminLogin({ username: username.trim(), password });
      onLoggedIn();
    } catch (err) {
      // stesso messaggio per utente inesistente, password sbagliata e non-admin:
      // non si deve scoprire quali account sono amministratori.
      setError(err instanceof ApiError && err.status === 429 ? err.message : "Credenziali non valide.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Shell>
      <div className="mx-auto max-w-md px-4 py-32">
        <h1 className="font-display text-4xl text-white">Accesso admin</h1>
        <p className="mt-2 text-white/55">Area riservata agli amministratori Sponky Squad.</p>

        <form onSubmit={handleSubmit} className="mt-8 grid gap-4 rounded-2xl border border-white/12 bg-asphalt-900/50 p-6" noValidate>
          <div className="grid gap-1.5">
            <label htmlFor="admin-user" className="text-sm font-bold text-white/76">Username</label>
            <Input id="admin-user" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="admin-pass" className="text-sm font-bold text-white/76">Password</label>
            <div className="relative">
              <Input id="admin-pass" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
              <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white" aria-label={showPassword ? "Nascondi password" : "Mostra password"}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error ? (
            <p role="alert" className="rounded-lg border border-racing-orange/40 bg-racing-orange/10 px-4 py-3 text-sm font-bold text-racing-orange">
              {error}
            </p>
          ) : null}

          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {loading ? "Verifica..." : "Accedi alla dashboard"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-white/45">
          <a href="#/" className="underline-offset-2 hover:underline">Torna al sito</a>
        </p>
      </div>
    </Shell>
  );
}

/** Elenco utenti con ricerca, paginazione e attiva/disattiva. */
function UsersSection() {
  const [rows, setRows] = useState<PublicUser[]>([]);
  const [total, setTotal] = useState(0);
  const [active, setActive] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ ok: boolean; errors: Record<string, string> | null; card: CardData | null } | null>(null);
  const [testing, setTesting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.adminUsers({ page, size: pageSize, q: search });
      setRows(data.users);
      setTotal(data.total);
      setActive(data.active);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search]);

  useEffect(() => {
    void load();
  }, [load]);

  const pages = Math.max(1, Math.ceil(total / pageSize));

  async function toggle(user: PublicUser) {
    setToggling(user.id);
    try {
      await api.adminToggleUser(user.id, !user.isActive);
      setRows((prev) => prev.map((r) => (r.id === user.id ? { ...r, isActive: !user.isActive } : r)));
    } finally {
      setToggling(null);
    }
  }

  async function runTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await api.adminTestRegistration();
      setTestResult({ ok: result.ok, errors: result.errors, card: result.card });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl text-white">Utenti registrati</h2>
        <Button variant="secondary" onClick={runTest} disabled={testing}>
          {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube2 className="h-4 w-4" />}
          {testing ? "Simulazione..." : "TEST REGISTRAZIONE"}
        </Button>
      </div>

      {/* anteprima della simulazione: account + tessera fittizia, niente scrittura sul DB */}
      {testResult ? (
        <div className="rounded-xl border border-racing-cyan/40 bg-racing-cyan/5 p-5">
          <p className="font-bold text-racing-cyan">
            {testResult.ok ? "Form valido: questo è l'account e la tessera che vedrebbe un nuovo iscritto." : "Il form con dati di prova non passa la validazione."}
          </p>
          {testResult.ok && testResult.card ? (
            <div className="mt-4 max-w-md">
              <MemberCard card={testResult.card} />
            </div>
          ) : null}
          {testResult.errors ? (
            <ul className="mt-3 list-inside list-disc text-sm text-white/70">
              {Object.entries(testResult.errors).map(([key, message]) => (
                <li key={key}><span className="font-bold text-white">{key}:</span> {message}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-64 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setPage(1);
                setSearch(query.trim());
              }
            }}
            placeholder="Cerca per nome, email o codice..."
            className="pl-9"
          />
        </div>
        <Button variant="secondary" onClick={() => { setPage(1); setSearch(query.trim()); }}>
          Cerca
        </Button>
        <p className="text-sm text-white/55">
          <span className="font-bold text-white">{total}</span> totali · <span className="font-bold text-racing-cyan">{active}</span> attivi
        </p>
      </div>

      {loading ? (
        <div className="grid place-items-center py-16 text-white/50">
          <Loader2 className="h-6 w-6 animate-spin text-racing-orange" />
        </div>
      ) : rows.length === 0 ? (
        <p className="py-16 text-center text-white/50">Nessun utente trovato.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/12">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-xs uppercase tracking-wider text-white/50">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Tessera</th>
                <th className="px-4 py-3">Codice</th>
                <th className="px-4 py-3">Gruppo</th>
                <th className="px-4 py-3">Stili</th>
                <th className="px-4 py-3">Stato</th>
                <th className="px-4 py-3">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/8">
              {rows.map((r) => (
                <tr key={r.id} className={cn("transition hover:bg-white/5", !r.isActive && "opacity-55")}>
                  <td className="px-4 py-3 font-bold text-white">{r.firstName} {r.lastName}</td>
                  <td className="px-4 py-3 text-white/70">{r.email}</td>
                  <td className="px-4 py-3 font-display text-racing-orange">N° {r.cardNumber}</td>
                  <td className="px-4 py-3 font-mono text-xs tracking-wider text-white/70">{r.memberId}</td>
                  <td className="px-4 py-3 text-white/60">{r.groupName}</td>
                  <td className="px-4 py-3 text-white/50">{r.ridingStyles.join(", ") || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", r.isActive ? "bg-racing-cyan/15 text-racing-cyan" : "bg-white/10 text-white/50")}>
                      {r.isActive ? "Attivo" : "Disattivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant={r.isActive ? "secondary" : "primary"} disabled={toggling === r.id} onClick={() => toggle(r)}>
                      {toggling === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : r.isActive ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                      {r.isActive ? "Disattiva" : "Attiva"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 ? (
        <div className="flex items-center justify-center gap-3">
          <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Precedente</Button>
          <span className="text-sm text-white/60">Pagina {page} di {pages}</span>
          <Button size="sm" variant="secondary" disabled={page >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))}>Successiva</Button>
        </div>
      ) : null}
    </div>
  );
}

/** Richieste di partnership ricevute. */
function PartnersSection() {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof api.adminPartners>>["requests"]>([]);
  const [pending, setPending] = useState(0);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.adminPartners();
      setRows(data.requests);
      setPending(data.pending);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function review(id: string, status: "approved" | "rejected") {
    setActing(id);
    try {
      await api.adminReviewPartner(id, status);
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
      // review() è raggiungibile solo da righe pending, quindi il contatore
      // scende sempre di uno.
      setPending((p) => Math.max(0, p - 1));
    } finally {
      setActing(null);
    }
  }

  return (
    <div className="grid gap-5">
      <h2 className="font-display text-2xl text-white">
        Richieste partner <span className="text-racing-orange">({pending} in attesa)</span>
      </h2>

      {loading ? (
        <div className="grid place-items-center py-16 text-white/50"><Loader2 className="h-6 w-6 animate-spin text-racing-orange" /></div>
      ) : rows.length === 0 ? (
        <p className="py-16 text-center text-white/50">Nessuna richiesta ricevuta finora.</p>
      ) : (
        <ul className="grid gap-3">
          {rows.map((r) => (
            <li key={r.id} className="rounded-xl border border-white/12 bg-white/5 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 font-bold text-white">
                    <Building2 className="h-4 w-4 text-racing-orange" />
                    {r.company}
                  </p>
                  <p className="text-sm text-white/60">{r.firstName} {r.lastName} · {r.email} · {r.phone}</p>
                  <p className="mt-1 text-xs text-white/40">Ricevuta il {new Date(r.createdAt).toLocaleDateString("it-IT")}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", r.status === "pending" ? "bg-racing-orange/15 text-racing-orange" : r.status === "approved" ? "bg-racing-cyan/15 text-racing-cyan" : "bg-white/10 text-white/50")}>
                    {r.status === "pending" ? "In attesa" : r.status === "approved" ? "Accettata" : "Rifiutata"}
                  </span>
                  {r.status === "pending" ? (
                    <>
                      <Button size="sm" disabled={acting === r.id} onClick={() => review(r.id, "approved")}>
                        <Check className="h-3.5 w-3.5" /> Accetta
                      </Button>
                      <Button size="sm" variant="secondary" disabled={acting === r.id} onClick={() => review(r.id, "rejected")}>
                        <X className="h-3.5 w-3.5" /> Rifiuta
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
              <p className="mt-3 border-t border-white/8 pt-3 text-sm text-white/70">{r.message}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Statistiche di base. */
function StatsSection() {
  const [data, setData] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const result = await api.adminStats();
        setData(result.failedLast24h);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const entries = Object.entries(data ?? {});

  return (
    <div className="grid gap-5">
      <h2 className="font-display text-2xl text-white">Statistiche</h2>

      {loading ? (
        <div className="grid place-items-center py-16 text-white/50"><Loader2 className="h-6 w-6 animate-spin text-racing-orange" /></div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-white/12 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-wider text-white/45">Accessi falliti (24h)</p>
              {entries.length === 0 ? (
                <p className="mt-2 text-sm text-white/50">Nessun tentativo fallito.</p>
              ) : (
                <ul className="mt-2 grid gap-2">
                  {entries.map(([scope, count]) => (
                    <li key={scope} className="flex items-center justify-between">
                      <span className="text-sm text-white/70 capitalize">{scope}</span>
                      <span className="font-display text-2xl text-racing-orange">{count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-xl border border-white/12 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-wider text-white/45">Nota</p>
              <p className="mt-2 text-sm text-white/60">
                Il rate limiting è lato database: i tentativi falliti vengono contati per combinazione di IP ed email,
                così un attacco a un solo account non blocca gli altri iscritti.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-white/12 bg-white/5 p-5">
            <p className="flex items-center gap-2 text-xs uppercase tracking-wider text-white/45">
              <RefreshCw className="h-3.5 w-3.5" /> Aggiorna
            </p>
            <p className="mt-2 text-sm text-white/60">Ricarica la pagina per aggiornare le statistiche.</p>
          </div>
        </>
      )}
    </div>
  );
}
