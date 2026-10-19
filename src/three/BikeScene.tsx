import { Environment, PerspectiveCamera } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { asset } from "@/lib/asset";
import { HellcatModel } from "@/three/HellcatModel";

/**
 * HDR di ambiente servito in locale. Prima arrivava dal CDN di drei
 * (raw.githubusercontent.com) e ci metteva anche 10 secondi: l'Environment e'
 * in Suspense, quindi per tutto quel tempo la scena restava vuota. Ora e' un
 * file nostro, sulla stessa origine.
 */
const ENV_PATH = asset("/env/venice_sunset_1k.hdr");

/** Nessun fotogramma deve avanzare di piu' di questo (secondi): dopo una pausa
 *  lunga (hero fuori schermo) il delta del clock sarebbe enorme e farebbe
 *  saltare ruote e strada. */
const MAX_DELTA = 0.05;

function RoadPlane() {
  const mesh = useRef<THREE.Mesh>(null);
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#0c0806";
    ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 420; i += 1) {
      const alpha = Math.random() * 0.18;
      ctx.fillStyle = `rgba(255,232,206,${alpha})`;
      ctx.fillRect(Math.random() * 128, Math.random() * 128, Math.random() * 2, Math.random() * 2);
    }
    const canvasTexture = new THREE.CanvasTexture(canvas);
    canvasTexture.wrapS = THREE.RepeatWrapping;
    canvasTexture.wrapT = THREE.RepeatWrapping;
    canvasTexture.repeat.set(8, 14);
    return canvasTexture;
  }, []);

  useFrame((_, delta) => {
    texture.offset.y -= Math.min(delta, MAX_DELTA) * 0.035;
    if (mesh.current) {
      mesh.current.position.z = Math.sin(performance.now() * 0.0004) * 0.04;
    }
  });

  return (
    <group>
      <mesh ref={mesh} rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.34, 0]}>
        <planeGeometry args={[16, 18, 1, 1]} />
        <meshStandardMaterial
          map={texture}
          color="#241812"
          roughness={0.5}
          metalness={0.35}
          envMapIntensity={0.35}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.32, 0.02]}>
        <planeGeometry args={[0.055, 14]} />
        <meshBasicMaterial color="#e74e0f" transparent opacity={0.34} />
      </mesh>
    </group>
  );
}

/**
 * Alone circolare dietro la scena: e' la controparte 3D del fondo circolare
 * del logo (arancio -> giallo -> rosa). Additivo e senza fog, cosi' bloom lo
 * raccoglie e il personaggio ci galleggia sopra invece di restare sul nero.
 */
function WarmHalo() {
  const texture = useMemo(() => {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, "rgba(255, 176, 74, 0.92)");
    gradient.addColorStop(0.3, "rgba(255, 206, 108, 0.5)");
    gradient.addColorStop(0.58, "rgba(255, 132, 96, 0.2)");
    gradient.addColorStop(1, "rgba(255, 111, 145, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    const canvasTexture = new THREE.CanvasTexture(canvas);
    canvasTexture.colorSpace = THREE.SRGBColorSpace;
    return canvasTexture;
  }, []);

  return (
    <mesh position={[0, 0.72, -2.2]}>
      <planeGeometry args={[7.2, 7.2]} />
      <meshBasicMaterial
        map={texture}
        transparent
        depthWrite={false}
        fog={false}
        blending={THREE.AdditiveBlending}
        opacity={0.85}
      />
    </mesh>
  );
}

/**
 * Illuminazione: solo temperature calde. Le luci fredde (ciano/blu) che
 * appiattivano il volto sono state tolte del tutto — restano arancio, ambra e
 * rosa, le stesse tinte del cerchio del logo.
 *
 * Il tempo viene accumulato a mano (clampato) invece di usare
 * clock.elapsedTime: cosi' quando la scena riparte, dopo essere stata ferma
 * fuori schermo, le luci non saltano di colpo in una posizione diversa.
 */
