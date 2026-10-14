import { Float, RoundedBox, useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useAssetExists } from "@/hooks/useAssetExists";

const MODEL_PATH = "/models/superbike.glb";

/**
 * Sponky: il maialino della mascotte del sito, in sella.
 * Stile fedele all'icona ufficiale: testa grande (funko), occhioni blu,
 * musetto rosa, casco nero lucido con banda bianca/rossa e gocciolini,
 * occhiali sul casco, orecchie che spuntano, giubbotto in pelle con
 * t-shirt a righe rosse/bianche.
 */
const PINK = "#f4a3ac";
const PINK_LIGHT = "#ffc2c9";
const PINK_DARK = "#d97986";
const BLACK_LEATHER = "#15161c";
const HELMET_BLACK = "#0d0e13";
const RACING_RED = "#d8232a";
const RACING_WHITE = "#f2f4f8";

function PigRider() {
  const eyeL = -0.2;
  const eyeR = 0.2;

  return (
    <group position={[-0.1, 0.46, -0.04]} rotation={[0.02, 0.18, -0.16]} scale={0.34}>
      {/* ===== GAMBE ===== */}
      {[-1, 1].map((side) => (
        <group key={`leg-${side}`}>
          {/* coscia */}
          <mesh
            position={[side * 0.24, 0.02, 0.22]}
            rotation={[1.3, 0, side * 0.12]}
            castShadow={false}
          >
            <capsuleGeometry args={[0.11, 0.28, 6, 14]} />
            <meshStandardMaterial color={BLACK_LEATHER} roughness={0.5} metalness={0.12} />
          </mesh>
          {/* stinco */}
          <mesh position={[side * 0.27, -0.17, 0.31]} rotation={[0.3, 0, 0]}>
            <capsuleGeometry args={[0.1, 0.24, 6, 14]} />
            <meshStandardMaterial color={BLACK_LEATHER} roughness={0.55} metalness={0.1} />
          </mesh>
          {/* stivale */}
          <mesh position={[side * 0.28, -0.36, 0.27]} rotation={[0.1, side * 0.1, 0]}>
            <boxGeometry args={[0.17, 0.15, 0.34]} />
            <meshStandardMaterial color="#0a0b0f" roughness={0.4} metalness={0.25} />
          </mesh>
          <mesh position={[side * 0.28, -0.3, 0.31]} rotation={[0.1, side * 0.1, 0]}>
            <boxGeometry args={[0.15, 0.05, 0.2]} />
            <meshStandardMaterial color={RACING_RED} roughness={0.35} metalness={0.3} />
          </mesh>
        </group>
      ))}

      {/* ===== BUSTO: GIUBBOTTO IN PELLE ===== */}
      <mesh position={[0, 0.1, 0]} scale={[0.4, 0.3, 0.34]}>
        <sphereGeometry args={[1, 32, 24]} />
        <meshStandardMaterial color={BLACK_LEATHER} roughness={0.42} metalness={0.18} />
      </mesh>
      <mesh position={[0, 0.3, 0.02]} scale={[0.42, 0.38, 0.36]}>
        <sphereGeometry args={[1, 32, 24]} />
        <meshStandardMaterial color={BLACK_LEATHER} roughness={0.4} metalness={0.2} />
      </mesh>

      {/* t-shirt a righe (petto) */}
      <mesh position={[0, 0.3, 0.3]} scale={[0.2, 0.24, 0.12]}>
        <sphereGeometry args={[1, 24, 18]} />
        <meshStandardMaterial color={RACING_WHITE} roughness={0.62} />
      </mesh>
      <mesh position={[0, 0.37, 0.404]}>
        <boxGeometry args={[0.3, 0.06, 0.03]} />
        <meshStandardMaterial color={RACING_RED} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.24, 0.408]}>
        <boxGeometry args={[0.3, 0.06, 0.03]} />
        <meshStandardMaterial color={RACING_RED} roughness={0.6} />
      </mesh>
      {/* zip del giubbotto */}
      <mesh position={[0.17, 0.3, 0.33]} rotation={[0, 0, -0.1]}>
        <boxGeometry args={[0.03, 0.42, 0.03]} />
        <meshStandardMaterial color="#3a3d48" roughness={0.3} metalness={0.8} />
      </mesh>

      {/* ===== BRACCIA verso il manubrio ===== */}
      {[-1, 1].map((side) => (
        <group key={`arm-${side}`}>
          <mesh position={[side * 0.34, 0.46, 0.06]}>
            <sphereGeometry args={[0.15, 20, 16]} />
            <meshStandardMaterial color={BLACK_LEATHER} roughness={0.4} metalness={0.2} />
          </mesh>
          <mesh
            position={[side * 0.4, 0.34, 0.26]}
            rotation={[1.18, 0, side * 0.26]}
          >
            <capsuleGeometry args={[0.095, 0.3, 6, 14]} />
            <meshStandardMaterial color={BLACK_LEATHER} roughness={0.44} metalness={0.16} />
          </mesh>
          {/* guanto */}
          <mesh position={[side * 0.42, 0.2, 0.48]}>
            <sphereGeometry args={[0.12, 18, 14]} />
            <meshStandardMaterial color="#0a0b0f" roughness={0.45} metalness={0.2} />
          </mesh>
          <mesh position={[side * 0.42, 0.24, 0.55]}>
            <boxGeometry args={[0.16, 0.1, 0.06]} />
            <meshStandardMaterial color={RACING_RED} roughness={0.4} />
          </mesh>
        </group>
      ))}

      {/* ===== COLLARDO ===== */}
      <mesh position={[0, 0.56, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.24, 0.07, 12, 32]} />
        <meshStandardMaterial color={BLACK_LEATHER} roughness={0.5} metalness={0.14} />
      </mesh>

      {/* ===== TESTA ===== */}
      <group position={[0, 0.95, 0.04]} rotation={[0.1, 0, 0]}>
        <mesh>
          <sphereGeometry args={[0.5, 40, 32]} />
          <meshStandardMaterial color={PINK} roughness={0.58} metalness={0.02} />
        </mesh>

        {/* musetto */}
        <mesh position={[0, -0.1, 0.44]} scale={[1.3, 0.9, 0.78]}>
          <sphereGeometry args={[0.2, 28, 22]} />
          <meshStandardMaterial color={PINK_LIGHT} roughness={0.55} />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh key={`nostril-${side}`} position={[side * 0.075, -0.09, 0.585]} scale={[1, 0.85, 0.6]}>
            <sphereGeometry args={[0.045, 12, 10]} />
            <meshStandardMaterial color={PINK_DARK} roughness={0.6} />
          </mesh>
        ))}

        {/* guance */}
        {[-1, 1].map((side) => (
          <mesh key={`cheek-${side}`} position={[side * 0.3, -0.1, 0.3]} scale={[0.6, 0.5, 0.4]}>
            <sphereGeometry args={[0.16, 16, 14]} />
            <meshStandardMaterial color="#f98f9d" roughness={0.6} />
          </mesh>
        ))}

        {/* occhioni */}
        {[eyeL, eyeR].map((x) => (
          <group key={`eye-${x}`} position={[x, 0.09, 0.36]}>
            <mesh>
              <sphereGeometry args={[0.15, 24, 20]} />
              <meshStandardMaterial color="#fbfdff" roughness={0.22} />
            </mesh>
            <mesh position={[0, 0, 0.085]}>
              <sphereGeometry args={[0.098, 20, 16]} />
              <meshStandardMaterial color="#2f8fe0" roughness={0.18} metalness={0.1} />
            </mesh>
            <mesh position={[0, 0, 0.13]}>
              <sphereGeometry args={[0.056, 16, 14]} />
              <meshStandardMaterial color="#0b1220" roughness={0.15} />
            </mesh>
            <mesh position={[-0.04, 0.05, 0.16]}>
              <sphereGeometry args={[0.03, 12, 10]} />
              <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} roughness={0.1} />
            </mesh>
          </group>
        ))}

        {/* ===== ORECCHIE (spuntano dal casco) ===== */}
        {[-1, 1].map((side) => (
          <group key={`ear-${side}`} position={[side * 0.42, 0.2, -0.02]} rotation={[0, 0, side * -0.5]}>
            <mesh scale={[0.5, 1.05, 0.3]}>
              <sphereGeometry args={[0.26, 22, 18]} />
              <meshStandardMaterial color={PINK} roughness={0.58} />
            </mesh>
            <mesh position={[0, 0.03, 0.06]} scale={[0.34, 0.8, 0.24]}>
              <sphereGeometry args={[0.24, 18, 14]} />
              <meshStandardMaterial color="#f6808f" roughness={0.62} />
            </mesh>
          </group>
        ))}

        {/* ===== CASCO ===== */}
        {/* cupola piena */}
        <mesh position={[0, 0.02, -0.02]}>
          <sphereGeometry args={[0.56, 44, 32, 0, Math.PI * 2, 0, Math.PI * 0.3]} />
          <meshStandardMaterial color={HELMET_BLACK} roughness={0.16} metalness={0.55} />
        </mesh>
        {/* bande laterali/dietro con apertura frontale */}
        <mesh position={[0, 0.02, -0.02]}>
          <sphereGeometry args={[0.56, 44, 28, Math.PI / 2 + 0.95, Math.PI * 2 - 1.9, Math.PI * 0.27, Math.PI * 0.33]} />
          <meshStandardMaterial
            color={HELMET_BLACK}
            roughness={0.16}
            metalness={0.55}
            side={THREE.DoubleSide}
          />
        </mesh>
        {/* bordo inferiore casco */}
        <mesh position={[0, -0.12, -0.02]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.52, 0.035, 10, 48, Math.PI * 1.45]} />
          <meshStandardMaterial color="#26282f" roughness={0.3} metalness={0.6} />
        </mesh>

        {/* banda bianca sagittale (fronte + retro) */}
        {[Math.PI / 2, -Math.PI / 2].map((phi) => (
          <mesh key={`stripe-${phi}`} position={[0, 0.02, -0.02]}>
            <sphereGeometry args={[0.568, 20, 20, phi - 0.24, 0.48, 0, Math.PI * 0.31]} />
            <meshStandardMaterial color={RACING_WHITE} roughness={0.3} metalness={0.25} />
          </mesh>
        ))}
        {/* pinstripe rosse ai lati della banda bianca */}
        {[-0.3, 0.3].map((d) =>
          [Math.PI / 2, -Math.PI / 2].map((phi) => (
            <mesh key={`red-${phi}-${d}`} position={[0, 0.02, -0.02]}>
              <sphereGeometry args={[0.57, 12, 20, phi + d - 0.05, 0.1, 0, Math.PI * 0.31]} />
              <meshStandardMaterial color={RACING_RED} roughness={0.3} metalness={0.3} />
            </mesh>
          )),
        )}

        {/* occhiali sul casco (banda + lente) */}
        <mesh position={[0, 0.3, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.47, 0.06, 12, 48]} />
          <meshStandardMaterial color="#1a1c23" roughness={0.35} metalness={0.5} />
        </mesh>
        <mesh position={[0, 0.3, 0.04]} rotation={[0, 0, 0]}>
          <cylinderGeometry args={[0.46, 0.46, 0.2, 32, 1, true, -1.05, 2.1]} />
          <meshStandardMaterial
            color="#19e6ff"
            transparent
            opacity={0.55}
            roughness={0.1}
            metalness={0.6}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh position={[-0.12, 0.36, 0.44]} rotation={[0.1, 0, 0.5]} scale={[0.5, 0.14, 0.05]}>
          <sphereGeometry args={[0.2, 12, 10]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={0.55} roughness={0.1} />
        </mesh>

        {/* visiera aperta sul frontale */}
        <mesh position={[0, 0.1, 0.5]} rotation={[-0.12, 0, 0]} scale={[1.35, 0.4, 0.16]}>
          <sphereGeometry args={[0.24, 20, 12]} />
          <meshStandardMaterial
            color="#0f1116"
            roughness={0.14}
            metalness={0.7}
          />
        </mesh>

        {/* fibbie del casco */}
        {[-1, 1].map((side) => (
          <mesh key={`strap-${side}`} position={[side * 0.4, -0.3, 0.18]} rotation={[0.3, 0, side * 0.5]}>
            <boxGeometry args={[0.07, 0.3, 0.05]} />
            <meshStandardMaterial color="#101116" roughness={0.6} />
          </mesh>
        ))}

        {/* spoiler posteriore */}
        <mesh position={[0, 0.06, -0.52]} rotation={[0.3, 0, 0]}>
          <boxGeometry args={[0.34, 0.1, 0.16]} />
          <meshStandardMaterial color="#171922" roughness={0.25} metalness={0.6} />
        </mesh>
      </group>
    </group>
  );
}

