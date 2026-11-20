import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useCursor } from '@react-three/drei';
import { world, queueEffect } from '../sim/world';
import { hasEvent, oceanDate } from '../data/oceanCalendar';
import { sfx, toast, getState } from '../state/store';
import { tmpObj } from './reefLayout';

const FLOOR = world.floorY;
const JELLIES = 12;
const rand = (a, b) => a + Math.random() * (b - a);

// Turtle hatching season: once a visit, a tiny baby sea turtle paddles up from the sand to the surface.
function BabyTurtle() {
  const kit = useMemo(
    () => ({
      sphere: new THREE.SphereGeometry(1, 14, 10),
      shell: new THREE.MeshStandardMaterial({ color: '#5a7d3a', roughness: 0.6 }),
      skin: new THREE.MeshStandardMaterial({ color: '#8fae6a', roughness: 0.6 }),
      eye: new THREE.MeshBasicMaterial({ color: '#111111' }),
      hidden: new THREE.MeshBasicMaterial({ visible: false }),
    }),
    [],
  );
  useEffect(() => () => Object.values(kit).forEach((x) => x.dispose()), [kit]);
  const root = useRef();
  const flippers = useRef([]);
  const trip = useRef({ start: world.time + rand(30, 60), dur: 26, x: rand(-3, 3), done: false });
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);

  useFrame(() => {
    const t = trip.current;
    const k = (world.time - t.start) / t.dur;
    const on = k > 0 && k < 1;
    root.current.visible = on;
    if (!on) return;
    // Up from the sand towards the light, drifting sideways with little pauses between strokes.
    const stroke = Math.sin(world.time * 5);
    root.current.position.set(t.x + Math.sin(k * 5) * 0.8 + world.current.x * k * 4, FLOOR + 0.3 + k * (world.surfaceY - FLOOR), 0.8 + Math.sin(k * 3) * 0.3);
    root.current.rotation.set(-0.9, Math.sin(k * 5) * 0.4, 0);
    flippers.current.forEach((f, i) => f && (f.rotation.z = (i % 2 ? -1 : 1) * (0.3 + stroke * 0.5)));
  });

  const onClick = (e) => {
    e.stopPropagation();
    sfx('giggle');
    queueEffect('hearts', root.current.position.clone(), 3);
    const bn = getState().settings.factLang === 'bn';
    toast(
      bn ? 'ছোট্ট কচ্ছপ ছানা! ডিম ফুটে বেরিয়ে সে সোজা সাগরের দিকে সাঁতরায় 🐢' : 'A baby sea turtle! Right after hatching it swims straight out to sea 🐢',
      '🐢',
      4000,
      bn ? 'bn' : '',
    );
  };

  return (
    <group ref={root} visible={false} scale={0.32}>
      <mesh geometry={kit.sphere} material={kit.shell} scale={[0.5, 0.2, 0.6]} />
      <mesh geometry={kit.sphere} material={kit.skin} position={[0, 0.02, 0.62]} scale={0.2} />
      {[1, -1].map((s) => (
        <mesh key={s} geometry={kit.sphere} material={kit.eye} position={[s * 0.1, 0.08, 0.76]} scale={0.04} />
      ))}
      {[
        [0.45, 0.25],
        [-0.45, 0.25],
        [0.35, -0.35],
        [-0.35, -0.35],
      ].map(([x, z], i) => (
        <group key={i} ref={(el) => (flippers.current[i] = el)} position={[x, 0, z]}>
          <mesh geometry={kit.sphere} material={kit.skin} position={[Math.sign(x) * 0.18, 0, 0]} scale={[0.25, 0.04, i < 2 ? 0.14 : 0.1]} />
        </group>
      ))}
      <mesh geometry={kit.sphere} material={kit.hidden} scale={1.4} onClick={onClick} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)} />
    </group>
  );
}

// Moon jelly bloom: a drift of see-through moon jellies far at the back, each with four pink rings.
function JellyBloom() {
  const kit = useMemo(() => {
    const bell = new THREE.SphereGeometry(1, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2);
    const ring = new THREE.TorusGeometry(0.22, 0.06, 6, 14);
    return {
      bell,
      ring,
      bellMat: new THREE.MeshStandardMaterial({ color: '#e8f4ff', transparent: true, opacity: 0.35, roughness: 0.2, depthWrite: false, side: THREE.DoubleSide, emissive: '#9fcfff', emissiveIntensity: 0.15 }),
      ringMat: new THREE.MeshStandardMaterial({ color: '#ffb3d9', transparent: true, opacity: 0.7, depthWrite: false }),
    };
  }, []);
  useEffect(() => () => Object.values(kit).forEach((x) => x.dispose()), [kit]);
  const bells = useRef();
  const rings = useRef();
  const jellies = useMemo(
    () => Array.from({ length: JELLIES }, () => ({ x: rand(-8, 8), y: rand(-1.5, 2.2), z: rand(-5.2, -3.6), phase: rand(0, 6), s: rand(0.22, 0.4), drift: rand(0.05, 0.12) })),
    [],
  );
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    jellies.forEach((j, i) => {
      // Pulse up, sink gently, drift with the current.
      const pulse = Math.max(0, Math.sin(world.time * 1.4 + j.phase));
      j.y += (pulse * 0.25 - 0.06) * dt;
      j.x += (world.current.x * 0.6 + j.drift * 0.2) * dt;
      if (j.y > world.surfaceY - 0.5) j.y = FLOOR + 1;
      if (j.x > 9) j.x = -9;
      const squash = 1 + pulse * 0.15;
      tmpObj.position.set(j.x, j.y, j.z);
      tmpObj.rotation.set(0, 0, Math.sin(world.time * 0.5 + j.phase) * 0.1);
      tmpObj.scale.set(j.s * squash, j.s * (0.6 / squash), j.s * squash);
      tmpObj.updateMatrix();
      bells.current.setMatrixAt(i, tmpObj.matrix);
      for (let r = 0; r < 4; r++) {
        const a = (r / 4) * Math.PI * 2;
        tmpObj.position.set(j.x + Math.cos(a) * j.s * 0.42, j.y + j.s * 0.12, j.z + Math.sin(a) * j.s * 0.42);
        tmpObj.rotation.set(Math.PI / 2, 0, 0);
        tmpObj.scale.setScalar(j.s * 0.7);
        tmpObj.updateMatrix();
        rings.current.setMatrixAt(i * 4 + r, tmpObj.matrix);
      }
    });
    bells.current.instanceMatrix.needsUpdate = true;
    rings.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <>
      <instancedMesh ref={bells} args={[kit.bell, kit.bellMat, JELLIES]} frustumCulled={false} />
      <instancedMesh ref={rings} args={[kit.ring, kit.ringMat, JELLIES * 4]} frustumCulled={false} />
    </>
  );
}

// Scene extras for today's ocean calendar events.
export default function OceanEvents() {
  const [day] = useState(() => oceanDate());
  return (
    <>
      {hasEvent('turtles', day) && <BabyTurtle />}
      {hasEvent('jellyBloom', day) && <JellyBloom />}
    </>
  );
}
