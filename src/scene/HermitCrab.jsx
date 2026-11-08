import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useCursor } from '@react-three/drei';
import { world } from '../sim/world';
import { showCreature, sfx, noticeOnce } from '../state/store';
import { sandY } from './reefLayout';

const HOME = { x: -0.2, z: 1.6 };
const ROAM = { x: 1.0, z0: 1.2, z1: 2.1 };
const HIDE_TIME = 1.6;
const rand = (a, b) => a + Math.random() * (b - a);

function makeKit() {
  const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.5, ...extra });
  return {
    sphere: new THREE.SphereGeometry(1, 16, 12),
    small: new THREE.SphereGeometry(1, 8, 6),
    leg: new THREE.CapsuleGeometry(0.014, 0.1, 3, 5),
    stalk: new THREE.CapsuleGeometry(0.01, 0.06, 3, 5),
    body: std('#e8553b'),
    claw: std('#f0703f'),
    soft: std('#f4a7a0', { roughness: 0.4 }),
    white: std('#ffffff', { roughness: 0.25 }),
    pupil: new THREE.MeshBasicMaterial({ color: '#1d1b33' }),
    shells: [
      [std('#f6dfc0', { roughness: 0.35 }), std('#d9844a', { roughness: 0.35 })], // cream with orange bands
      [std('#f7d4e6', { roughness: 0.3 }), std('#a868c8', { roughness: 0.3 })], // pink with purple bands
    ],
    hidden: new THREE.MeshBasicMaterial({ visible: false }),
  };
}

// A spiral shell made of rings that get smaller as they twist up to a point.
function Shell({ kit, look, shellRef, scale = 1 }) {
  const [a, b] = kit.shells[look];
  return (
    <group ref={shellRef} scale={scale}>
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const r = 0.15 - i * 0.022;
        const ang = i * 1.1;
        return (
          <mesh
            key={i}
            geometry={kit.sphere}
            material={i % 2 ? b : a}
            position={[Math.cos(ang) * 0.03 - i * 0.02, 0.11 + i * 0.045, Math.sin(ang) * 0.03 - i * 0.015]}
            scale={[r, r * 0.85, r]}
          />
        );
      })}
    </group>
  );
}

