import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useCursor } from '@react-three/drei';
import { world, queueEffect } from '../sim/world';
import { sharkActive } from '../sim/sharkBrain';
import { showCreature, sfx } from '../state/store';

const CHEST_X = -4.4; // matches TreasureChest.jsx
const CHEST_Z = 0.6;
const FLICK_TIME = 0.6;
const rand = (a, b) => a + Math.random() * (b - a);

// Tail segments behind the head: [y, z, width, length].
const TAIL = [
  [0.0, -0.2, 0.14, 0.1],
  [-0.01, -0.33, 0.12, 0.08],
  [-0.025, -0.44, 0.1, 0.07],
  [-0.045, -0.53, 0.08, 0.06],
];

function makeKit() {
  const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.5, ...extra });
  const feeler = new THREE.CylinderGeometry(0.008, 0.003, 0.9, 4);
  feeler.translate(0, 0.45, 0);
  return {
    sphere: new THREE.SphereGeometry(1, 16, 12),
    arm: new THREE.CapsuleGeometry(0.03, 0.18, 3, 6),
    feeler,
    leg: new THREE.CapsuleGeometry(0.014, 0.12, 2, 5),
    smile: new THREE.TorusGeometry(0.045, 0.011, 5, 10, Math.PI),
    shell: std('#c25b34'),
    claw: std('#d9703f'),
    belly: std('#f0a46b'),
    white: std('#ffffff', { roughness: 0.25 }),
    pupil: new THREE.MeshBasicMaterial({ color: '#1d1b33' }),
    mouth: std('#5a1f12'),
    hidden: new THREE.MeshBasicMaterial({ visible: false }),
  };
}

