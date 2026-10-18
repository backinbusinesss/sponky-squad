import { Float, RoundedBox, useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useAssetExists } from "@/hooks/useAssetExists";
import { asset } from "@/lib/asset";

const MODEL_PATH = asset("/models/superbike.glb");

/**
 * Sponky: il maialino della mascotte del sito, in sella.
 * Stile fedele all'icona ufficiale: proporzioni CHIBI (testa grande e
 * sferica, corpo compatto), muso acceso in primo piano, occhioni azzurri
 * grandi con riflessi cartoon, guance paffute e sorriso.
 * Abbigliamento: ELMETTO DA AVIATORE IN PELLE NERA con la scritta SPONKY in
 * bianco sulla fronte e gli occhiali da aviatore (lenti scure) sollevati
 * sopra la fronte; giubbotto classico di pelle con cerniera argentata e
 * parchettino italiano. Niente accenti da corsa, niente neon.
 *
 * Posa: zampe anteriori POGGIATE SUL MANUBRIO (presa reale sui grip) e stivali
 * sulle pedane. Il giubbotto resta lungo con le falde al vento, come richiesto.
 *
 * Il gruppo e' costruito direttamente in coordinate LOCALI della moto
 * (moto centerata, fronte = +Z):
 *   grip manubrio  ~ (+-0.47, 0.50, 0.56)
 *   sella          ~ (0, 0.40, -0.13)
 *   pedane         ~ (+-0.35, -0.07, -0.31)
 *
 * Testa e proporzioni: la testa e' l'elemento eroe della scena, quindi scala
 * piu' alta del corpo ridotto.
 */
const HEAD_Y = 1.06;
const HEAD_SCALE = 0.76;
const PINK = "#f9adb9";
const SNOUT = "#ff9aaf";
const PINK_DARK = "#e07a8c";
const LEATHER = "#221d26";
const PANTS = "#1e1c22";
const SILVER = "#c6cad2";
const TEE = "#e6e4df";
/** Raggio dell'elmetto: tenuto stretto sulla testa (0.5) per non far
 *  risaltare il bordo interno attorno al viso. */
const CAP_R = 0.545;
const CAP_OFFSET: [number, number, number] = [0, 0.02, -0.02];

/** Capsule fra due punti: la fedel cio' che tiene insieme arti e falde. */
function capsuleBetween(
  a: [number, number, number],
  b: [number, number, number],
  radius: number,
  props: { color: string; roughness?: number; metalness?: number },
) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const dz = b[2] - a[2];
  const len = Math.hypot(dx, dy, dz);
  const mid: [number, number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  const rx = Math.atan2(dz, dy);
  const rz = Math.asin(THREE.MathUtils.clamp(-dx / len, -1, 1));
  return (
    <mesh position={mid} rotation={[rx, 0, rz]}>
      <capsuleGeometry args={[radius, Math.max(len - 2 * radius, 0.01), 8, 16]} />
      <meshStandardMaterial
        color={props.color}
        roughness={props.roughness ?? 0.45}
        metalness={props.metalness ?? 0.15}
      />
    </mesh>
  );
}

/**
 * Casco da aviatore con apertura del viso ad ARCO, non a finestra.
 *
 * Una sfera con il taglio frontale farebbe un rettangolo sul viso: il bordo
 * verticale del taglio e l'orizzontale della cupola si incontrano ad angolo
 * retto e si legge come un buco ritagliato. Qui invece la coordinata theta
 * finale varia con phi secondo una funzione liscia (smoothstep), quindi il
 * bordo gira attorno al viso.
 *
 * Convenzioni identiche a THREE.SphereGeometry (theta da +Y, phi da -X verso
 * +Z, uv con v capovolta), cosi' la scritta mappata sulla fronte si allinea.
 */
function aviatorCapGeometry(
  radius: number,
  thetaFront: number,
  thetaBack: number,
  phiOpen: number,
  widthSeg = 76,
  heightSeg = 30,
) {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const phiStart = Math.PI / 2 - Math.PI;
  const phiLength = Math.PI * 2;
  const stride = widthSeg + 1;

  for (let iy = 0; iy <= heightSeg; iy += 1) {
    const v = iy / heightSeg;
    for (let ix = 0; ix <= widthSeg; ix += 1) {
      const phi = phiStart + (ix / widthSeg) * phiLength;

      // distanza angolare dal centro del viso (+Z, ovvero phi = pi/2)
      const raw = phi - Math.PI / 2;
      const delta = Math.abs(Math.atan2(Math.sin(raw), Math.cos(raw)));
      const t = Math.min(delta / phiOpen, 1);
      const thetaMax = thetaFront + (thetaBack - thetaFront) * (t * t * (3 - 2 * t));
      const theta = v * thetaMax;

      const sinTheta = Math.sin(theta);
      positions.push(
        -radius * Math.cos(phi) * sinTheta,
        radius * Math.cos(theta),
        radius * Math.sin(phi) * sinTheta,
      );
      uvs.push(ix / widthSeg, 1 - v);
    }
  }

  for (let iy = 0; iy < heightSeg; iy += 1) {
    for (let ix = 0; ix < widthSeg; ix += 1) {
      const a = ix + stride * (iy + 1);
      const b = ix + stride * iy;
      const c = ix + 1 + stride * iy;
      const d = ix + 1 + stride * (iy + 1);
      indices.push(a, b, d, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setIndex(indices);
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();

  /**
   * Normali verso l'ESTERNO.
   *
   * Questo e' il motivo per cui il casco non si vedeva. L'ordine degli indici
   * (a,b,d / b,c,d) e' quello di SphereGeometry, ma qui il raggio finale
   * theta varia da colonna a colonna: dove la manica si apre il passo fra una
   * riga e l'altra supera il passo orizzontale, il triangolo si inverte e
   * computeVertexNormals legge la faccia come se guardasse dentro la sfera.
   * FrontSide scarta allora la superficie esterna e del casco restava solo un
   * filo ai lati, con la testa tutta rosa davanti.
   *
   * La correzione e' esplicita: ogni normale la si proietta sulla posizione,
   * che per una sfera centrata nell'origine e' la normale geometrica esatta.
   */
  const pos = geometry.getAttribute("position");
  const nor = geometry.getAttribute("normal") as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i += 1) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);
    const len = Math.hypot(x, y, z) || 1;
    nor.setXYZ(i, x / len, y / len, z / len);
  }
  nor.needsUpdate = true;

  geometry.computeBoundingSphere();
  return geometry;
}

