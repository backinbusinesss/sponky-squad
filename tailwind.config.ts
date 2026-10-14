import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        md: "2rem",
        xl: "3rem",
      },
    },
    extend: {
      fontFamily: {
        display: ["Bebas Neue", "Impact", "sans-serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        asphalt: {
          950: "#050507",
          900: "#0a0b0f",
          800: "#11131a",
          700: "#191c26",
        },
        racing: {
          orange: "#e74e0f",
          red: "#9a1e1e",
          cyan: "#f4f4f4",
          lime: "#bac0c8",
          chrome: "#d7d7d7",
        },
      },
      boxShadow: {
        neon: "0 0 24px rgba(231, 78, 15, 0.28), 0 0 56px rgba(255, 255, 255, 0.08)",
        card: "0 30px 80px rgba(0, 0, 0, 0.45)",
      },
      backgroundImage: {
        "radial-neon":
          "radial-gradient(circle at 20% 20%, rgba(231,78,15,.24), transparent 28%), radial-gradient(circle at 82% 8%, rgba(255,255,255,.08), transparent 24%), linear-gradient(135deg, #050507 0%, #111111 52%, #1d1d1b 100%)",
        "road-lines":
          "linear-gradient(90deg, transparent 0 46%, rgba(255,255,255,.22) 46% 48%, transparent 48% 52%, rgba(255,255,255,.22) 52% 54%, transparent 54%)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        scan: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "0.45" },
          "50%": { opacity: "1" },
        },
        ticker: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.24s ease-out",
        "accordion-up": "accordion-up 0.24s ease-out",
        scan: "scan 2.2s linear infinite",
        pulseGlow: "pulseGlow 2.4s ease-in-out infinite",
        ticker: "ticker 24s linear infinite",
      },
      opacity: {
        6: "0.06",
        8: "0.08",
        12: "0.12",
        14: "0.14",
        16: "0.16",
        18: "0.18",
        22: "0.22",
        24: "0.24",
        26: "0.26",
        28: "0.28",
        32: "0.32",
        34: "0.34",
        35: "0.35",
        36: "0.36",
        38: "0.38",
        42: "0.42",
        44: "0.44",
        45: "0.45",
        46: "0.46",
        48: "0.48",
        52: "0.52",
        54: "0.54",
        56: "0.56",
        58: "0.58",
        62: "0.62",
        64: "0.64",
        66: "0.66",
        68: "0.68",
        72: "0.72",
        78: "0.78",
        85: "0.85",
        94: "0.94",
      },
    },
  },
  plugins: [],
} satisfies Config;