// A shy lobster living behind the treasure chest. It peeks out for a while, hides again, and zooms
// backwards with a flick of its tail when tapped or when the shark comes by.
export default function Lobster() {
  const kit = useMemo(makeKit, []);
  const root = useRef();
  const pose = useRef();
  const tail = useRef();
  const claws = useRef([]);
  const feelers = useRef([]);
  const s = useRef({ out: 0, wantOut: true, timer: rand(3, 6), flick: 0, snap: 0 });
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);
  useEffect(() => () => Object.values(kit).forEach((x) => x.dispose()), [kit]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const c = s.current;
    const t = world.time;
    const b = world.bounds;
    c.flick = Math.max(0, c.flick - dt);
    c.snap = Math.max(0, c.snap - dt);
    c.timer -= dt;
    if (c.timer <= 0) {
      c.wantOut = !c.wantOut;
      c.timer = c.wantOut ? rand(9, 14) : rand(5, 9);
    }
    const scared = sharkActive() && world.shark.pos.distanceTo(root.current.position) < 4.5;
    if (scared && c.out > 0.3 && c.flick <= 0) c.flick = FLICK_TIME;
    const goal = c.wantOut && !scared && c.flick <= 0 ? 1 : 0;
    c.out += (goal - c.out) * (1 - Math.exp(-dt * (goal ? 0.9 : 4)));

    // Peeks out on whichever side of the chest has room on screen.
    const chestX = Math.max(CHEST_X, b.minX + 0.4);
    const dir = chestX - 1.3 >= b.minX + 0.3 ? -1 : 1;
    const x = chestX + dir * (0.35 + c.out * 0.85);
    const z = CHEST_Z - 0.45 + c.out * 0.65;
    root.current.position.set(x, world.floorY + 0.14, z);
    // Faces outwards while walking, then turns to look at the viewer once it is out.
    pose.current.rotation.y = dir * (Math.PI / 2) * (1 - c.out * 0.75);

    const k = c.flick / FLICK_TIME;
    tail.current.rotation.x = c.flick > 0 ? -Math.sin(k * Math.PI) * 1.2 : Math.sin(t * 1.2) * 0.05;
    claws.current.forEach((claw, i) => {
      if (!claw) return;
      const side = i ? -1 : 1;
      const wave = c.snap <= 0 && c.out > 0.9 && Math.sin(t * 0.6 + i * 2) > 0.94;
      claw.rotation.x = c.snap > 0 ? -0.6 + Math.sin(t * 24) * 0.25 : wave ? -0.9 + Math.sin(t * 9) * 0.3 : -0.15;
      claw.rotation.y = side * (0.25 + Math.sin(t * 0.8 + i) * 0.05);
    });
    feelers.current.forEach((f, i) => {
      if (!f) return;
      const side = i ? -1 : 1;
      f.rotation.set(0.9 + Math.sin(t * 1.5 + i) * 0.15, 0, side * (0.5 + Math.sin(t * 1.1 + i * 3) * 0.12));
    });
  });

  const onClick = (e) => {
    e.stopPropagation();
    const c = s.current;
    c.snap = 0.9;
    if (c.flick <= 0) c.flick = FLICK_TIME;
    c.wantOut = true;
    c.timer = rand(8, 12);
    queueEffect('bubbles', root.current.position, 6);
    sfx('pop');
    showCreature('lobster');
  };

  return (
    <group ref={root}>
      <group ref={pose} scale={0.95}>
        {/* head and body */}
        <mesh geometry={kit.sphere} material={kit.shell} position={[0, 0.02, 0]} scale={[0.15, 0.12, 0.22]} />
        <mesh geometry={kit.sphere} material={kit.belly} position={[0, -0.04, 0.02]} scale={[0.13, 0.08, 0.19]} />
        <group ref={tail}>
          {TAIL.map(([y, z, w, l], i) => (
            <mesh key={i} geometry={kit.sphere} material={kit.shell} position={[0, y, z]} scale={[w, w * 0.6, l]} />
          ))}
          {[-0.5, 0, 0.5].map((a) => (
            <mesh key={a} geometry={kit.sphere} material={kit.claw} position={[a * 0.08, -0.06, -0.62]} scale={[0.05, 0.012, 0.07]} rotation={[0, a, 0]} />
          ))}
        </group>
        {/* walking legs */}
        {[0.08, 0, -0.08].flatMap((z) =>
          [1, -1].map((side) => (
            <mesh key={`${z}${side}`} geometry={kit.leg} material={kit.shell} position={[side * 0.15, -0.08, z]} rotation={[0, 0, side * 0.9]} />
          )),
        )}
        {/* big claws */}
        {[1, -1].map((side, i) => (
          <group key={side} ref={(el) => (claws.current[i] = el)} position={[side * 0.12, 0.0, 0.16]}>
            <mesh geometry={kit.arm} material={kit.shell} position={[side * 0.04, 0, 0.1]} rotation={[Math.PI / 2, 0, 0]} />
            <mesh geometry={kit.sphere} material={kit.claw} position={[side * 0.08, 0.01, 0.3]} scale={[0.09, 0.065, 0.15]} />
            <mesh geometry={kit.sphere} material={kit.claw} position={[side * 0.06, 0.05, 0.4]} scale={[0.035, 0.025, 0.08]} />
          </group>
        ))}
        {/* feelers, eyes and smile */}
        {[0, 1].map((i) => (
          <group key={i} ref={(el) => (feelers.current[i] = el)} position={[i ? -0.05 : 0.05, 0.06, 0.18]}>
            <mesh geometry={kit.feeler} material={kit.claw} />
          </group>
        ))}
        {[1, -1].map((side) => (
          <group key={side} position={[side * 0.06, 0.11, 0.17]}>
            <mesh geometry={kit.sphere} material={kit.white} scale={0.04} />
            <mesh geometry={kit.sphere} material={kit.pupil} position={[0, 0, 0.028]} scale={0.022} />
          </group>
        ))}
        <mesh geometry={kit.smile} material={kit.mouth} position={[0, 0.02, 0.215]} rotation={[0, 0, Math.PI]} />
        <mesh
          geometry={kit.sphere}
          material={kit.hidden}
          scale={[0.4, 0.3, 0.55]}
          onClick={onClick}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        />
      </group>
    </group>
  );
}
