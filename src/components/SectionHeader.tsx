import { cn } from "@/lib/utils";

type SectionHeaderProps = {
  eyebrow: string;
  title: string;
  copy?: string;
  align?: "left" | "center";
  className?: string;
};

export function SectionHeader({ eyebrow, title, copy, align = "left", className }: SectionHeaderProps) {
  return (
    <div
      data-reveal
      className={cn(
        "max-w-3xl",
        align === "center" && "mx-auto text-center",
        className,
      )}
    >
      <p className="mb-4 text-sm font-extrabold uppercase tracking-normal text-racing-orange">{eyebrow}</p>
      <h2 className="font-display text-5xl uppercase leading-[0.9] text-white neon-text sm:text-7xl lg:text-8xl">
        {title}
      </h2>
      {copy ? <p className="mt-6 text-base leading-8 text-white/68 sm:text-lg">{copy}</p> : null}
    </div>
  );
}
