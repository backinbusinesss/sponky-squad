import { useCallback, useEffect, useState } from "react";
import { Building2, Check, Loader2, RefreshCw, Search, TestTube2, UserCheck, UserX, X, Eye, EyeOff, LayoutDashboard, Users, Handshake, BarChart3, Shield, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MemberCard } from "@/components/MemberCard";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError, type MemberCard as CardData, type PublicUser } from "@/lib/api";
import { cn } from "@/lib/utils";

type Section = "users" | "partners" | "stats";

export function AdminPage() {
  const { status, user, logout } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [section, setSection] = useState<Section>("users");

  useEffect(() => {
    if (status === "anonymous") { setIsAdmin(false); return; }
    if (status === "authenticated" && user) { setIsAdmin(Boolean(user.isAdmin)); }
  }, [status, user]);

  if (status === "loading" || isAdmin === null) {
    return (
      <Shell>
        <div className="flex min-h-screen items-center justify-center gap-4 text-white/60">
          <Loader2 className="h-10 w-10 animate-spin text-racing-orange" />
          <p className="text-lg">Verifica dei permessi in corso...</p>
        </div>
      </Shell>
    );
  }

  if (!isAdmin) return <AdminLogin onLoggedIn={() => setIsAdmin(true)} />;

  return (
    <Shell>
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden w-72 shrink-0 border-r border-white/10 bg-asphalt-900/60 p-6 lg:block">
          <div className="mb-8 flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-racing-orange text-asphalt-950">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <p className="font-display text-xl text-white">Admin</p>
              <p className="text-xs text-white/40">Sponky Squad</p>
            </div>
          </div>

          <nav className="grid gap-1" aria-label="Navigazione admin">
            <SideLink active={section === "users"} onClick={() => setSection("users")} icon={<Users className="h-5 w-5" />} label="Utenti" />
            <SideLink active={section === "partners"} onClick={() => setSection("partners")} icon={<Handshake className="h-5 w-5" />} label="Richieste partner" />
            <SideLink active={section === "stats"} onClick={() => setSection("stats")} icon={<BarChart3 className="h-5 w-5" />} label="Statistiche" />
          </nav>

          <div className="mt-auto pt-8">
            <button
              type="button"
              onClick={() => { void logout().then(() => (window.location.hash = "#/")); }}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-white/60 transition hover:bg-white/8 hover:text-white"
            >
              <LogOut className="h-5 w-5" />
              Esci dalla dashboard
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-x-hidden">
          {/* Top bar mobile */}
          <header className="sticky top-0 z-20 border-b border-white/10 bg-asphalt-950/90 px-6 py-4 backdrop-blur-xl lg:hidden">
            <div className="flex items-center justify-between">
              <h1 className="font-display text-2xl text-white">Dashboard admin</h1>
              <Button variant="secondary" size="sm" onClick={() => { void logout().then(() => (window.location.hash = "#/")); }}>Esci</Button>
            </div>
            <nav className="mt-3 flex gap-2 overflow-x-auto">
              <Pill active={section === "users"} onClick={() => setSection("users")}>Utenti</Pill>
              <Pill active={section === "partners"} onClick={() => setSection("partners")}>Partner</Pill>
              <Pill active={section === "stats"} onClick={() => setSection("stats")}>Stats</Pill>
            </nav>
          </header>

          <div className="mx-auto max-w-7xl px-6 py-10 lg:px-10 lg:py-12">
            <header className="mb-10 hidden lg:block">
              <p className="text-sm font-bold uppercase tracking-widest text-racing-orange">Pannello riservato</p>
              <h1 className="mt-1 font-display text-5xl text-white">Dashboard amministratore</h1>
              <p className="mt-2 text-base text-white/50">Gestisci utenti, richieste di partnership e statistiche della community.</p>
            </header>

            <section className="rounded-2xl border border-white/10 bg-asphalt-900/40 p-6 lg:p-8">
              {section === "users" ? <UsersSection /> : null}
              {section === "partners" ? <PartnersSection /> : null}
              {section === "stats" ? <StatsSection /> : null}
            </section>
          </div>
        </main>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-asphalt-950 text-white">{children}</div>;
}

function SideLink({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition",
        active
          ? "bg-racing-orange text-asphalt-950 shadow-neon"
          : "text-white/60 hover:bg-white/8 hover:text-white",
      )}
    >
      {icon}
      {label}
    </button>
  );
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
      setError(err instanceof ApiError && err.status === 429 ? err.message : "Credenziali non valide.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Shell>
      <div className="flex min-h-screen items-center justify-center px-4 py-16">
        <div className="w-full max-w-lg">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-2xl bg-racing-orange text-asphalt-950 shadow-neon">
              <Shield className="h-10 w-10" />
            </div>
            <h1 className="font-display text-5xl text-white">Area riservata</h1>
            <p className="mt-2 text-lg text-white/50">Dashboard amministratori Sponky Squad</p>
          </div>

          <form onSubmit={handleSubmit} className="grid gap-5 rounded-2xl border border-white/12 bg-asphalt-900/60 p-8 shadow-2xl" noValidate>
            <div className="grid gap-2">
              <label htmlFor="admin-user" className="text-base font-bold text-white/80">Username</label>
              <Input id="admin-user" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required className="h-14 text-base" />
            </div>
            <div className="grid gap-2">
              <label htmlFor="admin-pass" className="text-base font-bold text-white/80">Password</label>
              <div className="relative">
                <Input id="admin-pass" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required className="h-14 pr-12 text-base" />
                <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white" aria-label={showPassword ? "Nascondi password" : "Mostra password"}>
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {error ? (
              <p role="alert" className="rounded-lg border border-racing-orange/40 bg-racing-orange/10 px-4 py-3 text-base font-bold text-racing-orange">
                {error}
              </p>
            ) : null}

            <Button type="submit" disabled={loading} className="h-14 text-base">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
              {loading ? "Verifica in corso..." : "Accedi alla dashboard"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-white/40">
            <a href="#/" className="underline-offset-2 hover:underline">Torna al sito</a>
          </p>
        </div>
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
  const [pageSize, setPageSize] = useState(25);
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

  useEffect(() => { void load(); }, [load]);

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
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl text-white">Utenti registrati</h2>
          <p className="mt-1 text-base text-white/50">
            <span className="font-bold text-white">{total}</span> totali · <span className="font-bold text-racing-cyan">{active}</span> attivi
          </p>
        </div>
        <Button variant="secondary" onClick={runTest} disabled={testing} className="h-12 px-6 text-base">
          {testing ? <Loader2 className="h-5 w-5 animate-spin" /> : <TestTube2 className="h-5 w-5" />}
          {testing ? "Simulazione..." : "TEST REGISTRAZIONE"}
        </Button>
      </div>

      {testResult ? (
        <div className="rounded-xl border border-racing-cyan/40 bg-racing-cyan/5 p-6">
          <p className="text-lg font-bold text-racing-cyan">
            {testResult.ok ? "Form valido: anteprima account e tessera di un nuovo iscritto." : "Il form con dati di prova non passa la validazione."}
          </p>
          {testResult.ok && testResult.card ? (
            <div className="mt-5 max-w-sm"><MemberCard card={testResult.card} /></div>
          ) : null}
          {testResult.errors ? (
            <ul className="mt-3 list-inside list-disc text-base text-white/70">
              {Object.entries(testResult.errors).map(([key, message]) => (
                <li key={key}><span className="font-bold text-white">{key}:</span> {message}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-80 flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { setPage(1); setSearch(query.trim()); } }}
            placeholder="Cerca per nome, email o codice..."
            className="h-12 pl-12 text-base"
          />
        </div>
        <Button variant="secondary" onClick={() => { setPage(1); setSearch(query.trim()); }} className="h-12 px-6">Cerca</Button>
      </div>

      {loading ? (
        <div className="grid place-items-center py-20 text-white/50">
          <Loader2 className="h-8 w-8 animate-spin text-racing-orange" />
        </div>
      ) : rows.length === 0 ? (
        <p className="py-20 text-center text-lg text-white/50">Nessun utente trovato.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-left text-base">
            <thead className="bg-white/5 text-sm uppercase tracking-wider text-white/50">
              <tr>
                <th className="px-5 py-4">Nome</th>
                <th className="px-5 py-4">Email</th>
                <th className="px-5 py-4">Tessera</th>
                <th className="px-5 py-4">Codice</th>
                <th className="px-5 py-4">Gruppo</th>
                <th className="px-5 py-4">Stili</th>
                <th className="px-5 py-4">Stato</th>
                <th className="px-5 py-4">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/8">
              {rows.map((r) => (
                <tr key={r.id} className={cn("transition hover:bg-white/5", !r.isActive && "opacity-50")}>
                  <td className="px-5 py-4 font-bold text-white">{r.firstName} {r.lastName}</td>
                  <td className="px-5 py-4 text-white/70">{r.email}</td>
                  <td className="px-5 py-4 font-display text-xl text-racing-orange">N° {r.cardNumber}</td>
                  <td className="px-5 py-4 font-mono text-sm tracking-wider text-white/70">{r.memberId}</td>
                  <td className="px-5 py-4 text-white/60">{r.groupName}</td>
                  <td className="px-5 py-4 text-white/50">{r.ridingStyles.join(", ") || "—"}</td>
                  <td className="px-5 py-4">
                    <span className={cn("rounded-full px-3 py-1.5 text-sm font-bold", r.isActive ? "bg-racing-cyan/15 text-racing-cyan" : "bg-white/10 text-white/50")}>
                      {r.isActive ? "Attivo" : "Disattivo"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <Button size="sm" variant={r.isActive ? "secondary" : "primary"} disabled={toggling === r.id} onClick={() => toggle(r)} className="h-10 px-4">
                      {toggling === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : r.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
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
        <div className="flex items-center justify-center gap-4 pt-4">
          <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="h-10 px-4">Precedente</Button>
          <span className="text-base text-white/60">Pagina {page} di {pages}</span>
          <Button size="sm" variant="secondary" disabled={page >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))} className="h-10 px-4">Successiva</Button>
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

  useEffect(() => { void load(); }, [load]);

  async function review(id: string, status: "approved" | "rejected") {
    setActing(id);
    try {
      await api.adminReviewPartner(id, status);
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
      setPending((p) => Math.max(0, p - 1));
    } finally {
      setActing(null);
    }
  }

  return (
    <div className="grid gap-6">
      <h2 className="font-display text-3xl text-white">
        Richieste partner <span className="text-racing-orange">({pending} in attesa)</span>
      </h2>

      {loading ? (
        <div className="grid place-items-center py-20 text-white/50"><Loader2 className="h-8 w-8 animate-spin text-racing-orange" /></div>
      ) : rows.length === 0 ? (
        <p className="py-20 text-center text-lg text-white/50">Nessuna richiesta ricevuta finora.</p>
      ) : (
        <ul className="grid gap-4">
          {rows.map((r) => (
            <li key={r.id} className="rounded-xl border border-white/10 bg-white/5 p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-xl font-bold text-white">
                    <Building2 className="h-5 w-5 text-racing-orange" />
                    {r.company}
                  </p>
                  <p className="mt-1 text-base text-white/60">{r.firstName} {r.lastName} · {r.email} · {r.phone}</p>
                  <p className="mt-1 text-sm text-white/40">Ricevuta il {new Date(r.createdAt).toLocaleDateString("it-IT")}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("rounded-full px-3 py-1.5 text-sm font-bold", r.status === "pending" ? "bg-racing-orange/15 text-racing-orange" : r.status === "approved" ? "bg-racing-cyan/15 text-racing-cyan" : "bg-white/10 text-white/50")}>
                    {r.status === "pending" ? "In attesa" : r.status === "approved" ? "Accettata" : "Rifiutata"}
                  </span>
                  {r.status === "pending" ? (
                    <>
                      <Button size="sm" disabled={acting === r.id} onClick={() => review(r.id, "approved")} className="h-10 px-4">
                        <Check className="h-4 w-4" /> Accetta
                      </Button>
                      <Button size="sm" variant="secondary" disabled={acting === r.id} onClick={() => review(r.id, "rejected")} className="h-10 px-4">
                        <X className="h-4 w-4" /> Rifiuta
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
              <p className="mt-4 border-t border-white/8 pt-4 text-base text-white/70">{r.message}</p>
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
    <div className="grid gap-6">
      <h2 className="font-display text-3xl text-white">Statistiche</h2>

      {loading ? (
        <div className="grid place-items-center py-20 text-white/50"><Loader2 className="h-8 w-8 animate-spin text-racing-orange" /></div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm uppercase tracking-widest text-white/45">Accessi falliti (24h)</p>
            {entries.length === 0 ? (
              <p className="mt-3 text-base text-white/50">Nessun tentativo fallito.</p>
            ) : (
              <ul className="mt-4 grid gap-3">
                {entries.map(([scope, count]) => (
                  <li key={scope} className="flex items-center justify-between">
                    <span className="text-lg text-white/70 capitalize">{scope}</span>
                    <span className="font-display text-4xl text-racing-orange">{count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm uppercase tracking-widest text-white/45">Sicurezza</p>
            <ul className="mt-4 grid gap-3 text-base text-white/60">
              <li>· Rate limiting lato database (IP + email)</li>
              <li>· Password hashate con bcrypt (cost 12)</li>
              <li>· Cookie HttpOnly/Secure/SameSite=None</li>
              <li>· Protezione CSRF su tutti i form</li>
              <li>· Query parametrizzate (no SQL injection)</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
