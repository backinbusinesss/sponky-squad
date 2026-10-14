import type { CSSProperties, MouseEvent, PropsWithChildren } from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type TiltCardProps = PropsWithChildren<{
  className?: string;
  glow?: string;
}>;

export function TiltCard({ children, className, glow = "rgba(255, 122, 24, 0.18)" }: TiltCardProps) {
  const [style, setStyle] = useState<CSSProperties>({});

  function onMove(event: MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const rotateY = ((x / rect.width) - 0.5) * 12;
    const rotateX = ((y / rect.height) - 0.5) * -12;

    setStyle({
      transform: `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`,
      background: `radial-gradient(circle at ${x}px ${y}px, ${glow}, transparent 38%), rgba(255,255,255,.055)`,
    });
  }

  return (
    <div
      data-cursor="accent"
      className={cn(
        "rounded-lg border border-white/12 bg-white/6 transition duration-300 will-change-transform hover:border-racing-orange/45",
        className,
      )}
      style={style}
      onMouseMove={onMove}
      onMouseLeave={() => setStyle({})}
    >
      {children}
    </div>
  );
}
