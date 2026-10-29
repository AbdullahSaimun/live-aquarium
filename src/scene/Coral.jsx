import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { world } from '../sim/world';

const FLOOR = world.floorY;

function makeGeometries() {
  const brain = new THREE.IcosahedronGeometry(1, 4);
  const p = brain.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const groove = Math.sin(v.x * 9 + Math.sin(v.z * 6) * 2) * Math.sin(v.y * 7 + v.z * 3);
    v.multiplyScalar(1 + groove * 0.05);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  brain.computeVertexNormals();

  return {
    brain,
    branch: new THREE.CapsuleGeometry(0.11, 0.8, 4, 8),
    tube: new THREE.CylinderGeometry(0.14, 0.18, 1, 12, 1, true),
    rim: new THREE.TorusGeometry(0.14, 0.04, 6, 14),
    fan: new THREE.CircleGeometry(1, 28, 0, Math.PI),
    tentacle: new THREE.CapsuleGeometry(0.05, 0.5, 3, 6),
    blob: new THREE.SphereGeometry(1, 16, 12),
    disc: new THREE.CylinderGeometry(1, 0.85, 0.1, 22),
    stalk: new THREE.CylinderGeometry(0.12, 0.2, 1, 10),
    finger: new THREE.CapsuleGeometry(0.09, 0.5, 4, 8),
  };
}

function makeMaterials() {
  const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...extra });
  return {
    pink: std('#ff7eb6'),
    coralOrange: std('#ff9f5a'),
    purple: std('#a77bff'),
    brain: std('#ffb4a2', { roughness: 0.9 }),
    tube: std('#ffcf5c', { side: THREE.DoubleSide }),
    tubeRim: std('#ff8f3d'),
    fan: std('#c06cff', { side: THREE.DoubleSide, transparent: true, opacity: 0.9 }),
    anemone: std('#ff9ed8', { emissive: '#ff4fa8', emissiveIntensity: 0.15 }),
    anemoneTip: std('#fff0fa'),
    yellow: std('#ffd23f'),
    blue: std('#5cc8ff'),
    table: std('#45c9b5'),
    bubble: std('#c9f7a8', { roughness: 0.3, emissive: '#7fe07a', emissiveIntensity: 0.12 }),
    finger: std('#ffb0d0', { roughness: 0.5 }),
    fingerOrange: std('#ffb36b', { roughness: 0.5 }),
  };
}

// Deterministic branching coral: each level splits into tilted, shorter branches.
function Branch({ geo, mat, depth, len, tilt }) {
  if (depth === 0) return null;
  return (
    <group rotation={[0, 0, tilt]}>
      <mesh geometry={geo} material={mat} position={[0, len / 2, 0]} scale={[1, len, 1]} />
      <group position={[0, len * 0.95, 0]}>
        <group rotation={[0, depth * 1.1, 0]}>
          <Branch geo={geo} mat={mat} depth={depth - 1} len={len * 0.72} tilt={0.55} />
          <Branch geo={geo} mat={mat} depth={depth - 1} len={len * 0.72} tilt={-0.5} />
        </group>
      </group>
    </group>
  );
}

function Anemone({ geos, mats, position }) {
  const tentacles = useRef([]);
  const items = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => {
        const a = (i / 18) * Math.PI * 2;
        const r = 0.25 + (i % 3) * 0.12;
        return { x: Math.cos(a) * r, z: Math.sin(a) * r, a, phase: i * 0.6 };
      }),
    [],
  );
  useFrame(() => {
    const t = world.time;
    tentacles.current.forEach((g, i) => {
      if (!g) return;
      const it = items[i];
      g.rotation.x = Math.sin(it.a) * 0.4 + Math.sin(t * 1.4 + it.phase) * 0.18;
      g.rotation.z = -Math.cos(it.a) * 0.4 + Math.cos(t * 1.1 + it.phase) * 0.18;
    });
  });
  return (
    <group position={position}>
      <mesh geometry={geos.blob} material={mats.anemone} scale={[0.6, 0.3, 0.6]} />
      {items.map((it, i) => (
        <group key={i} position={[it.x, 0.15, it.z]} ref={(el) => (tentacles.current[i] = el)}>
          <mesh geometry={geos.tentacle} material={mats.anemone} position={[0, 0.3, 0]} />
          <mesh geometry={geos.blob} material={mats.anemoneTip} position={[0, 0.58, 0]} scale={0.065} />
        </group>
      ))}
    </group>
  );
}

