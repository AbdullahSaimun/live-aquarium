import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { isClear, sandY, seeded, tmpObj, tmpColor } from './reefLayout';

const PEBBLE_COLORS = ['#9b8f84', '#b4a898', '#7f7a74', '#c9bfb0', '#8d8172', '#a7988a'];
const SHELL_COLORS = ['#fff3e3', '#ffd9c7', '#f5c6a8', '#fce8f0', '#e9d7c1'];
const RUBBLE_COLORS = ['#f4ede2', '#ead9cf', '#f1d3d6', '#e3e0d4'];

// Picks spots on the sand that keep out of the chest, the den and the creatures' homes.
function spots(count, seed, { xMax = 9.5, zMin = -6.5, zMax = 2.6, pad = 0.1 } = {}) {
  const rnd = seeded(seed);
  const out = [];
  let tries = 0;
  while (out.length < count && tries++ < count * 40) {
    const x = (rnd() * 2 - 1) * xMax;
    const z = zMin + rnd() * (zMax - zMin);
    if (isClear(x, z, pad)) out.push({ x, z, r: rnd(), r2: rnd(), r3: rnd() });
  }
  return out;
}

function Scatter({ geo, mat, items, colors, place }) {
  const mesh = useRef();
  useLayoutEffect(() => {
    const m = mesh.current;
    items.forEach((it, i) => {
      place(it, tmpObj);
      tmpObj.updateMatrix();
      m.setMatrixAt(i, tmpObj.matrix);
      m.setColorAt(i, tmpColor.set(colors[Math.floor(it.r3 * colors.length)]));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }, [items, colors, place]);
  return <instancedMesh ref={mesh} args={[geo, mat, items.length]} />;
}

// Pebbles, broken shells and bits of bleached coral rubble lying on the sand (all instanced).
export default function SeabedScatter({ detail = 'high' }) {
  const n = detail === 'low' ? 0.5 : 1;
  const kit = useMemo(() => {
    const pebble = new THREE.IcosahedronGeometry(1, 1);
    // A fan-shaped shell half: a ribbed, shallow dome.
    const shell = new THREE.SphereGeometry(1, 14, 6, 0, Math.PI, 0, Math.PI / 2);
    const p = shell.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const z = p.getZ(i);
      const a = Math.atan2(z, x);
      const rib = 1 + Math.abs(Math.sin(a * 7)) * 0.08;
      p.setXYZ(i, x * rib, p.getY(i) * 0.45, z * rib);
    }
    shell.computeVertexNormals();
    return {
      pebble,
      shell,
      rubble: new THREE.CapsuleGeometry(0.12, 0.5, 3, 6),
      stone: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.85, flatShading: true }),
      shellMat: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.45, side: THREE.DoubleSide }),
      rubbleMat: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 }),
    };
  }, []);
  useEffect(() => () => Object.values(kit).forEach((x) => x.dispose()), [kit]);

  const pebbles = useMemo(() => spots(Math.round(64 * n), 7), [n]);
  const shells = useMemo(() => spots(Math.round(30 * n), 19, { zMin: -3.5 }), [n]);
  const rubble = useMemo(() => spots(Math.round(24 * n), 31, { zMin: -6, zMax: 0.5 }), [n]);

  const placePebble = useMemo(
    () => (it, o) => {
      const s = 0.05 + it.r * it.r * 0.13;
      o.position.set(it.x, sandY(it.x, it.z) + s * 0.25, it.z);
      o.rotation.set(it.r2 * 3, it.r * 6, it.r3 * 2);
      o.scale.set(s * (1 + it.r2 * 0.6), s * 0.55, s);
    },
    [],
  );
  const placeShell = useMemo(
    () => (it, o) => {
      const s = 0.06 + it.r * 0.07;
      // Most lie open side down; a few are flipped and show their pearly inside.
      const flipped = it.r2 > 0.8;
      o.position.set(it.x, sandY(it.x, it.z) + (flipped ? s * 0.45 : 0.01), it.z);
      o.rotation.set(flipped ? Math.PI : 0, it.r * 6.28, (it.r3 - 0.5) * 0.4);
      o.scale.setScalar(s);
    },
    [],
  );
  const placeRubble = useMemo(
    () => (it, o) => {
      const s = 0.35 + it.r * 0.45;
      o.position.set(it.x, sandY(it.x, it.z) + 0.04, it.z);
      o.rotation.set(Math.PI / 2 + (it.r2 - 0.5) * 0.3, 0, it.r * 6.28);
      o.scale.set(s, s, s);
    },
    [],
  );

  return (
    <group>
      <Scatter key={`p${n}`} geo={kit.pebble} mat={kit.stone} items={pebbles} colors={PEBBLE_COLORS} place={placePebble} />
      <Scatter key={`s${n}`} geo={kit.shell} mat={kit.shellMat} items={shells} colors={SHELL_COLORS} place={placeShell} />
      <Scatter key={`r${n}`} geo={kit.rubble} mat={kit.rubbleMat} items={rubble} colors={RUBBLE_COLORS} place={placeRubble} />
    </group>
  );
}
