import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useCursor } from '@react-three/drei';
import { world } from '../sim/world';
import { showCreature, sfx } from '../state/store';
import { sharkActive } from '../sim/sharkBrain';
import { EEL_SPOT, sandY, seeded } from './reefLayout';

const COUNT = 7;
const SEGS = 6;
const SEG_LEN = 0.085;
const REACH = SEGS * SEG_LEN + 0.05; // how far an eel slides down into its hole

// A spotted garden eel colony: they sway out of their holes, turn to watch the fish, and all dive
// into the sand when tapped, when a fish swims right over them, or when the shark comes.
export default function GardenEels({ calm }) {
  const kit = useMemo(
    () => ({
      seg: new THREE.CapsuleGeometry(0.026, SEG_LEN, 3, 8),
      sphere: new THREE.SphereGeometry(1, 12, 8),
      hole: new THREE.RingGeometry(0.035, 0.075, 14).rotateX(-Math.PI / 2),
      holeDark: new THREE.CircleGeometry(0.04, 12).rotateX(-Math.PI / 2),
      body: new THREE.MeshStandardMaterial({ color: '#f3eee0', roughness: 0.45 }),
      spot: new THREE.MeshBasicMaterial({ color: '#2b2730' }),
      white: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.2 }),
      rim: new THREE.MeshStandardMaterial({ color: '#cdb48b', roughness: 0.95 }),
      dark: new THREE.MeshBasicMaterial({ color: '#4a3a28' }),
      hidden: new THREE.MeshBasicMaterial({ visible: false }),
    }),
    [],
  );
  useEffect(() => () => Object.values(kit).forEach((x) => x.dispose()), [kit]);

  const eels = useMemo(() => {
    const rnd = seeded(555);
    return Array.from({ length: COUNT }, (_, i) => {
      const a = (i / COUNT) * Math.PI * 2 + rnd() * 0.6;
      const d = i === 0 ? 0 : 0.28 + rnd() * 0.42;
      const x = EEL_SPOT.x + Math.cos(a) * d;
      const z = EEL_SPOT.z + Math.sin(a) * d * 0.7;
      return { x, z, y: sandY(x, z), size: 0.8 + rnd() * 0.4, phase: rnd() * 6.28, out: 1, hideUntil: 0, yaw: 0 };
    });
  }, []);

  const roots = useRef([]);
  const segs = useRef([]);
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const t = world.time;
    // The whole colony stays down while the shark is anywhere in the tank.
    const shark = sharkActive();
    eels.forEach((e, i) => {
      const root = roots.current[i];
      if (!root) return;
      // Find the nearest fish: watch it, or duck if it swims right over the hole.
      let near = null;
      let nearD = Infinity;
      for (const rt of world.runtime.values()) {
        const d = Math.hypot(rt.pos.x - e.x, rt.pos.z - e.z);
        if (d < nearD) {
          nearD = d;
          near = rt;
        }
      }
      if (near && nearD < 0.7 && near.pos.y < world.floorY + 1.3) e.hideUntil = Math.max(e.hideUntil, t + 1.2 + i * 0.15);
      const hide = shark || t < e.hideUntil;
      const target = hide ? 0 : 1;
      e.out += (target - e.out) * (1 - Math.exp(-dt * (hide ? 14 : 1.6)));
      root.position.y = e.y - (1 - e.out) * REACH * e.size;
      if (near && nearD < 5) {
        // Turn the short way round towards the fish.
        const turn = THREE.MathUtils.euclideanModulo(Math.atan2(near.pos.x - e.x, near.pos.z - e.z) - e.yaw + Math.PI, Math.PI * 2) - Math.PI;
        e.yaw += turn * (1 - Math.exp(-dt * 1.5));
      }
      root.rotation.y = e.yaw;
      const sway = calm ? 0.04 : 0.1;
      for (let k = 0; k < SEGS; k++) {
        const g = segs.current[i * SEGS + k];
        if (!g) continue;
        // Straight near the sand, curling forward at the top like a question mark.
        g.rotation.x = (k >= SEGS - 2 ? 0.45 : 0.04) * e.out;
        g.rotation.z = Math.sin(t * 1.3 + e.phase - k * 0.45) * sway * (k / SEGS);
      }
    });
  });

  const onClick = (e) => {
    e.stopPropagation();
    const t = world.time;
    // Everyone dives, then they peek out again one at a time.
    eels.forEach((eel, i) => (eel.hideUntil = t + 2.2 + i * 0.4));
    sfx('plop');
    showCreature('gardenEel');
  };

  return (
    <group>
      {eels.map((e, i) => {
        // Body segments nested so each bends from the one below.
        let node = (
          <group position={[0, SEG_LEN, 0]}>
            <mesh geometry={kit.sphere} material={kit.body} position={[0, 0.03, 0.005]} scale={[0.034, 0.04, 0.04]} />
            {[1, -1].map((side) => (
              <group key={side} position={[side * 0.022, 0.045, 0.02]}>
                <mesh geometry={kit.sphere} material={kit.white} scale={0.016} />
                <mesh geometry={kit.sphere} material={kit.spot} position={[0, 0, 0.011]} scale={0.009} />
              </group>
            ))}
          </group>
        );
        for (let k = SEGS - 1; k >= 0; k--) {
          node = (
            <group key={k} ref={(el) => (segs.current[i * SEGS + k] = el)} position={[0, k === 0 ? 0 : SEG_LEN, 0]}>
              <mesh geometry={kit.seg} material={kit.body} position={[0, SEG_LEN / 2, 0]} />
              {k % 2 === 1 && <mesh geometry={kit.sphere} material={kit.spot} position={[0, SEG_LEN / 2, 0.024]} scale={0.007} />}
              {node}
            </group>
          );
        }
        return (
          <group key={i}>
            <mesh geometry={kit.hole} material={kit.rim} position={[e.x, e.y + 0.012, e.z]} scale={e.size} />
            <mesh geometry={kit.holeDark} material={kit.dark} position={[e.x, e.y + 0.01, e.z]} scale={e.size} />
            <group ref={(el) => (roots.current[i] = el)} position={[e.x, e.y, e.z]} scale={e.size}>
              {node}
            </group>
          </group>
        );
      })}
      <mesh
        geometry={kit.sphere}
        material={kit.hidden}
        position={[EEL_SPOT.x, sandY(EEL_SPOT.x, EEL_SPOT.z) + 0.3, EEL_SPOT.z]}
        scale={[0.85, 0.4, 0.65]}
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      />
    </group>
  );
}
