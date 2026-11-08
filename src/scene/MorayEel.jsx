import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useCursor } from '@react-three/drei';
import { world } from '../sim/world';
import { showCreature, sfx } from '../state/store';
import { ROCKS, sandY } from './reefLayout';

// The moray lives in a cave on the front face of the big boulder at the back middle, where nothing
// stands in front of it (and phones can see it too).
const ROCK = ROCKS[3];
export const MORAY_DEN = {
  x: ROCK[0] - 0.25,
  y: sandY(ROCK[0], ROCK[1]) + ROCK[2] * 0.4,
  z: ROCK[1] + ROCK[2] * 1.02,
};
const NECK = 5;

// A green moray eel peeking out of its rock cave, breathing with its mouth open and shut. Tapped,
// it slides back inside for a moment. `world.morayClean` (set by the cleaner shrimp) makes it
// open wide for a cleaning.
export default function MorayEel({ calm }) {
  const kit = useMemo(
    () => ({
      seg: new THREE.SphereGeometry(1, 16, 12),
      small: new THREE.SphereGeometry(1, 8, 6),
      cave: new THREE.CircleGeometry(1, 20),
      skin: new THREE.MeshStandardMaterial({ color: '#4f7f36', roughness: 0.5 }),
      spot: new THREE.MeshStandardMaterial({ color: '#c8d84a', roughness: 0.5 }),
      mouth: new THREE.MeshStandardMaterial({ color: '#7a2b2b', roughness: 0.6 }),
      white: new THREE.MeshStandardMaterial({ color: '#fff9d6', roughness: 0.25 }),
      shrimp: new THREE.MeshStandardMaterial({ color: '#ff4f4f', roughness: 0.45 }),
      shrimpStripe: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.4 }),
      pupil: new THREE.MeshBasicMaterial({ color: '#1d1b33' }),
      dark: new THREE.MeshBasicMaterial({ color: '#141a14' }),
      hidden: new THREE.MeshBasicMaterial({ visible: false }),
    }),
    [],
  );
  useEffect(() => () => Object.values(kit).forEach((x) => x.dispose()), [kit]);

  const slide = useRef();
  const segs = useRef([]);
  const jaw = useRef();
  const helper = useRef();
  const s = useRef({ out: 0.8, hide: 0, nextClean: 35 });
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const c = s.current;
    const t = world.time;
    c.hide = Math.max(0, c.hide - dt);
    // Peek further out now and then; back inside when tapped.
    const target = c.hide > 0 ? 0 : 0.65 + Math.max(0, Math.sin(t * 0.17)) * 0.35;
    c.out += (target - c.out) * (1 - Math.exp(-dt * (c.hide > 0 ? 10 : 0.8)));
    slide.current.position.z = -0.9 + c.out * 0.9;
    segs.current.forEach((g, i) => {
      if (g) g.rotation.y = Math.sin(t * (calm ? 0.6 : 1) - i * 0.6) * 0.12 * (i / NECK);
    });
    // Now and then its own little cleaner shrimp climbs in to clean its teeth.
    c.nextClean -= dt;
    if (c.nextClean <= 0 && c.hide <= 0) {
      c.nextClean = 45 + Math.random() * 40;
      world.morayClean = t + 6;
      world.partnerEvents.push('moray');
    }
    // Morays breathe by opening and closing their mouths; wide open while being cleaned.
    const cleaning = world.morayClean > t && c.hide <= 0;
    helper.current.visible = cleaning;
    if (cleaning) {
      const k = Math.min(1, (6 - (world.morayClean - t)) / 1.2);
      helper.current.position.set(0.12 - k * 0.1, -0.06 + k * 0.02, 0.35 + k * 0.25);
      helper.current.rotation.y = Math.sin(t * 8) * 0.3;
    }
    jaw.current.rotation.x = cleaning ? 0.65 : 0.12 + Math.max(0, Math.sin(t * 1.6)) * 0.28;
  });

  const onClick = (e) => {
    e.stopPropagation();
    s.current.hide = 2.5;
    sfx('plop');
    showCreature('morayEel');
  };

  // Neck segments nested so the head can sway; the head is the last link, pointing out of the cave.
  let node = (
    <group position={[0, 0, 0.1]}>
      <mesh geometry={kit.seg} material={kit.skin} position={[0, 0.02, 0.08]} scale={[0.08, 0.075, 0.13]} />
      <group ref={jaw} position={[0, -0.025, 0.0]}>
        <mesh geometry={kit.seg} material={kit.skin} position={[0, -0.01, 0.1]} scale={[0.07, 0.03, 0.11]} />
        <mesh geometry={kit.seg} material={kit.mouth} position={[0, 0.01, 0.1]} scale={[0.055, 0.015, 0.09]} />
      </group>
      {[1, -1].map((side) => (
        <group key={side} position={[side * 0.05, 0.07, 0.12]}>
          <mesh geometry={kit.small} material={kit.white} scale={0.026} />
          <mesh geometry={kit.small} material={kit.pupil} position={[0, 0.005, 0.018]} scale={0.013} />
        </group>
      ))}
    </group>
  );
  for (let i = NECK - 1; i >= 0; i--) {
    node = (
      <group key={i} ref={(el) => (segs.current[i] = el)} position={[0, 0, i === 0 ? 0 : 0.1]}>
        <mesh geometry={kit.seg} material={kit.skin} scale={[0.075, 0.075, 0.08]} />
        {i % 2 === 1 && <mesh geometry={kit.small} material={kit.spot} position={[0.04, 0.05, 0]} scale={0.014} />}
        {node}
      </group>
    );
  }

  return (
    <group position={[MORAY_DEN.x, MORAY_DEN.y, MORAY_DEN.z]}>
      <mesh geometry={kit.cave} material={kit.dark} position={[0, 0, -0.02]} scale={[0.17, 0.14, 1]} />
      <group ref={slide}>{node}</group>
      {/* the moray's own little cleaner shrimp */}
      <group ref={helper} visible={false} scale={0.5}>
        <mesh geometry={kit.seg} material={kit.shrimp} scale={[0.05, 0.05, 0.11]} />
        <mesh geometry={kit.seg} material={kit.shrimpStripe} position={[0, 0.03, 0]} scale={[0.012, 0.02, 0.1]} />
      </group>
      <mesh
        geometry={kit.seg}
        material={kit.hidden}
        position={[0, 0, 0.3]}
        scale={[0.25, 0.22, 0.4]}
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      />
    </group>
  );
}
