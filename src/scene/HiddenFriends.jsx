import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useCursor } from '@react-three/drei';
import { world } from '../sim/world';
import { useStore, findHidden, sfx, hiddenFound } from '../state/store';
import { seeded } from './reefLayout';
import { glowTexture } from './NightLife';

const FLOOR = world.floorY;
const HINT_AFTER = 180; // seconds before a faint sparkle gives the hiding place away

// Where the leafy sea dragon may hide: beside kelp or among the seagrass, drifting at plant height.
const DRAGON_SPOTS = [
  [-0.4, FLOOR + 1.2, -3.35],
  [-2.8, FLOOR + 1.4, -3.95],
  [-6.8, FLOOR + 1.0, -1.35],
  [4.4, FLOOR + 1.3, -3.75],
  [7.6, FLOOR + 1.2, -2.55],
  [-8.2, FLOOR + 1.1, -2.95],
  [-6.2, FLOOR + 0.6, -3.4],
  [5.4, FLOOR + 0.6, -3.85],
];

// The purple sea fans in Coral.jsx: [x, z, turn, size]. The pygmy seahorse clings to one of them.
const FANS = [
  [-4.2, -4.6, 0.3, 1.6],
  [3.6, -5.2, -0.4, 1.3],
];
const FAN_POINTS = [
  [0.85, 1.25],
  [1.15, 0.55],
  [0.7, 2.2],
  [1.25, 2.6],
];
const PYGMY_SPOTS = FANS.flatMap(([fx, fz, turn, size]) =>
  FAN_POINTS.map(([r, a]) => {
    const lx = Math.cos(a) * r * size;
    const ly = Math.sin(a) * r * size;
    // Rotate the fan's local point by its turn, then sit just in front of the fan's surface.
    return [fx + lx * Math.cos(turn) + Math.sin(turn) * 0.05, FLOOR + ly, fz - lx * Math.sin(turn) + Math.cos(turn) * 0.05, turn];
  }),
);

// Same spots all day, new spots tomorrow.
function spotsForToday() {
  const d = new Date();
  const rnd = seeded(d.getFullYear() * 1000 + d.getMonth() * 40 + d.getDate());
  return {
    dragon: DRAGON_SPOTS[Math.floor(rnd() * DRAGON_SPOTS.length)],
    pygmy: PYGMY_SPOTS[Math.floor(rnd() * PYGMY_SPOTS.length)],
  };
}

function makeKit() {
  const leaf = new THREE.SphereGeometry(1, 8, 6);
  leaf.scale(0.06, 0.012, 0.03);
  return {
    sphere: new THREE.SphereGeometry(1, 12, 8),
    leaf,
    stalk: new THREE.CylinderGeometry(0.01, 0.014, 1, 5),
    dragon: new THREE.MeshStandardMaterial({ color: '#b9a24a', roughness: 0.6 }),
    dragonLeaf: new THREE.MeshStandardMaterial({ color: '#8f9a3c', roughness: 0.6, side: THREE.DoubleSide }),
    pygmy: new THREE.MeshStandardMaterial({ color: '#c06cff', roughness: 0.7 }),
    pygmyBump: new THREE.MeshStandardMaterial({ color: '#ff8fd0', roughness: 0.6 }),
    eye: new THREE.MeshBasicMaterial({ color: '#1d1b33' }),
    glow: new THREE.SpriteMaterial({ map: glowTexture(), color: '#fff6c8', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }),
    hidden: new THREE.MeshBasicMaterial({ visible: false }),
  };
}

function useHover() {
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);
  return { onPointerOver: () => setHovered(true), onPointerOut: () => setHovered(false) };
}

