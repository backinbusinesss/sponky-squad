import { Environment, PerspectiveCamera } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";
import { SuperbikeModel } from "@/three/SuperbikeModel";

function RoadPlane() {
  const mesh = useRef<THREE.Mesh>(null);
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#08090d";
    ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 420; i += 1) {
      const alpha = Math.random() * 0.18;
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fillRect(Math.random() * 128, Math.random() * 128, Math.random() * 2, Math.random() * 2);
    }
    const canvasTexture = new THREE.CanvasTexture(canvas);
    canvasTexture.wrapS = THREE.RepeatWrapping;
    canvasTexture.wrapT = THREE.RepeatWrapping;
    canvasTexture.repeat.set(8, 14);
    return canvasTexture;
  }, []);

  useFrame((_, delta) => {
    texture.offset.y -= delta * 0.035;
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
          color="#11131a"
          roughness={0.36}
          metalness={0.72}
          envMapIntensity={0.4}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.32, 0.02]}>
        <planeGeometry args={[0.055, 14]} />
        <meshBasicMaterial color="#e74e0f" transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

function DynamicLights() {
  const rim = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    if (rim.current) {
      rim.current.position.x = Math.sin(state.clock.elapsedTime * 0.7) * 2.6;
      rim.current.intensity = 5.5 + Math.sin(state.clock.elapsedTime * 1.1) * 1.2;
    }
  });

  return (
    <>
      <ambientLight intensity={0.58} />
      <hemisphereLight args={["#ffffff", "#101010", 1.1]} />
      <spotLight position={[0, 5, 4]} angle={0.5} penumbra={0.85} intensity={10} color="#ffffff" />
      <pointLight ref={rim} position={[-3.2, 1.8, 1.6]} color="#e74e0f" intensity={4.2} distance={7} />
      <pointLight position={[3.2, -0.2, 1.4]} color="#ffffff" intensity={2.4} distance={6} />
      <pointLight position={[1.7, 0.8, 2.2]} color="#e74e0f" intensity={1.8} distance={4.5} />
    </>
  );
}

export function BikeScene() {
  return (
    <Canvas
      frameloop="demand"
      dpr={[0.8, 1.15]}
      performance={{ min: 0.35 }}
      gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
    >
      <color attach="background" args={["#050507"]} />
      <fog attach="fog" args={["#050507", 5.8, 12.5]} />
      <PerspectiveCamera makeDefault position={[0.12, 0.5, 6.55]} fov={34} />
      <Suspense fallback={null}>
        <DynamicLights />
        <RoadPlane />
        <SuperbikeModel />
        <Environment preset="warehouse" environmentIntensity={0.55} />
        <EffectComposer multisampling={0} enableNormalPass={false}>
          <Bloom luminanceThreshold={0.28} intensity={0.42} mipmapBlur />
          <Vignette eskil={false} offset={0.22} darkness={0.55} />
        </EffectComposer>
      </Suspense>
    </Canvas>
  );
}
