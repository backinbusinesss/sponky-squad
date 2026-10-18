import { Float, RoundedBox, useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useAssetExists } from "@/hooks/useAssetExists";
import { asset } from "@/lib/asset";

const MODEL_PATH = asset("/models/superbike.glb");

/**
 * Sponky: il maialino della mascotte del sito, in sella.
 * Stile fedele all'icona ufficiale: testa grande (funko), occhioni blu,
 * musetto rosa, casco nero lucido con banda bianca/rossa e gocciolini,
 * occhiali sul casco, orecchie che spuntano, giubbotto in pelle con
 * t-shirt a righe rosse/bianche.
 *
 * Posa: "tuck" da corsa — tronco inclinato in avanti, zampe anteriori
 * POGGIATE SUL MANUBRIO (presa reale sui grip) e stivali sulle pedane.
 * Giacca LUNGA in pelle: gonnella che arriva sotto i fianchi piu' due
 * falde laterali e una centrale che svolazzano all'indietro (vento),
 * foderate di rosso racing. Sciarpa rossa al vento.
 *
 * Il gruppo e' costruito direttamente in coordinate LOCALI della moto
 * (moto centerata, fronte = +Z):
 *   grip manubrio  ~ (+-0.47, 0.50, 0.56)
 *   sella          ~ (0, 0.40, -0.13)
 *   pedane         ~ (+-0.35, -0.07, -0.31)
 */
const PINK = "#f4a3ac";
const PINK_LIGHT = "#ffc2c9";
const PINK_DARK = "#d97986";
const BLACK_LEATHER = "#15161c";
const PANTS = "#1b1d24";
const HELMET_BLACK = "#0d0e13";
const RACING_RED = "#d8232a";
const RACING_WHITE = "#f2f4f8";

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