// A leafy sea dragon: a long thin body covered in leaf-shaped flaps, swaying like seaweed.
function SeaDragon({ kit, spot }) {
  const g = useRef();
  const hover = useHover();
  const leaves = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        z: 0.2 - i * 0.04,
        y: Math.sin(i * 0.6) * 0.03,
        side: i % 2 ? 1 : -1,
        tilt: 0.5 + (i % 3) * 0.3,
      })),
    [],
  );
  useFrame(() => {
    const t = world.time;
    g.current.position.set(spot[0] + Math.sin(t * 0.4) * 0.05, spot[1] + Math.sin(t * 0.6) * 0.06, spot[2]);
    g.current.rotation.z = Math.sin(t * 0.8) * 0.12;
  });
  const onClick = (e) => {
    e.stopPropagation();
    sfx('chime');
    findHidden('seadragon', g.current.position.clone());
  };
  return (
    <group ref={g} rotation={[0, Math.PI / 2.4, 0]}>
      <mesh geometry={kit.sphere} material={kit.dragon} scale={[0.03, 0.04, 0.22]} />
      <mesh geometry={kit.stalk} material={kit.dragon} position={[0, 0.02, 0.27]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.14, 1]} />
      <mesh geometry={kit.sphere} material={kit.eye} position={[0.022, 0.03, 0.17]} scale={0.008} />
      {leaves.map((l, i) => (
        <mesh key={i} geometry={kit.leaf} material={kit.dragonLeaf} position={[l.side * 0.045, l.y + 0.02, l.z]} rotation={[0.3, l.side * 0.4, l.side * l.tilt]} />
      ))}
      <mesh geometry={kit.sphere} material={kit.hidden} scale={[0.18, 0.18, 0.32]} onClick={onClick} {...hover} />
    </group>
  );
}

// A pygmy seahorse: tiny, purple and bumpy, exactly like the sea fan it clings to.
function PygmySeahorse({ kit, spot }) {
  const g = useRef();
  const hover = useHover();
  useFrame(() => {
    g.current.rotation.z = Math.sin(world.time * 1.2) * 0.08;
  });
  const onClick = (e) => {
    e.stopPropagation();
    sfx('chime');
    findHidden('pygmySeahorse', g.current.position.clone());
  };
  return (
    <group ref={g} position={[spot[0], spot[1], spot[2]]} rotation={[0, spot[3], 0]}>
      <mesh geometry={kit.sphere} material={kit.pygmy} scale={[0.025, 0.04, 0.02]} />
      <mesh geometry={kit.sphere} material={kit.pygmy} position={[0.012, 0.045, 0]} scale={[0.02, 0.016, 0.016]} />
      <mesh geometry={kit.sphere} material={kit.pygmy} position={[-0.012, -0.045, 0]} scale={[0.01, 0.025, 0.01]} />
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} geometry={kit.sphere} material={kit.pygmyBump} position={[0.012 * (i % 2 ? 1 : -1), -0.02 + i * 0.015, 0.016]} scale={0.006} />
      ))}
      <mesh geometry={kit.sphere} material={kit.eye} position={[0.02, 0.05, 0.012]} scale={0.004} />
      {/* generous tap area: it is tiny */}
      <mesh geometry={kit.sphere} material={kit.hidden} scale={0.14} onClick={onClick} {...hover} />
    </group>
  );
}

// The day's two hidden friends. After a few minutes unfound, a faint sparkle helps a little.
export default function HiddenFriends() {
  const kit = useMemo(makeKit, []);
  useEffect(
    () => () => {
      kit.glow.map.dispose();
      Object.values(kit).forEach((x) => x.dispose());
    },
    [kit],
  );
  // Re-pick at midnight: the store re-renders every second, so a new day shows up by itself.
  const day = new Date().toDateString();
  const spots = useMemo(spotsForToday, [day]);
  useStore((s) => s.stats.hidden); // re-render when one is found
  const found = hiddenFound();
  const hint = useRef();
  const started = useRef(null);
  useFrame(() => {
    if (started.current === null) started.current = world.time;
    const waited = world.time - started.current;
    const target = !found.seadragon ? spots.dragon : !found.pygmySeahorse ? spots.pygmy : null;
    hint.current.visible = !!target && waited > HINT_AFTER;
    if (target && hint.current.visible) {
      hint.current.position.set(target[0], target[1] + 0.05, target[2] + 0.1);
      kit.glow.opacity = 0.25 + Math.max(0, Math.sin(world.time * 2.5)) * 0.5;
    }
  });
  return (
    <group>
      <SeaDragon kit={kit} spot={spots.dragon} />
      <PygmySeahorse kit={kit} spot={spots.pygmy} />
      <sprite ref={hint} material={kit.glow} scale={0.45} visible={false} />
    </group>
  );
}
