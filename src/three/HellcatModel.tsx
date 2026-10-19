import { Float, useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
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

/** Salto di tempo massimo per fotogramma (secondi). Dopo una pausa lunga il
 *  delta del clock sarebbe enorme e farebbe scattare ruote e vibrazione. */
const MAX_DELTA = 0.05;

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

/**
 * Colori di base presi dal pacchetto originale (FILE/Model/hellcat.mtl).
 *
 * L'export GLB ha perso il colore di "Black Metal" e "matte silver" — senza
 * baseColorFactor il loader li legge bianchi — quindi la moto perdeva il
 * contrasto nero/argento dei render. Qui si rimettono i valori del file, in
 * forma lineare (come li legge il loader glTF, non sRGB).
 */
const PACK_BASE_COLORS: Record<string, [number, number, number]> = {
  "Black Metal": [0.017388, 0.017388, 0.017388],
  "matte silver": [0.401851, 0.401851, 0.401851],
  emission: [0.8, 0.8, 0.8],
  "tail light": [0.8, 0.8, 0.8],
};

/**
 * Materiali: colori del pacchetto, riflessi neutri e superfici opache accese.
 *
 * Il modello non ha texture (il Readme del pacchetto lo dice: solo materiali
 * Blender), quindi i "colori" sono i valori dei materiali. Due cose li
 * alteravano: le due basi bianche perse nell'export e l'ambiente della scena,
 * un tramonto caldo che tinse di arancio tutto il metallo. Con l'ambiente
 * neutro qui sotto cromo, argento e rame tornano come nei render, mentre la
 * scena intorno resta calda come prima.
 */
function tuneMaterials(source: THREE.Object3D, neutralEnv: THREE.Texture) {
  source.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;

    object.castShadow = false;
    object.receiveShadow = false;

    const list = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of list) {
      if (!material) continue;

      if (material instanceof THREE.MeshStandardMaterial) {
        const pack = PACK_BASE_COLORS[material.name];
        if (pack) material.color.setRGB(pack[0], pack[1], pack[2], THREE.LinearSRGBColorSpace);

        material.envMap = neutralEnv;
        material.envMapIntensity = 0.9;
        material.roughness = Math.max(material.roughness, 0.12);
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
function prepare(source: THREE.Object3D, neutralEnv: THREE.Texture) {
  const clone = source.clone(true);
  tuneMaterials(clone, neutralEnv);

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
  const elapsed = useRef(0);
  const { mouse } = useThree();
  const gl = useThree((state) => state.gl);

  /**
   * Ambiente neutro da studio (RoomEnvironment, incluso in three) usato solo
   * come envMap dei materiali della moto: e' la luce che nei render del
   * pacchetto fa leggere cromo, argento e rame per quello che sono. La scena
   * intorno continua a usare l'HDR del tramonto.
   */
  const neutralEnv = useMemo(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const texture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    return texture;
  }, [gl]);

  useEffect(() => () => neutralEnv.dispose(), [neutralEnv]);

  const { scene, wheels } = useMemo(() => {
    const prepared = prepare(gltf.scene, neutralEnv);
    return { scene: prepared, wheels: collectWheels(prepared) };
  }, [gltf.scene, neutralEnv]);

  useFrame((_, delta) => {
    // Il loop e' pilotato da BikeScene (SceneRunner): qui non si invalida piu',
    // altrimenti la scena continuerebbe a girare anche fuori schermo.
    const step = Math.min(delta, MAX_DELTA);
    elapsed.current += step;
    const time = elapsed.current;

    // Ruote in rotazione: la strada scorre, quindi la moto deve "camminare".
    for (const wheel of wheels) {
      wheel.rotation.x -= step * 1.7;
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
      const idle = time * 26;
      group.current.position.y =
        place.position[1] + Math.sin(time * 0.9) * 0.02 + Math.sin(idle) * 0.0022;
      group.current.rotation.z = Math.sin(idle * 0.5) * 0.0026;
    }
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
