import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";
import { ArrowUpRight, Facebook, Heart, Instagram, MessageCircle, Radio } from "lucide-react";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { SectionHeader } from "@/components/SectionHeader";
import { loadSocialStats, socialPosts, socialSnapshot, type SocialPlatform, type SocialStats } from "@/data/social";
import { cn, formatNumber } from "@/lib/utils";

/**
 * Serie storica disegnata come area: la pendenza e' il messaggio, quindi si
 * normalizza sulla serie e non sull'asse, cosi' un salto di due follower non
 * sembra un crollo. Il gradiente va dall'accento al trasparente per non
 * seppellire la griglia sotto.
 */
function Sparkline({ series, id }: { series: number[]; id: string }) {
  const W = 300;
  const H = 76;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;

  const points = series.map((value, index) => {
    const x = (index / (series.length - 1)) * W;
    const y = H - 6 - ((value - min) / span) * (H - 18);
    return [x, y] as const;
  });

  const line = points.map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join("");
  const area = `${line}L${W} ${H}L0 ${H}Z`;
  const last = points[points.length - 1];
  const first = points[0];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-[76px] w-full" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity=".34" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1="0" y1={H - 1} x2={W} y2={H - 1} stroke="#ffffff" strokeOpacity=".1" />
      <path d={area} fill={`url(#${id}-fill)`} />
      <path d={line} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={first[0]} cy={first[1]} r="3" fill="#05060A" stroke="currentColor" strokeWidth="2" />
      <circle cx={last[0]} cy={last[1]} r="4.5" fill="currentColor" />
      <circle cx={last[0]} cy={last[1]} r="9" fill="currentColor" opacity=".28" />
    </svg>
  );
}

function LiveDot() {
  return (
    <span className="relative flex h-2.5 w-2.5 shrink-0">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-racing-orange opacity-70" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-racing-orange" />
    </span>
  );
}

const PlatformIcon = {
  instagram: Instagram,
  facebook: Facebook,
} as const;

const accentClass = {
  instagram: "text-racing-orange",
  facebook: "text-racing-cyan",
} as const;

function PlatformCard({ platform, syncedLabel }: { platform: SocialPlatform; syncedLabel: string }) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const Icon = PlatformIcon[platform.key];

  const metrics = [
    { label: "Post", value: formatNumber(platform.posts) },
    { label: "Copertura 7 gg", value: formatNumber(platform.reach) },
    { label: "Engagement", value: `${platform.engagement.toString().replace(".", ",")}%` },
  ];

  return (
    <article
      ref={ref}
      data-reveal
      className="glass-panel relative overflow-hidden rounded-lg p-5 sm:p-6"
      style={{ color: undefined }}
    >
      <div className={cn("pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full blur-3xl", platform.key === "instagram" ? "bg-racing-orange/16" : "bg-racing-cyan/16")} />

      <header className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={cn("grid h-11 w-11 place-items-center rounded-lg border border-white/12 bg-white/8", accentClass[platform.key])}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="font-display text-xl uppercase leading-none text-white">{platform.name}</p>
            <a
              href={platform.href}
              target="_blank"
              rel="noreferrer"
              className="mt-1.5 inline-flex min-h-9 items-center gap-1 text-sm font-bold text-white/56 underline-offset-4 transition hover:text-white hover:underline"
            >
              {platform.handle}
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-racing-orange/40 bg-racing-orange/12 px-2.5 py-1 text-[0.65rem] font-extrabold uppercase text-racing-orange">
          <LiveDot />
          Live
        </span>
      </header>

      <div className="relative mt-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div>
          <p className="font-display text-5xl leading-none text-white sm:text-6xl">
            <AnimatedCounter value={platform.followers} />
          </p>
          <p className="mt-2 text-xs font-bold uppercase text-white/48">Follower</p>
        </div>
        <p className={cn("inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/8 px-3 py-1.5 text-sm font-extrabold", platform.followersDelta >= 0 ? "text-emerald-300" : "text-red-300")}>
          <span aria-hidden="true">{platform.followersDelta >= 0 ? "▲" : "▼"}</span>
          {platform.followersDelta >= 0 ? "+" : ""}
          {formatNumber(platform.followersDelta)}
          <span className="font-bold text-white/44">/ 7 gg</span>
        </p>
      </div>

      <div className={cn("relative mt-5", accentClass[platform.key])}>
        <Sparkline series={platform.series} id={`spark-${platform.key}`} />
      </div>
      <p className="relative mt-1 flex items-center justify-between text-[0.7rem] font-bold uppercase text-white/38">
        <span>30 giorni fa</span>
        <span>Oggi</span>
      </p>

      <dl className="relative mt-5 grid grid-cols-3 gap-2 border-t border-white/10 pt-5">
        {metrics.map((metric) => (
          <div key={metric.label}>
            <dt className="text-[0.65rem] font-bold uppercase leading-4 text-white/44">{metric.label}</dt>
            <dd className="mt-1 font-display text-xl leading-none text-white">{metric.value}</dd>
          </div>
        ))}
      </dl>

      <p className="relative mt-4 text-[0.7rem] font-bold uppercase text-white/32">Ultimo aggiornamento · {syncedLabel}</p>
    </article>
  );
}

