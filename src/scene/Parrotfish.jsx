import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useCursor } from '@react-three/drei';
import { world } from '../sim/world';
import { showCreature, sfx } from '../state/store';
import { addSheen } from './underwater';
import { tmpObj } from './reefLayout';

const FLOOR = world.floorY;
// Coral heads it bites (Coral.jsx), and where it sleeps at night: beside the brain coral, out of the way.
const BITE_SPOTS = [
  [-1.6, -2.6, 0.55],
  [2.2, -2.6, 0.6],
  [0.6, -3.4, 0.5],
  [-5, -3.2, 0.55],
  [5.6, -2.8, 0.7],
  [-6.2, -2.2, 0.7],
];
const BED = new THREE.Vector3(-1.0, FLOOR + 0.75, -2.05);
const SAND = 14;
const rand = (a, b) => a + Math.random() * (b - a);

function makeKit() {
  return {
    sphere: new THREE.SphereGeometry(1, 20, 14),
    cone: new THREE.ConeGeometry(1, 1, 10),
    body: addSheen(new THREE.MeshStandardMaterial({ color: '#2ec4b6', roughness: 0.4 }), 0.25, 'fish-body'),
    patch: new THREE.MeshStandardMaterial({ color: '#ff8fb3', roughness: 0.5 }),
    scale: new THREE.MeshStandardMaterial({ color: '#1f9e95', roughness: 0.5 }),
    beak: new THREE.MeshStandardMaterial({ color: '#f3f1e4', roughness: 0.3 }),
    fin: addSheen(new THREE.MeshStandardMaterial({ color: '#7be0ff', roughness: 0.5, transparent: true, opacity: 0.85, side: THREE.DoubleSide }), 0.3, 'fish-fin', true),
    eye: new THREE.MeshStandardMaterial({ color: '#ffe15c', roughness: 0.3 }),
    pupil: new THREE.MeshBasicMaterial({ color: '#13131f' }),
    // The see-through sleeping bubble: almost invisible, with a soft glowing rim.
    mucus: addSheen(
      new THREE.MeshStandardMaterial({ color: '#e6fbff', roughness: 0.05, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide }),
      0.9,
      'mucus',
      true,
    ),
    sand: new THREE.MeshStandardMaterial({ color: '#f3e3c3', roughness: 1, transparent: true, opacity: 0.85 }),
    hidden: new THREE.MeshBasicMaterial({ visible: false }),
  };
}