function PigRider() {
  const tailSideL = useRef<THREE.Group>(null);
  const tailSideR = useRef<THREE.Group>(null);
  const tailCenter = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const earL = useRef<THREE.Group>(null);
  const earR = useRef<THREE.Group>(null);

  /**
   * Casco: una sola superficie con l'apertura del viso ad arco.
   *
   * thetaFront 1.40 rad = 80 gradi: il bordo frontale cade A LIVELLO degli
   * occhi, cosi' resta tutta la cupola nera sopra di loro. Con 1.10 il bordo
   * stava piu' in basso del bulbo oculare, il casco finiva dietro la testa e
   * da davanti non si vedeva altro che pelle rosa.
   */
  const capGeometry = useMemo(() => aviatorCapGeometry(CAP_R, 1.4, 2.4, 2.35), []);

  /**
   * Scritta "SPONKY" sulla fronte dell'elmetto: disegnata su canvas e mappata
   * su un segmento di sfera, cosi' segue la curvatura della fronte e non
   * richiede un font scaricato a runtime.
   */
  const foreheadText = useMemo(() => {
    // rapporto del segmento di sfera su cui la scritta viene mappata
    // (phi 1.15, theta 0.75..1.05, raggio 0.553): mantenere il canvas alla
    // stessa proporzione e' l'unico modo per non deformare le lettere.
    const W = 640;
    const H = 212;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const word = "SPONKY";
      const spacing = 10;
      const face = (size: number) => `900 ${size}px 'Arial Black', 'Helvetica Neue', Arial, sans-serif`;
      const measure = (size: number) => {
        ctx.font = face(size);
        let total = 0;
        for (const ch of word) total += ctx.measureText(ch).width + spacing;
        return total - spacing;
      };
      // si adatta al canvas invece di usare un corpo fisso: un font piu' largo
      // del riquadro finirebbe tagliato ai bordi del segmento sferico
      const target = W - 52;
      let size = 140;
      const natural = measure(size);
      if (natural > target) size = Math.floor((size * target) / natural);
      ctx.font = face(size);
      let total = 0;
      for (const ch of word) total += ctx.measureText(ch).width + spacing;
      total -= spacing;
      let x = (W - total) / 2;
      for (const ch of word) {
        const w = ctx.measureText(ch).width;
        ctx.fillText(ch, x + w / 2, H / 2 + 2);
        x += w + spacing;
      }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
  }, []);

  // moto in movimento: giacca al vento, testa leggermente sospesa, orecchie che
  // flettono. Il volto resta fermo guardando avanti, cambia solo il contorno.
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const flapA = Math.sin(t * 2.3);
    const flapB = Math.sin(t * 2.9 + 1.4);
    if (tailSideL.current) tailSideL.current.rotation.x = 1.55 + flapA * 0.1;
    if (tailSideR.current) tailSideR.current.rotation.x = 1.55 + flapB * 0.1;
    if (tailCenter.current) tailCenter.current.rotation.x = 1.7 + flapB * 0.08;
    if (headRef.current) {
      headRef.current.position.y = HEAD_Y + Math.sin(t * 1.7) * 0.012;
      headRef.current.rotation.z = Math.sin(t * 1.1) * 0.018;
    }
    if (earL.current) earL.current.rotation.z = 0.55 + flapB * 0.05;
    if (earR.current) earR.current.rotation.z = -0.55 - flapA * 0.05;
  });

  return (
    <group position={[0, 0.02, 0]} rotation={[0, 0, 0]} scale={1}>
      {/* ===== GAMBE: ginocchia sul serbatoio, stivali sulle pedane ===== */}
      {([-1, 1] as const).map((side) => (
        <group key={`leg-${side}`}>
          {capsuleBetween(
            [side * 0.13, 0.4, -0.13],
            [side * 0.31, 0.15, 0.05],
            0.082,
            { color: PANTS, roughness: 0.55, metalness: 0.1 },
          )}
          {/* ginocchio con paraginocchio */}
          <mesh position={[side * 0.315, 0.15, 0.06]} scale={[1, 0.9, 1]}>
            <sphereGeometry args={[0.076, 20, 16]} />
            <meshStandardMaterial color="#16141a" roughness={0.4} metalness={0.2} />
          </mesh>
          {capsuleBetween(
            [side * 0.31, 0.13, 0.02],
            [side * 0.345, -0.03, -0.27],
            0.063,
            { color: PANTS, roughness: 0.55, metalness: 0.1 },
          )}
          {/* stivale sulla pedana */}
          <RoundedBox
            args={[0.115, 0.1, 0.24]}
            radius={0.03}
            position={[side * 0.348, -0.062, -0.285]}
            rotation={[0.06, side * -0.14, 0]}
          >
            <meshStandardMaterial color="#100f13" roughness={0.5} metalness={0.12} />
          </RoundedBox>
          <mesh position={[side * 0.348, -0.02, -0.25]} rotation={[0.06, side * -0.14, 0]}>
            <boxGeometry args={[0.12, 0.032, 0.07]} />
            <meshStandardMaterial color={SILVER} roughness={0.3} metalness={0.85} />
          </mesh>
          <mesh position={[side * 0.348, -0.112, -0.29]} rotation={[0.06, side * -0.14, 0]}>
            <boxGeometry args={[0.118, 0.022, 0.24]} />
            <meshStandardMaterial color="#0a090c" roughness={0.65} />
          </mesh>
        </group>
      ))}

      {/* ===== GIUBBOTTO: pelle nera, taglio lungo (mantenuto da richiesta) ===== */}
      <mesh position={[0, 0.42, -0.24]} rotation={[0.34, 0, 0]}>
        <cylinderGeometry args={[0.26, 0.5, 0.4, 30, 1, true, 0.94, 4.4]} />
        <meshStandardMaterial color={LEATHER} roughness={0.55} metalness={0.08} side={THREE.DoubleSide} />
      </mesh>
      {/* fodera interna: pelle scura, non piu' rossa corsa */}
      <mesh position={[0, 0.41, -0.243]} rotation={[0.34, 0, 0]}>
        <cylinderGeometry args={[0.244, 0.478, 0.414, 30, 1, true, 0.94, 4.4]} />
        <meshStandardMaterial color="#0b0a0d" roughness={0.7} side={THREE.DoubleSide} />
      </mesh>
      {/* bordo del lembo */}
      <mesh position={[0, 0.249, -0.31]} rotation={[0.34 + Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.49, 0.017, 8, 40, 4.4]} />
        <meshStandardMaterial color={SILVER} roughness={0.4} metalness={0.7} />
      </mesh>

      {/* fianchi/pelvi sotto la giacca */}
      <mesh position={[0, 0.4, -0.13]} scale={[0.18, 0.14, 0.16]}>
        <sphereGeometry args={[1, 24, 18]} />
        <meshStandardMaterial color={PANTS} roughness={0.55} metalness={0.1} />
      </mesh>

      {/* ===== FALDE AL VENTO ===== */}
      <group ref={tailCenter} position={[0, 0.5, -0.34]} rotation={[1.7, 0, 0]}>
        <RoundedBox args={[0.2, 0.38, 0.04]} radius={0.016} position={[0, -0.19, 0]} rotation={[-0.1, 0, 0]}>
          <meshStandardMaterial color={LEATHER} roughness={0.55} metalness={0.08} />
        </RoundedBox>
        <RoundedBox args={[0.17, 0.32, 0.014]} radius={0.006} position={[0, -0.192, -0.026]} rotation={[-0.1, 0, 0]}>
          <meshStandardMaterial color="#26232b" roughness={0.6} />
        </RoundedBox>
        <RoundedBox args={[0.17, 0.26, 0.034]} radius={0.014} position={[0, -0.45, 0.05]} rotation={[-0.5, 0, 0]}>
          <meshStandardMaterial color={LEATHER} roughness={0.55} metalness={0.08} />
        </RoundedBox>
      </group>
      {([-1, 1] as const).map((side) => (
        <group
          key={`tail-${side}`}
          ref={side === -1 ? tailSideL : tailSideR}
          position={[side * 0.2, 0.44, -0.3]}
          rotation={[1.55, side * -0.22, side * 0.3]}
        >
          <RoundedBox args={[0.16, 0.4, 0.038]} radius={0.015} position={[0, -0.2, 0]} rotation={[0, 0, side * -0.08]}>
            <meshStandardMaterial color={LEATHER} roughness={0.55} metalness={0.08} />
          </RoundedBox>
          <RoundedBox args={[0.13, 0.34, 0.012]} radius={0.005} position={[0, -0.202, -0.026]} rotation={[0, 0, side * -0.08]}>
            <meshStandardMaterial color="#26232b" roughness={0.6} />
          </RoundedBox>
          <RoundedBox args={[0.13, 0.24, 0.032]} radius={0.013} position={[side * 0.02, -0.49, 0.04]} rotation={[-0.4, 0, side * -0.15]}>
            <meshStandardMaterial color={LEATHER} roughness={0.55} metalness={0.08} />
          </RoundedBox>
        </group>
      ))}

      {/* ===== BUSTO: giubbotto classico, corpo piu' compatto della testa ===== */}
      {capsuleBetween([0, 0.4, -0.1], [0, 0.68, 0.16], 0.148, {
        color: LEATHER,
        roughness: 0.55,
        metalness: 0.08,
      })}
      <mesh position={[0, 0.62, 0.11]} scale={[0.14, 0.12, 0.125]}>
        <sphereGeometry args={[1, 28, 22]} />
        <meshStandardMaterial color={LEATHER} roughness={0.52} metalness={0.1} />
      </mesh>

      {/* camicia chiara sotto il giubbotto aperto */}
      <group position={[0, 0.6, 0.1]} rotation={[0.9, 0, 0]}>
        <mesh position={[0, 0.02, 0.098]} scale={[0.07, 0.086, 0.032]}>
          <sphereGeometry args={[1, 24, 18]} />
          <meshStandardMaterial color={TEE} roughness={0.7} />
        </mesh>
        {/* asole del giubbotto ai lati della camicia */}
        {([-1, 1] as const).map((side) => (
          <mesh key={`lapel-${side}`} position={[side * 0.088, 0.01, 0.116]} rotation={[0, 0, side * -0.28]}>
            <boxGeometry args={[0.055, 0.27, 0.028]} />
            <meshStandardMaterial color={LEATHER} roughness={0.52} metalness={0.1} />
          </mesh>
        ))}
      </group>

      {/* ===== CERNIERA ARGENTATA: il dettaglio che identifica il giubbotto ===== */}
      {capsuleBetween([0.004, 0.44, -0.03], [0.004, 0.65, 0.12], 0.017, {
        color: SILVER,
        roughness: 0.24,
        metalness: 0.94,
      })}
      <RoundedBox args={[0.03, 0.04, 0.016]} radius={0.006} position={[0.012, 0.5, 0.03]} rotation={[0.62, 0, 0]}>
        <meshStandardMaterial color={SILVER} roughness={0.22} metalness={0.95} />
      </RoundedBox>

      {/* cintura in pelle con fibbia d'argento */}
      <mesh position={[0, 0.45, -0.06]} rotation={[-0.82, 0, 0]}>
        <torusGeometry args={[0.188, 0.026, 10, 32, 4.6]} />
        <meshStandardMaterial color="#0f0e12" roughness={0.6} metalness={0.1} />
      </mesh>
      <RoundedBox args={[0.058, 0.042, 0.02]} radius={0.008} position={[0, 0.33, 0.1]} rotation={[0.9, 0, 0]}>
        <meshStandardMaterial color={SILVER} roughness={0.24} metalness={0.9} />
      </RoundedBox>

      {/* ===== BRACCIA: zampine poggiate sui grip ===== */}
      {([-1, 1] as const).map((side) => (
        <group key={`arm-${side}`}>
          <mesh position={[side * 0.19, 0.67, 0.13]} scale={[0.088, 0.08, 0.084]}>
            <sphereGeometry args={[1, 22, 18]} />
            <meshStandardMaterial color={LEATHER} roughness={0.52} metalness={0.1} />
          </mesh>
          {capsuleBetween(
            [side * 0.21, 0.66, 0.15],
            [side * 0.33, 0.57, 0.36],
            0.058,
            { color: LEATHER, roughness: 0.55, metalness: 0.08 },
          )}
          {/* manica: nessun accento rosso, pelle nera continua */}
          {capsuleBetween(
            [side * 0.33, 0.57, 0.36],
            [side * 0.44, 0.515, 0.52],
            0.05,
            { color: LEATHER, roughness: 0.55, metalness: 0.08 },
          )}
          {/* polsino con zip corto */}
          {capsuleBetween(
            [side * 0.415, 0.528, 0.485],
            [side * 0.44, 0.515, 0.52],
            0.054,
            { color: "#1e1c22", roughness: 0.5, metalness: 0.12 },
          )}
          {/* zampina che avvolge il grip */}
          <RoundedBox
            args={[0.1, 0.082, 0.125]}
            radius={0.03}
            position={[side * 0.462, 0.512, 0.56]}
            rotation={[0.3, 0, side * -0.12]}
          >
            <meshStandardMaterial color="#141216" roughness={0.5} metalness={0.12} />
          </RoundedBox>
          <mesh position={[side * 0.462, 0.468, 0.575]}>
            <sphereGeometry args={[0.042, 16, 12]} />
            <meshStandardMaterial color="#141216" roughness={0.52} metalness={0.1} />
          </mesh>
        </group>
      ))}

      {/* ===== PARCHETTINO ITALIANO sulla manica sinistra ===== */}
      <group position={[-0.27, 0.63, 0.25]} rotation={[0.42, -0.7, 0.3]}>
        <RoundedBox args={[0.062, 0.076, 0.012]} radius={0.004}>
          <meshStandardMaterial color="#111015" roughness={0.6} />
        </RoundedBox>
        {[
          { c: "#008c45", y: 0.024 },
          { c: "#f4f5f0", y: 0 },
          { c: "#cd212a", y: -0.024 },
        ].map((stripe) => (
          <mesh key={stripe.c} position={[0, stripe.y, 0.0075]}>
            <boxGeometry args={[0.05, 0.021, 0.004]} />
            <meshStandardMaterial color={stripe.c} roughness={0.65} />
          </mesh>
        ))}
      </group>

      {/* ===== COLLARLO ===== */}
      {capsuleBetween([0, 0.66, 0.11], [0, 0.76, 0.14], 0.072, { color: PINK, roughness: 0.58 })}
      {/* colletto alto del giubbotto */}
      <mesh position={[0, 0.73, 0.1]} rotation={[-0.28, 0, 0]}>
        <torusGeometry args={[0.118, 0.042, 12, 32, Math.PI * 1.55]} />
        <meshStandardMaterial color={LEATHER} roughness={0.5} metalness={0.12} />
      </mesh>
      {/* passamontagna scuro sotto l'elmetto */}
      <mesh position={[0, 0.77, 0.12]} rotation={[-0.2, 0, 0]}>
        <torusGeometry args={[0.106, 0.034, 10, 28]} />
        <meshStandardMaterial color="#17151b" roughness={0.75} />
      </mesh>

      {/* ===== TESTA: chibi, il volto e' l'elemento eroe ===== */}
      <group
        ref={headRef}
        position={[0, HEAD_Y, 0.16]}
        /* la moto e' ruotata di -pi/14: la testa compensa quasi tutto, cosi' il
           volto (e la scritta sulla fronte) guarda lo sguardo dello visitatore */
        rotation={[0.1, 0.14, 0]}
        scale={HEAD_SCALE}
      >
        {/* pelle: non plastica. Sheen morbido + alta ruvidezza tolgono il
            riflesso netto tipico del materiale da giocattolo */}
        <mesh>
          <sphereGeometry args={[0.5, 44, 34]} />
          <meshPhysicalMaterial
            color={PINK}
            roughness={0.74}
            metalness={0}
            sheen={0.75}
            sheenRoughness={0.88}
            sheenColor="#ffbcca"
          />
        </mesh>

        {/* muso: rotondo e acceso in primo piano. Sta BASSO, sotto gli occhi:
            cosi' la fronte resta libera e l'elmetto puo' scendere fino a
            coprirla invece di fermarsi a una fascia sottile */}
        <mesh position={[0, -0.2, 0.42]} scale={[1.05, 0.82, 0.78]}>
          <sphereGeometry args={[0.2, 30, 24]} />
          <meshPhysicalMaterial color={SNOUT} roughness={0.62} sheen={0.55} sheenRoughness={0.8} sheenColor="#ffc3cd" />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh key={`nostril-${side}`} position={[side * 0.085, -0.19, 0.565]} scale={[1, 0.85, 0.55]}>
            <sphereGeometry args={[0.045, 14, 12]} />
            <meshStandardMaterial color={PINK_DARK} roughness={0.55} />
          </mesh>
        ))}

        {/* sorriso: subito sotto il muso */}
        <mesh position={[0, -0.39, 0.325]} rotation={[0, 0, Math.PI]}>
          <torusGeometry args={[0.1, 0.018, 8, 28, Math.PI * 0.95]} />
          <meshStandardMaterial color="#a8495a" roughness={0.5} />
        </mesh>

        {/* guance paffute e arrossate, ai lati del muso */}
        {[-1, 1].map((side) => (
          <mesh key={`cheek-${side}`} position={[side * 0.3, -0.19, 0.29]} scale={[0.7, 0.6, 0.45]}>
            <sphereGeometry args={[0.19, 18, 16]} />
            <meshPhysicalMaterial
              color="#ff8ea3"
              roughness={0.8}
              sheen={0.9}
              sheenRoughness={0.9}
              sheenColor="#ff6d86"
            />
          </mesh>
        ))}

        {/* occhioni azzurri: scendono sul volto (non in fronte) e hanno pupilla
            grande piu' TRE riflessi bianchi, per restare luminosi anche con
            l'illuminazione tutta calda */}
        {[-0.235, 0.235].map((x) => (
          <group key={`eye-${x}`} position={[x, -0.02, 0.35]} scale={0.9}>
            <mesh>
              <sphereGeometry args={[0.165, 26, 22]} />
              <meshStandardMaterial color="#fdfefe" roughness={0.18} />
            </mesh>
            <mesh position={[0, 0, 0.098]}>
              <sphereGeometry args={[0.118, 22, 18]} />
              <meshStandardMaterial
                color="#58bdf7"
                emissive="#2b86d8"
                emissiveIntensity={0.55}
                roughness={0.14}
                metalness={0.05}
              />
            </mesh>
            <mesh position={[0, 0, 0.148]}>
              <sphereGeometry args={[0.068, 18, 16]} />
              <meshStandardMaterial color="#080d14" roughness={0.1} />
            </mesh>
            {/* riflesso principale, grande */}
            <mesh position={[-0.055, 0.062, 0.175]}>
              <sphereGeometry args={[0.062, 16, 14]} />
              <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.7} roughness={0.06} />
            </mesh>
            {/* riflesso laterale piccolo */}
            <mesh position={[0.056, 0.052, 0.17]}>
              <sphereGeometry args={[0.022, 12, 10]} />
              <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.6} roughness={0.06} />
            </mesh>
            {/* riflesso in basso, chiude il cerchio dell'occhio */}
            <mesh position={[0.05, -0.05, 0.172]}>
              <sphereGeometry args={[0.03, 12, 10]} />
              <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.55} roughness={0.06} />
            </mesh>
          </group>
        ))}

        {/* ===== ORECCHIE: grandi, fuori dall'elmetto ===== */}
        {/* ORECCCHIE: devono stare FUORI dal guscio del casco, altrimenti il
            casco le ingoia. Il centro sta a R≈0.57 dal centro del casco
            (CAP_R 0.545) e la base resta sepolta dentro la testa. */}
        <group ref={earL} position={[-0.5, 0.3, -0.04]} rotation={[0, 0, 0.55]}>
          <mesh scale={[0.46, 1.05, 0.3]}>
            <sphereGeometry args={[0.26, 22, 18]} />
            <meshPhysicalMaterial color={PINK} roughness={0.74} sheen={0.75} sheenRoughness={0.88} sheenColor="#ffbcca" />
          </mesh>
          <mesh position={[0, 0.03, 0.06]} scale={[0.32, 0.8, 0.24]}>
            <sphereGeometry args={[0.24, 18, 14]} />
            <meshPhysicalMaterial color="#ff93a6" roughness={0.8} sheen={0.6} sheenRoughness={0.85} sheenColor="#ff8098" />
          </mesh>
        </group>
        <group ref={earR} position={[0.5, 0.3, -0.04]} rotation={[0, 0, -0.55]}>
          <mesh scale={[0.46, 1.05, 0.3]}>
            <sphereGeometry args={[0.26, 22, 18]} />
            <meshPhysicalMaterial color={PINK} roughness={0.74} sheen={0.75} sheenRoughness={0.88} sheenColor="#ffbcca" />
          </mesh>
          <mesh position={[0, 0.03, 0.06]} scale={[0.32, 0.8, 0.24]}>
            <sphereGeometry args={[0.24, 18, 14]} />
            <meshPhysicalMaterial color="#ff93a6" roughness={0.8} sheen={0.6} sheenRoughness={0.85} sheenColor="#ff8098" />
          </mesh>
        </group>

        {/* ===== ELMETTO DA AVIATORE IN PELLE ===== */}
        {/* unica superficie: l'apertura del viso e' un arco lisco, vedi
            aviatorCapGeometry */}
        <mesh position={CAP_OFFSET} geometry={capGeometry}>
          {/* pelle nera OPACA.
              Prima aveva un clearcoat forte: la cupola prendeva un riflesso
              gigante e sembrava una visiera in plastica. La pelle del casco
              riflette poco e in modo diffuso — solo il bordo e i lacci sono
              leggermente piu' lucidi. */}
          <meshPhysicalMaterial
            color="#151318"
            roughness={0.78}
            metalness={0.04}
            clearcoat={0.18}
            clearcoatRoughness={0.6}
            sheen={0.35}
            sheenRoughness={0.9}
            sheenColor="#5a4a3c"
            side={THREE.DoubleSide}
          />
        </mesh>

        {/* LACCI DELL'ELMETTO: scendono dai lati della cupola e si annodano
            sotto il mento. Sono la lettura piu' chiara di "casco in pelle
            allacciato" e ancorano il bordo inferiore della apertura. */}

        {/* SCRITTA SPONKY sulla fronte del casco.
            theta 0.75..1.05: resta fra il bordo del casco (1.10) e le lenti
            (che scendono fino a y≈0.43, cioe' theta≈0.76 ai lati del testo).
            phi 1.15 la tiene interamente sul fronte, senza girare sugli fianchi. */}
        <mesh position={CAP_OFFSET} renderOrder={3}>
          <sphereGeometry args={[0.553, 44, 22, Math.PI / 2 - 0.575, 1.15, 0.75, 0.3]} />
          <meshStandardMaterial
            map={foreheadText}
            transparent
            depthWrite={false}
            roughness={0.7}
            metalness={0}
            polygonOffset
            polygonOffsetFactor={-2}
          />
        </mesh>

        {/* ===== OCCHIALI DA AVIATORE, SOLLEVATI SULLA FRONTE ===== */}
        <mesh position={[0, 0.532, -0.02]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.186, 0.032, 10, 44]} />
          <meshStandardMaterial color="#0f0e12" roughness={0.6} metalness={0.12} />
        </mesh>
        {([-1, 1] as const).map((side) => (
          <group key={`lens-${side}`} position={[side * 0.125, 0.528, 0.165]}>
            <mesh rotation={[Math.PI / 2, 0, side * -0.34]}>
              <cylinderGeometry args={[0.098, 0.098, 0.036, 28]} />
              <meshStandardMaterial color="#17151d" roughness={0.1} metalness={0.75} />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, side * -0.34]} position={[0, 0, 0.015]}>
              <torusGeometry args={[0.096, 0.018, 8, 32]} />
              <meshStandardMaterial color={SILVER} roughness={0.3} metalness={0.88} />
            </mesh>
            {/* riflesso caldo sulla lente */}
            <mesh position={[side * -0.028, 0.032, 0.026]} scale={[0.5, 0.2, 0.06]}>
              <sphereGeometry args={[0.055, 12, 10]} />
              <meshStandardMaterial color="#ffd9a8" emissive="#ffb870" emissiveIntensity={0.4} roughness={0.1} />
            </mesh>
          </group>
        ))}
        {/* ponte fra le due lenti */}
        <mesh position={[0, 0.53, 0.165]}>
          <boxGeometry args={[0.09, 0.038, 0.032]} />
          <meshStandardMaterial color={SILVER} roughness={0.3} metalness={0.88} />
        </mesh>

        {/* ===== BAVETTA DELL'ELMETTO ===== */}
        {([-1, 1] as const).map((side) =>
          capsuleBetween(
            [side * 0.4, -0.04, 0.1],
            [side * 0.1, -0.44, 0.22],
            0.021,
            { color: "#1a181e", roughness: 0.62, metalness: 0.08 },
          ),
        )}
        <RoundedBox args={[0.06, 0.045, 0.024]} radius={0.008} position={[0, -0.45, 0.24]} rotation={[0.3, 0, 0]}>
          <meshStandardMaterial color={SILVER} roughness={0.26} metalness={0.9} />
        </RoundedBox>
      </group>
    </group>
  );
}

