import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useCursor } from '@react-three/drei';
import { world, queueEffect } from '../sim/world';
import { showCreature, sfx } from '../state/store';

const HOME = { x: 2.2, z: -2.45 }; // beside the short kelp in Plants.jsx
const HOP_TIME = 1.1;

// Spine from the neck down to where the tail curls: [x, y, radius].
const SPINE = [
  [0.0, 0.36, 0.12],
  [0.04, 0.22, 0.135],
  [0.03, 0.07, 0.13],
  [-0.02, -0.07, 0.11],
  [-0.05, -0.19, 0.088],
  [-0.04, -0.29, 0.068],
  [0.0, -0.36, 0.052],
];

function makeKit() {
  const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.5, ...extra });
  return {
    sphere: new THREE.SphereGeometry(1, 16, 12),
    snout: new THREE.CapsuleGeometry(0.035, 0.14, 3, 8),
    curl: new THREE.TorusGeometry(0.075, 0.03, 6, 14, Math.PI * 1.6),
    crown: new THREE.ConeGeometry(0.05, 0.1, 5),
    fin: new THREE.CircleGeometry(0.11, 10, 0, Math.PI),
    skin: std('#ffb84d'),
    plate: std('#ffd98a'),
    finMat: std('#ffe7b3', { transparent: true, opacity: 0.8, side: THREE.DoubleSide }),
    white: std('#ffffff', { roughness: 0.25 }),
    pupil: new THREE.MeshBasicMaterial({ color: '#1d1b33' }),
    hidden: new THREE.MeshBasicMaterial({ visible: false }),
  };
}

// A little seahorse holding on near the kelp with its curly tail, bobbing and turning to look around.
export default function Seahorse({ calm }) {
  const kit = useMemo(makeKit, []);
  const root = useRef();
  const pose = useRef();
  const fin = useRef();
  const hop = useRef(0);
  const turn = useRef(0);
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);
  useEffect(() => () => Object.values(kit).forEach((x) => x.dispose()), [kit]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const t = world.time;
    const b = world.bounds;
    hop.current = Math.max(0, hop.current - dt);
    const k = 1 - hop.current / HOP_TIME;
    const x = THREE.MathUtils.clamp(HOME.x, b.minX + 0.5, b.maxX - 0.4) + 0.35;
    const hopY = hop.current > 0 ? Math.sin(k * Math.PI) * 0.6 : 0;
    root.current.position.set(x, world.floorY + 1.15 + Math.sin(t * 0.9) * (calm ? 0.04 : 0.1) + hopY, HOME.z);
    // Mostly side-on so its shape reads clearly, turning now and then to peek at the viewer.
    const look = Math.sin(t * 0.25) > 0.6 ? -0.9 : 0;
    const spin = hop.current > 0 ? k * Math.PI * 2 : 0;
    turn.current += (look - turn.current) * (1 - Math.exp(-dt * 2));
    pose.current.rotation.y = turn.current + spin;
    pose.current.rotation.z = Math.sin(t * 0.8) * 0.06;
    fin.current.rotation.y = Math.sin(t * 18) * 0.5;
  });

  const onClick = (e) => {
    e.stopPropagation();
    if (hop.current <= 0) hop.current = HOP_TIME;
    queueEffect('hearts', root.current.position, 2);
    sfx('squeak');
    showCreature('seahorse');
  };

  return (
    <group ref={root}>
      <group ref={pose} scale={1.25}>
        {/* body drawn side-on, snout towards +x */}
        <group>
          {SPINE.map(([x, y, r], i) => (
            <mesh key={i} geometry={kit.sphere} material={i % 2 ? kit.plate : kit.skin} position={[x, y, 0]} scale={[r, r * 0.9, r * 0.8]} />
          ))}
          <mesh geometry={kit.curl} material={kit.skin} position={[0.07, -0.38, 0]} rotation={[0, 0, Math.PI * 0.9]} />
          {/* head, snout and crown */}
          <mesh geometry={kit.sphere} material={kit.skin} position={[0.04, 0.5, 0]} scale={[0.12, 0.1, 0.09]} />
          <mesh geometry={kit.snout} material={kit.skin} position={[0.18, 0.46, 0]} rotation={[0, 0, Math.PI / 2 + 0.25]} />
          <mesh geometry={kit.crown} material={kit.plate} position={[0.0, 0.62, 0]} />
          {[1, -1].map((side) => (
            <group key={side} position={[0.08, 0.53, side * 0.075]}>
              <mesh geometry={kit.sphere} material={kit.white} scale={0.04} />
              <mesh geometry={kit.sphere} material={kit.pupil} position={[0.012, 0, side * 0.025]} scale={0.022} />
            </group>
          ))}
          <group ref={fin} position={[-0.11, 0.06, 0]}>
            <mesh geometry={kit.fin} material={kit.finMat} rotation={[0, Math.PI / 2, Math.PI / 2]} />
          </group>
        </group>
        <mesh
          geometry={kit.sphere}
          material={kit.hidden}
          scale={[0.35, 0.6, 0.35]}
          onClick={onClick}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        />
      </group>
    </group>
  );
}
