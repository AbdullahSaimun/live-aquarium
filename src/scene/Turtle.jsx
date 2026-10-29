import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useCursor } from '@react-three/drei';
import { world, queueEffect } from '../sim/world';
import { critterFact, sfx } from '../state/store';

const SPIN_TIME = 1.4;
const BACK_Z = -3.4; // glides behind the fish

function makeKit() {
  const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra });
  return {
    sphere: new THREE.SphereGeometry(1, 22, 14),
    small: new THREE.SphereGeometry(1, 12, 10),
    smile: new THREE.TorusGeometry(0.07, 0.015, 5, 12, Math.PI),
    shell: std('#3f9a6a'),
    plate: std('#74cf93'),
    belly: std('#f2dd9a'),
    skin: std('#8fd6a0'),
    white: std('#ffffff', { roughness: 0.25 }),
    pupil: new THREE.MeshBasicMaterial({ color: '#1d1b33' }),
    mouth: std('#2f5a3c'),
    hidden: new THREE.MeshBasicMaterial({ visible: false }),
  };
}

const PLATES = [
  [0, 0.27, 0, 0.26, 0.08, 0.28],
  [0.32, 0.2, 0.22, 0.17, 0.07, 0.18],
  [-0.32, 0.2, 0.22, 0.17, 0.07, 0.18],
  [0.32, 0.2, -0.26, 0.17, 0.07, 0.18],
  [-0.32, 0.2, -0.26, 0.17, 0.07, 0.18],
  [0, 0.22, 0.5, 0.16, 0.06, 0.14],
  [0, 0.22, -0.52, 0.16, 0.06, 0.14],
];

// A gentle sea turtle that glides slowly around the back of the tank. Tap it for a twirl and a fact.
export default function Turtle() {
  const kit = useMemo(makeKit, []);
  const root = useRef();
  const pose = useRef();
  const head = useRef();
  const flippers = useRef([]);
  const angle = useRef(Math.random() * Math.PI * 2);
  const spin = useRef(0);
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);
  useEffect(() => () => Object.values(kit).forEach((x) => x.dispose()), [kit]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const t = world.time;
    const a = (angle.current += dt * 0.07);
    const w = Math.max(1.2, world.bounds.maxX * 0.9);
    root.current.position.set(Math.cos(a) * w, 0.4 + Math.sin(a * 2) * 0.9, BACK_Z + Math.sin(a) * 0.5);
    // Face along the path: the derivative of the loop above.
    const yaw = Math.atan2(-Math.sin(a) * w, Math.cos(a) * 0.5);
    spin.current = Math.max(0, spin.current - dt);
    const k = 1 - spin.current / SPIN_TIME;
    const roll = spin.current > 0 ? (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2) * Math.PI * 2 : 0;
    pose.current.rotation.set(-Math.cos(a * 2) * 0.25, yaw, roll + Math.sin(t * 0.8) * 0.08, 'YXZ');

    const stroke = Math.sin(t * 1.6);
    flippers.current.forEach((f, i) => {
      if (!f) return;
      const side = i % 2 ? -1 : 1;
      const front = i < 2;
      f.rotation.z = side * (front ? 0.15 + stroke * 0.55 : 0.1 - stroke * 0.25);
      f.rotation.y = side * (front ? 0.5 + stroke * 0.2 : -0.4);
    });
    head.current.rotation.x = Math.sin(t * 0.9) * 0.12;
  });

  const onClick = (e) => {
    e.stopPropagation();
    if (spin.current <= 0) spin.current = SPIN_TIME;
    queueEffect('bubbles', root.current.position, 8);
    sfx('bubbles');
    critterFact('turtle');
  };

  const flipper = (i, at, scale, offset) => (
    <group key={i} ref={(el) => (flippers.current[i] = el)} position={at}>
      <mesh geometry={kit.small} material={kit.skin} position={offset} scale={scale} />
    </group>
  );

  return (
    <group ref={root}>
      <group ref={pose} scale={0.95}>
        <mesh geometry={kit.sphere} material={kit.shell} scale={[0.7, 0.3, 0.85]} />
        {PLATES.map(([x, y, z, sx, sy, sz], i) => (
          <mesh key={i} geometry={kit.small} material={kit.plate} position={[x, y, z]} scale={[sx, sy, sz]} />
        ))}
        <mesh geometry={kit.sphere} material={kit.belly} position={[0, -0.09, 0]} scale={[0.66, 0.17, 0.8]} />
        {flipper(0, [0.5, -0.06, 0.35], [0.5, 0.05, 0.17], [0.42, 0, -0.08])}
        {flipper(1, [-0.5, -0.06, 0.35], [0.5, 0.05, 0.17], [-0.42, 0, -0.08])}
        {flipper(2, [0.38, -0.06, -0.6], [0.22, 0.04, 0.12], [0.16, 0, -0.06])}
        {flipper(3, [-0.38, -0.06, -0.6], [0.22, 0.04, 0.12], [-0.16, 0, -0.06])}
        <group ref={head} position={[0, 0.03, 0.88]}>
          <mesh geometry={kit.sphere} material={kit.skin} scale={[0.24, 0.21, 0.27]} position={[0, 0, 0.12]} />
          {[1, -1].map((side) => (
            <group key={side} position={[side * 0.13, 0.08, 0.3]}>
              <mesh geometry={kit.small} material={kit.white} scale={0.065} />
              <mesh geometry={kit.small} material={kit.pupil} position={[side * 0.01, 0, 0.045]} scale={0.035} />
            </group>
          ))}
          <mesh geometry={kit.smile} material={kit.mouth} position={[0, -0.04, 0.37]} rotation={[0, 0, Math.PI]} />
        </group>
        <mesh
          geometry={kit.sphere}
          material={kit.hidden}
          scale={[1.2, 0.7, 1.4]}
          onClick={onClick}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        />
      </group>
    </group>
  );
}
