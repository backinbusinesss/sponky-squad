import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock, MapPin } from "lucide-react";
import { SectionHeader } from "@/components/SectionHeader";
import { Button } from "@/components/ui/button";
import { EventArtPicker } from "@/components/EventArtPicker";
import { events as staticEvents } from "@/data/content";
import { getEventArt } from "@/data/eventArt";
import { api, type ContentEvent } from "@/lib/api";
import { useCountdown } from "@/hooks/useCountdown";
import { cn } from "@/lib/utils";

interface ViewEvent {
  key: string;
  title: string;
  date: string;
  place: string;
  tag: string | null;
  seats: number | null;
  cover: string;
  description: string;
  linkUrl: string | null;
  linkText: string | null;
}

function Countdown({ date }: { date: string }) {
  const countdown = useCountdown(date);
  const items = [
    ["Giorni", countdown.days],
    ["Ore", countdown.hours],
    ["Min", countdown.minutes],
    ["Sec", countdown.seconds],
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-lg border border-white/12 bg-white/8 p-3 text-center">
          <p className="font-display text-4xl leading-none text-white">{String(value).padStart(2, "0")}</p>
          <p className="mt-1 text-[0.7rem] font-bold uppercase text-white/42">{label}</p>
        </div>
      ))}
    </div>
  );
}

function fromStatic(): ViewEvent[] {
  return staticEvents.map((event) => ({
    key: event.title,
    title: event.title,
    date: event.date,
    place: event.place,
    tag: event.tag,
    seats: event.seats,
    cover: event.cover,
    description: event.description,
    linkUrl: null,
    linkText: null,
  }));
}

function fromRemote(rows: ContentEvent[]): ViewEvent[] {
  return rows.map((row) => ({
    key: row.id,
    title: row.title,
    date: row.date,
    place: row.location,
    tag: null,
    seats: null,
    cover: row.graphicId,
    description: row.description,
    linkUrl: row.linkUrl,
    linkText: row.linkText,
  }));
}

/**
 * Calendario eventi.
 *
 * Gli eventi pubblicati dalla dashboard arrivano dall'API; se non ce ne sono
 * (o l'API non risponde) valgono quelli di `content.ts`. La sezione resta cosi'
 * sempre popolata, anche prima che l'admin inserisca qualcosa.
 */
export function EventsSection() {
  const [remote, setRemote] = useState<ViewEvent[] | null>(null);

  const list = useMemo(() => (remote && remote.length > 0 ? remote : fromStatic()), [remote]);

  const [selectedKey, setSelectedKey] = useState(list[0]?.key ?? "");
  const selected = useMemo(
    () => list.find((event) => event.key === selectedKey) ?? list[0],
    [list, selectedKey],
  );

  useEffect(() => {
    let alive = true;
    api
      .content()
      .then((data) => {
        if (alive) setRemote(fromRemote(data.events));
      })
      .catch(() => {
        /* offline: si resta sul calendario statico */
      });
    return () => {
      alive = false;
    };
  }, []);

  // Quando arriva l'elenco dall'API l'evento scelto puo' non esistere piu':
  // in quel caso si torna al primo della lista.
  useEffect(() => {
    if (!list.some((event) => event.key === selectedKey)) {
      setSelectedKey(list[0]?.key ?? "");
    }
  }, [list, selectedKey]);

  // Copertina scelta per ogni evento: parte dal dato e resta in stato locale,
  // cosi' le grafiche si possono provare direttamente in pagina.
  const [covers, setCovers] = useState<Record<string, string>>({});

  if (!selected) return null;

  const cover = getEventArt(covers[selected.key] ?? selected.cover);

  const formattedDate = new Intl.DateTimeFormat("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(selected.date));

  const linkHref = selected.linkUrl || "#iscrizione";
  const linkLabel = selected.linkText || "Prenota posto";
  const external = Boolean(selected.linkUrl);

  return (
    <section id="eventi" className="section-shell overflow-hidden bg-asphalt-950">
      <div className="container">
        <SectionHeader
          eyebrow="Eventi"
          title="Il calendario che chiama la strada"
          copy="Un modulo interattivo per prossimi raduni, track day e serate partner con countdown live e scheda evento."
          align="center"
        />

        <div className="mt-14 grid gap-6 lg:grid-cols-[.95fr_1.05fr]">
          <div data-reveal className="glass-panel rounded-lg p-4 lg:self-start">
            <div className="mb-4 flex items-center gap-3 px-2 text-sm font-bold uppercase text-white/42">
              <CalendarDays className="h-4 w-4 text-racing-orange" />
              Prossime uscite
            </div>
            <div className="grid gap-3">
              {list.map((event) => (
                <button
                  key={event.key}
                  type="button"
                  onClick={() => setSelectedKey(event.key)}
                  className={cn(
                    "rounded-lg border p-5 text-left transition",
                    event.key === selected.key
                      ? "border-racing-orange bg-racing-orange/12"
                      : "border-white/10 bg-white/5 hover:border-racing-cyan/50 hover:bg-white/8",
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-lg font-extrabold text-white">{event.title}</h3>
                    {event.tag ? (
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase text-racing-cyan">
                        {event.tag}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-3 flex items-center gap-2 text-sm text-white/56">
                    <Clock className="h-4 w-4" />
                    {new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(event.date))}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div data-reveal className="relative overflow-hidden rounded-lg border border-white/12 bg-white/6 p-6 shadow-card">
            <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-racing-cyan/18 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-56 w-56 rounded-full bg-racing-orange/20 blur-3xl" />
            <div className="relative">
              {/* copertina scelta per l'evento: e' la foto profilo dell'uscita */}
              <div className="relative mb-6 overflow-hidden rounded-lg border border-white/12">
                <img
                  key={cover.id}
                  src={cover.url}
                  alt={`Copertina evento: ${cover.sceneLabel}`}
                  className="aspect-[16/9] w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-asphalt-950 via-asphalt-950/30 to-transparent" />
                <span className="absolute left-3 top-3 rounded-full border border-racing-cyan/35 bg-asphalt-950/70 px-3 py-1 text-xs font-bold uppercase text-racing-cyan backdrop-blur">
                  Evento selezionato
                </span>
              </div>
              <h3 className="font-display text-6xl uppercase leading-none text-white">{selected.title}</h3>
              <p className="selectable mt-4 flex items-center gap-2 text-white/62">
                <MapPin className="h-4 w-4 text-racing-orange" />
                {selected.place}
              </p>
              <p className="mt-2 text-white/62">{formattedDate}</p>
              {selected.description ? (
                <p className="mt-6 text-base leading-8 text-white/68">{selected.description}</p>
              ) : null}
              <div className="mt-8">
                <Countdown date={selected.date} />
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Button asChild>
                  <a
                    href={linkHref}
                    {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  >
                    {linkLabel}
                  </a>
                </Button>
                {selected.seats !== null ? (
                  <p className="text-sm font-bold uppercase text-white/44">{selected.seats} posti community</p>
                ) : null}
              </div>

              <div className="mt-6">
                <EventArtPicker
                  value={cover.id}
                  onChange={(id) => setCovers((prev) => ({ ...prev, [selected.key]: id }))}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
