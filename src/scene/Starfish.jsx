import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useCursor } from '@react-three/drei';
import { world, queueEffect } from '../sim/world';
import { critterFact, sfx } from '../state/store';

const FLOOR = world.floorY;
const HOP_TIME = 1;

const STARS = [
  { x: 1.8, z: 1.6, rot: 0.4, color: '#ff7a59', scale: 0.32 },
  { x: -5.2, z: 1.8, rot: 1.2, color: '#ffc94d', scale: 0.26 },
  { x: -1.2, z: 2.2, rot: 2.1, color: '#c77dff', scale: 0.24 },
];

function makeKit() {
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
    star: starGeo,
    small: new THREE.SphereGeometry(1, 10, 8),
    smile: new THREE.TorusGeometry(0.16, 0.035, 5, 12, Math.PI),
    hit: new THREE.CylinderGeometry(1.1, 1.1, 0.6, 12),
    white: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.25 }),
    pupil: new THREE.MeshBasicMaterial({ color: '#1d1b33' }),
    mouth: new THREE.MeshStandardMaterial({ color: '#7a2a3a' }),
    hidden: new THREE.MeshBasicMaterial({ visible: false }),
  };
}

// One smiling starfish on the sand: tap it and it hops and spins.
function Star({ kit, def }) {
  const group = useRef();
  const pose = useRef();
  const hop = useRef(0);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.6 }), [def.color]);
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);
  useEffect(() => () => mat.dispose(), [mat]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    hop.current = Math.max(0, hop.current - dt);
    const k = 1 - hop.current / HOP_TIME;
    const b = world.bounds;
    // Stay on screen when portrait phones narrow the tank.
    group.current.position.x = THREE.MathUtils.clamp(def.x, b.minX + 0.4, b.maxX - 0.4);
    pose.current.position.y = hop.current > 0 ? Math.sin(k * Math.PI) * 0.9 : 0;
    pose.current.rotation.y = def.rot + (hop.current > 0 ? k * Math.PI * 2 : 0);
    const breathe = 1 + Math.sin(world.time * 1.3 + def.rot * 3) * 0.03;
    pose.current.scale.set(def.scale * breathe, def.scale, def.scale * breathe);
  });

  const onClick = (e) => {
    e.stopPropagation();
    if (hop.current <= 0) hop.current = HOP_TIME;
    queueEffect('hearts', group.current.position.clone().setY(FLOOR + 0.6), 2);
    sfx('squeak');
    critterFact('starfish');
  };

  return (
    <group ref={group} position={[def.x, FLOOR + 0.02, def.z]}>
      <group ref={pose}>
        <mesh geometry={kit.star} material={mat} />
        {/* a little face on top, looking at the viewer */}
        <group position={[0, 0.24, 0]} rotation={[-0.3, -def.rot, 0]}>
          {[1, -1].map((side) => (
            <group key={side} position={[side * 0.17, 0.05, 0.05]}>
              <mesh geometry={kit.small} material={kit.white} scale={0.12} />
              <mesh geometry={kit.small} material={kit.pupil} position={[0, 0, 0.08]} scale={0.065} />
            </group>
          ))}
          <mesh geometry={kit.smile} material={kit.mouth} position={[0, -0.14, 0.1]} rotation={[0, 0, Math.PI]} />
        </group>
        <mesh
          geometry={kit.hit}
          material={kit.hidden}
          onClick={onClick}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        />
      </group>
    </group>
  );
}

export default function Starfish() {
  const kit = useMemo(makeKit, []);
  useEffect(() => () => Object.values(kit).forEach((x) => x.dispose()), [kit]);
  return STARS.map((def) => <Star key={def.x} kit={kit} def={def} />);
}
