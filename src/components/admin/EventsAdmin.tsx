import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Link2, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EventArtPicker } from "@/components/EventArtPicker";
import {
  ActiveToggle,
  AdminField,
  AdminListShell,
  AdminRowActions,
  FormShell,
  StatusBadge,
} from "@/components/admin/shared";
import { api, ApiError, type ContentEvent } from "@/lib/api";
import { getEventArt } from "@/data/eventArt";

/**
 * Gestione eventi: data, luogo, descrizione, grafica 2D di copertina e un
 * eventuale link (testo + indirizzo) per il pulsante di iscrizione.
 * Gli eventi salvati qui sono gli stessi che la sezione pubblica mostra.
 */

interface FormState {
  id: string | null;
  title: string;
  date: string;
  location: string;
  description: string;
  graphicId: string;
  linkText: string;
  linkUrl: string;
  isActive: boolean;
}

const EMPTY: FormState = {
  id: null,
  title: "",
  date: "",
  location: "",
  description: "",
  graphicId: "art-01",
  linkText: "",
  linkUrl: "",
  isActive: true,
};

/** ISO -> valore per <input type="datetime-local">, in ora locale. */
function toLocalInput(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Data non valida";
  return new Intl.DateTimeFormat("it-IT", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function EventsAdminSection() {
  const [rows, setRows] = useState<ContentEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.content();
      setRows(data.events);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function startEdit(row: ContentEvent) {
    setForm({
      id: row.id,
      title: row.title,
      date: toLocalInput(row.date),
      location: row.location,
      description: row.description,
      graphicId: row.graphicId,
      linkText: row.linkText ?? "",
      linkUrl: row.linkUrl ?? "",
      isActive: row.isActive,
    });
    setErrors({});
    setFormError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;

    const local: Record<string, string> = {};
    if (form.title.trim().length < 2) local.title = "Inserisci il titolo.";
    if (!form.date) local.date = "Scegli data e ora.";
    if (form.location.trim().length < 2) local.location = "Inserisci il luogo.";
    setErrors(local);
    setFormError(null);
    if (Object.keys(local).length > 0) return;

    const payload = {
      title: form.title.trim(),
      date: new Date(form.date).toISOString(),
      location: form.location.trim(),
      description: form.description.trim(),
      graphicId: form.graphicId,
      linkText: form.linkText.trim(),
      linkUrl: form.linkUrl.trim(),
      isActive: form.isActive,
    };

    setSaving(true);
    try {
      if (form.id) {
        const result = await api.adminUpdateContent("events", form.id, payload);
        const item = result.item as ContentEvent;
        setRows((prev) => prev.map((row) => (row.id === item.id ? item : row)));
      } else {
        const result = await api.adminCreateContent("events", payload);
        setRows((prev) => [...prev, result.item as ContentEvent].sort((a, b) => a.date.localeCompare(b.date)));
      }
      setForm(EMPTY);
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.errors).length > 0) setErrors(err.errors);
      else if (err instanceof ApiError) setFormError(err.message);
      else setFormError("Salvataggio non riuscito.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(row: ContentEvent) {
    setBusyId(row.id);
    try {
      const result = await api.adminUpdateContent("events", row.id, { isActive: !row.isActive });
      const item = result.item as ContentEvent;
      setRows((prev) => prev.map((r) => (r.id === item.id ? item : r)));
    } catch {
      setFormError("Modifica della visibilita' non riuscita.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(row: ContentEvent) {
    if (!window.confirm(`Eliminare l'evento "${row.title}"?`)) return;
    setBusyId(row.id);
    try {
      await api.adminDeleteContent("events", row.id);
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      if (form.id === row.id) setForm(EMPTY);
    } catch {
      setFormError("Eliminazione non riuscita.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="grid gap-8">
      <div>
        <h2 className="font-display text-3xl text-white">Eventi</h2>
        <p className="mt-1 text-base text-white/50">
          Aggiungi uscite e raduni: compariranno nel calendario del sito con la grafica scelta.
        </p>
      </div>

      <FormShell
        title={form.id ? "Modifica evento" : "Nuovo evento"}
        subtitle={
          form.id
            ? "Stai modificando un evento pubblicato."
            : "Data, luogo e una delle copertine grafiche disponibili."
        }
        editing={Boolean(form.id)}
        onSubmit={handleSubmit}
        onCancel={() => {
          setForm(EMPTY);
          setErrors({});
        }}
        error={formError}
        saving={saving}
        submitLabel={form.id ? "Salva modifiche" : "Aggiungi evento"}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <AdminField label="Titolo" error={errors.title}>
            <Input
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Neon Ride Milano"
              className="h-12 text-base"
            />
          </AdminField>

          <AdminField label="Data e ora" error={errors.date}>
            <Input
              type="datetime-local"
              value={form.date}
              onChange={(e) => set("date", e.target.value)}
              className="h-12 text-base"
            />
          </AdminField>

          <AdminField label="Luogo" error={errors.location}>
            <Input
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder="Milano, Piazza Gae Aulenti"
              className="h-12 text-base"
            />
          </AdminField>

          <AdminField label="Testo del pulsante" hint="Vuoto = «Prenota posto»">
            <Input
              value={form.linkText}
              onChange={(e) => set("linkText", e.target.value)}
              placeholder="Iscriviti all'evento"
              className="h-12 text-base"
            />
          </AdminField>
        </div>

        <AdminField label="Link del pulsante" hint="Indirizzo completo (https://…) oppure un'ancora del sito (#iscrizione)" error={errors.linkUrl}>
          <div className="relative">
            <Link2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
            <Input
              value={form.linkUrl}
              onChange={(e) => set("linkUrl", e.target.value)}
              placeholder="https://…"
              className="h-12 pl-11 text-base"
            />
          </div>
        </AdminField>

        <AdminField label="Descrizione">
          <Textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            rows={3}
            placeholder="Un giro serale tra luci urbane, pit stop partner e arrivo social."
            className="text-base"
          />
        </AdminField>

        <EventArtPicker value={form.graphicId} onChange={(id) => set("graphicId", id)} />

        <ActiveToggle checked={form.isActive} onChange={(value) => set("isActive", value)} />
      </FormShell>

      <div className="grid gap-4">
        <h3 className="flex items-center gap-2 font-display text-2xl text-white">
          <CalendarDays className="h-5 w-5 text-racing-orange" />
          Calendario ({rows.length})
        </h3>

        <AdminListShell loading={loading} empty="Nessun evento in calendario." count={rows.length}>
          {rows.map((row) => {
            const art = getEventArt(row.graphicId);
            return (
              <li
                key={row.id}
                className="grid gap-4 rounded-xl border border-white/10 bg-white/4 p-4 md:grid-cols-[200px_1fr_auto] md:items-center"
              >
                <img
                  src={art.url}
                  alt=""
                  loading="lazy"
                  className="aspect-[16/9] w-full rounded-lg border border-white/10 object-cover"
                />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="font-display text-2xl text-white">{row.title}</p>
                    <StatusBadge active={row.isActive} />
                  </div>
                  <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/55">
                    <span className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-racing-cyan" />
                      {formatDate(row.date)}
                    </span>
                    <span className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-racing-orange" />
                      {row.location}
                    </span>
                  </p>
                  {row.description ? (
                    <p className="mt-2 line-clamp-2 text-sm text-white/55">{row.description}</p>
                  ) : null}
                  {row.linkUrl ? (
                    <p className="mt-2 text-xs font-bold uppercase text-white/40">
                      Pulsante: {row.linkText || "Prenota posto"} → {row.linkUrl}
                    </p>
                  ) : null}
                </div>
                <AdminRowActions
                  active={row.isActive}
                  busy={busyId === row.id}
                  onEdit={() => startEdit(row)}
                  onDelete={() => void remove(row)}
                  onToggleActive={() => void toggleActive(row)}
                />
              </li>
            );
          })}
        </AdminListShell>
      </div>
    </div>
  );
}


