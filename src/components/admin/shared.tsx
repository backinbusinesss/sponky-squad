import type { ReactNode } from "react";
import { Loader2, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Elementi comuni alle sezioni contenuti della dashboard.
 * Estratti qui perche' eventi, domande e partner condividono la stessa
 * impaginazione dei campi: un solo posto da toccare se cambia lo stile.
 */

export function AdminField({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-bold text-white/75">{label}</span>
      {children}
      {hint && !error ? <span className="text-xs text-white/40">{hint}</span> : null}
      {error ? <span className="text-sm font-bold text-racing-orange">{error}</span> : null}
    </label>
  );
}

export function ActiveToggle({
  checked,
  onChange,
  label = "Visibile sul sito",
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label?: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-sm font-bold text-white/75">
      <span
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition",
          checked ? "bg-racing-cyan/80" : "bg-white/15",
        )}
        aria-hidden="true"
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white transition",
            checked ? "left-[1.4rem]" : "left-0.5",
          )}
        />
      </span>
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

export function FormShell({
  title,
  subtitle,
  editing,
  onSubmit,
  onCancel,
  error,
  saving,
  submitLabel,
  children,
}: {
  title: string;
  subtitle: string;
  editing: boolean;
  onSubmit: (event: React.FormEvent) => void;
  onCancel: () => void;
  error: string | null;
  saving: boolean;
  submitLabel: string;
  children: ReactNode;
}) {
  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className={cn(
        "grid gap-5 rounded-xl border p-6",
        editing ? "border-racing-orange/50 bg-racing-orange/5" : "border-white/10 bg-white/4",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-2xl text-white">{title}</h3>
          <p className="text-sm text-white/45">{subtitle}</p>
        </div>
        {editing ? (
          <Button type="button" variant="secondary" size="sm" onClick={onCancel} className="h-10 px-4">
            <X className="h-4 w-4" /> Annulla modifica
          </Button>
        ) : null}
      </div>

      {children}

      {error ? (
        <p role="alert" className="rounded-lg border border-racing-orange/40 bg-racing-orange/10 px-4 py-3 text-sm font-bold text-racing-orange">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={saving} className="h-12 justify-self-start px-8 text-base">
        {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
        {saving ? "Salvataggio..." : submitLabel}
      </Button>
    </form>
  );
}

export function AdminListShell({
  loading,
  empty,
  count,
  children,
}: {
  loading: boolean;
  empty: string;
  count: number;
  children: ReactNode;
}) {
  if (loading) {
    return (
      <div className="grid place-items-center py-16 text-white/50">
        <Loader2 className="h-8 w-8 animate-spin text-racing-orange" />
      </div>
    );
  }
  if (count === 0) {
    return <p className="py-16 text-center text-lg text-white/50">{empty}</p>;
  }
  return <ul className="grid gap-4">{children}</ul>;
}

export function AdminRowActions({
  onEdit,
  onDelete,
  busy,
  active,
  onToggleActive,
}: {
  onEdit: () => void;
  onDelete: () => void;
  busy: boolean;
  active: boolean;
  onToggleActive: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={onToggleActive} className="h-10 px-4">
        {active ? "Nascondi" : "Pubblica"}
      </Button>
      <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={onEdit} className="h-10 px-4">
        <Pencil className="h-4 w-4" /> Modifica
      </Button>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={busy}
        onClick={onDelete}
        className="h-10 px-4 text-racing-orange hover:bg-racing-orange/10"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Elimina
      </Button>
    </div>
  );
}

export function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "rounded-full px-3 py-1.5 text-xs font-bold uppercase",
        active ? "bg-racing-cyan/15 text-racing-cyan" : "bg-white/10 text-white/50",
      )}
    >
      {active ? "Pubblicato" : "Nascosto"}
    </span>
  );
}
