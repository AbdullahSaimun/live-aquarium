import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useCursor } from '@react-three/drei';
import { world } from '../sim/world';
import { showCreature, sfx } from '../state/store';
import { ROCKS, sandY, tmpObj } from './reefLayout';

const URCHINS = [
  { x: 1.5, z: -1.3, s: 1 },
  { x: -6.3, z: -0.9, s: 1.15 },
];
const CUCUMBER = { x0: -0.9, x1: 0.5, z: -1.6 };
const SMALL_CLAMS = [
  { x: 2.6, z: 0.5, turn: 0.4 },
  { x: -3.0, z: 0.1, turn: 2.2 },
  { x: 5.8, z: -1.6, turn: 1.3 },
];
const SNAIL = { x0: 4.0, x1: 5.2, z: 1.3 };
const SPINES = 70;

function makeKit() {
  const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra });
  // A ribbed half-shell dome for the little clams.
  const shell = new THREE.SphereGeometry(1, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  const p = shell.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const a = Math.atan2(p.getZ(i), p.getX(i));
    const rib = 1 + Math.abs(Math.sin(a * 6)) * 0.07;
    p.setXYZ(i, p.getX(i) * rib, p.getY(i) * 0.4, p.getZ(i) * rib * 0.8);
  }
  shell.computeVertexNormals();
  // Sponges are turned on a lathe: a fat barrel and a tall vase.
  const lathe = (pts) => {
    const g = new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), 18);
    const q = g.attributes.position;
    for (let i = 0; i < q.count; i++) {
      const a = Math.atan2(q.getZ(i), q.getX(i));
      const k = 1 + Math.sin(a * 9) * 0.05;
      q.setX(i, q.getX(i) * k);
      q.setZ(i, q.getZ(i) * k);
    }
    g.computeVertexNormals();
    return g;
  };
  return {
    sphere: new THREE.SphereGeometry(1, 16, 12),
    small: new THREE.SphereGeometry(1, 8, 6),
    spine: new THREE.ConeGeometry(0.014, 0.3, 4).translate(0, 0.15, 0),
    capsule: new THREE.CapsuleGeometry(1, 1, 4, 8),
    stalk: new THREE.CapsuleGeometry(0.012, 0.09, 3, 5),
    shell,
    barrel: lathe([[0.18, 0], [0.3, 0.12], [0.36, 0.38], [0.33, 0.6], [0.26, 0.62], [0.22, 0.4], [0.05, 0.3]]),
    vase: lathe([[0.08, 0], [0.12, 0.3], [0.2, 0.75], [0.24, 1.05], [0.19, 1.07], [0.14, 0.7], [0.04, 0.5]]),
    urchin: std('#3b1f52', { roughness: 0.45 }),
    spineMat: std('#5a2f78', { roughness: 0.25, metalness: 0.25, emissive: '#2a0f45', emissiveIntensity: 0 }),
    cucumber: std('#c98d52', { roughness: 0.8 }),
    cucumberSpot: std('#5b3a22'),
    feeder: std('#ffe08a'),
    clamShell: std('#e8dccb', { roughness: 0.5, side: THREE.DoubleSide }),
    clamInside: std('#6d8fd8', { emissive: '#3c63c9', emissiveIntensity: 0.1 }),
    barrelMat: std('#f08a3c', { roughness: 0.95, side: THREE.DoubleSide, flatShading: true }),
    vaseMat: std('#9b6ad6', { roughness: 0.9, side: THREE.DoubleSide, flatShading: true }),
    blueSponge: std('#4f8fe0', { roughness: 0.95, flatShading: true }),
    snailBody: std('#e3cfb2', { roughness: 0.5 }),
    shellA: std('#f6e6c8', { roughness: 0.4 }),
    shellB: std('#a8613a', { roughness: 0.4 }),
    eye: new THREE.MeshBasicMaterial({ color: '#1d1b33' }),
    hidden: new THREE.MeshBasicMaterial({ visible: false }),
  };
}

function useTap(onTap) {
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);
  return {
    onClick: (e) => {
      e.stopPropagation();
      onTap();
    },
    onPointerOver: () => setHovered(true),
    onPointerOut: () => setHovered(false),
  };
}

