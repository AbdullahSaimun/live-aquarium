import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { world } from '../sim/world';

const SEGMENTS = 7;
const SEG_LEN = 0.55;

// [x, z, height scale, color index, phase]
const KELP = [
  [-8.2, -3.2, 1.2, 0, 0],
  [-7.6, -3.8, 1.5, 1, 1.3],
  [-6.8, -1.6, 0.9, 0, 2.1],
  [-2.8, -4.2, 1.4, 1, 0.6],
  [-0.4, -3.6, 1.1, 0, 3.1],
  [2.2, -2.6, 0.8, 2, 1.8],
  [4.4, -4.0, 1.4, 1, 2.6],
  [7.6, -2.8, 1.3, 0, 0.9],
  [8.4, -1.2, 0.9, 2, 2.4],
];

const COLORS = ['#3fc380', '#2fa86e', '#8bd450'];

function Strand({ geo, mat, height, phase, sway }) {
  const segs = useRef([]);
  useFrame(() => {
    const t = world.time;
    segs.current.forEach((g, i) => {
      if (!g) return;
      const k = (i + 1) / SEGMENTS;
      g.rotation.z = Math.sin(t * 0.9 + phase - i * 0.45) * 0.09 * k * sway;
      g.rotation.x = Math.cos(t * 0.7 + phase - i * 0.35) * 0.06 * k * sway;
    });
  });

  // Nested groups so each segment bends relative to the one below it.
  let node = null;
  for (let i = SEGMENTS - 1; i >= 0; i--) {
    const width = 1 - (i / SEGMENTS) * 0.55;
    node = (
      <group ref={(el) => (segs.current[i] = el)} position={[0, i === 0 ? 0 : SEG_LEN * height, 0]}>
        <mesh geometry={geo} material={mat} position={[0, (SEG_LEN * height) / 2, 0]} scale={[width, height, width * 0.5]} />
        {node}
      </group>
    );
  }
  return node;
}

export default function Plants({ calm }) {
  const geo = useMemo(() => new THREE.CapsuleGeometry(0.12, SEG_LEN * 0.9, 3, 8), []);
  const mats = useMemo(() => COLORS.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7 })), []);
  useEffect(
    () => () => {
      geo.dispose();
      mats.forEach((m) => m.dispose());
    },
    [geo, mats],
  );

  return KELP.map(([x, z, h, c, phase], i) => (
    <group key={i} position={[x, world.floorY - 0.15, z]}>
      <Strand geo={geo} mat={mats[c]} height={h} phase={phase} sway={calm ? 0.5 : 1} />
      <group position={[0.25, 0, 0.15]} rotation={[0, 1, 0]} scale={0.6}>
        <Strand geo={geo} mat={mats[(c + 1) % COLORS.length]} height={h} phase={phase + 1} sway={calm ? 0.5 : 1} />
      </group>
    </group>
  ));
}