function HeroBikeAccents() {
  return (
    <group>
      {/* alone al suolo: suggeriscono la moto che "galleggia" */}
      <mesh position={[-0.52, -0.36, 0.74]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 0.08]}>
        <torusGeometry args={[0.34, 0.018, 10, 60]} />
        <meshBasicMaterial color="#e74e0f" transparent opacity={0.5} />
      </mesh>
      <mesh position={[0.5, -0.33, -0.72]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 0.08]}>
        <torusGeometry args={[0.28, 0.016, 10, 60]} />
        <meshBasicMaterial color="#e74e0f" transparent opacity={0.34} />
      </mesh>

      {/* filetto sul carter: tenue, classico, non un neon */}
      <RoundedBox args={[0.62, 0.045, 0.028]} radius={0.018} position={[0.16, 0.2, 0.52]} rotation={[0.12, -0.32, -0.04]}>
        <meshStandardMaterial
          color="#ff7a18"
          emissive="#ff6a00"
          emissiveIntensity={0.85}
          roughness={0.35}
          metalness={0.3}
        />
      </RoundedBox>
      {/* pannello scuro affumicato, senza emissione cyan */}
      <RoundedBox args={[0.46, 0.17, 0.03]} radius={0.018} position={[0.48, 0.47, 0.31]} rotation={[0.04, -0.55, 0.1]}>
        <meshStandardMaterial
          color="#16130f"
          roughness={0.3}
          metalness={0.6}
        />
      </RoundedBox>
    </group>
  );
}

