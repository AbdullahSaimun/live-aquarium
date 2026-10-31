import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useCursor } from '@react-three/drei';
import { world, queueEffect } from '../sim/world';
import { showCreature, sfx } from '../state/store';

const Z = -3.7; // behind the fish
const TENTACLES = 7;
const SQUISH_TIME = 0.9;

// Two jellies drifting in the upper back corners: one pink, one lilac.
const JELLIES = [
  { side: -1, color: '#ff9ccf', glow: '#ff6fb7', phase: 0, scale: 0.55 },
  { side: 1, color: '#b9a6ff', glow: '#8f7dff', phase: 2.3, scale: 0.45 },
];

function makeKit() {
  // Bell: the top half of a sphere, open underneath.
  const bell = new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  const tentacle = new THREE.CylinderGeometry(0.012, 0.004, 1, 4, 6);
  tentacle.translate(0, -0.5, 0);
  const arm = new THREE.CapsuleGeometry(0.05, 0.6, 3, 6);
  arm.translate(0, -0.35, 0);
  return {
    bell,
    tentacle,
    arm,
    small: new THREE.SphereGeometry(1, 10, 8),
    pupil: new THREE.MeshBasicMaterial({ color: '#1d1b33' }),
    hidden: new THREE.MeshBasicMaterial({ visible: false }),
  };
}

function Jelly({ kit, def, calm }) {
  const root = useRef();
  const bell = useRef();
  const strands = useRef([]);
  const squish = useRef(0);
  const mats = useMemo(
    () => ({
      bell: new THREE.MeshStandardMaterial({
        color: def.color,
        emissive: def.glow,
        transparent: true,
        opacity: 0.62,
        roughness: 0.2,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
      strand: new THREE.MeshStandardMaterial({ color: def.color, emissive: def.glow, transparent: true, opacity: 0.5, depthWrite: false }),
    }),
    [def],
  );
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const t = world.time + def.phase;
    const b = world.bounds;
    squish.current = Math.max(0, squish.current - dt);
    // Pulse: a quick squeeze pushes it up, then it drifts gently down again.
    const beat = (t * 0.55) % 1;
    const squeeze = Math.max(0, Math.sin(beat * Math.PI * 2)) ** 2;
    const tap = squish.current > 0 ? Math.sin((1 - squish.current / SQUISH_TIME) * Math.PI * 3) * 0.25 : 0;
    const x = def.side * Math.max(1.1, b.maxX - 1.2) + Math.sin(t * 0.13) * (calm ? 0.2 : 0.6);
    const y = 1.1 + Math.sin(t * 0.21) * 0.7 + (calm ? 0 : Math.sin(beat * Math.PI) * 0.12);
    root.current.position.set(x, y, Z);
    root.current.rotation.z = Math.sin(t * 0.3) * 0.12;
    bell.current.scale.set(1 - squeeze * 0.14 + tap, 0.75 + squeeze * 0.18 - tap, 1 - squeeze * 0.14 + tap);
    strands.current.forEach((s, i) => {
      if (!s) return;
      s.rotation.x = Math.sin(t * 1.3 + i) * 0.18;
      s.rotation.z = Math.sin(t * 1.1 + i * 1.7) * 0.2;
    });
    // Glow brighter as the tank gets darker.
    const glow = 0.12 + (1 - world.light) * 0.9;
    mats.bell.emissiveIntensity = glow;
    mats.strand.emissiveIntensity = glow;
  });

  const onClick = (e) => {
    e.stopPropagation();
    squish.current = SQUISH_TIME;
    queueEffect('bubbles', root.current.position, 6);
    sfx('bubbles');
    showCreature('jellyfish');
  };

  return (
    <group ref={root} scale={def.scale}>
      <group ref={bell}>
        <mesh geometry={kit.bell} material={mats.bell} />
        {[1, -1].map((side) => (
          <mesh key={side} geometry={kit.small} material={kit.pupil} position={[side * 0.3, 0.45, 0.82]} scale={0.07} />
        ))}
      </group>
      {Array.from({ length: TENTACLES }, (_, i) => {
        const a = (i / TENTACLES) * Math.PI * 2;
        return (
          <group key={i} ref={(el) => (strands.current[i] = el)} position={[Math.cos(a) * 0.8, 0, Math.sin(a) * 0.8]}>
            <mesh geometry={kit.tentacle} material={mats.strand} scale={[1, 1.6 + (i % 3) * 0.4, 1]} />
          </group>
        );
      })}
      {[0, 1, 2].map((i) => (
        <group key={`arm${i}`} ref={(el) => (strands.current[TENTACLES + i] = el)} position={[(i - 1) * 0.18, 0, 0]}>
          <mesh geometry={kit.arm} material={mats.bell} />
        </group>
      ))}
      <mesh
        geometry={kit.small}
        material={kit.hidden}
        scale={[1.2, 1.4, 1.2]}
        position={[0, -0.3, 0]}
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      />
    </group>
  );
}

export default function Jellyfish({ calm }) {
  const kit = useMemo(makeKit, []);
  useEffect(() => () => Object.values(kit).forEach((x) => x.dispose()), [kit]);
  return JELLIES.map((def) => <Jelly key={def.side} kit={kit} def={def} calm={calm} />);
}
