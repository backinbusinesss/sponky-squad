import { useCallback, useEffect, useState } from "react";
import { HelpCircle, Link2 } from "lucide-react";
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
import { api, ApiError, type ContentFaq } from "@/lib/api";
import { LinkedText } from "@/lib/linkify";

/**
 * Gestione delle domande frequenti ("domande prima di partire").
 *
 * Si aggiungono, modificano, nascondono ed eliminano le coppie domanda/
 * risposta. Nella risposta i link possono essere scritti in due modi:
 *   [testo](https://esempio.it)  oppure  https://esempio.it
 * L'anteprima qui sotto mostra esattamente come usciranno sul sito.
 */

interface FormState {
  id: string | null;
  question: string;
  answer: string;
  isActive: boolean;
}

const EMPTY: FormState = { id: null, question: "", answer: "", isActive: true };

export function FaqAdminSection() {
  const [rows, setRows] = useState<ContentFaq[]>([]);
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
      setRows(data.faqs);
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

  function startEdit(row: ContentFaq) {
    setForm({ id: row.id, question: row.question, answer: row.answer, isActive: row.isActive });
    setErrors({});
    setFormError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;

    const local: Record<string, string> = {};
    if (form.question.trim().length < 3) local.question = "Inserisci la domanda.";
    if (form.answer.trim().length < 2) local.answer = "Inserisci la risposta.";
    setErrors(local);
    setFormError(null);
    if (Object.keys(local).length > 0) return;

    const payload = {
      question: form.question.trim(),
      answer: form.answer.trim(),
      isActive: form.isActive,
    };

    setSaving(true);
    try {
      if (form.id) {
        const result = await api.adminUpdateContent("faq", form.id, payload);
        const item = result.item as ContentFaq;
        setRows((prev) => prev.map((row) => (row.id === item.id ? item : row)));
      } else {
        const result = await api.adminCreateContent("faq", payload);
        setRows((prev) => [...prev, result.item as ContentFaq]);
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

  async function toggleActive(row: ContentFaq) {
    setBusyId(row.id);
    try {
      const result = await api.adminUpdateContent("faq", row.id, { isActive: !row.isActive });
      const item = result.item as ContentFaq;
      setRows((prev) => prev.map((r) => (r.id === item.id ? item : r)));
    } catch {
      setFormError("Modifica della visibilita' non riuscita.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(row: ContentFaq) {
    if (!window.confirm(`Eliminare la domanda "${row.question}"?`)) return;
    setBusyId(row.id);
    try {
      await api.adminDeleteContent("faq", row.id);
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
        <h2 className="font-display text-3xl text-white">Domande frequenti</h2>
        <p className="mt-1 text-base text-white/50">
          Le domande della sezione «Domande prima di partire». Puoi aggiungerne, modificarle
          o eliminarle: l'ordine segue quello di creazione, dall'alto verso il basso.
        </p>
      </div>

      <FormShell
        title={form.id ? "Modifica domanda" : "Nuova domanda"}
        subtitle="Nella risposta puoi inserire link cliccabili."
        editing={Boolean(form.id)}
        onSubmit={handleSubmit}
        onCancel={() => {
          setForm(EMPTY);
          setErrors({});
        }}
        error={formError}
        saving={saving}
        submitLabel={form.id ? "Salva modifiche" : "Aggiungi domanda"}
      >
        <AdminField label="Domanda" error={errors.question}>
          <Input
            value={form.question}
            onChange={(e) => set("question", e.target.value)}
            placeholder="L'iscrizione e' davvero gratuita?"
            className="h-12 text-base"
          />
        </AdminField>

        <AdminField
          label="Risposta"
          hint="Link: [testo](https://esempio.it) oppure incolla direttamente https://esempio.it"
          error={errors.answer}
        >
          <Textarea
            value={form.answer}
            onChange={(e) => set("answer", e.target.value)}
            rows={5}
            placeholder="Si. La tessera e' gratuita: ti registri e ricevi subito l'accesso. Dettagli su [sponkysquad.it](https://www.sponkysquad.it)."
            className="text-base"
          />
        </AdminField>

        {form.answer.trim() ? (
          <div className="rounded-xl border border-white/10 bg-asphalt-950/60 p-4">
            <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-white/40">
              <Link2 className="h-3.5 w-3.5" /> Anteprima sul sito
            </p>
            <p className="text-base leading-7 text-white/75">
              <LinkedText text={form.answer} />
            </p>
          </div>
        ) : null}

        <ActiveToggle checked={form.isActive} onChange={(value) => set("isActive", value)} />
      </FormShell>

      <div className="grid gap-4">
        <h3 className="flex items-center gap-2 font-display text-2xl text-white">
          <HelpCircle className="h-5 w-5 text-racing-orange" />
          Domande ({rows.length})
        </h3>

        <AdminListShell loading={loading} empty="Nessuna domanda: la sezione del sito e' vuota." count={rows.length}>
          {rows.map((row) => (
            <li key={row.id} className="grid gap-4 rounded-xl border border-white/10 bg-white/4 p-5 lg:grid-cols-[1fr_auto] lg:items-start">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-xl font-bold text-white">{row.question}</p>
                  <StatusBadge active={row.isActive} />
                </div>
                <p className="mt-2 text-base leading-7 text-white/65">
                  <LinkedText text={row.answer} />
                </p>
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