// A hermit crab: wanders the front sand carrying its shell. Every few minutes it finds the other
// shell lying on the sand, climbs out, and moves in. Tapped, it pulls into its shell for a moment.
export default function HermitCrab({ calm }) {
  const kit = useMemo(makeKit, []);
  useEffect(
    () => () => {
      Object.values(kit).forEach((x) => (Array.isArray(x) ? x.flat().forEach((m) => m.dispose()) : x.dispose()));
    },
    [kit],
  );
  const shells = [useRef(), useRef()];
  const crab = useRef();
  const body = useRef();
  const soft = useRef();
  const legs = useRef([]);
  const s = useRef({
    x: HOME.x,
    z: HOME.z,
    tx: HOME.x,
    tz: HOME.z,
    yaw: 0,
    wait: 2,
    worn: 0, // which shell it is wearing
    spare: { x: HOME.x + 0.9, z: HOME.z + 0.3 }, // where the other shell lies
    stage: 'walk', // walk | approach | out | in
    stageT: 0,
    swapIn: 70, // seconds until it goes house hunting
    hide: 0,
    from: { x: 0, z: 0 },
  });
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const c = s.current;
    const t = world.time;
    c.hide = Math.max(0, c.hide - dt);
    let walking = false;
    const walkTo = (tx, tz, speed) => {
      const dx = tx - c.x;
      const dz = tz - c.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.04) return true;
      const step = Math.min(d, dt * speed);
      c.x += (dx / d) * step;
      c.z += (dz / d) * step;
      let dy = Math.atan2(dx, dz) - c.yaw;
      dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      c.yaw += dy * (1 - Math.exp(-dt * 5));
      walking = true;
      return false;
    };

    if (c.hide > 0) {
      // stays put, tucked in
    } else if (c.stage === 'walk') {
      c.swapIn -= dt;
      if (c.wait > 0) c.wait -= dt;
      else if (walkTo(c.tx, c.tz, calm ? 0.15 : 0.25)) {
        c.wait = rand(2, 5);
        c.tx = HOME.x + rand(-ROAM.x, ROAM.x);
        c.tz = rand(ROAM.z0, ROAM.z1);
      }
      if (c.swapIn <= 0) c.stage = 'approach';
    } else if (c.stage === 'approach') {
      // Walk up beside the empty shell.
      if (walkTo(c.spare.x - 0.3, c.spare.z, 0.3)) {
        c.stage = 'out';
        c.stageT = 0;
        c.from = { x: c.x, z: c.z };
        c.yaw = Math.PI / 2; // face the new shell
      }
    } else if (c.stage === 'out' || c.stage === 'in') {
      c.stageT += dt;
      if (c.stage === 'out' && c.stageT > 1.3) {
        c.stage = 'in';
        c.stageT = 0;
      } else if (c.stage === 'in' && c.stageT > 1.4) {
        // Moved in! The old shell stays where it was.
        const old = { x: c.from.x, z: c.from.z };
        c.x = c.spare.x;
        c.z = c.spare.z;
        c.spare = old;
        c.worn = 1 - c.worn;
        c.stage = 'walk';
        c.swapIn = rand(160, 260);
        c.wait = 1.5;
        sfx('pop');
        noticeOnce(
          'hermitSwap',
          'The hermit crab moved into a new shell! Hermit crabs swap homes when they grow bigger. 🐚',
          'সন্ন্যাসী কাঁকড়া নতুন খোলসে ঢুকে গেল! বড় হলে ওরা এভাবে বাড়ি বদলায়। 🐚',
          '🐚',
        );
      }
    }

    // Where the body is: inside the worn shell, or sliding across to the new one.
    let bx = c.x;
    let bz = c.z;
    let outK = 0;
    if (c.stage === 'out') {
      outK = Math.min(1, c.stageT / 1.0);
      bx = c.from.x + outK * 0.12;
    } else if (c.stage === 'in') {
      const k = Math.min(1, c.stageT / 1.2);
      bx = c.from.x + 0.12 + (c.spare.x - c.from.x - 0.12) * k;
      bz = c.from.z + (c.spare.z - c.from.z) * k;
      outK = 1 - k;
    }
    crab.current.position.set(bx, sandY(bx, bz), bz);
    crab.current.rotation.y = c.yaw;
    const tuck = c.hide > 0 ? 0.25 : 1;
    body.current.scale.setScalar(body.current.scale.x + (tuck - body.current.scale.x) * (1 - Math.exp(-dt * 10)));
    soft.current.visible = outK > 0.05;
    soft.current.scale.setScalar(0.08 * Math.max(0.05, outK));

    // Shells: the worn one rides on the crab (unless it is mid-move), the other lies on the sand.
    const moving = c.stage === 'out' || c.stage === 'in';
    shells.forEach((ref, i) => {
      const g = ref.current;
      if (!g) return;
      if (i === c.worn && !moving) {
        g.position.set(c.x - Math.sin(c.yaw) * 0.08, sandY(c.x, c.z) + 0.02, c.z - Math.cos(c.yaw) * 0.08);
        g.rotation.set(0, c.yaw, walking ? Math.sin(t * 9) * 0.05 : 0);
      } else {
        const p = i === c.worn ? c.from : c.spare;
        g.position.set(p.x, sandY(p.x, p.z) + 0.01, p.z);
        g.rotation.set(0, 1.2, 0.15);
      }
    });

    legs.current.forEach((leg, i) => {
      if (!leg) return;
      const side = i < 2 ? 1 : -1;
      leg.rotation.z = side * (0.9 + (walking ? Math.sin(t * 14 + i * 2) * 0.3 : 0));
    });
  });

  const onClick = (e) => {
    e.stopPropagation();
    if (s.current.stage !== 'walk') return; // busy moving house
    s.current.hide = HIDE_TIME;
    sfx('plop');
    showCreature('hermitCrab');
  };

  return (
    <group>
      <Shell kit={kit} look={0} shellRef={shells[0]} />
      <Shell kit={kit} look={1} shellRef={shells[1]} scale={1.12} />
      <group ref={crab}>
        <group ref={body} position={[0, 0.07, 0.05]}>
          {/* the soft curled tummy shows only while it moves house */}
          <mesh ref={soft} geometry={kit.sphere} material={kit.soft} position={[0, 0.02, -0.12]} scale={0.08} visible={false} />
          <mesh geometry={kit.sphere} material={kit.body} scale={[0.07, 0.05, 0.06]} />
          {/* one big claw and one small one, like real hermit crabs */}
          <mesh geometry={kit.sphere} material={kit.claw} position={[0.06, -0.01, 0.08]} scale={[0.045, 0.035, 0.06]} />
          <mesh geometry={kit.sphere} material={kit.claw} position={[-0.05, -0.01, 0.07]} scale={[0.028, 0.022, 0.04]} />
          {[0, 1, 2, 3].map((i) => (
            <group key={i} ref={(el) => (legs.current[i] = el)} position={[i < 2 ? 0.05 : -0.05, -0.01, 0.02 - (i % 2) * 0.04]}>
              <mesh geometry={kit.leg} material={kit.body} position={[0, -0.05, 0]} />
            </group>
          ))}
          {[1, -1].map((side) => (
            <group key={side} position={[side * 0.025, 0.04, 0.05]}>
              <mesh geometry={kit.stalk} material={kit.body} position={[0, 0.03, 0]} />
              <mesh geometry={kit.small} material={kit.white} position={[0, 0.07, 0]} scale={0.018} />
              <mesh geometry={kit.small} material={kit.pupil} position={[0, 0.07, 0.014]} scale={0.009} />
            </group>
          ))}
        </group>
        <mesh
          geometry={kit.sphere}
          material={kit.hidden}
          position={[0, 0.15, -0.02]}
          scale={0.28}
          onClick={onClick}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        />
      </group>
    </group>
  );
}
