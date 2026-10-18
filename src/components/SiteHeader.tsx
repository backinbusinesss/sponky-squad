import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { asset } from "@/lib/asset";
import { navItems } from "@/data/content";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useRoute, navigate } from "@/lib/router";

/**
 * Header del sito.
 *
 * Due comportamenti da notare, entrammi voluti dal cliente:
 *
 * 1. Se non si è loggati appare "Accedi" (apre la modale di login). Appena si
 *    ha una sessione sparisce e al suo posto c'è "Ciao, [Nome]", che porta su
 *    /account. Il passaggio avviene solo dopo che /api/me ha confermato: non ci
 *    si fida dello stato locale.
 *
 * 2. Tre click rapidi sul logo attivano un rombo di scarico: un'animazione
 *    breve sul logo più un flash. È un easter egg, non ha effetti sul resto.
 */

const LOGO_TRIPLE_CLICK_MS = 700;

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [exhaust, setExhaust] = useState(false);
  const clickTimes = useRef<number[]>([]);
  const { status, user } = useAuth();
  const route = useRoute();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // easter egg: 3 click sul logo entro 700ms l'uno dall'altro
  function handleLogoClick() {
    const now = Date.now();
    clickTimes.current = [...clickTimes.current.filter((t) => now - t < LOGO_TRIPLE_CLICK_MS), now];
    if (clickTimes.current.length >= 3) {
      clickTimes.current = [];
      setExhaust(true);
      window.setTimeout(() => setExhaust(false), 1400);
    }
  }

  const loggedIn = status === "authenticated" && user;

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition duration-300",
        scrolled ? "border-b border-white/10 bg-asphalt-950/78 shadow-2xl backdrop-blur-xl" : "bg-transparent",
      )}
    >
      <div className="container flex h-20 items-center justify-between gap-4">
        <a
          href="#/"
          onClick={handleLogoClick}
          className="group flex items-center gap-3"
          aria-label="Sponky Squad home"
          data-cursor="accent"
        >
          <span
            className={cn(
              "grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-white/8 shadow-neon transition",
              exhaust && "animate-pulse border-racing-orange/70 shadow-[0_0_30px_rgba(255,110,26,.6)]",
            )}
          >
            <img
              src={asset("/assets/sponky-logo-original.webp")}
              alt=""
              className={cn("h-7 w-7 object-contain transition-transform duration-500", exhaust && "animate-bounce")}
            />
          </span>
          <span className="font-display text-3xl leading-none text-white">Sponky Squad</span>

          {/* onda sonora del rombo di scarico, visibile solo durante l'easter egg */}
          {exhaust ? (
            <span
              aria-hidden
              className="ml-1 flex items-end gap-0.5"
            >
              {[0, 1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  className="w-1 rounded bg-racing-orange"
                  style={{
                    height: `${8 + Math.random() * 14}px`,
                    animation: "exhaustWave 400ms ease-in-out infinite alternate",
                    animationDelay: `${i * 60}ms`,
                  }}
                />
              ))}
            </span>
          ) : null}
        </a>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Navigazione principale">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-full px-4 py-2 text-sm font-bold text-white/66 transition hover:bg-white/8 hover:text-white"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Button variant="secondary" onClick={() => window.dispatchEvent(new CustomEvent("sponky:open-partner"))}>
            Partner
          </Button>

          {loggedIn ? (
            <Button asChild>
              <a href="#/account">Ciao, {user.firstName}</a>
            </Button>
          ) : status === "loading" ? (
            // niente pulsante finché non sappiamo se c'è una sessione: un
            // "Accedi" che sparisce mezzo secondo dopo è peggio di un attimo
            // di attesa
            <span className="h-11 w-24 animate-pulse rounded-full bg-white/8" aria-hidden />
          ) : (
            <Button asChild>
              <a href="#login" onClick={(e) => { e.preventDefault(); openLogin(); }}>Accedi</a>
            </Button>
          )}
        </div>

        <Button
          className="lg:hidden"
          variant="secondary"
          size="icon"
          aria-label={open ? "Chiudi menu" : "Apri menu"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {open ? (
        <div className="border-t border-white/10 bg-asphalt-950/94 px-4 pb-6 pt-3 backdrop-blur-xl lg:hidden">
          <nav className="grid gap-2" aria-label="Navigazione mobile">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-lg px-4 py-3 font-bold text-white/76 hover:bg-white/8 hover:text-white"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <button
              type="button"
              className="rounded-lg px-4 py-3 text-left font-bold text-white/76 hover:bg-white/8 hover:text-white"
              onClick={() => { setOpen(false); window.dispatchEvent(new CustomEvent("sponky:open-partner")); }}
            >
              Partner
            </button>
            {loggedIn ? (
              <Button asChild className="mt-2" onClick={() => setOpen(false)}>
                <a href="#/account">Ciao, {user.firstName}</a>
              </Button>
            ) : (
              <>
                <Button asChild className="mt-2" onClick={() => setOpen(false)}>
                  <a href="#iscrizione">Iscriviti gratis</a>
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => { setOpen(false); openLogin(); }}
                >
                  Accedi
                </Button>
              </>
            )}
          </nav>
        </div>
      ) : null}

      <style>{`@keyframes exhaustWave { from { transform: scaleY(.4); } to { transform: scaleY(1); } }`}</style>
    </header>
  );

  // apre la modale di login delegandola al genitore tramite un evento custom
  function openLogin() {
    window.dispatchEvent(new CustomEvent("sponky:open-login"));
    if (route === "account" || route === "admin") navigate("home");
  }
}
