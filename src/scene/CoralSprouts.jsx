import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { world } from '../sim/world';
import { useStore } from '../state/store';
import { seeded, sandY, isClear } from './reefLayout';

export const MAX_SPROUTS = 12;
const COLORS = [
  ['#ff8fc4', '#ff3fa0'],
  ['#ffb36b', '#ff7a1a'],
  ['#b58cff', '#9a5cff'],
  ['#7ee8d2', '#3dffb0'],
  ['#ffe066', '#d6ff3a'],
  ['#8fd8ff', '#29e3ff'],
];

// Fixed spots for the new little corals: the same tank always grows in the same places, kept away
// from homes, rocks and the open middle front where the pet fish swim.
const SPOTS = (() => {
  const rnd = seeded(4242);
  const out = [];
  for (let tries = 0; out.length < MAX_SPROUTS && tries < 400; tries++) {
    const x = (rnd() * 2 - 1) * 7.2;
    const z = -3.6 + rnd() * 4.6;
    if (Math.abs(x) < 2.6 && z > -0.5) continue;
    if (!isClear(x, z, 0.35)) continue;
    if (out.some((s) => Math.hypot(s.x - x, s.z - z) < 1.1)) continue;
    out.push({ x, z, kind: Math.floor(rnd() * 3), color: Math.floor(rnd() * COLORS.length), turn: rnd() * 6.28, seed: rnd() });
  }
  return out;
})();

/** How many sprouts a tank has after this many visit days (one every 2–3 days). */
export const sproutsFor = (days) => Math.min(SPOTS.length, Math.floor(Math.max(0, days - 1) / 2.5));

function Sprout({ s, kit, age }) {
  const y = sandY(s.x, s.z);
  const size = 0.45 + Math.min(1, age / 6) * 0.55; // the newest are small and grow over the days
  const mat = kit.mats[s.color];
  return (
    <group position={[s.x, y, s.z]} rotation={[0, s.turn, 0]} scale={size}>
      {s.kind === 0 &&
        // a little branching coral
        [-0.35, 0, 0.4].map((a, i) => (
          <mesh key={i} geometry={kit.branch} material={mat} position={[a * 0.25, 0.22, 0]} rotation={[0, 0, a]} scale={[1, 0.7 + i * 0.15, 1]} />
        ))}
      {s.kind === 1 && <mesh geometry={kit.dome} material={mat} scale={[0.3, 0.22, 0.28]} />}
      {s.kind === 2 &&
        // finger coral tufts
        [0, 1, 2, 3].map((i) => (
          <mesh key={i} geometry={kit.finger} material={mat} position={[Math.cos(i * 1.7) * 0.12, 0.14, Math.sin(i * 1.7) * 0.12]} rotation={[Math.cos(i) * 0.25, 0, Math.sin(i) * 0.25]} />
        ))}
    </group>
  );
}

// Baby corals that appear as the tank is visited day after day: the reef grows with care.
export default function CoralSprouts() {
  const days = useStore((s) => s.stats.visitDays || 0);
  const count = sproutsFor(days);
  const kit = useMemo(
    () => ({
      branch: new THREE.CapsuleGeometry(0.06, 0.4, 4, 8),
      dome: new THREE.SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2),
      finger: new THREE.CapsuleGeometry(0.05, 0.22, 4, 8),
      mats: COLORS.map(([c, glow]) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.65, emissive: glow, emissiveIntensity: 0 })),
    }),
    [],
  );
  useEffect(
    () => () => {
      kit.branch.dispose();
      kit.dome.dispose();
      kit.finger.dispose();
      kit.mats.forEach((m) => m.dispose());
    },
    [kit],
  );
  // Like the big corals, they fluoresce at night.
  useFrame(() => {
    const night = 1 - world.light;
    kit.mats.forEach((m) => (m.emissiveIntensity = night * night * 0.6));
  });
  return SPOTS.slice(0, count).map((s, i) => <Sprout key={i} s={s} kit={kit} age={days - 1 - i * 2.5} />);
}
