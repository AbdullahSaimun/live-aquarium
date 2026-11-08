import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useCursor } from '@react-three/drei';
import { world } from '../sim/world';
import { showCreature, sfx } from '../state/store';
import { sandY } from './reefLayout';

// Three tiny neon sea slugs on the sand, each slowly crawling back and forth along a short path.
const SLUGS = [
  { kind: 'chromodoris', x: 1.1, z: 0.95, turn: 0.3 },
  { kind: 'flabellina', x: -2.2, z: 1.0, turn: 2.6 },
  { kind: 'dancer', x: 5.4, z: -0.6, turn: 1.4 },
];

function makeKit() {
  const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.35, ...extra });
  return {
    sphere: new THREE.SphereGeometry(1, 16, 10),
    cap: new THREE.CapsuleGeometry(1, 1, 4, 8),
    blue: std('#2f5bff', { emissive: '#1d3bff', emissiveIntensity: 0.15 }),
    yellow: std('#ffd23f'),
    white: std('#ffffff'),
    orange: std('#ff8a1f', { emissive: '#ff6a00', emissiveIntensity: 0.15 }),
    purple: std('#b46cff', { emissive: '#7b2bff', emissiveIntensity: 0.12 }),
    red: std('#e8243b', { emissive: '#b3001b', emissiveIntensity: 0.12 }),
    pupil: new THREE.MeshBasicMaterial({ color: '#1d1b33' }),
    hidden: new THREE.MeshBasicMaterial({ visible: false }),
  };
}

function Chromodoris({ kit }) {
  // Blue with a yellow rim, orange horns and a frilly orange gill tuft on its back.
  return (
    <>
      <mesh geometry={kit.sphere} material={kit.yellow} scale={[0.07, 0.03, 0.15]} position={[0, 0.02, 0]} />
      <mesh geometry={kit.sphere} material={kit.blue} scale={[0.062, 0.042, 0.14]} position={[0, 0.03, 0]} />
      <mesh geometry={kit.sphere} material={kit.white} scale={[0.012, 0.008, 0.09]} position={[0, 0.07, 0]} />
      {[1, -1].map((s) => (
        <mesh key={s} geometry={kit.cap} material={kit.orange} scale={[0.01, 0.02, 0.01]} position={[s * 0.025, 0.08, 0.1]} rotation={[0.3, 0, 0]} />
      ))}
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} geometry={kit.cap} material={kit.orange} scale={[0.008, 0.02, 0.008]} position={[Math.cos(i * 1.26) * 0.02, 0.08, -0.1 + Math.sin(i * 1.26) * 0.02]} rotation={[Math.cos(i * 1.26) * 0.6, 0, Math.sin(i * 1.26) * 0.6]} />
      ))}
    </>
  );
}

function Flabellina({ kit, cerata }) {
  // Purple and slim, covered in orange-tipped "fingers" (cerata) that wave gently.
  return (
    <>
      <mesh geometry={kit.sphere} material={kit.purple} scale={[0.045, 0.035, 0.16]} position={[0, 0.03, 0]} />
      {[1, -1].map((s) => (
        <mesh key={s} geometry={kit.cap} material={kit.purple} scale={[0.008, 0.03, 0.008]} position={[s * 0.02, 0.07, 0.12]} rotation={[0.4, 0, s * 0.3]} />
      ))}
      {Array.from({ length: 12 }, (_, i) => {
        const side = i % 2 ? 1 : -1;
        const z = 0.08 - Math.floor(i / 2) * 0.03;
        return (
          <group key={i} ref={(el) => (cerata.current[i] = el)} position={[side * 0.025, 0.05, z]} rotation={[0, 0, side * 0.5]}>
            <mesh geometry={kit.cap} material={kit.purple} scale={[0.009, 0.022, 0.009]} position={[0, 0.025, 0]} />
            <mesh geometry={kit.sphere} material={kit.orange} scale={0.011} position={[0, 0.052, 0]} />
          </group>
        );
      })}
    </>
  );
}

function Dancer({ kit }) {
  // The red "Spanish dancer": a wide body with a white-edged frilly skirt.
  return (
    <>
      <mesh geometry={kit.sphere} material={kit.white} scale={[0.1, 0.02, 0.17]} position={[0, 0.015, 0]} />
      <mesh geometry={kit.sphere} material={kit.red} scale={[0.092, 0.032, 0.16]} position={[0, 0.025, 0]} />
      <mesh geometry={kit.sphere} material={kit.red} scale={[0.04, 0.03, 0.12]} position={[0, 0.045, 0]} />
      {[1, -1].map((s) => (
        <mesh key={s} geometry={kit.cap} material={kit.red} scale={[0.009, 0.02, 0.009]} position={[s * 0.02, 0.075, 0.11]} rotation={[0.3, 0, 0]} />
      ))}
    </>
  );
}

function Slug({ kit, def, index }) {
  const root = useRef();
  const body = useRef();
  const cerata = useRef([]);
  const wiggle = useRef(0);
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const t = world.time + index * 20;
    wiggle.current = Math.max(0, wiggle.current - dt);
    // Back and forth along a short path, about one slow lap a minute.
    const along = Math.sin(t * 0.05) * 0.25;
    const x = def.x + Math.sin(def.turn) * along;
    const z = def.z + Math.cos(def.turn) * along;
    root.current.position.set(x, sandY(x, z), z);
    root.current.rotation.y = def.turn + (Math.cos(t * 0.05) < 0 ? Math.PI : 0);
    const w = wiggle.current > 0 ? Math.sin(wiggle.current * 25) * 0.25 * wiggle.current : 0;
    body.current.rotation.z = w;
    body.current.scale.set(1, 1 + Math.sin(t * 1.5) * 0.04, 1 - Math.sin(t * 1.5) * 0.03);
    cerata.current.forEach((c, i) => c && (c.rotation.x = Math.sin(t * 2 + i) * 0.2));
  });
  const onClick = (e) => {
    e.stopPropagation();
    wiggle.current = 1;
    sfx('squeak');
    showCreature('nudibranch');
  };
  return (
    <group ref={root}>
      <group ref={body} scale={1.6}>
        {def.kind === 'chromodoris' && <Chromodoris kit={kit} />}
        {def.kind === 'flabellina' && <Flabellina kit={kit} cerata={cerata} />}
        {def.kind === 'dancer' && <Dancer kit={kit} />}
      </group>
      <mesh
        geometry={kit.sphere}
        material={kit.hidden}
        position={[0, 0.08, 0]}
        scale={[0.25, 0.18, 0.35]}
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      />
    </group>
  );
}

export default function Nudibranchs() {
  const kit = useMemo(makeKit, []);
  useEffect(() => () => Object.values(kit).forEach((x) => x.dispose()), [kit]);
  return SLUGS.map((def, i) => <Slug key={def.kind} kit={kit} def={def} index={i} />);
}
