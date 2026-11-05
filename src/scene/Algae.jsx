import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { useFrame } from '@react-three/fiber';
import { world } from '../sim/world';
import { ROCKS, addSway, isClearOfHomes, sandY, seeded, tmpObj, tmpColor } from './reefLayout';

// Seagrass meadows: [x, z, radius, blades at high detail]. Back and corners only.
const MEADOWS = [
  [-6.4, -3.7, 1.5, 190],
  [5.6, -4.1, 1.6, 190],
  [-0.6, -5.0, 1.7, 200],
  [-7.6, 1.6, 0.8, 60],
  [7.7, 1.9, 0.8, 60],
];

// One seagrass blade: a thin ribbon, darker at the base, curving forward towards the tip.
function bladeGeometry() {
  const geo = new THREE.PlaneGeometry(0.095, 1, 1, 6);
  geo.translate(0, 0.5, 0);
  const p = geo.attributes.position;
  const colors = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    p.setX(i, p.getX(i) * (1 - y * 0.55));
    p.setZ(i, y * y * 0.18);
    const k = 0.62 + y * 0.38;
    colors.set([k, k, k], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

function Seagrass({ detail }) {
  const mesh = useRef();
  const scale = detail === 'low' ? 0.5 : 1;
  const geo = useMemo(bladeGeometry, []);
  const mat = useMemo(
    () => addSway(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, side: THREE.DoubleSide }), { amp: 0.16, speed: 1, height: 1 }),
    [],
  );
  const blades = useMemo(() => {
    const rnd = seeded(101);
    const out = [];
    MEADOWS.forEach(([cx, cz, r, n]) => {
      for (let i = 0; i < Math.round(n * scale); i++) {
        const a = rnd() * Math.PI * 2;
        const d = Math.sqrt(rnd()) * r;
        const x = cx + Math.cos(a) * d;
        const z = cz + Math.sin(a) * d * 0.7;
        if (!isClearOfHomes(x, z)) continue;
        out.push({ x, z, h: (0.6 + rnd() * 0.8) * (1 - d / r * 0.45), turn: rnd() * 6.28, tilt: (rnd() - 0.5) * 0.35, c: rnd() });
      }
    });
    return out;
  }, [scale]);
  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat],
  );
  useLayoutEffect(() => {
    const m = mesh.current;
    blades.forEach((b, i) => {
      tmpObj.position.set(b.x, sandY(b.x, b.z) - 0.02, b.z);
      tmpObj.rotation.set(b.tilt, b.turn, b.tilt * 0.5);
      tmpObj.scale.set(1, b.h, 1);
      tmpObj.updateMatrix();
      m.setMatrixAt(i, tmpObj.matrix);
      m.setColorAt(i, tmpColor.setHSL(0.25 + b.c * 0.08, 0.5 + b.c * 0.15, 0.38 + b.c * 0.14));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }, [blades]);
  return <instancedMesh key={blades.length} ref={mesh} args={[geo, mat, blades.length]} />;
}

// Sea lettuce: thin, ruffled, see-through green sheets in little clumps on rocks and sand.
function lettuceGeometry() {
  const geo = new THREE.PlaneGeometry(0.55, 0.42, 10, 8);
  geo.translate(0, 0.21, 0);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const edge = Math.max(Math.abs(x) / 0.275, y / 0.42);
    p.setZ(i, Math.sin(x * 22 + y * 9) * 0.05 * edge + Math.sin(x * 6) * 0.04);
    p.setX(i, x * (0.6 + y * 1.1));
  }
  geo.computeVertexNormals();
  return geo;
}

const LETTUCE = [
  [-7.5, -4.4, 1.0],
  [-1.2, -6.2, 1.1],
  [4.0, -5.4, 0.9],
  [6.7, -4.4, 1.2],
  [-8.4, -1.6, 0.8],
  [1.2, 0.8, 0.6],
  [-5.6, -2.0, 0.7],
];

// Red feather algae: a stem with soft leaflets on both sides, like a crimson fern.
function featherGeometry() {
  const parts = [];
  const stem = new THREE.CylinderGeometry(0.012, 0.02, 0.9, 5);
  stem.translate(0, 0.45, 0);
  parts.push(stem);
  for (let i = 0; i < 14; i++) {
    const y = 0.1 + i * 0.055;
    const len = 0.16 * (1 - i / 16);
    for (const side of [1, -1]) {
      const leaf = new THREE.SphereGeometry(1, 6, 4);
      leaf.scale(len, 0.012, 0.03);
      leaf.translate(len * 0.9 * side, 0, 0);
      leaf.rotateZ(side * 0.5);
      leaf.translate(0, y, 0);
      parts.push(leaf);
    }
  }
  const merged = mergeGeometries(parts.map((g) => g.toNonIndexed()));
  parts.forEach((g) => g.dispose());
  return merged;
}

// Grape algae (Caulerpa): little green bead clusters on upright stalks along a creeping runner.
function grapeGeometry() {
  const parts = [];
  const runner = new THREE.CapsuleGeometry(0.018, 0.9, 3, 5);
  runner.rotateZ(Math.PI / 2);
  runner.translate(0, 0.02, 0);
  parts.push(runner);
  const rnd = seeded(77);
  for (let s = 0; s < 6; s++) {
    const x = -0.4 + s * 0.16;
    const h = 0.12 + rnd() * 0.18;
    const stalk = new THREE.CylinderGeometry(0.01, 0.014, h, 4);
    stalk.translate(x, h / 2, 0);
    parts.push(stalk);
    for (let b = 0; b < 7; b++) {
      const bead = new THREE.SphereGeometry(0.026 + rnd() * 0.01, 6, 5);
      const a = rnd() * Math.PI * 2;
      bead.translate(x + Math.cos(a) * 0.035, h * (0.45 + b * 0.09), Math.sin(a) * 0.035);
      parts.push(bead);
    }
  }
  const merged = mergeGeometries(parts.map((g) => g.toNonIndexed()));
  parts.forEach((g) => g.dispose());
  return merged;
}

