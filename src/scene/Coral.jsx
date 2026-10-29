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

  const star = new THREE.Shape();
  for (let i = 0; i <= 10; i++) {
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    const r = i % 2 === 0 ? 1 : 0.45;
    if (i === 0) star.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else star.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const starGeo = new THREE.ExtrudeGeometry(star, { depth: 0.12, bevelEnabled: true, bevelSize: 0.1, bevelThickness: 0.1, bevelSegments: 2 });
  starGeo.rotateX(-Math.PI / 2);

  return {
    brain,
    star: starGeo,
    branch: new THREE.CapsuleGeometry(0.11, 0.8, 4, 8),
    tube: new THREE.CylinderGeometry(0.14, 0.18, 1, 12, 1, true),
    rim: new THREE.TorusGeometry(0.14, 0.04, 6, 14),
    fan: new THREE.CircleGeometry(1, 28, 0, Math.PI),
    tentacle: new THREE.CapsuleGeometry(0.05, 0.5, 3, 6),
    blob: new THREE.SphereGeometry(1, 16, 12),
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
    star: std('#ff7a59', { roughness: 0.6 }),
    starYellow: std('#ffc94d', { roughness: 0.6 }),
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

export default function Coral() {
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

      <mesh geometry={geos.star} material={mats.star} position={[1.8, FLOOR + 0.02, 1.6]} rotation={[0, 0.4, 0]} scale={0.32} />
      <mesh geometry={geos.star} material={mats.starYellow} position={[-5.2, FLOOR + 0.02, 1.8]} rotation={[0, 1.2, 0]} scale={0.26} />
    </group>
  );
}
