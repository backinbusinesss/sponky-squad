import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { navItems } from "@/data/content";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition duration-300",
        scrolled ? "border-b border-white/10 bg-asphalt-950/78 shadow-2xl backdrop-blur-xl" : "bg-transparent",
      )}
    >
      <div className="container flex h-20 items-center justify-between gap-4">
        <a href="#top" className="group flex items-center gap-3" aria-label="Sponky Squad home" data-cursor="accent">
          <span className="grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-white/8 shadow-neon">
            <img src="/assets/sponky-logo-original.webp" alt="" className="h-7 w-7 object-contain" />
          </span>
          <span className="font-display text-3xl leading-none text-white">Sponky Squad</span>
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
          <Button variant="secondary" asChild>
            <a href="#partner">Partner</a>
          </Button>
          <Button asChild>
            <a href="#iscrizione">Iscriviti gratis</a>
          </Button>
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
            <Button asChild className="mt-2">
              <a href="#iscrizione" onClick={() => setOpen(false)}>
                Iscriviti gratis
              </a>
            </Button>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