function PostCard({ post }: { post: (typeof socialPosts)[number] }) {
  const Icon = PlatformIcon[post.platform];
  const accent = accentClass[post.platform];

  return (
    <a
      href={post.platform === "instagram" ? "https://www.instagram.com/sponkysquad/" : "https://www.facebook.com/"}
      target="_blank"
      rel="noreferrer"
      data-reveal
      className="group flex min-h-9 flex-col overflow-hidden rounded-lg border border-white/10 bg-white/5 transition hover:border-white/25 hover:bg-white/8"
    >
      <div className="relative aspect-4/5 overflow-hidden bg-asphalt-900">
        <img
          src={post.image}
          alt={post.caption}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
        />
        <div className="absolute inset-0 bg-linear-to-t from-asphalt-950 via-asphalt-950/25 to-transparent" />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-asphalt-950/85 px-2.5 py-1 text-[0.65rem] font-extrabold uppercase text-white backdrop-blur-sm">
          <Icon className={cn("h-3 w-3", accent)} aria-hidden="true" />
          {post.ago}
        </span>
        <p className="absolute bottom-0 left-0 right-0 p-3 text-sm font-semibold leading-5 text-white/92">{post.caption}</p>
      </div>
      <div className="flex items-center justify-between gap-3 px-3 py-3">
        <p className="min-w-0 truncate text-xs font-bold uppercase text-white/48">{post.place}</p>
        <p className="flex shrink-0 items-center gap-3 text-xs font-bold text-white/56">
          <span className="inline-flex items-center gap-1">
            <Heart className={cn("h-3.5 w-3.5", accent)} aria-hidden="true" />
            {formatNumber(post.likes)}
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
            {formatNumber(post.comments)}
          </span>
        </p>
      </div>
    </a>
  );
}

export function SocialLiveSection() {
  const [stats, setStats] = useState<SocialStats>(socialSnapshot);

  useEffect(() => {
    let cancelled = false;
    void loadSocialStats().then((next) => {
      if (!cancelled) {
        setStats(next);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const totalFollowers = stats.platforms.reduce((sum, platform) => sum + platform.followers, 0);

  return (
    <section id="social" className="section-shell bg-asphalt-900">
      <div className="container">
        <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <SectionHeader
            eyebrow="Social live"
            title="La squad, in tempo reale"
            copy="Follower e post della pagina Instagram e di quella Facebook, letti sul colpo: crescita a 30 giorni, delta settimanale e le ultime uscite."
            className="max-w-2xl"
          />
          <div data-reveal className="glass-panel flex shrink-0 items-center gap-3 rounded-lg px-4 py-3">
            <Radio className="h-5 w-5 text-racing-orange" aria-hidden="true" />
            <div>
              <p className="font-display text-3xl leading-none text-white">
                <AnimatedCounter value={totalFollowers} />
              </p>
              <p className="mt-1 text-[0.7rem] font-bold uppercase text-white/48">Follower totali</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {stats.platforms.map((platform) => (
            <PlatformCard key={platform.key} platform={platform} syncedLabel={stats.syncedLabel} />
          ))}
        </div>

        <div className="mt-10 flex items-end justify-between gap-4">
          <h3 data-reveal className="font-display text-3xl uppercase leading-none text-white sm:text-4xl">
            Post recenti
          </h3>
          <p data-reveal className="text-sm font-bold uppercase text-white/44">
            Ultimi 7 giorni
          </p>
        </div>

        <div className="mt-6 grid gap-4 min-[480px]:grid-cols-2 xl:grid-cols-4">
          {socialPosts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      </div>
    </section>
  );
}
