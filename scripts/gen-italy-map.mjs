/**
 * Genera public/assets/italy-map.svg dai dati geografici reali (Natural Earth 50m).
 * Proiezione equirettangolare con nord in alto, semplificazione Douglas-Peucker.
 * Stampa anche le percentuali delle citta' per src/data/content.ts.
 */
import fs from "node:fs";

const W = 820;
const H = 520;
const PAD = 52;

const raw = JSON.parse(fs.readFileSync(".bin/ne50m.json", "utf8"));
const italy = raw.features.find(
  (f) =>
    f.properties.ISO_A3 === "ITA" ||
    f.properties.ADM0_A3 === "ITA" ||
    f.properties.NAME === "Italy",
);

if (!italy) {
  console.error("Italia non trovata nel geojson");
  process.exit(1);
}

const polys =
  italy.geometry.type === "Polygon"
    ? [italy.geometry.coordinates]
    : italy.geometry.coordinates;

function rdp(points, epsilon) {
  if (points.length < 3) return points;
  let maxDist = 0;
  let index = 0;
  const [sx, sy] = points[0];
  const [ex, ey] = points[points.length - 1];
  const dx = ex - sx;
  const dy = ey - sy;
  const len = Math.hypot(dx, dy) || 1e-9;

  for (let i = 1; i < points.length - 1; i += 1) {
    const [px, py] = points[i];
    const dist = Math.abs(dy * px - dx * py + ex * sy - ey * sx) / len;
    if (dist > maxDist) {
      maxDist = dist;
      index = i;
    }
  }
  if (maxDist > epsilon) {
    const left = rdp(points.slice(0, index + 1), epsilon);
    const right = rdp(points.slice(index), epsilon);
    return left.slice(0, -1).concat(right);
  }
  return [points[0], points[points.length - 1]];
}

const rings = [];
for (const poly of polys) {
  let outer = poly[0];
  const a = outer[0];
  const b = outer[outer.length - 1];
  if (a[0] === b[0] && a[1] === b[1]) outer = outer.slice(0, -1);
  const lons = outer.map((p) => p[0]);
  const lats = outer.map((p) => p[1]);
  const spanLon = Math.max(...lons) - Math.min(...lons);
  const spanLat = Math.max(...lats) - Math.min(...lats);
  if (spanLon < 0.35 && spanLat < 0.35) continue;
  rings.push(outer);
}

const simplified = rings.map((ring) => rdp(ring, 0.04));

// y negativo -> nord in alto
const cosLat = Math.cos((42 * Math.PI) / 180);
const project = ([lon, lat]) => [lon * cosLat, -lat];

const xs = [];
const ys = [];
for (const ring of simplified) {
  for (const p of ring) {
    const [x, y] = project(p);
    xs.push(x);
    ys.push(y);
  }
}
const minX = Math.min(...xs);
const maxX = Math.max(...xs);
const minY = Math.min(...ys);
const maxY = Math.max(...ys);

const scale = Math.min(
  (W - PAD * 2) / (maxX - minX),
  (H - PAD * 2) / (maxY - minY),
);
const offX = (W - (maxX - minX) * scale) / 2 - minX * scale;
const offY = (H - (maxY - minY) * scale) / 2 - minY * scale;

const toPx = (lonLat) => {
  const [x, y] = project(lonLat);
  return [x * scale + offX, y * scale + offY];
};

const fmt = (n) => Math.round(n * 10) / 10;

const paths = simplified.map((ring) =>
  ring
    .map((p, i) => {
      const [px, py] = toPx(p);
      return `${i === 0 ? "M" : "L"}${fmt(px)} ${fmt(py)}`;
    })
    .join("") + "Z",
);

const cities = {
  Torino: [7.68, 45.07],
  Milano: [9.19, 45.46],
  Bologna: [11.34, 44.49],
  Roma: [12.5, 41.9],
  Sardegna: [9.1, 40.05],
  Cremona: [10.02, 45.13],
};

const cityPx = Object.fromEntries(
  Object.entries(cities).map(([k, v]) => [k, toPx(v)]),
);

// rotta Torino > Milano > Bologna > Roma
const route = ["Torino", "Milano", "Bologna", "Roma"];
const routeD = route
  .map((name, i) => {
    const [x, y] = cityPx[name];
    return `${i === 0 ? "M" : "L"}${fmt(x)} ${fmt(y)}`;
  })
  .join("");
const sardX = cityPx.Sardegna[0];
const sardY = cityPx.Sardegna[1];
const romaX = cityPx.Roma[1] && cityPx.Roma[0];
const romaY = cityPx.Roma[1];

