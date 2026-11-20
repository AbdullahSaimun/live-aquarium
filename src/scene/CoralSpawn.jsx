import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { world } from '../sim/world';
import { tmpObj, tmpColor } from './reefLayout';

const FLOOR = world.floorY;
// The corals in Coral.jsx that release egg bundles: [x, z].
const CORALS = [
  [-6.2, -2.2],
  [5.6, -2.8],
  [1.2, -4.4],
  [-1.6, -2.6],
  [-2.6, -5],
  [2.4, -4],
  [-0.6, -4.6],
  [6.8, -3.4],
  [0.6, -3.4],
  [-7, -2.8],
  [2.2, -2.6],
  [-5, -3.2],
  [4.8, 0.2],
];
const COLORS = ['#ff9ec4', '#ffb37a', '#ffd1e3', '#ff7fae'].map((c) => new THREE.Color(c));
export const SPAWN_TIME = 70;

// Coral spawning: on full-moon nights the corals release tiny pink and orange egg bundles that rise
// slowly through the water like upside-down snow, wobbling in the current.
export default function CoralSpawn({ detail }) {
  const count = detail === 'low' ? 70 : 160;
  const geo = useMemo(() => new THREE.SphereGeometry(1, 8, 6), []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ff6fa8', emissiveIntensity: 0.35, roughness: 0.4 }), []);
  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat],
  );
  const mesh = useRef();
  const pool = useMemo(
    () => Array.from({ length: count }, () => ({ pos: new THREE.Vector3(), speed: 0, phase: Math.random() * 6, life: 0, size: 0 })),
    [count],
  );
  const emit = useRef(0);
  const snap = useRef(0);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const s = world.spawning;
    const on = world.time < s.until;
    const m = mesh.current;
    // Release bundles steadily while the event lasts (faster in the middle of it).
    if (on) {
      const k = 1 - Math.abs((s.until - world.time) / SPAWN_TIME - 0.5) * 2;
      emit.current += dt * (6 + k * 22) * (count / 160);
      while (emit.current >= 1) {
        emit.current -= 1;
        const p = pool.find((q) => q.life <= 0);
        if (!p) break;
        const [x, z] = CORALS[Math.floor(Math.random() * CORALS.length)];
        p.pos.set(x + (Math.random() - 0.5) * 0.8, FLOOR + 0.6 + Math.random() * 0.6, z + (Math.random() - 0.5) * 0.6);
        p.speed = 0.22 + Math.random() * 0.22;
        p.life = 1;
        p.size = 0.045 + Math.random() * 0.04; // larger than life so they read from the glass
        m.setColorAt(pool.indexOf(p), COLORS[Math.floor(Math.random() * COLORS.length)]);
        if (m.instanceColor) m.instanceColor.needsUpdate = true;
      }
      // Now and then a fish darts over to snap at a bundle.
      snap.current -= dt;
      if (snap.current <= 0) {
        snap.current = 2 + Math.random() * 3;
        const fish = [...world.runtime.values()];
        const p = pool.find((q) => q.life > 0 && q.pos.y > FLOOR + 1.5);
        const rt = fish[Math.floor(Math.random() * fish.length)];
        if (p && rt && rt.sleeping <= 0) {
          rt.target.copy(p.pos);
          rt.retarget = 2.5;
          rt.hover = 0;
        }
      }
    }
    let alive = 0;
    pool.forEach((p, i) => {
      if (p.life > 0) {
        alive++;
        p.pos.y += p.speed * dt;
        p.pos.x += (world.current.x * 0.8 + Math.sin(world.time * 1.3 + p.phase) * 0.06) * dt;
        p.pos.z += Math.cos(world.time * 1.1 + p.phase) * 0.04 * dt;
        if (p.pos.y > world.surfaceY) p.life = 0;
      }
      tmpObj.position.copy(p.pos);
      tmpObj.scale.setScalar(p.life > 0 ? p.size : 0.0001);
      tmpObj.updateMatrix();
      m.setMatrixAt(i, tmpObj.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    m.visible = on || alive > 0;
  });

  useEffect(() => {
    pool.forEach((_, i) => mesh.current.setColorAt(i, tmpColor.set('#ff9ec4')));
  }, [pool]);

  return <instancedMesh ref={mesh} args={[geo, mat, count]} frustumCulled={false} visible={false} />;
}