// A spiky purple sea urchin; its spines bristle out when tapped.
function Urchin({ kit, def }) {
  const group = useRef();
  const spines = useRef();
  const bristle = useRef(0);
  const y = sandY(def.x, def.z) + 0.13 * def.s;
  useLayoutEffect(() => {
    const m = spines.current;
    const up = new THREE.Vector3(0, 1, 0);
    const dir = new THREE.Vector3();
    for (let i = 0; i < SPINES; i++) {
      // Fibonacci points over the upper part of a ball, so spines spread evenly.
      const t = (i + 0.5) / SPINES;
      const yy = 1 - t * 1.45;
      const r = Math.sqrt(Math.max(0, 1 - yy * yy));
      const a = i * 2.39996;
      dir.set(Math.cos(a) * r, yy, Math.sin(a) * r).normalize();
      tmpObj.position.copy(dir).multiplyScalar(0.16);
      tmpObj.quaternion.setFromUnitVectors(up, dir);
      tmpObj.scale.set(1, 0.8 + ((i * 7) % 5) * 0.1, 1);
      tmpObj.updateMatrix();
      m.setMatrixAt(i, tmpObj.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, []);
  useFrame((_, rawDt) => {
    bristle.current = Math.max(0, bristle.current - Math.min(rawDt, 0.1));
    const k = bristle.current > 0 ? Math.sin((1 - bristle.current / 0.8) * Math.PI) : 0;
    spines.current.scale.setScalar(1 + k * 0.35 + Math.sin(world.time * 0.8 + def.x) * 0.02);
    kit.spineMat.emissiveIntensity = (1 - world.light) * 0.5;
  });
  const tap = useTap(() => {
    bristle.current = 0.8;
    sfx('squeak');
    showCreature('seaUrchin');
  });
  return (
    <group ref={group} position={[def.x, y, def.z]} scale={def.s}>
      <mesh geometry={kit.sphere} material={kit.urchin} scale={[0.17, 0.13, 0.17]} />
      <instancedMesh ref={spines} args={[kit.spine, kit.spineMat, SPINES]} />
      <mesh geometry={kit.sphere} material={kit.hidden} scale={0.45} {...tap} />
    </group>
  );
}

// A spotted sea cucumber that inches slowly back and forth across the sand.
function SeaCucumber({ kit, calm }) {
  const root = useRef();
  const segs = useRef([]);
  const s = useRef({ x: CUCUMBER.x0 + 0.3, dir: 1, turn: 0, squish: 0 });
  const SEG = 7;
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const c = s.current;
    const t = world.time;
    c.squish = Math.max(0, c.squish - dt);
    if (c.squish <= 0) c.x += c.dir * dt * (calm ? 0.02 : 0.04) * (0.6 + 0.4 * Math.max(0, Math.sin(t * 1.4)));
    if (c.x > CUCUMBER.x1) c.dir = -1;
    if (c.x < CUCUMBER.x0) c.dir = 1;
    c.turn += ((c.dir > 0 ? 0 : Math.PI) - c.turn) * (1 - Math.exp(-dt * 0.8));
    root.current.position.set(c.x, sandY(c.x, CUCUMBER.z) + 0.07, CUCUMBER.z);
    root.current.rotation.y = c.turn;
    const sq = c.squish > 0 ? Math.sin((c.squish / 0.9) * Math.PI) : 0;
    segs.current.forEach((g, i) => {
      if (!g) return;
      // A slow wave of squeezing runs along the body as it crawls.
      const wave = Math.sin(t * 1.4 - i * 0.9);
      g.position.x = (i - (SEG - 1) / 2) * 0.1 * (1 - sq * 0.3) + wave * 0.008;
      g.scale.set(1 + sq * 0.25, 1 - sq * 0.35 + wave * 0.06, 1 + sq * 0.2);
    });
  });
  const tap = useTap(() => {
    s.current.squish = 0.9;
    sfx('plop');
    showCreature('seaCucumber');
  });
  return (
    <group ref={root}>
      {Array.from({ length: SEG }, (_, i) => {
        const r = 0.085 * (1 - Math.abs(i - (SEG - 1) / 2) / SEG) + 0.02;
        return (
          <group key={i} ref={(el) => (segs.current[i] = el)}>
            <mesh geometry={kit.sphere} material={kit.cucumber} scale={[r * 1.2, r * 0.85, r]} />
            {i % 2 === 0 && <mesh geometry={kit.small} material={kit.cucumberSpot} position={[0, r * 0.75, r * 0.3]} scale={0.018} />}
            {i % 3 === 1 && <mesh geometry={kit.small} material={kit.cucumberSpot} position={[0.02, r * 0.6, -r * 0.5]} scale={0.014} />}
          </group>
        );
      })}
      {/* little feeding tentacles at the front */}
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} geometry={kit.small} material={kit.feeder} position={[0.37, 0.02 + Math.sin(i * 1.26) * 0.03, Math.cos(i * 1.26) * 0.03]} scale={0.016} />
      ))}
      <mesh geometry={kit.sphere} material={kit.hidden} position={[0, 0.08, 0]} scale={[0.6, 0.32, 0.38]} {...tap} />
    </group>
  );
}