const landPaths = paths
  .map(
    (d) =>
      `      <path d="${d}" fill="url(#imLand)" stroke="#19E6FF" stroke-opacity=".6" stroke-width="2.5" stroke-linejoin="round"/>`,
  )
  .join("\n");

const pulseCircles = Object.entries(cityPx)
  .map(([name, [x, y]]) => {
    const color =
      name === "Milano"
        ? "#19E6FF"
        : name === "Bologna"
          ? "#FF7A18"
          : name === "Roma"
            ? "#FF2F2F"
            : "#EAF6FF";
    return `      <circle cx="${fmt(x)}" cy="${fmt(y)}" r="15" fill="${color}" opacity=".28" filter="url(#imBlur4)"/>`;
  })
  .join("\n");

const svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="imBg" x1="0" y1="0" x2="${W}" y2="${H}" gradientUnits="userSpaceOnUse">
      <stop stop-color="#06070C"/>
      <stop offset="1" stop-color="#0A0C14"/>
    </linearGradient>
    <linearGradient id="imLand" x1="200" y1="60" x2="560" y2="470" gradientUnits="userSpaceOnUse">
      <stop stop-color="#1A2033"/>
      <stop offset="1" stop-color="#0E1220"/>
    </linearGradient>
    <linearGradient id="imRoute" x1="0" y1="0" x2="1" y2="1">
      <stop stop-color="#19E6FF"/>
      <stop offset=".55" stop-color="#FF7A18"/>
      <stop offset="1" stop-color="#FF2F2F"/>
    </linearGradient>
    <radialGradient id="imGlow" cx=".5" cy=".5" r=".5">
      <stop stop-color="#FF7A18" stop-opacity=".4"/>
      <stop offset="1" stop-color="#FF7A18" stop-opacity="0"/>
    </radialGradient>
    <filter id="imBlur14" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="14"/>
    </filter>
    <filter id="imBlur4" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="4"/>
    </filter>
    <clipPath id="imClip">
      <rect width="${W}" height="${H}" rx="18"/>
    </clipPath>
  </defs>

  <g clip-path="url(#imClip)">
    <rect width="${W}" height="${H}" fill="url(#imBg)"/>

    <!-- griglia geografica -->
    <g stroke="#FFFFFF" stroke-opacity=".05">
      <path d="M0 65H${W}M0 130H${W}M0 195H${W}M0 260H${W}M0 325H${W}M0 390H${W}M0 455H${W}"/>
      <path d="M68 0V${H}M136 0V${H}M204 0V${H}M272 0V${H}M340 0V${H}M408 0V${H}M476 0V${H}M544 0V${H}M612 0V${H}M680 0V${H}M748 0V${H}"/>
    </g>

    <!-- alone dietro lo stivale -->
    <ellipse cx="410" cy="260" rx="280" ry="230" fill="url(#imGlow)" filter="url(#imBlur14)" opacity=".7"/>

    <!-- ITALIA (contorni reali Natural Earth 50m) -->
${landPaths}

    <!-- rotta Torino > Milano > Bologna > Roma -->
    <g>
      <path d="${routeD}" stroke="url(#imRoute)" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" filter="url(#imBlur4)" opacity=".35"/>
      <path d="${routeD}" stroke="url(#imRoute)" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="11 13"/>
      <path d="M${fmt(romaX)} ${fmt(romaY)}C${fmt(romaX - 60)} ${fmt(romaY + 14)} ${fmt(sardX + 60)} ${fmt(sardY + 8)} ${fmt(sardX)} ${fmt(sardY)}" stroke="#19E6FF" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="6 13" opacity=".6"/>
    </g>

    <!-- pulsazioni sui punti citta' -->
${pulseCircles}

    <!-- coordinate decorative -->
    <g stroke="#FFFFFF" stroke-opacity=".16" stroke-width="2" stroke-linecap="round">
      <path d="M40 40h26M40 40v26M780 480h-26M780 480v-26"/>
    </g>
    <g stroke="#19E6FF" stroke-opacity=".5" stroke-width="2" stroke-linecap="round">
      <path d="M760 60v34M743 77h34"/>
      <circle cx="760" cy="77" r="14" stroke-opacity=".35" fill="none"/>
    </g>

    <rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="17.5" stroke="#FFFFFF" stroke-opacity=".12"/>
  </g>
</svg>
`;

fs.writeFileSync("public/assets/italy-map.svg", svg);
console.log("italy-map.svg scritto (" + svg.length + " byte)");

console.log("mapHighlights aggiornati:");
for (const [name, [x, y]] of Object.entries(cityPx)) {
  console.log(
    `  { label: ${JSON.stringify(name)}, x: "${fmt((x / W) * 100)}%", y: "${fmt((y / H) * 100)}%" },`,
  );
}
console.log("vertex per ring:", simplified.map((r) => r.length).join(","));
