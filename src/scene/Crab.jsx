import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useCursor } from '@react-three/drei';
import { world, queueEffect, removePellet } from '../sim/world';
import { critterFact, sfx } from '../state/store';

const Y = world.floorY + 0.12;
const SPEED = 0.9;
const rand = (a, b) => a + Math.random() * (b - a);

function makeKit() {
  const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.5, ...extra });
  return {
    sphere: new THREE.SphereGeometry(1, 20, 14),
    small: new THREE.SphereGeometry(1, 10, 8),
    leg: new THREE.CapsuleGeometry(0.025, 0.2, 3, 6),
    stalk: new THREE.CapsuleGeometry(0.02, 0.1, 3, 6),
    smile: new THREE.TorusGeometry(0.06, 0.014, 5, 12, Math.PI),
    shell: std('#ff5a3c'),
    claw: std('#ff7a52'),
    spot: std('#ffb08a'),
    white: std('#ffffff', { roughness: 0.25 }),
    pupil: new THREE.MeshBasicMaterial({ color: '#1d1b33' }),
    mouth: std('#7a1f1f'),
    hidden: new THREE.MeshBasicMaterial({ visible: false }),
  };
}

// Leftover food lying on the sand that the crab can tidy up.
function findCrumb() {
  let best = null;
  for (const p of world.pellets) {
    if (p.active && !p.dragging && p.resting > 1.5 && (!best || p.resting > best.resting)) best = p;
  }
  return best;
}

