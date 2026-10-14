import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig(() => ({
  plugins: [react()],
  // GitHub Pages serve il sito da /<repo>/, in locale resta "/"
  // (npm run deploy imposta VITE_BASE=/sponky-squad/)
  base: process.env.VITE_BASE ?? "/",
  // Consente il sito anche quando esposto da un tunnel pubblico (npm run share)
  server: { allowedHosts: true },
  preview: { allowedHosts: true },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    target: "es2022",
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ["three", "@react-three/fiber", "@react-three/drei", "@react-three/postprocessing"],
          animation: ["gsap", "framer-motion", "lenis"],
          forms: ["react-hook-form", "@hookform/resolvers", "zod"],
        },
      },
    },
  },
}));