function HeroBikeAccents() {
  return (
    <group>
      <mesh position={[-0.52, -0.36, 0.74]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 0.08]}>
        <torusGeometry args={[0.34, 0.018, 10, 60]} />
        <meshBasicMaterial color="#e74e0f" transparent opacity={0.78} />
      </mesh>
      <mesh position={[0.5, -0.33, -0.72]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 0.08]}>
        <torusGeometry args={[0.28, 0.016, 10, 60]} />
        <meshBasicMaterial color="#e74e0f" transparent opacity={0.54} />
      </mesh>
      <RoundedBox args={[0.72, 0.16, 0.045]} radius={0.025} position={[0.16, 0.24, 0.52]} rotation={[0.12, -0.32, -0.04]}>
        <meshStandardMaterial color="#e74e0f" emissive="#e74e0f" emissiveIntensity={0.5} roughness={0.28} metalness={0.48} />
      </RoundedBox>
      <RoundedBox args={[0.5, 0.2, 0.035]} radius={0.02} position={[0.48, 0.47, 0.31]} rotation={[0.04, -0.55, 0.1]}>
        <meshStandardMaterial color="#f5f5f5" roughness={0.18} metalness={0.7} transparent opacity={0.82} />
      </RoundedBox>
    </group>
  );
}

function applyHeroMaterials(scene: THREE.Object3D) {
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) {
      return;
    }

    object.castShadow = false;
    object.receiveShadow = false;

    const material = object.material;
    if (Array.isArray(material)) {
      material.forEach((item) => {
        if (item instanceof THREE.MeshStandardMaterial) {
          item.envMapIntensity = 1.1;
          item.roughness = Math.max(item.roughness, 0.32);
          item.metalness = Math.max(item.metalness, 0.18);
        }
      });
    } else if (material instanceof THREE.MeshStandardMaterial) {
      material.envMapIntensity = 1.1;
      material.roughness = Math.max(material.roughness, 0.28);
      material.metalness = Math.max(material.metalness, 0.18);
    }
  });
}

function RealSuperbike() {
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
    <group scale={1.32} rotation={[0, -0.72, 0]} position={[1.72, -0.48, 0]}>
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
        {modelExists ? <RealSuperbike /> : <FallbackSuperbike />}
      </group>
    </Float>
  );
}

useGLTF.preload(MODEL_PATH);
