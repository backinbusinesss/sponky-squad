import { Float, useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { asset } from "@/lib/asset";

/**
 * Moto dell'hero: Hellcat X132.
 *
 * Il modello arriva dal pacchetto originale (Blender -> GLB) ed e' gia'
 * orientato come la scena: muso verso +Z, ruote che girano attorno all'asse X,
 * unita' in metri (2.22 di lunghezza). Qui viene solo normalizzato (scala,
 * centratura, appoggio a terra) e rifinito nei materiali.
 *
 * Animazione: la strada sotto scorre, quindi le ruote girano — la moto
 * "viaggia" da ferma. In piu' segue il mouse con un ritardo morbido e vibra
 * appena come un motore al minimo.
 */

const MODEL_PATH = asset("/models/hellcat.glb");

/** Lunghezza della moto in unita' di scena (il modello misura 2.218 m). */
const TARGET_LENGTH = 2.9;

type Placement = { position: [number, number, number]; scale: number; rotY: number };

/**
 * Posizione nella scena. Su schermi stretti la moto e' piu' piccola e piu'
 * alta: altrimenti il muso finisce fuori dal bordo destro.
 */
function usePlacement(): Placement {
  const width = useThree((state) => state.size.width);
  return useMemo(() => {
    if (width < 640) {
      return { position: [0, -0.5, -0.2], scale: 0.74, rotY: -0.52 };
    }
    if (width < 1024) {
      return { position: [0.05, -0.55, -0.15], scale: 0.86, rotY: -0.56 };
    }
    return { position: [0.3, -0.6, 0], scale: 1, rotY: -0.58 };
  }, [width]);
}

/** Materiali: piu' riflessi, e le superfici opache non devono spegnersi. */
function tuneMaterials(scene: THREE.Object3D) {
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;

    object.castShadow = false;
    object.receiveShadow = false;

    const list = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of list) {
      if (!material) continue;

      if (material instanceof THREE.MeshStandardMaterial) {
        material.envMapIntensity = 1.3;
        material.roughness = Math.max(material.roughness, 0.24);
        material.metalness = Math.max(material.metalness, 0.12);
        // la vernice del serbatoio e' molto scura: senza un minimo di emissive
        // si perde nel fondo nero della scena
        if (material.color && material.color.getHSL({ h: 0, s: 0, l: 0 }).l < 0.06) {
          material.emissive = new THREE.Color("#1a0f08");
          material.emissiveIntensity = 0.28;
        }
      }

      // Le luci posteriori del modello sono emissive: si tengono accese ma
      // basse, altrimenti con il bloom diventano una macchia.
      const glow = material as THREE.Material & { emissiveIntensity?: number };
      if (typeof glow.emissiveIntensity === "number" && glow.emissiveIntensity > 0.6) {
        glow.emissiveIntensity = 0.6;
      }
    }
  });
}

/** Prepara una copia del modello: materiali, scala, centratura, appoggio. */
function prepare(source: THREE.Object3D) {
  const clone = source.clone(true);
  tuneMaterials(clone);

  // Il pacchetto contiene anche il pavimento di Blender ("Plane"): qui la
  // scena ha gia' la sua strada, quindi quel piano va nascosto.
  clone.traverse((object) => {
    if (object instanceof THREE.Mesh && /^plane/i.test(object.name)) {
      object.visible = false;
    }
  });

  const box = new THREE.Box3().setFromObject(clone);
  const size = box.getSize(new THREE.Vector3());
  const scale = TARGET_LENGTH / Math.max(size.x, size.z);
  clone.scale.multiplyScalar(scale);

  // Ricentra su X/Z e appoggia le ruote a y = 0: cosi' il gruppo esterno puo'
  // posizionare la moto sul piano stradale senza conti a mano.
  const fitted = new THREE.Box3().setFromObject(clone);
  const center = fitted.getCenter(new THREE.Vector3());
  clone.position.x -= center.x;
  clone.position.z -= center.z;
  clone.position.y -= fitted.min.y;

  return clone;
}

/** Ruote da far girare: nel GLB si chiamano "front_tire" e "Back_tire". */
function collectWheels(root: THREE.Object3D) {
  const wheels: THREE.Object3D[] = [];
  root.traverse((object) => {
    if (/tire/i.test(object.name) && object.type !== "Scene") {
      wheels.push(object);
    }
  });
  return wheels;
}

export function HellcatModel() {
  const gltf = useGLTF(MODEL_PATH);
  const place = usePlacement();
  const group = useRef<THREE.Group>(null);
  const { mouse } = useThree();

  const { scene, wheels } = useMemo(() => {
    const prepared = prepare(gltf.scene);
    return { scene: prepared, wheels: collectWheels(prepared) };
  }, [gltf.scene]);

  useFrame((state, delta) => {
    // Ruote in rotazione: la strada scorre, quindi la moto deve "camminare".
    for (const wheel of wheels) {
      wheel.rotation.x -= delta * 1.7;
    }

    if (group.current) {
      // inseguimento morbido del mouse: il ritardo e' voluto, da peso
      group.current.rotation.y = THREE.MathUtils.lerp(
        group.current.rotation.y,
        place.rotY + mouse.x * 0.12,
        0.045,
      );
      group.current.rotation.x = THREE.MathUtils.lerp(
        group.current.rotation.x,
        -mouse.y * 0.03,
        0.045,
      );
      // vibrazione del minimo
      const idle = state.clock.elapsedTime * 26;
      group.current.position.y =
        place.position[1] + Math.sin(state.clock.elapsedTime * 0.9) * 0.02 + Math.sin(idle) * 0.0022;
      group.current.rotation.z = Math.sin(idle * 0.5) * 0.0026;
    }

    // frameloop "demand": senza invalidate l'animazione si fermerebbe al primo frame
    state.invalidate();
  });

  return (
    <Float speed={0.7} floatIntensity={0.06} rotationIntensity={0.03}>
      <group ref={group} position={place.position} rotation={[0, place.rotY, 0]}>
        <primitive object={scene} />
      </group>
    </Float>
  );
}

useGLTF.preload(MODEL_PATH);
