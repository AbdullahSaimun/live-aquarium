import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { world } from '../sim/world';

const BURST = 40;
const VENTS = [
  [-5.2, -2.9],
  [3.8, -2.4],
  [0.6, -3.4],
];
const dummy = new THREE.Object3D();

// Ambient bubble streams from a few vents plus pooled bursts (eating, tapping food), in one instanced mesh.
export default function Bubbles({ ambient = 45 }) {
  const mesh = useRef();
  const total = ambient + BURST;
  const geo = useMemo(() => new THREE.SphereGeometry(1, 10, 8), []);
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#e8fbff',
        emissive: '#9be7ff',
        emissiveIntensity: 0.35,
        roughness: 0.1,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
      }),
    [],
  );
  const bubbles = useMemo(
    () =>
      Array.from({ length: total }, (_, i) => {
        const isAmbient = i < ambient;
        const vent = VENTS[i % VENTS.length];
        return {
          isAmbient,
          vent,
          pos: new THREE.Vector3(vent[0], world.floorY + Math.random() * 7, vent[1]),
          speed: 0.5 + Math.random() * 0.6,
          size: 0.04 + Math.random() * 0.07,
          phase: Math.random() * 10,
          life: isAmbient ? 1 : 0,
        };
      }),
    [total, ambient],
  );
  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat],
  );

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const queue = world.effects.bubbles;
    while (queue.length) {
      const fx = queue.shift();
      for (let i = 0; i < fx.count; i++) {
        const b = bubbles.find((q) => !q.isAmbient && q.life <= 0);
        if (!b) break;
        b.life = 2.5;
        b.pos.copy(fx.pos);
        b.pos.x += (Math.random() - 0.5) * 0.4;
        b.pos.z += (Math.random() - 0.5) * 0.4;
        b.speed = 0.8 + Math.random() * 0.8;
        b.size = 0.03 + Math.random() * 0.05;
      }
    }

    const t = world.time;
    const m = mesh.current;
    bubbles.forEach((b, i) => {
      let visible = true;
      if (b.isAmbient) {
        b.pos.y += b.speed * dt;
        if (b.pos.y > world.surfaceY + 0.5) {
          b.pos.set(b.vent[0], world.floorY, b.vent[1]);
          b.speed = 0.5 + Math.random() * 0.6;
        }
      } else if (b.life > 0) {
        b.life -= dt;
        b.pos.y += b.speed * dt;
      } else {
        visible = false;
      }
      dummy.position.set(b.pos.x + Math.sin(t * 2 + b.phase) * 0.08, b.pos.y, b.pos.z + Math.cos(t * 1.7 + b.phase) * 0.05);
      const s = visible ? b.size * (b.isAmbient ? 1 : Math.min(1, b.life * 2)) : 0;
      dummy.scale.setScalar(Math.max(0.0001, s));
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh key={total} ref={mesh} args={[geo, mat, total]} frustumCulled={false} />;
}
