import { footerLinks } from "@/data/content";

export function Footer() {
  return (
    <footer id="footer" className="bg-asphalt-950 py-10">
      <div className="container flex flex-col gap-8 border-t border-white/10 pt-8 md:flex-row md:items-center md:justify-between">
        <div>
          <a href="#top" className="inline-flex items-center gap-3" data-cursor="accent">
            <img src="/assets/sponky-logo-original.webp" alt="" className="h-10 w-10 rounded-full bg-white/8 object-contain p-2" />
            <span className="font-display text-3xl uppercase leading-none text-white">Sponky Squad</span>
          </a>
          <p className="mt-3 max-w-lg text-sm leading-6 text-white/48">
            Progetto creato da motociclisti per motociclisti. Layout demo pronto per asset, copy legale e integrazioni reali.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {footerLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="rounded-full border border-white/10 px-4 py-2 text-sm font-bold text-white/54 transition hover:border-racing-orange/50 hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