function DynamicLights() {
  const rim = useRef<THREE.PointLight>(null);
  const warm = useRef<THREE.PointLight>(null);
  const elapsed = useRef(0);

  useFrame((_, delta) => {
    elapsed.current += Math.min(delta, MAX_DELTA);
    const time = elapsed.current;

    if (rim.current) {
      rim.current.position.x = Math.sin(time * 0.7) * 2.6;
      rim.current.intensity = 5.5 + Math.sin(time * 1.1) * 1.1;
    }
    if (warm.current) {
      warm.current.position.x = Math.cos(time * 0.55) * 2.4;
      warm.current.intensity = 3.6 + Math.cos(time * 0.9) * 0.8;
    }
  });

  return (
    <>
      {/* chiave calda: riempie il volto senza bruciarlo */}
      <ambientLight intensity={0.34} color="#ffd0a8" />
      <hemisphereLight args={["#ffc98f", "#3a1c10", 0.55]} />
      {/* spot anteriore: il muso resta il punto piu' luminoso */}
      <spotLight position={[0.4, 3.6, 5]} angle={0.62} penumbra={0.9} intensity={8.5} color="#fff0d4" />
      {/* riempimento caldo dal basso (ambra) */}
      <pointLight position={[1.4, -0.4, 3]} color="#ffb347" intensity={2.2} distance={6} />
      {/* luce di contorno arancio brand */}
      <pointLight ref={rim} position={[-3.2, 1.8, 1.6]} color="#ff8a1e" intensity={5.5} distance={8} />
      {/* contorno opposto in rosa: sostituisce il vecchio ciano */}
      <pointLight ref={warm} position={[3.2, 1.4, 1.8]} color="#ff6f91" intensity={3.6} distance={7.5} />
      {/* accento rosa basso dietro, per staccare i contorni dal fondo */}
      <pointLight position={[-1.6, 0.2, -1.4]} color="#ff9ec4" intensity={1.8} distance={5} />
      {/* contro-ricevuta calda dietro la mascotte: senza questa la giacca di
          pelle nera si perdeva sulla moto scura */}
      <pointLight position={[0.2, 1.7, -2.2]} color="#ffb26b" intensity={4} distance={6} />
    </>
  );
}

/**
 * Motore del loop di render. Il Canvas e' in "demand": disegna solo quando
 * qualcuno lo invalida. Qui si invalida soltanto finche' la hero e' in vista,
 * quindi mentre l'utente legge il resto della pagina la GPU resta ferma
 * (prima la scena continuava a girare a piena velocita' anche a 10.000 px di
 * distanza, ed era quello a far "laggare" lo scroll).
 */
function SceneRunner({ active }: { active: boolean }) {
  const invalidate = useThree((state) => state.invalidate);
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    if (active) invalidate();
  }, [active, invalidate]);

  useFrame(() => {
    if (activeRef.current) invalidate();
  });

  return null;
}

/** true finche' l'elemento e' (anche solo in parte) in viewport. */
function useInView(element: { current: HTMLElement | null }) {
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const node = element.current;
    if (!node || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        const last = entries[entries.length - 1];
        if (last) setInView(last.isIntersecting);
      },
      // un margine generoso fa ripartire la scena poco prima che entri in vista
      { rootMargin: "220px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [element]);

  return inView;
}

export function BikeScene() {
  const host = useRef<HTMLDivElement>(null);
  const inView = useInView(host);

  return (
    <div ref={host} className="h-full w-full">
      <Canvas
        frameloop="demand"
        dpr={[0.8, 1.15]}
        performance={{ min: 0.35 }}
        gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
      >
        <color attach="background" args={["#120a09"]} />
        <fog attach="fog" args={["#120a09", 6.4, 13.5]} />
        <PerspectiveCamera makeDefault position={[0.12, 0.62, 6.4]} fov={34} />
        <SceneRunner active={inView} />
        {/* Poca roba, tutta locale: si disegna subito. */}
        <DynamicLights />
        <WarmHalo />
        <RoadPlane />
        {/* Ambiente e moto si agganciano appena sono pronti: ciascuno ha il suo
            Suspense, cosi' il ritardo di uno non blocca l'altro. */}
        <Suspense fallback={null}>
          <Environment files={ENV_PATH} environmentIntensity={0.85} />
        </Suspense>
        <Suspense fallback={null}>
          <HellcatModel />
        </Suspense>
        <EffectComposer multisampling={0} enableNormalPass={false}>
          <Bloom luminanceThreshold={0.34} intensity={0.4} mipmapBlur />
          <Vignette eskil={false} offset={0.24} darkness={0.42} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