function PigRider() {
  const eyeL = -0.2;
  const eyeR = 0.2;
  const tailSideL = useRef<THREE.Group>(null);
  const tailSideR = useRef<THREE.Group>(null);
  const tailCenter = useRef<THREE.Group>(null);
  const scarfTip = useRef<THREE.Group>(null);

  // falde e sciarpa al vento: moto che viaggia, tutto fluttera indietro
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const flapA = Math.sin(t * 2.3);
    const flapB = Math.sin(t * 2.9 + 1.4);
    if (tailSideL.current) {
      tailSideL.current.rotation.x = 1.6 + flapA * 0.1;
    }
    if (tailSideR.current) {
      tailSideR.current.rotation.x = 1.6 + flapB * 0.1;
    }
    if (tailCenter.current) {
      tailCenter.current.rotation.x = 1.75 + flapB * 0.08;
    }
    if (scarfTip.current) {
      scarfTip.current.rotation.x = 0.35 + flapA * 0.1;
      scarfTip.current.rotation.y = -0.25 + flapB * 0.08;
    }
  });

  return (
    <group position={[0, 0.02, 0]} rotation={[0, 0, 0]} scale={1}>
      {/* ===== GAMBE: ginocchia sul serbatoio, stivali sulle pedane ===== */}
      {([-1, 1] as const).map((side) => (
        <group key={`leg-${side}`}>
          {/* coscia: fianco -> ginocchio (avanti, che abbraccia il serbatoio) */}
          {capsuleBetween(
            [side * 0.13, 0.4, -0.13],
            [side * 0.31, 0.15, 0.05],
            0.085,
            { color: PANTS, roughness: 0.55, metalness: 0.1 },
          )}
          {/* ginocchio con paraginocchio */}
          <mesh position={[side * 0.315, 0.15, 0.06]} scale={[1, 0.9, 1]}>
            <sphereGeometry args={[0.078, 20, 16]} />
            <meshStandardMaterial color="#0f1015" roughness={0.35} metalness={0.3} />
          </mesh>
          {/* stinco: ginocchio -> pedana */}
          {capsuleBetween(
            [side * 0.31, 0.13, 0.02],
            [side * 0.345, -0.03, -0.27],
            0.065,
            { color: PANTS, roughness: 0.55, metalness: 0.1 },
          )}
          {/* stivale da corsa sulla pedana */}
          <RoundedBox
            args={[0.115, 0.1, 0.24]}
            radius={0.03}
            position={[side * 0.348, -0.062, -0.285]}
            rotation={[0.06, side * -0.14, 0]}
          >
            <meshStandardMaterial color="#0a0b0f" roughness={0.42} metalness={0.22} />
          </RoundedBox>
          <mesh position={[side * 0.348, -0.02, -0.25]} rotation={[0.06, side * -0.14, 0]}>
            <boxGeometry args={[0.12, 0.035, 0.07]} />
            <meshStandardMaterial color={RACING_RED} roughness={0.35} metalness={0.3} />
          </mesh>
          <mesh position={[side * 0.348, -0.112, -0.29]} rotation={[0.06, side * -0.14, 0]}>
            <boxGeometry args={[0.118, 0.022, 0.24]} />
            <meshStandardMaterial color="#05060a" roughness={0.6} />
          </mesh>
        </group>
      ))}

      {/* ===== GIACCA LUNGA: gonnella ampia che avvolge anche i fianchi della moto ===== */}
      {/* pelle esterna */}
      <mesh position={[0, 0.42, -0.24]} rotation={[0.34, 0, 0]}>
        <cylinderGeometry args={[0.27, 0.52, 0.4, 30, 1, true, 0.94, 4.4]} />
        <meshStandardMaterial color={BLACK_LEATHER} roughness={0.42} metalness={0.18} side={THREE.DoubleSide} />
      </mesh>
      {/* fodera rossa racing che sporge dal lembo */}
      <mesh position={[0, 0.41, -0.243]} rotation={[0.34, 0, 0]}>
        <cylinderGeometry args={[0.254, 0.498, 0.414, 30, 1, true, 0.94, 4.4]} />
        <meshStandardMaterial color={RACING_RED} roughness={0.5} side={THREE.DoubleSide} />
      </mesh>
      {/* piping rosso sul lembo della giacca lunga */}
      <mesh position={[0, 0.249, -0.31]} rotation={[0.34 + Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.51, 0.019, 8, 40, 4.4]} />
        <meshStandardMaterial color={RACING_RED} roughness={0.45} emissive="#3d0507" emissiveIntensity={0.6} />
      </mesh>

      {/* fianchi/pelvi sotto la giacca */}
      <mesh position={[0, 0.4, -0.13]} scale={[0.2, 0.15, 0.17]}>
        <sphereGeometry args={[1, 24, 18]} />
        <meshStandardMaterial color={PANTS} roughness={0.55} metalness={0.1} />
      </mesh>

      {/* ===== FALDE DELLA GIACCA AL VENTO: dalla vita indietro, sopra il codino ===== */}
      {/* centrale: dal dorso del giubbotto, beccata dal vento verso l'alto */}
      <group ref={tailCenter} position={[0, 0.5, -0.34]} rotation={[1.75, 0, 0]}>
        <RoundedBox args={[0.2, 0.38, 0.04]} radius={0.016} position={[0, -0.19, 0]} rotation={[-0.1, 0, 0]}>
          <meshStandardMaterial color={BLACK_LEATHER} roughness={0.44} metalness={0.16} />
        </RoundedBox>
        <RoundedBox args={[0.17, 0.32, 0.014]} radius={0.006} position={[0, -0.192, -0.026]} rotation={[-0.1, 0, 0]}>
          <meshStandardMaterial color={RACING_RED} roughness={0.52} />
        </RoundedBox>
        <RoundedBox args={[0.17, 0.26, 0.034]} radius={0.014} position={[0, -0.45, 0.05]} rotation={[-0.5, 0, 0]}>
          <meshStandardMaterial color={BLACK_LEATHER} roughness={0.44} metalness={0.16} />
        </RoundedBox>
        <RoundedBox args={[0.14, 0.22, 0.012]} radius={0.005} position={[0, -0.455, 0.025]} rotation={[-0.5, 0, 0]}>
          <meshStandardMaterial color={RACING_RED} roughness={0.52} />
        </RoundedBox>
      </group>
      {/* laterali: svolazzano fuori dai fianchi come un cappotto preso dal vento */}
      {([-1, 1] as const).map((side) => (
        <group
          key={`tail-${side}`}
          ref={side === -1 ? tailSideL : tailSideR}
          position={[side * 0.2, 0.44, -0.3]}
          rotation={[1.6, side * -0.22, side * 0.3]}
        >
          <RoundedBox args={[0.16, 0.4, 0.038]} radius={0.015} position={[0, -0.2, 0]} rotation={[0, 0, side * -0.08]}>
            <meshStandardMaterial color={BLACK_LEATHER} roughness={0.44} metalness={0.16} />
          </RoundedBox>
          <RoundedBox args={[0.13, 0.34, 0.012]} radius={0.005} position={[0, -0.202, -0.026]} rotation={[0, 0, side * -0.08]}>
            <meshStandardMaterial color={RACING_RED} roughness={0.52} />
          </RoundedBox>
          <RoundedBox args={[0.13, 0.24, 0.032]} radius={0.013} position={[side * 0.02, -0.49, 0.04]} rotation={[-0.4, 0, side * -0.15]}>
            <meshStandardMaterial color={BLACK_LEATHER} roughness={0.44} metalness={0.16} />
          </RoundedBox>
        </group>
      ))}

      {/* ===== BUSTO: GIUBBOTTO IN PELLE (posa da corsa) ===== */}
      {capsuleBetween([0, 0.4, -0.1], [0, 0.7, 0.18], 0.165, {
        color: BLACK_LEATHER,
        roughness: 0.42,
        metalness: 0.18,
      })}
      {/* petto in avanti (tuck) */}
      <mesh position={[0, 0.64, 0.12]} scale={[0.158, 0.132, 0.14]}>
        <sphereGeometry args={[1, 28, 22]} />
        <meshStandardMaterial color={BLACK_LEATHER} roughness={0.4} metalness={0.2} />
      </mesh>

      {/* fascione/petto: t-shirt a righe rosse/bianche scoperta */}
      <group position={[0, 0.6, 0.1]} rotation={[0.9, 0, 0]}>
        <mesh position={[0, 0.02, 0.112]} scale={[0.086, 0.092, 0.037]}>
          <sphereGeometry args={[1, 24, 18]} />
          <meshStandardMaterial color={RACING_WHITE} roughness={0.62} />
        </mesh>
        <mesh position={[0, 0.052, 0.146]}>
          <boxGeometry args={[0.145, 0.026, 0.016]} />
          <meshStandardMaterial color={RACING_RED} roughness={0.6} />
        </mesh>
        <mesh position={[0, -0.004, 0.15]}>
          <boxGeometry args={[0.145, 0.026, 0.016]} />
          <meshStandardMaterial color={RACING_RED} roughness={0.6} />
        </mesh>
        {/* asole della giacca ai lati della camicia */}
        {([-1, 1] as const).map((side) => (
          <mesh key={`lapel-${side}`} position={[side * 0.095, 0.01, 0.128]} rotation={[0, 0, side * -0.28]}>
            <boxGeometry args={[0.055, 0.27, 0.028]} />
            <meshStandardMaterial color={BLACK_LEATHER} roughness={0.4} metalness={0.2} />
          </mesh>
        ))}
        {/* zip metallico */}
        <mesh position={[0.062, -0.02, 0.142]}>
          <boxGeometry args={[0.014, 0.24, 0.014]} />
          <meshStandardMaterial color="#3a3d48" roughness={0.3} metalness={0.8} />
        </mesh>
        {/* pannello dorsale: righe racing sulla schiena */}
        <mesh position={[0, 0.11, -0.158]}>
          <boxGeometry args={[0.23, 0.045, 0.02]} />
          <meshStandardMaterial color={RACING_RED} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.045, -0.162]}>
          <boxGeometry args={[0.23, 0.026, 0.02]} />
          <meshStandardMaterial color={RACING_WHITE} roughness={0.5} />
        </mesh>
      </group>

      {/* cintura con fibbia al neon cyan */}
      <mesh position={[0, 0.45, -0.06]} rotation={[-0.82, 0, 0]}>
        <torusGeometry args={[0.198, 0.028, 10, 32, 4.6]} />
        <meshStandardMaterial color="#0a0b0f" roughness={0.5} metalness={0.25} />
      </mesh>
      <RoundedBox args={[0.06, 0.045, 0.02]} radius={0.008} position={[0, 0.33, 0.1]} rotation={[0.9, 0, 0]}>
        <meshStandardMaterial color="#0b3d47" emissive="#19e6ff" emissiveIntensity={1.1} roughness={0.3} metalness={0.5} />
      </RoundedBox>

      {/* ===== BRACCIA: le ZAMPE POGGIATE SUI GRIP DEL MANUBRIO ===== */}
      {([-1, 1] as const).map((side) => (
        <group key={`arm-${side}`}>
          {/* spallaccio in pelle */}
          <mesh position={[side * 0.2, 0.69, 0.13]} scale={[0.095, 0.085, 0.09]}>
            <sphereGeometry args={[1, 22, 18]} />
            <meshStandardMaterial color={BLACK_LEATHER} roughness={0.38} metalness={0.22} />
          </mesh>
          {/* omero: spalla -> gomito */}
          {capsuleBetween(
            [side * 0.21, 0.68, 0.15],
            [side * 0.33, 0.57, 0.36],
            0.06,
            { color: BLACK_LEATHER, roughness: 0.44, metalness: 0.16 },
          )}
          {/* banda rossa sul braccio */}
          {capsuleBetween(
            [side * 0.295, 0.605, 0.3],
            [side * 0.315, 0.585, 0.33],
            0.063,
            { color: RACING_RED, roughness: 0.45 },
          )}
          {/* avambraccio: gomito -> polso sul grip */}
          {capsuleBetween(
            [side * 0.33, 0.57, 0.36],
            [side * 0.44, 0.515, 0.52],
            0.052,
            { color: BLACK_LEATHER, roughness: 0.44, metalness: 0.16 },
          )}
          {/* polsino rosso */}
          {capsuleBetween(
            [side * 0.415, 0.528, 0.485],
            [side * 0.44, 0.515, 0.52],
            0.056,
            { color: RACING_RED, roughness: 0.45 },
          )}
          {/* guanto da corsa che AVVOLGE il grip */}
          <RoundedBox
            args={[0.1, 0.082, 0.125]}
            radius={0.03}
            position={[side * 0.462, 0.512, 0.56]}
            rotation={[0.3, 0, side * -0.12]}
          >
            <meshStandardMaterial color="#0a0b0f" roughness={0.42} metalness={0.24} />
          </RoundedBox>
          {/* nocche rosse */}
          <mesh position={[side * 0.462, 0.552, 0.552]} rotation={[0.3, 0, side * -0.12]}>
            <boxGeometry args={[0.085, 0.02, 0.05]} />
            <meshStandardMaterial color={RACING_RED} roughness={0.35} metalness={0.3} />
          </mesh>
          {/* dita che passano sotto il grip */}
          <mesh position={[side * 0.462, 0.468, 0.575]}>
            <sphereGeometry args={[0.042, 16, 12]} />
            <meshStandardMaterial color="#0a0b0f" roughness={0.45} metalness={0.2} />
          </mesh>
        </group>
      ))}

      {/* ===== COLLARLO + NUCA ===== */}
      {capsuleBetween([0, 0.66, 0.12], [0, 0.78, 0.15], 0.078, { color: PINK, roughness: 0.58 })}
      {/* gobba da corsa dietro le spalle */}
      <mesh position={[0, 0.66, -0.02]} rotation={[0.6, 0, 0]} scale={[0.15, 0.11, 0.16]}>
        <sphereGeometry args={[1, 24, 18]} />
        <meshStandardMaterial color={BLACK_LEATHER} roughness={0.36} metalness={0.24} />
      </mesh>
      {/* colletto alto della giacca in pelle */}
      <mesh position={[0, 0.73, 0.11]} rotation={[-0.28, 0, 0]}>
        <torusGeometry args={[0.125, 0.045, 12, 32, Math.PI * 1.55]} />
        <meshStandardMaterial color={BLACK_LEATHER} roughness={0.42} metalness={0.2} />
      </mesh>
      {/* passamontagna sotto il casco */}
      <mesh position={[0, 0.78, 0.12]} rotation={[-0.2, 0, 0]}>
        <torusGeometry args={[0.112, 0.036, 10, 28]} />
        <meshStandardMaterial color="#101118" roughness={0.7} />
      </mesh>

      {/* ===== SCIARPA ROSSA AL VENTO: anello al collo + nastri dietro ===== */}
      <group position={[0, 0.74, 0.1]} rotation={[-0.35, 0, 0]}>
        {/* anello attorno al collo */}
        <mesh>
          <torusGeometry args={[0.105, 0.038, 10, 26, Math.PI * 1.6]} />
          <meshStandardMaterial color={RACING_RED} roughness={0.62} />
        </mesh>
        {/* nastro lungo che esce dalla nuca e vola indietro */}
        <group ref={scarfTip} position={[0.05, 0.03, -0.09]} rotation={[0.5, -0.3, 0.12]}>
          <RoundedBox args={[0.07, 0.035, 0.3]} radius={0.014} position={[0, 0, -0.13]}>
            <meshStandardMaterial color={RACING_RED} roughness={0.62} />
          </RoundedBox>
          <RoundedBox args={[0.055, 0.028, 0.22]} radius={0.011} position={[0.015, -0.015, -0.36]} rotation={[0.35, 0.15, 0]}>
            <meshStandardMaterial color="#b81c22" roughness={0.64} />
          </RoundedBox>
        </group>
        {/* secondo nastro piu' corto, staccato sul lato */}
        <group position={[-0.07, 0.02, -0.07]} rotation={[0.6, 0.35, -0.18]}>
          <RoundedBox args={[0.05, 0.026, 0.2]} radius={0.01} position={[0, 0, -0.09]}>
            <meshStandardMaterial color={RACING_RED} roughness={0.62} />
          </RoundedBox>
        </group>
      </group>

      {/* ===== TESTA (funko grande, in leggero tuck verso il manubrio) ===== */}
      <group position={[0, 0.98, 0.2]} rotation={[0.14, 0, 0]} scale={0.4}>
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

        {/* fibbie del casco (hanno il mento, non escono dalle guance) */}
        {[-1, 1].map((side) => (
          <mesh key={`strap-${side}`} position={[side * 0.3, -0.34, 0.16]} rotation={[0.45, 0, side * 0.35]}>
            <boxGeometry args={[0.06, 0.22, 0.05]} />
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
      {/* alone al suolo: suggeriscono la moto che "galleggia" sul neon */}
      <mesh position={[-0.52, -0.36, 0.74]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 0.08]}>
        <torusGeometry args={[0.34, 0.018, 10, 60]} />
        <meshBasicMaterial color="#e74e0f" transparent opacity={0.78} />
      </mesh>
      <mesh position={[0.5, -0.33, -0.72]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 0.08]}>
        <torusGeometry args={[0.28, 0.016, 10, 60]} />
        <meshBasicMaterial color="#e74e0f" transparent opacity={0.54} />
      </mesh>

      {/* striscia luminosa sul carter: sottile e intensa, non un riquadro */}
      <RoundedBox args={[0.62, 0.045, 0.028]} radius={0.018} position={[0.16, 0.2, 0.52]} rotation={[0.12, -0.32, -0.04]}>
        <meshStandardMaterial
          color="#ff7a18"
          emissive="#ff6a00"
          emissiveIntensity={2.6}
          roughness={0.25}
          metalness={0.3}
        />
      </RoundedBox>
      {/* pannello scuro affumicato al posto della lastra bianca */}
      <RoundedBox args={[0.46, 0.17, 0.03]} radius={0.018} position={[0.48, 0.47, 0.31]} rotation={[0.04, -0.55, 0.1]}>
        <meshStandardMaterial
          color="#0c0f15"
          emissive="#0b2b34"
          emissiveIntensity={0.5}
          roughness={0.16}
          metalness={0.85}
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

    // pneumatici: arancione saturo con quasi nessun blu
    if (src.r > 0.30 && src.b < 0.09 && src.g < src.r * 0.38 && src.r > src.b + 0.20) {
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
    // spruzzi e scritte chiari e neutri: riportati sul tono del pannello
    // per non far sembrare la carena sporca di pennarello
    else if (min(src.r, min(src.g, src.b)) > 0.24 &&
             (max(max(src.r, src.g), src.b) - min(src.r, min(src.g, src.b))) < 0.13) {
      diffuseColor.rgb *= 0.46;
    }
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
        item.envMapIntensity = 1.1;
        item.roughness = Math.max(item.roughness, 0.32);
        item.metalness = Math.max(item.metalness, 0.18);
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