// Table coral: flat plates stacked on a short stalk.
function TableCoral({ geos, mats, position, scale = 1 }) {
  return (
    <group position={position} scale={scale}>
      <mesh geometry={geos.stalk} material={mats.table} position={[0, 0.4, 0]} scale={[1, 0.8, 1]} />
      <mesh geometry={geos.disc} material={mats.table} position={[0, 0.82, 0]} scale={[0.9, 1, 0.8]} />
      <mesh geometry={geos.disc} material={mats.table} position={[0.35, 0.55, 0.1]} scale={[0.55, 1, 0.5]} />
      <mesh geometry={geos.disc} material={mats.table} position={[-0.3, 0.42, -0.1]} scale={[0.45, 1, 0.4]} />
    </group>
  );
}

const BUBBLES = [
  [0, 0.2, 0, 0.22],
  [0.24, 0.14, 0.1, 0.17],
  [-0.22, 0.13, 0.08, 0.18],
  [0.1, 0.12, -0.22, 0.16],
  [-0.12, 0.1, 0.24, 0.15],
  [0.05, 0.38, 0.05, 0.15],
  [0.3, 0.3, -0.1, 0.12],
  [-0.28, 0.32, -0.08, 0.13],
];

// Bubble coral: a soft cluster of glowing green balls.
function BubbleCoral({ geos, mats, position, scale = 1 }) {
  return (
    <group position={position} scale={scale}>
      {BUBBLES.map(([x, y, z, r], i) => (
        <mesh key={i} geometry={geos.blob} material={mats.bubble} position={[x, y, z]} scale={r} />
      ))}
    </group>
  );
}

// Soft finger coral that sways in the current.
function FingerCoral({ geos, mat, position, scale = 1, calm }) {
  const fingers = useRef([]);
  const items = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const a = (i / 7) * Math.PI * 2;
        const r = i === 0 ? 0 : 0.18;
        return { x: Math.cos(a) * r, z: Math.sin(a) * r, h: 0.8 + (i % 3) * 0.2, lean: i === 0 ? 0 : 0.35, a, phase: i * 0.9 };
      }),
    [],
  );
  useFrame(() => {
    const t = world.time;
    const amp = calm ? 0.04 : 0.12;
    fingers.current.forEach((g, i) => {
      if (!g) return;
      const it = items[i];
      g.rotation.x = Math.sin(it.a) * it.lean + Math.sin(t * 1.1 + it.phase) * amp;
      g.rotation.z = -Math.cos(it.a) * it.lean + Math.cos(t * 0.9 + it.phase) * amp;
    });
  });
  return (
    <group position={position} scale={scale}>
      {items.map((it, i) => (
        <group key={i} position={[it.x, 0, it.z]} ref={(el) => (fingers.current[i] = el)}>
          <mesh geometry={geos.finger} material={mat} position={[0, it.h * 0.45, 0]} scale={[1, it.h * 1.3, 1]} />
        </group>
      ))}
    </group>
  );
}

function TubeCluster({ geos, mats, position }) {
  const tubes = [
    [0, 1.2, 0],
    [0.3, 0.9, 0.15],
    [-0.28, 0.75, 0.1],
    [0.1, 0.6, -0.28],
    [-0.15, 1.0, -0.22],
  ];
  return (
    <group position={position}>
      {tubes.map(([x, h, z], i) => (
        <group key={i} position={[x, 0, z]} rotation={[x * 0.4, 0, -x * 0.5]}>
          <mesh geometry={geos.tube} material={mats.tube} position={[0, h / 2, 0]} scale={[1, h, 1]} />
          <mesh geometry={geos.rim} material={mats.tubeRim} position={[0, h, 0]} rotation={[Math.PI / 2, 0, 0]} />
        </group>
      ))}
    </group>
  );
}