/**
 * Gli pneumatici del modello sono dipinti arancioni dentro la texture
 * (estetica "toy"). Questo override del fragment shader li riconosce
 * (rosso dominante, blu basso, verde basso => non oro, non rosa) e li
 * rimappe sulla gomma nera, tenendo la variazione di luminanza per non
 * perdere il disegno della spalla e del battistrada.
 */
const TIRE_REMAP_CHUNK = `
  #include <map_fragment>
  {
    vec3 src = diffuseColor.rgb;
    float lum = dot(src, vec3(0.30, 0.59, 0.11));

    // display e fanali ciano/teal: riportati al grafite caldo. Il modello non
    // deve sembrare un cruscotto da cyberpunk.
    if (src.b > 0.16 && src.g > 0.16 && src.r < src.g * 0.7) {
      float t = smoothstep(0.10, 0.75, lum);
      diffuseColor.rgb = mix(vec3(0.010, 0.009, 0.011), vec3(0.062, 0.040, 0.028), t);
    }
    // pneumatici: arancione saturo con quasi nessun blu
    else if (src.r > 0.30 && src.b < 0.09 && src.g < src.r * 0.38 && src.r > src.b + 0.20) {
      float t = smoothstep(0.05, 0.55, lum);
      diffuseColor.rgb = mix(vec3(0.008), vec3(0.042, 0.042, 0.050), t);
    }
    // pannelli salmone/rosa fuori palette -> grafite calda scura
    else if (src.r > 0.45 && src.r > src.g * 1.35 && src.r > src.b * 1.5 && src.g > 0.18 && src.b > 0.14) {
      float t = smoothstep(0.15, 0.75, lum);
      diffuseColor.rgb = mix(vec3(0.026, 0.024, 0.028), vec3(0.085, 0.046, 0.046), t);
    }
    // rosa saturo (non il rosso brand, che ha il verde quasi nullo) -> grafite
    else if (src.r > 0.50 && src.r > src.g * 1.8 && src.r > src.b * 1.8 && src.g > 0.05 && src.b > 0.06) {
      float t = smoothstep(0.2, 0.8, lum);
      diffuseColor.rgb = mix(vec3(0.024, 0.023, 0.027), vec3(0.080, 0.052, 0.052), t);
    }
    // marroni/cuoio e anelli ruota (né oro né grigio neutro) -> scuro
    else if (src.r > 0.14 && src.r < 0.62 && src.g > src.b * 1.35 && src.g < src.r * 0.85 && src.b < 0.22) {
      float t = smoothstep(0.06, 0.44, lum);
      diffuseColor.rgb = mix(vec3(0.014, 0.014, 0.017), vec3(0.070, 0.070, 0.082), t);
    }
    // graffiature, spruzzi e pannelli chiari: li buttiamo su una gamma strettis-
    // sima di grafite caldo. Il modello di origine e' bianco sporco e pieno di
    // segni chiari: con due soli toni vicini la carena resta scura e non sembra
    // rovinata, ma soprattutto la mascotte non ci scompare davanti.
    else if (min(src.r, min(src.g, src.b)) > 0.12) {
      float t = smoothstep(0.12, 0.85, lum);
      diffuseColor.rgb = mix(vec3(0.036, 0.031, 0.031), vec3(0.064, 0.053, 0.046), t);
    }

    // residui freddi: bordi e sottili del cruscotto che stanno sotto la soglia
    // della regola principale. Qualsiasi tono con blu/verde marcatamente sopra
    // il rosso viene riportato su grafite caldo, altrimenti il display continuava
    // a leggersi teal anche dopo la rimappatura.
    {
      vec3 cool = diffuseColor.rgb;
      float cold = max(cool.b, cool.g) - cool.r;
      if (cold > 0.015) {
        float k = clamp(cold * 8.0, 0.0, 1.0);
        float grey = dot(cool, vec3(0.30, 0.59, 0.11));
        diffuseColor.rgb = mix(cool, grey * vec3(1.30, 1.0, 0.74), k);
      }
    }

    // viraggio caldo su tutta la moto: di origine il modello e' grigio/blu e
    // stonava con l'illuminazione arancio
    diffuseColor.rgb *= vec3(1.10, 0.97, 0.86);
  }
`;