// Half-buried clams that open a crack now and then.
function SmallClam({ kit, def, index }) {
  const lid = useRef();
  useFrame(() => {
    const t = world.time + index * 5;
    const open = Math.max(0, Math.sin(t * 0.35)) ** 3 * 0.45;
    lid.current.rotation.x = -open;
  });
  return (
    <group position={[def.x, sandY(def.x, def.z) + 0.01, def.z]} rotation={[0, def.turn, 0]} scale={0.13}>
      <mesh geometry={kit.shell} material={kit.clamShell} rotation={[Math.PI, 0, 0]} />
      <mesh geometry={kit.small} material={kit.clamInside} scale={[0.85, 0.15, 0.65]} position={[0, 0.02, 0]} />
      <group ref={lid} position={[0, 0, -0.8]}>
        <mesh geometry={kit.shell} material={kit.clamShell} position={[0, 0, 0.8]} />
      </group>
    </group>
  );
}

// A striped sea snail gliding very slowly; tapped, it pulls into its shell for a moment.
function Snail({ kit }) {
  const root = useRef();
  const body = useRef();
  const s = useRef({ x: SNAIL.x0 + 0.2, dir: 1, hide: 0 });
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const c = s.current;
    c.hide = Math.max(0, c.hide - dt);
    if (c.hide <= 0) c.x += c.dir * dt * 0.03;
    if (c.x > SNAIL.x1) c.dir = -1;
    if (c.x < SNAIL.x0) c.dir = 1;
    root.current.position.set(c.x, sandY(c.x, SNAIL.z), SNAIL.z);
    root.current.rotation.y = c.dir > 0 ? 0 : Math.PI;
    const out = c.hide > 0 ? 0.15 : 1;
    const k = body.current.scale.x + (out - body.current.scale.x) * (1 - Math.exp(-dt * 6));
    body.current.scale.setScalar(k);
  });
  const tap = useTap(() => {
    s.current.hide = 3;
    sfx('plop');
  });
  return (
    <group ref={root} scale={0.9}>
      <group ref={body}>
        <mesh geometry={kit.capsule} material={kit.snailBody} position={[0.06, 0.035, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.035, 0.1, 0.045]} />
        {[1, -1].map((side) => (
          <group key={side} position={[0.16, 0.06, side * 0.025]} rotation={[side * 0.3, 0, -0.5]}>
            <mesh geometry={kit.stalk} material={kit.snailBody} position={[0, 0.05, 0]} />
            <mesh geometry={kit.small} material={kit.eye} position={[0, 0.1, 0]} scale={0.012} />
          </group>
        ))}
      </group>
      {/* the shell: stacked rings of cream and brown that spiral up to a point */}
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh
          key={i}
          geometry={kit.sphere}
          material={i % 2 ? kit.shellB : kit.shellA}
          position={[-0.02 - i * 0.012, 0.09 + i * 0.03, 0]}
          scale={[0.075 - i * 0.013, 0.05 - i * 0.008, 0.07 - i * 0.012]}
        />
      ))}
      <mesh geometry={kit.sphere} material={kit.hidden} position={[0, 0.1, 0]} scale={0.22} {...tap} />
    </group>
  );
}

// Sea sponges: an orange barrel, a purple vase and blue crusts on a rock. Just scenery.
function Sponges({ kit }) {
  const blue = ROCKS[9];
  return (
    <group>
      <mesh geometry={kit.barrel} material={kit.barrelMat} position={[-3.4, sandY(-3.4, -3.6) - 0.02, -3.6]} scale={1.2} />
      <mesh geometry={kit.vase} material={kit.vaseMat} position={[5.0, sandY(5.0, -3.9) - 0.02, -3.9]} />
      <mesh geometry={kit.vase} material={kit.vaseMat} position={[5.25, sandY(5.25, -3.7) - 0.02, -3.7]} scale={0.7} rotation={[0.15, 1, -0.1]} />
      {[0, 1, 2, 3].map((i) => (
        <mesh
          key={i}
          geometry={kit.sphere}
          material={kit.blueSponge}
          position={[blue[0] - 0.35 + i * 0.22, sandY(blue[0], blue[1]) + 0.25 + (i % 2) * 0.12, blue[1] + 0.55]}
          scale={[0.16, 0.07, 0.12]}
        />
      ))}
    </group>
  );
}

export default function Critters({ calm }) {
  const kit = useMemo(makeKit, []);
  useEffect(() => () => Object.values(kit).forEach((x) => x.dispose()), [kit]);
  return (
    <group>
      {URCHINS.map((u) => (
        <Urchin key={u.x} kit={kit} def={u} />
      ))}
      <SeaCucumber kit={kit} calm={calm} />
      {SMALL_CLAMS.map((c, i) => (
        <SmallClam key={c.x} kit={kit} def={c} index={i} />
      ))}
      <Snail kit={kit} />
      <Sponges kit={kit} />
    </group>
  );
}
