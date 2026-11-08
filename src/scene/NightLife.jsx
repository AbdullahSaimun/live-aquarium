import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useCursor } from '@react-three/drei';
import { world } from '../sim/world';
import { showCreature, sfx } from '../state/store';

const SPARKLES = 64;
const LANTERNS = 9;
const dummy = new THREE.Object3D();

// A soft round glow, drawn once into a tiny canvas and used for the anglerfish lure.
function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(180,240,255,0.8)');
  grad.addColorStop(1, 'rgba(120,200,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function useTapCursor() {
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);
  return { onPointerOver: () => setHovered(true), onPointerOut: () => setHovered(false) };
}

// A deep-sea anglerfish drifting slowly at the back, its glowing lure bobbing in front of it.
function Anglerfish({ kit }) {
  const root = useRef();
  const lure = useRef();
  const hover = useTapCursor();
  useFrame(() => {
    const t = world.time;
    const b = world.bounds;
    const range = Math.max(1, b.maxX - 1);
    const x = Math.sin(t * 0.05) * range * 0.7;
    root.current.position.set(x, world.floorY + 1.25 + Math.sin(t * 0.4) * 0.15, -4.4);
    root.current.rotation.y = Math.cos(t * 0.05) > 0 ? Math.PI / 2 : -Math.PI / 2;
    lure.current.position.y = 0.42 + Math.sin(t * 2.2) * 0.03;
    lure.current.material.opacity = 0.75 + Math.sin(t * 3.1) * 0.2;
  });
  const onClick = (e) => {
    e.stopPropagation();
    sfx('whale');
    showCreature('anglerfish');
  };
  return (
    <group ref={root}>
      <mesh geometry={kit.sphere} material={kit.angler} scale={[0.32, 0.27, 0.3]} />
      {/* a wide grumpy mouth full of little teeth */}
      <mesh geometry={kit.sphere} material={kit.mouth} position={[0, -0.08, 0.24]} scale={[0.2, 0.08, 0.08]} />
      {[-0.12, -0.06, 0, 0.06, 0.12].map((x) => (
        <mesh key={x} geometry={kit.cone} material={kit.tooth} position={[x, -0.03, 0.29]} rotation={[Math.PI, 0, 0]} scale={[0.015, 0.04, 0.015]} />
      ))}
      {[1, -1].map((side) => (
        <group key={side} position={[side * 0.12, 0.1, 0.22]}>
          <mesh geometry={kit.sphere} material={kit.eye} scale={0.04} />
          <mesh geometry={kit.sphere} material={kit.pupil} position={[0, 0, 0.03]} scale={0.02} />
        </group>
      ))}
      <mesh geometry={kit.cone} material={kit.angler} position={[0, 0, -0.34]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.14, 0.18, 0.04]} />
      {/* the fishing rod on its head and the shining lure */}
      <mesh geometry={kit.rod} material={kit.angler} position={[0, 0.3, 0.12]} rotation={[0.6, 0, 0]} />
      <sprite ref={lure} material={kit.glow} position={[0, 0.42, 0.3]} scale={0.35} />
      <mesh geometry={kit.sphere} material={kit.lureBall} position={[0, 0.42, 0.3]} scale={0.03} />
      <mesh geometry={kit.sphere} material={kit.hidden} scale={0.5} onClick={onClick} {...hover} />
    </group>
  );
}

