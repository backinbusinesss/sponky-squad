import fs from "node:fs";

const source = fs.readFileSync("src/components/CustomCursor.tsx", "utf8");
const camel = [
  "className",
  "stopColor",
  "stopOpacity",
  "strokeWidth",
  "strokeLinecap",
  "strokeLinejoin",
  "strokeDasharray",
  "fillRule",
  "clipRule",
  "fontSize",
  "fontWeight",
];

const svgs = [...source.matchAll(/<svg[\s\S]*?<\/svg>/g)].map((m) =>
  camel
    .reduce(
      (acc, key) => acc.replaceAll(key, key === "className" ? "class" : key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)),
      m[0],
    ),
);

const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>
body{margin:0;background:#050507;display:flex;gap:60px;align-items:center;justify-content:center;height:100vh}
svg{width:360px;height:auto}
@keyframes cursorSaluteWave{from{transform:rotate(-11deg)}to{transform:rotate(11deg)}}
.cursor-salute-fingers{transform-box:view-box;transform-origin:29px 32px;animation:cursorSaluteWave .26s ease-in-out infinite alternate}
</style></head>
<body><div>${svgs[0]}</div><div>${svgs[1]}</div></body></html>`;

fs.writeFileSync("public/cursor-preview.html", html);
console.log("svgs:", svgs.length);