// A little red crab that scuttles sideways along the sand and tidies up leftover food.
export default function Crab() {
  const kit = useMemo(makeKit, []);
  const root = useRef();
  const body = useRef();
  const legs = useRef([]);
  const claws = useRef([]);
  const pincers = useRef([]);
  const s = useRef({ x: 1, z: 1.6, tx: 1, tz: 1.6, wait: 1, snap: 0, hop: 0, crumb: null, nibble: 0 });
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);
  useEffect(() => () => Object.values(kit).forEach((x) => x.dispose()), [kit]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const c = s.current;
    const t = world.time;
    const b = world.bounds;
    c.snap = Math.max(0, c.snap - dt);
    c.hop = Math.max(0, c.hop - dt);

    // Follow a crumb if there is one, otherwise stroll to a new spot now and then.
    if (c.crumb && !c.crumb.active) c.crumb = null;
    if (!c.crumb && c.nibble <= 0) c.crumb = findCrumb();
    if (c.crumb) {
      c.tx = c.crumb.pos.x;
      c.tz = c.crumb.pos.z;
    } else if (c.wait > 0) {
      c.wait -= dt;
      if (c.wait <= 0) {
        c.tx = rand(b.minX + 0.6, b.maxX - 0.6);
        c.tz = rand(0.8, 2.2);
      }
    }
    const dx = c.tx - c.x;
    const dz = c.tz - c.z;
    const d = Math.hypot(dx, dz);
    let walking = false;
    if (c.nibble > 0) {
      c.nibble -= dt;
      if (c.nibble <= 0 && c.crumb) {
        queueEffect('bubbles', c.crumb.pos, 3);
        removePellet(c.crumb);
        c.crumb = null;
        c.wait = rand(1, 3);
      }
    } else if (d > 0.08) {
      const step = Math.min(d, SPEED * dt * (c.crumb ? 1.4 : 1));
      c.x += (dx / d) * step;
      c.z += (dz / d) * step;
      walking = true;
    } else if (c.crumb) {
      c.nibble = 1.2;
    } else if (c.wait <= 0) {
      c.wait = rand(2, 5);
    }
    c.x = THREE.MathUtils.clamp(c.x, b.minX + 0.3, b.maxX - 0.3);

    const hopY = c.hop > 0 ? Math.sin((1 - c.hop / 0.5) * Math.PI) * 0.35 : 0;
    root.current.position.set(c.x, Y + hopY, c.z);
    // Mostly faces the viewer, with a slight lean into the walk.
    body.current.rotation.z = walking ? Math.sin(t * 14) * 0.06 : 0;
    body.current.rotation.y = walking ? Math.sign(dx) * 0.25 : 0;

    legs.current.forEach((leg, i) => {
      if (!leg) return;
      const side = i < 3 ? 1 : -1;
      const swing = walking ? Math.sin(t * 16 + i * 2.1) * 0.35 : 0;
      leg.rotation.z = side * (0.9 + swing);
    });
    // Claws: snap while nibbling or when tapped, otherwise wave hello every few seconds.
    const busy = c.snap > 0 || c.nibble > 0;
    const wave = !busy && Math.sin(t * 0.7) > 0.93;
    claws.current.forEach((claw, i) => {
      if (!claw) return;
      const side = i ? -1 : 1;
      claw.rotation.x = c.snap > 0 ? -0.9 : wave && i === 0 ? -0.7 + Math.sin(t * 10) * 0.3 : -0.2;
      claw.rotation.z = side * (c.snap > 0 ? 0.4 : 0.15);
    });
    const open = busy ? (Math.sin(t * 22) > 0 ? 0.5 : 0) : 0.15;
    pincers.current.forEach((p) => p && (p.rotation.x = -open));
  });

  const onClick = (e) => {
    e.stopPropagation();
    const c = s.current;
    c.snap = 1;
    c.hop = 0.5;
    sfx('pop');
    critterFact('crab');
  };

  return (
    <group ref={root}>
      <group ref={body} scale={0.9}>
        <mesh geometry={kit.sphere} material={kit.shell} scale={[0.38, 0.17, 0.28]} />
        {[-0.15, 0, 0.15].map((x) => (
          <mesh key={x} geometry={kit.small} material={kit.spot} position={[x, 0.14, 0.02]} scale={[0.05, 0.025, 0.05]} />
        ))}
        {/* three legs per side */}
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const side = i < 3 ? 1 : -1;
          const z = 0.12 - (i % 3) * 0.12;
          return (
            <group key={i} ref={(el) => (legs.current[i] = el)} position={[side * 0.3, -0.02, z]}>
              <mesh geometry={kit.leg} material={kit.shell} position={[0, -0.13, 0]} />
            </group>
          );
        })}
        {/* claws reaching forward */}
        {[1, -1].map((side, i) => (
          <group key={side} ref={(el) => (claws.current[i] = el)} position={[side * 0.3, 0.02, 0.18]}>
            <mesh geometry={kit.leg} material={kit.claw} position={[side * 0.05, 0, 0.12]} rotation={[Math.PI / 2, 0, 0]} />
            <group position={[side * 0.08, 0, 0.32]}>
              <mesh geometry={kit.small} material={kit.claw} scale={[0.1, 0.08, 0.13]} />
              <group ref={(el) => (pincers.current[i] = el)} position={[0, 0.05, -0.04]}>
                <mesh geometry={kit.small} material={kit.claw} position={[0, 0, 0.1]} scale={[0.05, 0.03, 0.11]} />
              </group>
            </group>
          </group>
        ))}
        {/* eyes on stalks and a happy smile */}
        {[1, -1].map((side) => (
          <group key={side} position={[side * 0.1, 0.16, 0.14]}>
            <mesh geometry={kit.stalk} material={kit.shell} position={[0, 0.05, 0]} />
            <mesh geometry={kit.small} material={kit.white} position={[0, 0.14, 0]} scale={0.05} />
            <mesh geometry={kit.small} material={kit.pupil} position={[0, 0.14, 0.035]} scale={0.026} />
          </group>
        ))}
        <mesh geometry={kit.smile} material={kit.mouth} position={[0, 0.04, 0.27]} rotation={[0, 0, Math.PI]} />
        <mesh
          geometry={kit.sphere}
          material={kit.hidden}
          scale={[0.7, 0.45, 0.6]}
          onClick={onClick}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        />
      </group>
    </group>
  );
}
