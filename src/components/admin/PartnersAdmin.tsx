import { useCallback, useEffect, useState } from "react";
import { ImageOff, MapPin, Store, Tag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ActiveToggle,
  AdminField,
  AdminListShell,
  AdminRowActions,
  FormShell,
  StatusBadge,
} from "@/components/admin/shared";
import { api, ApiError, type ContentPartner } from "@/lib/api";
import { PARTNER_TAGS } from "@/data/options";
import { cn } from "@/lib/utils";

/**
 * Catalogo partner mostrato nella sezione «Sconti che fanno benzina».
 * Ogni scheda ha titolo, immagine, descrizione, luogo e uno o piu' tag
 * scelti fra i 10 disponibili: i tag diventano i filtri della sezione.
 */

interface FormState {
  id: string | null;
  title: string;
  imageUrl: string;
  description: string;
  location: string;
  tags: string[];
  isActive: boolean;
}

const EMPTY: FormState = {
  id: null,
  title: "",
  imageUrl: "",
  description: "",
  location: "",
  tags: [],
  isActive: true,
};

export function PartnersAdminSection() {
  const [rows, setRows] = useState<ContentPartner[]>([]);
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
      setRows(data.partners);
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

  function toggleTag(tag: string) {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter((t) => t !== tag) : [...prev.tags, tag],
    }));
  }

  function startEdit(row: ContentPartner) {
    setForm({
      id: row.id,
      title: row.title,
      imageUrl: row.imageUrl ?? "",
      description: row.description,
      location: row.location,
      tags: row.tags,
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
    if (form.description.trim().length < 2) local.description = "Inserisci la descrizione.";
    setErrors(local);
    setFormError(null);
    if (Object.keys(local).length > 0) return;

    const payload = {
      title: form.title.trim(),
      imageUrl: form.imageUrl.trim(),
      description: form.description.trim(),
      location: form.location.trim(),
      tags: form.tags,
      isActive: form.isActive,
    };

    setSaving(true);
    try {
      if (form.id) {
        const result = await api.adminUpdateContent("partners", form.id, payload);
        const item = result.item as ContentPartner;
        setRows((prev) => prev.map((row) => (row.id === item.id ? item : row)));
      } else {
        const result = await api.adminCreateContent("partners", payload);
        setRows((prev) => [...prev, result.item as ContentPartner]);
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

  async function toggleActive(row: ContentPartner) {
    setBusyId(row.id);
    try {
      const result = await api.adminUpdateContent("partners", row.id, { isActive: !row.isActive });
      const item = result.item as ContentPartner;
      setRows((prev) => prev.map((r) => (r.id === item.id ? item : r)));
    } catch {
      setFormError("Modifica della visibilita' non riuscita.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(row: ContentPartner) {
    if (!window.confirm(`Eliminare il partner "${row.title}"?`)) return;
    setBusyId(row.id);
    try {
      await api.adminDeleteContent("partners", row.id);
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
        <h2 className="font-display text-3xl text-white">Partner</h2>
        <p className="mt-1 text-base text-white/50">
          Le schede del catalogo convenzioni: titolo, immagine, descrizione, luogo e tag.
        </p>
      </div>

      <FormShell
        title={form.id ? "Modifica partner" : "Nuovo partner"}
        subtitle="I tag diventano i filtri della sezione partner sul sito."
        editing={Boolean(form.id)}
        onSubmit={handleSubmit}
        onCancel={() => {
          setForm(EMPTY);
          setErrors({});
        }}
        error={formError}
        saving={saving}
        submitLabel={form.id ? "Salva modifiche" : "Aggiungi partner"}
      >
        <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
          <div className="grid gap-5">
            <AdminField label="Titolo" error={errors.title}>
              <Input
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Synt Chemical"
                className="h-12 text-base"
              />
            </AdminField>

            <AdminField label="Luogo">
              <Input
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
                placeholder="Zola Predosa, BO"
                className="h-12 text-base"
              />
            </AdminField>
          </div>

          {/* Anteprima immagine: si vede subito se il link e' sbagliato */}
          <div className="grid gap-2">
            <span className="text-sm font-bold text-white/75">Immagine</span>
            <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-white/10 bg-white/5">
              {form.imageUrl.trim() ? (
                <img
                  src={form.imageUrl.trim()}
                  alt=""
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <span className="grid h-full place-items-center text-white/25">
                  <ImageOff className="h-8 w-8" />
                </span>
              )}
            </div>
          </div>
        </div>

        <AdminField label="URL immagine" hint="Indirizzo completo dell'immagine (https://…)" error={errors.imageUrl}>
          <Input
            value={form.imageUrl}
            onChange={(e) => set("imageUrl", e.target.value)}
            placeholder="https://esempio.it/logo.png"
            className="h-12 text-base"
          />
        </AdminField>

        <AdminField label="Descrizione" error={errors.description}>
          <Textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            rows={3}
            placeholder="Promo dedicata moto e auto per tutti i soci."
            className="text-base"
          />
        </AdminField>

        <AdminField label="Tag" hint="Seleziona uno o piu' tag fra i 10 disponibili">
          <div className="flex flex-wrap gap-2">
            {PARTNER_TAGS.map((tag) => {
              const checked = form.tags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  aria-pressed={checked}
                  className={cn(
                    "flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold transition",
                    checked
                      ? "border-racing-orange bg-racing-orange text-asphalt-950"
                      : "border-white/12 bg-white/6 text-white/62 hover:border-racing-cyan/60 hover:text-white",
                  )}
                >
                  <Tag className="h-3.5 w-3.5" />
                  {tag}
                </button>
              );
            })}
          </div>
        </AdminField>

        <ActiveToggle checked={form.isActive} onChange={(value) => set("isActive", value)} />
      </FormShell>

      <div className="grid gap-4">
        <h3 className="flex items-center gap-2 font-display text-2xl text-white">
          <Store className="h-5 w-5 text-racing-orange" />
          Catalogo ({rows.length})
        </h3>

        <AdminListShell loading={loading} empty="Nessun partner in catalogo." count={rows.length}>
          {rows.map((row) => (
            <li key={row.id} className="grid gap-4 rounded-xl border border-white/10 bg-white/4 p-4 md:grid-cols-[180px_1fr_auto] md:items-center">
              {row.imageUrl ? (
                <img
                  src={row.imageUrl}
                  alt=""
                  loading="lazy"
                  className="aspect-[4/3] w-full rounded-lg border border-white/10 object-cover"
                />
              ) : (
                <span className="grid aspect-[4/3] w-full place-items-center rounded-lg border border-white/10 bg-white/5 text-white/25">
                  <ImageOff className="h-7 w-7" />
                </span>
              )}

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="font-display text-2xl text-white">{row.title}</p>
                  <StatusBadge active={row.isActive} />
                </div>
                {row.location ? (
                  <p className="mt-1 flex items-center gap-2 text-sm text-white/55">
                    <MapPin className="h-4 w-4 text-racing-orange" />
                    {row.location}
                  </p>
                ) : null}
                <p className="mt-2 line-clamp-2 text-sm text-white/55">{row.description}</p>
                {row.tags.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {row.tags.map((tag) => (
                      <span key={tag} className="rounded-full border border-racing-cyan/30 bg-racing-cyan/10 px-3 py-1 text-xs font-bold uppercase text-racing-cyan">
                        {tag}
                      </span>
                    ))}
                  </div>
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
          ))}
        </AdminListShell>
      </div>
    </div>
  );
}
