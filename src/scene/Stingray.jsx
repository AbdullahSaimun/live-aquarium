import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useCursor } from '@react-three/drei';
import { world, queueEffect } from '../sim/world';
import { showCreature, sfx } from '../state/store';
import { sharkActive } from '../sim/sharkBrain';
import { sandY } from './reefLayout';

// The ray glides an oval loop low over the front sand, then now and then settles and buries itself.
const LOOP = { x: 0.3, z: 0.9, rx: 2.6, rz: 0.7 };
const SPOTS = 10;
const rand = (a, b) => a + Math.random() * (b - a);

export default function Stingray({ calm }) {
  const kit = useMemo(
    () => ({
      body: new THREE.SphereGeometry(1, 28, 10),
      small: new THREE.SphereGeometry(1, 10, 8),
      tail: new THREE.CylinderGeometry(0.006, 0.02, 0.9, 5).translate(0, -0.45, 0),
      skin: new THREE.MeshStandardMaterial({ color: '#4d6a8c', roughness: 0.55 }),
      belly: new THREE.MeshStandardMaterial({ color: '#e8edf3', roughness: 0.6 }),
      spot: new THREE.MeshStandardMaterial({ color: '#f4f8ff', roughness: 0.5 }),
      sand: new THREE.MeshStandardMaterial({ color: '#e6c99a', roughness: 1, transparent: true, opacity: 0 }),
      white: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.25 }),
      pupil: new THREE.MeshBasicMaterial({ color: '#1d1b33' }),
      hidden: new THREE.MeshBasicMaterial({ visible: false }),
    }),
    [],
  );
  useEffect(() => () => Object.values(kit).forEach((x) => x.dispose()), [kit]);
  const base = useMemo(() => Float32Array.from(kit.body.attributes.position.array), [kit]);
  const spots = useMemo(
    () => Array.from({ length: SPOTS }, (_, i) => [Math.cos(i * 2.4) * (0.15 + (i % 3) * 0.12), Math.sin(i * 2.4) * (0.1 + (i % 3) * 0.08)]),
    [],
  );

  const root = useRef();
  const s = useRef({ a: 0, mode: 'glide', modeT: rand(25, 40), bury: 0, lift: 0 });
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const c = s.current;
    const t = world.time;
    c.modeT -= dt;
    c.lift = Math.max(0, c.lift - dt);
    if (c.mode === 'glide' && c.modeT <= 0 && !sharkActive()) {
      c.mode = 'rest';
      c.modeT = rand(14, 22);
    } else if (c.mode === 'rest' && (c.modeT <= 0 || c.lift > 0)) {
      c.mode = 'glide';
      c.modeT = rand(25, 40);
      queueEffect('bubbles', root.current.position, 8);
    }
    c.bury += ((c.mode === 'rest' ? 1 : 0) - c.bury) * (1 - Math.exp(-dt * (c.mode === 'rest' ? 0.5 : 4)));

    // Glide the loop (slower while settling), facing the way it swims.
    const speed = (calm ? 0.12 : 0.2) * (1 - c.bury) + (c.lift > 0 ? 0.4 : 0);
    c.a += speed * dt;
    const x = LOOP.x + Math.cos(c.a) * LOOP.rx;
    const z = LOOP.z + Math.sin(c.a) * LOOP.rz;
    const ground = sandY(x, z);
    const y = ground + 0.03 + (1 - c.bury) * (0.32 + Math.sin(t * 0.8) * 0.06);
    root.current.position.set(x, y, z);
    root.current.rotation.y = Math.atan2(-Math.sin(c.a) * LOOP.rx, Math.cos(c.a) * LOOP.rz);
    // Sand settles over it while it rests: only the eyes stay above.
    kit.sand.opacity = c.bury * 0.92;

    // Wings ripple from body to tip; barely while resting.
    const p = kit.body.attributes.position;
    const amp = (1 - c.bury * 0.9) * (calm ? 0.05 : 0.09);
    for (let i = 0; i < p.count; i++) {
      const bx = base[i * 3];
      p.setY(i, base[i * 3 + 1] + Math.sin(Math.abs(bx) * 3 - t * 3.2) * amp * bx * bx);
    }
    p.needsUpdate = true;
  });

  const onClick = (e) => {
    e.stopPropagation();
    s.current.lift = 1.5;
    sfx('splash');
    showCreature('stingray');
  };

  return (
    <group ref={root}>
      {/* a wide, flat diamond-ish body pointing along +z */}
      <mesh geometry={kit.body} material={kit.skin} scale={[0.6, 0.08, 0.42]} />
      <mesh geometry={kit.body} material={kit.belly} scale={[0.57, 0.06, 0.4]} position={[0, -0.02, 0]} />
      {spots.map(([sx, sz], i) => (
        <mesh key={i} geometry={kit.small} material={kit.spot} position={[sx, 0.075, sz]} scale={[0.022, 0.008, 0.022]} />
      ))}
      <mesh geometry={kit.tail} material={kit.skin} position={[0, 0, -0.38]} rotation={[-Math.PI / 2, 0, 0]} />
      {[1, -1].map((side) => (
        <group key={side} position={[side * 0.09, 0.08, 0.22]}>
          <mesh geometry={kit.small} material={kit.white} scale={0.035} />
          <mesh geometry={kit.small} material={kit.pupil} position={[0, 0.012, 0.02]} scale={0.018} />
        </group>
      ))}
      {/* sand cover, faded in while buried */}
      <mesh geometry={kit.body} material={kit.sand} scale={[0.66, 0.07, 0.44]} position={[0, 0, -0.04]} />
      <mesh
        geometry={kit.body}
        material={kit.hidden}
        scale={[0.75, 0.3, 0.6]}
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      />
    </group>
  );
}