function applyHeroMaterials(scene: THREE.Object3D) {
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) {
      return;
    }

    object.castShadow = false;
    object.receiveShadow = false;

    const material = object.material;
    const tune = (item: THREE.Material) => {
      if (item instanceof THREE.MeshStandardMaterial) {
        item.envMapIntensity = 1.35;
        item.roughness = Math.max(item.roughness, 0.32);
        item.metalness = Math.max(item.metalness, 0.18);
      }

      // I neon freddi del modello (bordi del cruscotto, fanali) vengono spenti:
      // la moto deve sembrare classica, non cyberpunk. Il controllo va fatto su
      // OGNI tipo di materiale: Phong e Lambert hanno l'emissive ma non
      // entrano nel ramo standard, e i bordi ciano erano appunto l'unico pezzo
      // che restava acceso.
      const glow = item as THREE.Material & {
        emissive?: THREE.Color;
        emissiveIntensity?: number;
        specular?: THREE.Color;
      };
      if (glow.emissive && (glow.emissiveIntensity ?? 0) > 0) {
        const { r, g, b } = glow.emissive;
        if (g > r * 0.85 || b > r * 0.85) {
          // neon freddo (bordi del cruscotto, fanali): spento del tutto. Un
          // emissive bianco con l'emissiveMap ciano rientra in questo caso.
          glow.emissive.setRGB(0, 0, 0);
          glow.emissiveIntensity = 0;
        } else {
          glow.emissiveIntensity = Math.min(glow.emissiveIntensity ?? 1, 0.5);
        }
      }
      if (glow.specular) {
        const { r, g, b } = glow.specular;
        if (g > r * 0.9 && b > r * 0.9) {
          glow.specular.setRGB(0.06, 0.04, 0.03);
        }
      }

      // ricolorazione pneumatici, applicata una sola volta per materiale
      if (!item.userData.sponkyTires) {
        item.userData.sponkyTires = true;
        const previous = item.onBeforeCompile;
        item.onBeforeCompile = (shader, renderer) => {
          previous?.(shader, renderer);
          if (shader.fragmentShader.includes("#include <map_fragment>")) {
            shader.fragmentShader = shader.fragmentShader.replace(
              "#include <map_fragment>",
              TIRE_REMAP_CHUNK,
            );
          }
        };
        item.needsUpdate = true;
      }
    };

    if (Array.isArray(material)) {
      material.forEach(tune);
    } else if (material) {
      tune(material);
    }
  });
}