export default function Coral({ calm }) {
  const geos = useMemo(makeGeometries, []);
  const mats = useMemo(makeMaterials, []);
  useEffect(
    () => () => {
      Object.values(geos).forEach((g) => g.dispose());
      Object.values(mats).forEach((m) => m.dispose());
    },
    [geos, mats],
  );

  return (
    <group>
      <group position={[-6.2, FLOOR - 0.1, -2.2]} scale={1.1}>
        <Branch geo={geos.branch} mat={mats.pink} depth={4} len={1.1} tilt={0} />
      </group>
      <group position={[5.6, FLOOR - 0.1, -2.8]} rotation={[0, 1, 0]} scale={1.25}>
        <Branch geo={geos.branch} mat={mats.coralOrange} depth={4} len={1.0} tilt={0.1} />
      </group>
      <group position={[1.2, FLOOR - 0.1, -4.4]} rotation={[0, 2, 0]} scale={0.9}>
        <Branch geo={geos.branch} mat={mats.purple} depth={3} len={1.2} tilt={-0.1} />
      </group>

      <mesh geometry={geos.brain} material={mats.brain} position={[-1.6, FLOOR - 0.1, -2.6]} scale={[0.9, 0.6, 0.85]} />
      <mesh geometry={geos.brain} material={mats.brain} position={[7.2, FLOOR - 0.15, -0.4]} scale={[0.6, 0.4, 0.6]} />

      <mesh geometry={geos.fan} material={mats.fan} position={[-4.2, FLOOR, -4.6]} rotation={[0, 0.3, 0]} scale={1.6} />
      <mesh geometry={geos.fan} material={mats.fan} position={[3.6, FLOOR, -5.2]} rotation={[0, -0.4, 0]} scale={1.3} />

      <TubeCluster geos={geos} mats={mats} position={[3.2, FLOOR - 0.1, -1.2]} />
      <TubeCluster geos={geos} mats={mats} position={[-7.6, FLOOR - 0.1, -0.6]} />

      <Anemone geos={geos} mats={mats} position={[-3.4, FLOOR, -0.8]} />
      <Anemone geos={geos} mats={mats} position={[6.4, FLOOR, 1.2]} />


      {/* more reef: some near the middle so narrow phone screens see it too */}
      <group position={[-2.6, FLOOR - 0.1, -5]} rotation={[0, 0.6, 0]}>
        <Branch geo={geos.branch} mat={mats.yellow} depth={4} len={0.95} tilt={0.05} />
      </group>
      <group position={[2.4, FLOOR - 0.1, -4]} rotation={[0, -0.8, 0]} scale={0.85}>
        <Branch geo={geos.branch} mat={mats.blue} depth={4} len={1.0} tilt={-0.08} />
      </group>
      <TableCoral geos={geos} mats={mats} position={[-0.6, FLOOR - 0.1, -4.6]} />
      <TableCoral geos={geos} mats={mats} position={[6.8, FLOOR - 0.1, -3.4]} scale={0.8} />
      <BubbleCoral geos={geos} mats={mats} position={[0.6, FLOOR - 0.05, -3.4]} />
      <BubbleCoral geos={geos} mats={mats} position={[-7, FLOOR - 0.05, -2.8]} scale={1.2} />
      <FingerCoral geos={geos} mat={mats.finger} position={[2.2, FLOOR - 0.1, -2.6]} calm={calm} />
      <FingerCoral geos={geos} mat={mats.fingerOrange} position={[-5, FLOOR - 0.1, -3.2]} scale={1.2} calm={calm} />
      <FingerCoral geos={geos} mat={mats.finger} position={[4.8, FLOOR - 0.1, 0.2]} scale={0.8} calm={calm} />
    </group>
  );
}
