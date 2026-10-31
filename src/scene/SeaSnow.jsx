import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { world } from '../sim/world';

const COUNT = 140;
const TOP = 3.6;
const BOTTOM = -3.1;
const DAY = new THREE.Color('#ffffff');
const NIGHT = new THREE.Color('#8ff7ff'); // glowing plankton after dark

// Tiny specks drifting slowly down through the water, so the tank feels deep and alive.
// At night they glow softly like plankton.
export default function SeaSnow() {
  const { geo, mat, speed } = useMemo(() => {
    const pos = new Float32Array(COUNT * 3);
    const speed = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 18;
      pos[i * 3 + 1] = BOTTOM + Math.random() * (TOP - BOTTOM);
      pos[i * 3 + 2] = -6 + Math.random() * 8.5;
      speed[i] = 0.04 + Math.random() * 0.08;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: DAY,
      size: 0.06,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return { geo, mat, speed };
  }, []);
  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat],
  );

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const pos = geo.attributes.position;
    const t = world.time;
    for (let i = 0; i < COUNT; i++) {
      let y = pos.getY(i) - speed[i] * dt;
      if (y < BOTTOM) y = TOP;
      pos.setY(i, y);
      pos.setX(i, pos.getX(i) + Math.sin(t * 0.3 + i) * 0.03 * dt);
    }
    pos.needsUpdate = true;
    const night = 1 - world.light;
    mat.color.copy(DAY).lerp(NIGHT, night);
    mat.size = 0.06 + night * 0.04;
    mat.opacity = 0.45 + night * 0.4;
  });

  return <points geometry={geo} material={mat} frustumCulled={false} />;
}
