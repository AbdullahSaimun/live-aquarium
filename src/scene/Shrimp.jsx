import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useCursor } from '@react-three/drei';
import { world, queueEffect, removePellet, findCrumb } from '../sim/world';
import { showCreature, sfx } from '../state/store';

const FLIP_TIME = 0.9;
const rand = (a, b) => a + Math.random() * (b - a);

// Two cleaner shrimp, each pottering about near its own rock at the front of the sand.
const HOMES = [
  { x: 4.0, z: 1.4 },
  { x: -2.8, z: 1.9 },
];

// Body segments from the head back to the tail, curving down: [y, z, radius].
const SEGMENTS = [
  [0.0, 0.12, 0.075],
  [0.012, 0.0, 0.066],
  [0.0, -0.1, 0.056],
  [-0.03, -0.18, 0.046],
  [-0.07, -0.23, 0.036],
];

function makeKit() {
  const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.45, ...extra });
  const feeler = new THREE.CylinderGeometry(0.006, 0.003, 0.55, 4);
  feeler.translate(0, 0.275, 0);
  const leg = new THREE.CylinderGeometry(0.008, 0.006, 0.12, 4);
  leg.translate(0, -0.06, 0);
  return {
    sphere: new THREE.SphereGeometry(1, 14, 10),
    feeler,
    leg,
    red: std('#ff4f4f'),
    white: std('#ffffff', { roughness: 0.3 }),
    pupil: new THREE.MeshBasicMaterial({ color: '#1d1b33' }),
    hidden: new THREE.MeshBasicMaterial({ visible: false }),
  };
}

function OneShrimp({ kit, home, calm }) {
  const root = useRef();
  const pose = useRef();
  const feelers = useRef([]);
  const s = useRef({ x: home.x, z: home.z, tx: home.x, tz: home.z, yaw: 0, wait: rand(1, 3), crumb: null, nibble: 0, flip: 0 });
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const c = s.current;
    const t = world.time;
    const b = world.bounds;
    const hx = THREE.MathUtils.clamp(home.x, b.minX + 0.5, b.maxX - 0.5);
    c.flip = Math.max(0, c.flip - dt);

    if (c.crumb && !c.crumb.active) c.crumb = null;
    if (!c.crumb && c.nibble <= 0) c.crumb = findCrumb({ x: hx, z: home.z, radius: 2.5 });
    if (c.crumb) {
      c.tx = c.crumb.pos.x;
      c.tz = c.crumb.pos.z;
    } else if (c.wait > 0) {
      c.wait -= dt;
      if (c.wait <= 0) {
        c.tx = hx + rand(-0.9, 0.9);
        c.tz = home.z + rand(-0.4, 0.4);
      }
    }

    const dx = c.tx - c.x;
    const dz = c.tz - c.z;
    const d = Math.hypot(dx, dz);
    let walking = false;
    if (c.flip > 0) {
      // Tail-flick escape: shoot backwards while flipping over.
      c.x -= Math.sin(c.yaw) * dt * 1.4;
      c.z -= Math.cos(c.yaw) * dt * 1.4;
    } else if (c.nibble > 0) {
      c.nibble -= dt;
      if (c.nibble <= 0 && c.crumb) {
        queueEffect('bubbles', c.crumb.pos, 3);
        removePellet(c.crumb);
        c.crumb = null;
        c.wait = rand(1, 3);
      }
    } else if (d > 0.06) {
      const step = Math.min(d, dt * (c.crumb ? 0.9 : 0.5));
      c.x += (dx / d) * step;
      c.z += (dz / d) * step;
      walking = true;
      let dy = Math.atan2(dx, dz) - c.yaw;
      dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      c.yaw += dy * (1 - Math.exp(-dt * 6));
    } else if (c.crumb) {
      c.nibble = 1.2;
    } else if (c.wait <= 0) {
      c.wait = rand(2, 5);
      // Turn to face the viewer while resting.
      c.yaw += Math.atan2(Math.sin(-c.yaw), Math.cos(-c.yaw)) * 0.5;
    }
    c.x = THREE.MathUtils.clamp(c.x, b.minX + 0.3, b.maxX - 0.3);
    c.z = THREE.MathUtils.clamp(c.z, 0.4, 2.4);

    const k = 1 - c.flip / FLIP_TIME;
    const hopY = c.flip > 0 ? Math.sin(k * Math.PI) * 0.45 : walking ? Math.abs(Math.sin(t * 10)) * 0.02 : 0;
    root.current.position.set(c.x, world.floorY + 0.16 + hopY, c.z);
    pose.current.rotation.set(c.flip > 0 ? -k * Math.PI * 2 : c.nibble > 0 ? 0.25 + Math.sin(t * 20) * 0.08 : 0, c.yaw, 0, 'YXZ');
    const busy = calm ? 0.5 : 1;
    feelers.current.forEach((f, i) => {
      if (!f) return;
      const side = i ? -1 : 1;
      f.rotation.set(1.0 + Math.sin(t * 2.2 + i) * 0.25 * busy, 0, side * (0.35 + Math.sin(t * 1.7 + i * 2) * 0.2 * busy));
    });
  });

  const onClick = (e) => {
    e.stopPropagation();
    if (s.current.flip <= 0) s.current.flip = FLIP_TIME;
    queueEffect('bubbles', root.current.position, 5);
    sfx('pop');
    showCreature('shrimp');
  };

  return (
    <group ref={root}>
      <group ref={pose} scale={1.3}>
        {SEGMENTS.map(([y, z, r], i) => (
          <mesh key={i} geometry={kit.sphere} material={i % 2 ? kit.white : kit.red} position={[0, y, z]} scale={[r * 0.9, r, r * 1.15]} />
        ))}
        {/* tail fan */}
        {[1, -1].map((side) => (
          <mesh key={side} geometry={kit.sphere} material={kit.red} position={[side * 0.03, -0.1, -0.29]} scale={[0.035, 0.008, 0.05]} rotation={[0, side * 0.5, 0]} />
        ))}
        {[0, 1].map((i) => (
          <group key={i} ref={(el) => (feelers.current[i] = el)} position={[i ? -0.025 : 0.025, 0.04, 0.18]}>
            <mesh geometry={kit.feeler} material={kit.white} />
          </group>
        ))}
        {[1, -1].map((side) => (
          <group key={side} position={[side * 0.045, 0.045, 0.16]}>
            <mesh geometry={kit.sphere} material={kit.white} scale={0.025} />
            <mesh geometry={kit.sphere} material={kit.pupil} position={[side * 0.006, 0, 0.018]} scale={0.014} />
          </group>
        ))}
        {[0.06, -0.02, -0.1].flatMap((z) =>
          [1, -1].map((side) => (
            <mesh key={`${z}${side}`} geometry={kit.leg} material={kit.white} position={[side * 0.04, -0.04, z]} rotation={[0, 0, side * 0.5]} />
          )),
        )}
        <mesh
          geometry={kit.sphere}
          material={kit.hidden}
          scale={[0.3, 0.25, 0.4]}
          onClick={onClick}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        />
      </group>
    </group>
  );
}

export default function Shrimp({ calm }) {
  const kit = useMemo(makeKit, []);
  useEffect(() => () => Object.values(kit).forEach((x) => x.dispose()), [kit]);
  return HOMES.map((home) => <OneShrimp key={home.x} kit={kit} home={home} calm={calm} />);
}
