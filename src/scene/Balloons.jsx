import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useCursor } from '@react-three/drei';
import { world, queueEffect } from '../sim/world';
import { sfx } from '../state/store';

const Z = -3.3; // behind the fish
const COLORS = ['#ff9cc2', '#ffd23f', '#8fd3ff', '#c9a7ff', '#7ee0b5', '#ffb07a'];
const RISE = 0.28; // units per second
const TOP = 4.2;
const BOTTOM = -3.4;
const REGROW = 2.5; // seconds before a popped balloon floats up again
const rand = (a, b) => a + Math.random() * (b - a);

function makeKit() {
  const string = new THREE.CylinderGeometry(0.006, 0.006, 1.3, 4);
  string.translate(0, -0.65, 0);
  return {
    balloon: new THREE.SphereGeometry(1, 20, 16),
    knot: new THREE.ConeGeometry(0.06, 0.09, 8),
    string,
    stringMat: new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.7 }),
    shine: new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55 }),
    hidden: new THREE.MeshBasicMaterial({ visible: false }),
  };
}

// One balloon drifting up the back of the tank; tap it to pop it.
function Balloon({ kit, index, count }) {
  const group = useRef();
  const s = useRef({ y: rand(BOTTOM, TOP), popped: 0, burst: world.balloonBurst, phase: rand(0, 6) });
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: COLORS[index % COLORS.length], roughness: 0.25, metalness: 0.05 }),
    [index],
  );
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);
  useEffect(() => () => mat.dispose(), [mat]);

  const pop = () => {
    const b = s.current;
    if (b.popped > 0) return;
    b.popped = REGROW;
    queueEffect('hearts', group.current.position, 3);
    queueEffect('bubbles', group.current.position, 8);
    sfx('balloon');
  };

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const b = s.current;
    // The birthday celebration pops every balloon at once (staggered a little).
    if (world.balloonBurst !== b.burst && world.time - world.balloonBurst > index * 0.15) {
      b.burst = world.balloonBurst;
      pop();
    }
    if (b.popped > 0) {
      b.popped -= dt;
      group.current.visible = false;
      if (b.popped <= 0) b.y = BOTTOM;
      return;
    }
    group.current.visible = true;
    b.y += RISE * dt;
    if (b.y > TOP) b.y = BOTTOM;
    const span = Math.max(1.2, world.bounds.maxX - 0.6);
    const x = -span + ((index + 0.5) / count) * span * 2 + Math.sin(world.time * 0.4 + b.phase) * 0.35;
    group.current.position.set(x, b.y, Z + (index % 2) * 0.4);
    group.current.rotation.z = Math.sin(world.time * 0.7 + b.phase) * 0.12;
  });

  return (
    <group ref={group}>
      <mesh geometry={kit.balloon} material={mat} scale={[0.32, 0.4, 0.32]} />
      <mesh geometry={kit.balloon} material={kit.shine} position={[-0.11, 0.14, 0.24]} scale={[0.05, 0.09, 0.03]} />
      <mesh geometry={kit.knot} material={mat} position={[0, -0.43, 0]} rotation={[Math.PI, 0, 0]} />
      <mesh geometry={kit.string} material={kit.stringMat} position={[0, -0.46, 0]} />
      <mesh
        geometry={kit.balloon}
        material={kit.hidden}
        scale={[0.45, 0.55, 0.45]}
        onClick={(e) => {
          e.stopPropagation();
          pop();
        }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      />
    </group>
  );
}

// Balloons for Asma's birthday, mounted only on 23 December.
export default function Balloons() {
  const kit = useMemo(makeKit, []);
  useEffect(() => () => Object.values(kit).forEach((x) => x.dispose()), [kit]);
  const count = 6;
  return Array.from({ length: count }, (_, i) => <Balloon key={i} kit={kit} index={i} count={count} />);
}
