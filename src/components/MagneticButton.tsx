import { ArrowRight } from "lucide-react";
import { motion, type HTMLMotionProps, useMotionValue, useSpring } from "framer-motion";
import type { MouseEvent, ReactNode } from "react";
import { cn } from "@/lib/utils";

type MagneticButtonProps = Omit<HTMLMotionProps<"a">, "children"> & {
  children: ReactNode;
  variant?: "primary" | "secondary";
  showArrow?: boolean;
};

export function MagneticButton({
  children,
  className,
  variant = "primary",
  showArrow = true,
  onMouseMove,
  onMouseLeave,
  ...props
}: MagneticButtonProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 180, damping: 16, mass: 0.25 });
  const springY = useSpring(y, { stiffness: 180, damping: 16, mass: 0.25 });

  function handleMove(event: MouseEvent<HTMLAnchorElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    x.set((event.clientX - rect.left - rect.width / 2) * 0.24);
    y.set((event.clientY - rect.top - rect.height / 2) * 0.24);
    onMouseMove?.(event);
  }

  function handleLeave(event: MouseEvent<HTMLAnchorElement>) {
    x.set(0);
    y.set(0);
    onMouseLeave?.(event);
  }

  return (
    <motion.a
      style={{ x: springX, y: springY }}
      data-cursor="accent"
      className={cn(
        "group relative inline-flex min-h-12 items-center justify-center gap-3 overflow-hidden rounded-full px-6 py-3 text-sm font-extrabold uppercase tracking-normal transition duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-racing-cyan",
        variant === "primary"
          ? "bg-racing-orange text-asphalt-950 shadow-neon hover:bg-white"
          : "border border-white/16 bg-white/8 text-white hover:border-racing-cyan/70 hover:bg-racing-cyan/10",
        className,
      )}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      {...props}
    >
      <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/45 to-transparent transition duration-700 group-hover:translate-x-full" />
      <span className="relative">{children}</span>
      {showArrow ? <ArrowRight className="relative h-4 w-4 transition group-hover:translate-x-1" /> : null}
    </motion.a>
  );
}