/**
 * Posizione della moto in base alle dimensioni della scena.
 * - desktop: spostata a destra, dietro le card, leggermente sopra il centro;
 * - tablet/telefono: centrata e molto piu' piccola, alzata verso la prima
 *   schermata, per non finire tagliata fuori dal bordo destro.
 */
type Placement = { position: [number, number, number]; scale: number; rotY: number };

function useBikePlacement(): Placement {
  const width = useThree((state) => state.size.width);
  return useMemo(() => {
    if (width < 640) {
      // telefono stretto
      return { position: [0.02, 0.78, -0.35], scale: 0.7, rotY: -0.6 };
    }
    if (width < 1024) {
      // tablet / telefono grande
      return { position: [0.1, 0.7, -0.3], scale: 0.86, rotY: -0.66 };
    }
    return { position: [1.5, 0.26, 0], scale: 1.26, rotY: -0.72 };
  }, [width]);
}

function RealSuperbike({ place }: { place: Placement }) {
  const gltf = useGLTF(MODEL_PATH);
  const scene = useMemo(() => {
    const clone = gltf.scene.clone(true);
    applyHeroMaterials(clone);
    const box = new THREE.Box3().setFromObject(clone);
    const center = box.getCenter(new THREE.Vector3());
    clone.position.sub(center);
    return clone;
  }, [gltf.scene]);

  return (
    <group scale={place.scale} rotation={[0, place.rotY, 0]} position={place.position}>
      <primitive object={scene} />
      <HeroBikeAccents />
      <PigRider />
    </group>
  );
}