// A parrotfish: by day it crunches the coral with its beak (and the crunched coral comes out as fine
// white sand!). At night it parks by the reef and wraps itself in a see-through mucus bubble to sleep.
export default function Parrotfish() {
  const kit = useMemo(makeKit, []);
  useEffect(() => () => Object.values(kit).forEach((x) => x.dispose()), [kit]);
  const root = useRef();
  const body = useRef();
  const tail = useRef();
  const bubble = useRef();
  const sand = useRef();
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);
  const s = useRef({
    pos: new THREE.Vector3(3, FLOOR + 1, -1.5),
    vel: new THREE.Vector3(),
    target: new THREE.Vector3(3, FLOOR + 1, -1.5),
    yaw: 0,
    pitch: 0,
    phase: 0,
    mode: 'swim', // swim | bite | sleep
    timer: 2,
    bites: 0,
    cocoon: 0, // 0..1 how much of the sleeping bubble is built
    wiggle: 0,
    dart: 0,
  });
  const grains = useMemo(() => Array.from({ length: SAND }, () => ({ pos: new THREE.Vector3(), vel: new THREE.Vector3(), life: 0 })), []);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const c = s.current;
    const t = world.time;
    const night = world.light < 0.3;
    const b = world.bounds;
    c.timer -= dt;
    c.wiggle = Math.max(0, c.wiggle - dt);
    c.dart = Math.max(0, c.dart - dt);

    if (night && c.mode !== 'sleep') {
      c.mode = 'sleep';
      c.target.copy(BED);
    } else if (!night && c.mode === 'sleep') {
      c.mode = 'swim'; // morning: the bubble is left behind and fades
      c.timer = 0;
    }

    if (c.mode === 'swim' && c.timer <= 0) {
      const spots = BITE_SPOTS.filter(([x]) => x > b.minX - 1 && x < b.maxX + 1);
      const [x, z, h] = spots[Math.floor(Math.random() * spots.length)] || BITE_SPOTS[0];
      c.target.set(x + rand(-0.3, 0.3), FLOOR + h + 0.25, z + 0.55);
      c.timer = 12;
    }
    const d = c.pos.distanceTo(c.target);
    if (c.mode === 'swim' && d < 0.25) {
      c.mode = 'bite';
      c.bites = 3 + Math.floor(Math.random() * 3);
      c.timer = 0.6;
    }
    if (c.mode === 'bite' && c.timer <= 0) {
      // Crunch! A little puff of fine sand drifts down.
      c.bites--;
      c.timer = rand(0.7, 1.2);
      c.wiggle = 0.3;
      if (world.light > 0.3 && Math.random() < 0.5) sfx('chomp');
      for (let i = 0; i < 3; i++) {
        const g = grains.find((q) => q.life <= 0);
        if (!g) break;
        g.pos.copy(c.pos).add(tmpObj.position.set(-Math.sin(c.yaw) * 0.45, -0.05, -Math.cos(c.yaw) * 0.45));
        g.vel.set(rand(-0.15, 0.15), rand(-0.05, 0.08), rand(-0.15, 0.15));
        g.life = rand(1.5, 2.5);
      }
      if (c.bites <= 0) {
        c.mode = 'swim';
        c.timer = rand(2, 5);
        c.target.set(c.pos.x + rand(-2.5, 2.5), FLOOR + rand(0.9, 1.6), THREE.MathUtils.clamp(c.pos.z + rand(-0.8, 0.8), -3.4, 0));
      }
    }

    // Swim: slow, steady strokes; stand still while biting or sleeping.
    const still = c.mode === 'bite' || (c.mode === 'sleep' && d < 0.15);
    const want = tmpObj.position.subVectors(c.target, c.pos);
    const speed = c.dart > 0 ? 1.8 : c.mode === 'sleep' ? 0.4 : 0.7;
    if (still) want.set(0, Math.sin(t * 0.8) * 0.02, 0);
    else want.multiplyScalar(Math.min(1, d) * speed / Math.max(d, 1e-3));
    c.vel.lerp(want, 1 - Math.exp(-dt * 2));
    c.pos.addScaledVector(c.vel, dt);
    const flat = Math.hypot(c.vel.x, c.vel.z);
    if (flat > 0.05 && !still) c.yaw += Math.atan2(Math.sin(Math.atan2(c.vel.x, c.vel.z) - c.yaw), Math.cos(Math.atan2(c.vel.x, c.vel.z) - c.yaw)) * (1 - Math.exp(-dt * 3));
    const pitchGoal = c.mode === 'bite' ? 0.35 : THREE.MathUtils.clamp(-c.vel.y, -0.4, 0.4);
    c.pitch += (pitchGoal - c.pitch) * (1 - Math.exp(-dt * 3));
    c.phase += dt * (still ? 1.2 : 3 + flat * 6);

    root.current.position.copy(c.pos);
    root.current.rotation.set(c.pitch, c.yaw, Math.sin(c.phase * 8) * 0.2 * (c.wiggle > 0 ? 1 : 0), 'YXZ');
    tail.current.rotation.y = Math.sin(c.phase) * (still ? 0.08 : 0.4);
    body.current.rotation.y = -Math.sin(c.phase) * (still ? 0.01 : 0.05);

    // The night bubble grows slowly around the sleeping fish, and fades away in the morning.
    const building = c.mode === 'sleep' && d < 0.4;
    c.cocoon = THREE.MathUtils.clamp(c.cocoon + dt * (building ? 1 / 25 : -1 / 6), 0, 1);
    bubble.current.visible = c.cocoon > 0.01;
    bubble.current.scale.set(0.75 * c.cocoon + 0.05, 0.5 * c.cocoon + 0.05, 1.0 * c.cocoon + 0.05);
    kit.mucus.opacity = 0.16 * Math.min(1, c.cocoon * 1.5);

    // Sand puffs.
    const m = sand.current;
    grains.forEach((g, i) => {
      if (g.life > 0) {
        g.life -= dt;
        g.vel.y -= dt * 0.06;
        g.vel.multiplyScalar(1 - dt * 0.8);
        g.pos.addScaledVector(g.vel, dt);
      }
      tmpObj.position.copy(g.pos);
      tmpObj.scale.setScalar(g.life > 0 ? 0.035 * Math.min(1, g.life) : 0.0001);
      tmpObj.updateMatrix();
      m.setMatrixAt(i, tmpObj.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });

  const onClick = (e) => {
    e.stopPropagation();
    const c = s.current;
    c.wiggle = 0.8; // a sleepy wiggle at night, a startled one by day
    if (c.mode !== 'sleep') {
      c.dart = 0.6;
      c.target.set(c.pos.x + rand(-2, 2), FLOOR + rand(1, 1.8), c.pos.z);
      c.mode = 'swim';
      c.timer = 4;
    }
    sfx('bubbles');
    showCreature('parrotfish');
  };

  return (
    <>
      <group ref={root}>
        <group ref={body}>
          <mesh geometry={kit.sphere} material={kit.body} scale={[0.17, 0.22, 0.42]} />
          <mesh geometry={kit.sphere} material={kit.patch} position={[0, -0.04, 0.12]} scale={[0.165, 0.15, 0.2]} />
          {[-0.12, 0.02, 0.16].map((z) => (
            <mesh key={z} geometry={kit.sphere} material={kit.scale} position={[0, 0.05, z]} scale={[0.172, 0.12, 0.05]} />
          ))}
          {/* the beak: fused teeth like a parrot's */}
          <mesh geometry={kit.sphere} material={kit.beak} position={[0, -0.03, 0.41]} scale={[0.07, 0.07, 0.06]} />
          {[1, -1].map((side) => (
            <group key={side} position={[side * 0.115, 0.07, 0.27]}>
              <mesh geometry={kit.sphere} material={kit.eye} scale={0.045} />
              <mesh geometry={kit.sphere} material={kit.pupil} position={[side * 0.02, 0, 0.012]} scale={0.024} />
            </group>
          ))}
          <mesh geometry={kit.cone} material={kit.fin} position={[0, 0.22, -0.02]} scale={[0.01, 0.12, 0.42]} />
          {[1, -1].map((side) => (
            <mesh key={side} geometry={kit.sphere} material={kit.fin} position={[side * 0.17, -0.04, 0.12]} rotation={[0, side * 0.5, side * 0.4]} scale={[0.01, 0.06, 0.1]} />
          ))}
        </group>
        <group ref={tail} position={[0, 0, -0.4]}>
          <mesh geometry={kit.cone} material={kit.fin} position={[0, 0, -0.12]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.015, 0.25, 0.25]} />
        </group>
        <mesh ref={bubble} geometry={kit.sphere} material={kit.mucus} visible={false} renderOrder={2} />
        <mesh geometry={kit.sphere} material={kit.hidden} scale={[0.4, 0.4, 0.65]} onClick={onClick} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)} />
      </group>
      <instancedMesh ref={sand} args={[kit.sphere, kit.sand, SAND]} frustumCulled={false} />
    </>
  );
}
