import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { world } from '../sim/world';

const COUNT = 32;
const LIFE = 1.6;

function heartGeometry() {
  const s = new THREE.Shape();
  s.moveTo(0, -0.5);
  s.bezierCurveTo(-0.1, -0.35, -0.6, -0.1, -0.55, 0.2);
  s.bezierCurveTo(-0.5, 0.5, -0.1, 0.55, 0, 0.25);
  s.bezierCurveTo(0.1, 0.55, 0.5, 0.5, 0.55, 0.2);
  s.bezierCurveTo(0.6, -0.1, 0.1, -0.35, 0, -0.5);
  const geo = new THREE.ShapeGeometry(s, 8);
  geo.scale(0.32, 0.32, 0.32);
  return geo;
}

const dummy = new THREE.Object3D();

export default function Hearts() {
  const mesh = useRef();
  const geo = useMemo(heartGeometry, []);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ff5c9a', side: THREE.DoubleSide }), []);
  const particles = useMemo(
    () => Array.from({ length: COUNT }, () => ({ life: 0, pos: new THREE.Vector3(), vel: new THREE.Vector3(), phase: 0 })),
    [],
  );
  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat],
  );

  useFrame(({ camera }, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const queue = world.effects.hearts;
    while (queue.length) {
      const fx = queue.shift();
      for (let i = 0; i < fx.count; i++) {
        const p = particles.find((q) => q.life <= 0);
        if (!p) break;
        p.life = LIFE;
        p.pos.copy(fx.pos).add(new THREE.Vector3((Math.random() - 0.5) * 0.5, Math.random() * 0.3, 0.3));
        p.vel.set((Math.random() - 0.5) * 0.6, 0.9 + Math.random() * 0.5, 0);
        p.phase = Math.random() * 6;
      }
    }
    const m = mesh.current;
    particles.forEach((p, i) => {
      if (p.life > 0) {
        p.life -= dt;
        p.pos.addScaledVector(p.vel, dt);
        const k = 1 - p.life / LIFE;
        const scale = Math.sin(Math.min(1, k * 3) * Math.PI * 0.5) * (1 - Math.max(0, k - 0.7) / 0.3);
        dummy.position.copy(p.pos);
        dummy.position.x += Math.sin(k * 8 + p.phase) * 0.1;
        dummy.quaternion.copy(camera.quaternion);
        dummy.scale.setScalar(Math.max(0.001, scale));
      } else {
        dummy.scale.setScalar(0);
      }
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={mesh} args={[geo, mat, COUNT]} frustumCulled={false} />;
}