// Little lanternfish drifting in a loose group, dotted with glowing blue lights.
function Lanternfish({ kit }) {
  const fish = useMemo(
    () => Array.from({ length: LANTERNS }, (_, i) => ({ phase: i * 0.9, ox: (i % 3) * 0.35, oy: Math.floor(i / 3) * 0.28, oz: ((i * 7) % 5) * 0.12 })),
    [],
  );
  const refs = useRef([]);
  const hover = useTapCursor();
  useFrame(() => {
    const t = world.time;
    const range = Math.max(1, world.bounds.maxX - 0.5);
    const cx = Math.sin(t * 0.08 + 2) * range * 0.6;
    const dir = Math.cos(t * 0.08 + 2) >= 0 ? 1 : -1;
    fish.forEach((f, i) => {
      const g = refs.current[i];
      if (!g) return;
      g.position.set(cx + f.ox + Math.sin(t * 0.7 + f.phase) * 0.12, 0.2 + f.oy + Math.sin(t * 0.9 + f.phase) * 0.1, -3.4 - f.oz);
      g.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    });
  });
  const onClick = (e) => {
    e.stopPropagation();
    sfx('chime');
    showCreature('lanternfish');
  };
  return fish.map((f, i) => (
    <group key={i} ref={(el) => (refs.current[i] = el)}>
      <mesh geometry={kit.sphere} material={kit.lanternBody} scale={[0.035, 0.035, 0.1]} />
      {[-0.05, -0.01, 0.03].map((z) => (
        <mesh key={z} geometry={kit.sphere} material={kit.lanternDot} position={[0, -0.025, z]} scale={0.009} />
      ))}
      <mesh geometry={kit.sphere} material={kit.hidden} scale={0.18} onClick={onClick} {...hover} />
    </group>
  ));
}

// Blue glowing plankton that sparkle wherever the water is tapped at night.
function Sparkles({ kit }) {
  const mesh = useRef();
  const pool = useMemo(() => Array.from({ length: SPARKLES }, () => ({ pos: new THREE.Vector3(), vel: new THREE.Vector3(), life: 0 })), []);
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const queue = world.effects.sparkles;
    while (queue.length) {
      const fx = queue.shift();
      for (let i = 0; i < fx.count; i++) {
        const p = pool.find((q) => q.life <= 0);
        if (!p) break;
        p.life = 1.4 + Math.random() * 0.8;
        p.pos.copy(fx.pos);
        p.vel.set((Math.random() - 0.5) * 0.9, (Math.random() - 0.3) * 0.7, (Math.random() - 0.5) * 0.5);
      }
    }
    const m = mesh.current;
    pool.forEach((p, i) => {
      if (p.life > 0) {
        p.life -= dt;
        p.vel.multiplyScalar(1 - dt * 1.5);
        p.pos.addScaledVector(p.vel, dt);
      }
      dummy.position.copy(p.pos);
      dummy.scale.setScalar(p.life > 0 ? 0.03 + Math.min(1, p.life) * 0.04 : 0.0001);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={mesh} args={[kit.sphere, kit.sparkle, SPARKLES]} frustumCulled={false} />;
}

// Creatures and lights that only appear after dark (mounted by Aquarium only at night).
export default function NightLife() {
  const kit = useMemo(() => {
    const glow = new THREE.SpriteMaterial({ map: glowTexture(), color: '#bdf3ff', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    return {
      sphere: new THREE.SphereGeometry(1, 14, 10),
      cone: new THREE.ConeGeometry(1, 1, 8),
      rod: new THREE.CylinderGeometry(0.008, 0.012, 0.32, 5).translate(0, 0.16, 0),
      angler: new THREE.MeshStandardMaterial({ color: '#3a3550', roughness: 0.7 }),
      mouth: new THREE.MeshStandardMaterial({ color: '#1a1424' }),
      tooth: new THREE.MeshStandardMaterial({ color: '#f4f1e6' }),
      eye: new THREE.MeshStandardMaterial({ color: '#dfe8ff', emissive: '#6b86c9', emissiveIntensity: 0.3 }),
      pupil: new THREE.MeshBasicMaterial({ color: '#0b0b14' }),
      lureBall: new THREE.MeshBasicMaterial({ color: '#e9fbff' }),
      glow,
      lanternBody: new THREE.MeshStandardMaterial({ color: '#5a6b86', metalness: 0.4, roughness: 0.35 }),
      lanternDot: new THREE.MeshBasicMaterial({ color: '#7ff0ff' }),
      sparkle: new THREE.MeshBasicMaterial({ color: '#7ff6ff', transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }),
      hidden: new THREE.MeshBasicMaterial({ visible: false }),
    };
  }, []);
  useEffect(
    () => () => {
      kit.glow.map.dispose();
      Object.values(kit).forEach((x) => x.dispose());
    },
    [kit],
  );
  return (
    <group>
      <Anglerfish kit={kit} />
      <Lanternfish kit={kit} />
      <Sparkles kit={kit} />
    </group>
  );
}
