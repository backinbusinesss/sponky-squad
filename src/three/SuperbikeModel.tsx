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
      return { position: [0, 0.7, -0.25], scale: 0.78, rotY: -0.5 };
    }
    if (width < 1024) {
      // tablet / telefono grande
      return { position: [0.05, 0.6, -0.2], scale: 0.95, rotY: -0.55 };
    }
    return { position: [0.3, 0.15, 0], scale: 1.35, rotY: -0.55 };
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
