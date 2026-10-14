# Sponky Squad Immersive

Rebuild moderno del sito Sponky Squad con React, Vite, TypeScript, Tailwind, Framer Motion, GSAP, Lenis e scena 3D in React Three Fiber.

## Stack

- React 18 + Vite + TypeScript
- Tailwind CSS con componenti stile shadcn/ui
- Three.js + `@react-three/fiber` + `@react-three/drei` + postprocessing
- GSAP ScrollTrigger + Lenis
- Framer Motion
- React Hook Form + Zod

## Setup

```bash
npm install
npm run dev
```

Build production:

```bash
npm run build
npm run preview
```

## Link condivisibile

Per mandare il sito ad altre persone direttamente dal tuo PC (senza deploy):

```bash
npm run share
```

Avvia la preview della build e la espone su un link pubblico del tipo
`https://xxxx.trycloudflare.com` (Cloudflare Quick Tunnel, nessun account).
Il link resta vivo finche resta aperto il terminale: eseguilo, copia il link,
mandalo. `npm run share:dev` fa lo stesso ma col dev server a hot reload.
La prima esecuzione scarica il binario `cloudflared` in `.bin/`.

Alternativa permanente: deploy su Vercel/Netlify (vedi sotto).

## Cursore personalizzato

Il cursore e' una moto laterale (`src/components/CustomCursor.tsx`) che:

- segue il mouse con molla e si inclina in base alla velocita';
- si ingrandisce e cambia glow quando passa su link, bottoni e campi form;
- al click fa il saluto dei motociclisti: la zampina rosa del maialino con
  due dita distese che ondeggiano, per un istante.

Si attiva solo su dispositivi con puntatore fisico (`pointer: fine`): su touch
 resta il cursore di sistema. Anteprima degli SVG: `npm run cursor:preview`
 genera `public/cursor-preview.html`; verifica automatica: `npm run verify:cursor`.

## Struttura

```text
src/
  components/     UI riusabile, cursor, header, preloader, card
  components/ui/  Primitive stile shadcn
  data/           Copy, partner, eventi, FAQ, testimonial
  hooks/          Lenis, ScrollTrigger, countdown
  lib/            Utility
  sections/       Sezioni pagina obbligatorie
  three/          Scena 3D e moto procedurale
public/assets/    Placeholder logo, gallery, texture e note asset
```

## Note asset

La hero carica `public/models/superbike.glb`. Il file incluso e' un GLB reale CC0 scaricato da models.codelove.in (`Cyberpunk Neon Motorbike`, 18.450 triangoli, 501 KB), usabile anche commercialmente secondo la pagina/licenza del provider. Per produzione puoi sostituirlo con una supersportiva premium mantenendo lo stesso nome file.

Le immagini in `public/assets` sono placeholder SVG: sostituirle con fotografia/video reali ottimizzati in WebP/AVIF. Evitare file hero troppo pesanti; target consigliato sotto 250 KB per poster e sotto 2 MB per video brevi.

## Deploy

Il progetto e' pronto per Vercel o Netlify.

- Build command: `npm run build`
- Output directory: `dist`
- Node consigliato: 20+

## Integrazioni future

- Collegare il form finale a CRM, email marketing o API proprietaria.
- Sostituire i dati in `src/data/content.ts` con endpoint partner/eventi.
- Collegare mappa live con geolocalizzazione, privacy e consenso esplicito.
- Aggiungere area utente per tessera digitale reale, profilo, garage e preferenze.