function placeInstances(mesh, items, colorOf) {
  items.forEach((it, i) => {
    tmpObj.position.set(it.x, it.y ?? sandY(it.x, it.z), it.z);
    tmpObj.rotation.set(it.rx ?? 0, it.ry ?? 0, it.rz ?? 0);
    tmpObj.scale.setScalar(it.s ?? 1);
    tmpObj.updateMatrix();
    mesh.setMatrixAt(i, tmpObj.matrix);
    mesh.setColorAt(i, colorOf(it, i));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
}

// Top of a boulder from ROCKS, where algae like to grow.
const rockTop = (i, rnd) => {
  const [x, z, s] = ROCKS[i];
  const a = rnd() * Math.PI * 2;
  const d = rnd() * s * 0.45;
  return { x: x + Math.cos(a) * d, z: z + Math.sin(a) * d * 0.6, y: sandY(x, z) + s * 0.12 + s * 0.85 * (0.8 - d / s * 0.5) };
};

export default function Algae({ detail = 'high' }) {
  const kit = useMemo(
    () => ({
      lettuce: lettuceGeometry(),
      feather: featherGeometry(),
      grape: grapeGeometry(),
      lettuceMat: addSway(
        new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.55, side: THREE.DoubleSide, transparent: true, opacity: 0.82 }),
        { amp: 0.06, speed: 1.3, height: 0.42 },
      ),
      featherMat: addSway(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6, emissive: '#5a0a1c', emissiveIntensity: 0 }), {
        amp: 0.12,
        speed: 0.8,
        height: 0.9,
      }),
      grapeMat: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.35, emissive: '#2f7a1c', emissiveIntensity: 0.05 }),
    }),
    [],
  );
  useEffect(() => () => Object.values(kit).forEach((x) => x.dispose()), [kit]);

  const lettuce = useRef();
  const feather = useRef();
  const grape = useRef();

  const items = useMemo(() => {
    const rnd = seeded(303);
    const lettuceItems = [];
    LETTUCE.forEach(([x, z, s], k) => {
      const onRock = ROCKS.findIndex(([rx, rz, rs]) => Math.hypot(rx - x, rz - z) < rs * 0.6);
      for (let i = 0; i < 4; i++) {
        const base = onRock >= 0 ? rockTop(onRock, rnd) : { x: x + (rnd() - 0.5) * 0.4, z: z + (rnd() - 0.5) * 0.3 };
        lettuceItems.push({ ...base, s: s * (0.6 + rnd() * 0.5), ry: rnd() * 6.28, rx: (rnd() - 0.5) * 0.5, rz: (rnd() - 0.5) * 0.6, c: rnd(), k });
      }
    });
    const featherItems = [];
    [[-3.5, -5.2], [2.6, -5.0], [-6.9, -2.9], [7.4, -3.2], [-0.2, -3.9]].forEach(([x, z]) => {
      for (let i = 0; i < (detail === 'low' ? 2 : 4); i++) {
        const fx = x + (rnd() - 0.5) * 0.7;
        const fz = z + (rnd() - 0.5) * 0.5;
        if (!isClearOfHomes(fx, fz)) continue;
        featherItems.push({ x: fx, z: fz, s: 0.7 + rnd() * 0.6, ry: rnd() * 6.28, rz: (rnd() - 0.5) * 0.3, c: rnd() });
      }
    });
    const grapeItems = [];
    [[-5.3, -0.9], [6.0, -2.0], [-2.0, -4.2], [1.6, -3.3], [8.0, 0.3], [-8.0, 0.0], [5.0, 1.6]].forEach(([x, z]) => {
      if (!isClearOfHomes(x, z)) return;
      grapeItems.push({ x, z, s: 0.8 + rnd() * 0.5, ry: rnd() * 6.28, c: rnd() });
    });
    return { lettuceItems, featherItems, grapeItems };
  }, [detail]);

  useLayoutEffect(() => {
    placeInstances(lettuce.current, items.lettuceItems, (it) => tmpColor.setHSL(0.27 + it.c * 0.05, 0.55, 0.5 + it.c * 0.1));
    placeInstances(feather.current, items.featherItems, (it) => tmpColor.setHSL(0.97 + it.c * 0.03, 0.62, 0.42 + it.c * 0.1));
    placeInstances(grape.current, items.grapeItems, (it) => tmpColor.setHSL(0.28 + it.c * 0.04, 0.6, 0.42));
  }, [items]);

  // Red algae and grape beads glow faintly at night, like the corals.
  useFrame(() => {
    const night = 1 - world.light;
    kit.featherMat.emissiveIntensity = night * 0.5;
    kit.grapeMat.emissiveIntensity = 0.05 + night * 0.4;
  });

  return (
    <group>
      <Seagrass key={detail} detail={detail} />
      <instancedMesh key={`l${items.lettuceItems.length}`} ref={lettuce} args={[kit.lettuce, kit.lettuceMat, items.lettuceItems.length]} />
      <instancedMesh key={`f${items.featherItems.length}`} ref={feather} args={[kit.feather, kit.featherMat, items.featherItems.length]} />
      <instancedMesh key={`g${items.grapeItems.length}`} ref={grape} args={[kit.grape, kit.grapeMat, items.grapeItems.length]} />
    </group>
  );
}