function Tire({ x }: { x: number }) {
  return (
    <group position={[x, -0.66, 0]} rotation={[0, Math.PI / 2, 0]}>
      <mesh>
        <torusGeometry args={[0.5, 0.11, 14, 56]} />
        <meshStandardMaterial color="#050505" roughness={0.55} metalness={0.18} />
      </mesh>
      <mesh>
        <torusGeometry args={[0.32, 0.026, 10, 48]} />
        <meshStandardMaterial color="#d6d6d6" roughness={0.24} metalness={0.82} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[0.07, 0.07, 0.16, 18]} />
        <meshStandardMaterial color="#e74e0f" emissive="#e74e0f" emissiveIntensity={0.45} roughness={0.28} metalness={0.7} />
      </mesh>
    </group>
  );
}

function FallbackSuperbike() {
  return (
    <group position={[0.58, -0.2, 0]} rotation={[0, -0.36, 0]} scale={1.05}>
      <Tire x={-1.36} />
      <Tire x={1.34} />

      <mesh position={[0, -0.42, 0]}>
        <boxGeometry args={[2.45, 0.08, 0.12]} />
        <meshStandardMaterial color="#d6d6d6" roughness={0.25} metalness={0.85} />
      </mesh>

      <RoundedBox args={[1.38, 0.4, 0.62]} radius={0.1} position={[-0.16, 0.22, 0]} rotation={[0, 0, -0.1]}>
        <meshStandardMaterial color="#e74e0f" roughness={0.23} metalness={0.72} emissive="#5a1500" emissiveIntensity={0.18} />
      </RoundedBox>

      <RoundedBox args={[0.94, 0.28, 0.52]} radius={0.08} position={[0.82, 0.27, 0]} rotation={[0, 0, 0.14]}>
        <meshStandardMaterial color="#121212" roughness={0.28} metalness={0.55} />
      </RoundedBox>

      <RoundedBox args={[0.8, 0.2, 0.42]} radius={0.08} position={[-0.78, 0.56, 0]} rotation={[0, 0, -0.04]}>
        <meshStandardMaterial color="#080808" roughness={0.32} metalness={0.4} />
      </RoundedBox>

      <RoundedBox args={[0.68, 0.28, 0.44]} radius={0.1} position={[1.28, 0.08, 0]} rotation={[0, 0, -0.18]}>
        <meshStandardMaterial color="#f5f5f5" roughness={0.22} metalness={0.62} emissive="#ffffff" emissiveIntensity={0.45} />
      </RoundedBox>

      <mesh position={[0.14, -0.56, -0.02]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.31, 0.052, 10, 36]} />
        <meshStandardMaterial color="#222222" roughness={0.26} metalness={0.88} />
      </mesh>

      <mesh position={[-1.36, -0.06, 0.36]} rotation={[0.18, 0.08, 0.12]}>
        <boxGeometry args={[0.4, 0.12, 0.12]} />
        <meshStandardMaterial color="#e74e0f" emissive="#e74e0f" emissiveIntensity={0.55} roughness={0.25} />
      </mesh>
    </group>
  );
}

export function SuperbikeModel() {
  const group = useRef<THREE.Group>(null);
  const { mouse } = useThree();
  const modelExists = useAssetExists(MODEL_PATH);
  const place = useBikePlacement();

  useFrame((state) => {
    if (!group.current) {
      return;
    }

    group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, mouse.x * 0.1, 0.04);
    group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, -mouse.y * 0.035, 0.04);
    group.current.position.y = Math.sin(state.clock.elapsedTime * 0.9) * 0.025;
  });

  return (
    <Float speed={0.8} floatIntensity={0.1} rotationIntensity={0.06}>
      <group ref={group}>
        {modelExists ? <RealSuperbike place={place} /> : <FallbackSuperbike />}
      </group>
    </Float>
  );
}

useGLTF.preload(MODEL_PATH);
