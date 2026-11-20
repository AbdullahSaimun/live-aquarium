import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { useFrame } from '@react-three/fiber';
import { world, queueEffect } from '../sim/world';
import { useStore, sfx } from '../state/store';
import { tmpObj, seeded } from './reefLayout';
import { part, eyes, SPHERE, CONE_Z } from './WildFish';

const FLOOR = world.floorY;
// The clownfish home anemone (Coral.jsx) and the flat rock face beside it where the eggs are laid.
const ANEMONE = new THREE.Vector3(-3.4, FLOOR + 0.9, -0.8);
const NEST = new THREE.Vector3(-2.82, FLOOR + 0.2, -0.39);
const ROCK = [-2.82, FLOOR + 0.06, -0.6];
const EGGS = 34;
const rand = (a, b) => a + Math.random() * (b - a);

function babyGeometry() {
  const parts = [
    part(SPHERE, '#ff8a3d', [0.05, 0.06, 0.11]),
    part(SPHERE, '#ffffff', [0.052, 0.062, 0.016], undefined, [0, 0, 0.035]),
    part(CONE_Z, '#ff8a3d', [0.008, 0.06, 0.06], undefined, [0, 0, -0.13]),
    ...eyes(0.035, 0.02, 0.07, 0.016),
  ];
  const g = mergeGeometries(parts);
  parts.forEach((p) => p.dispose());
  return g;
}

// The clownfish family: a patch of orange eggs on the rock by the anemone (the dad fans them), and
// later a few tiny babies who stay close to the anemone and slowly grow.
export default function ClownNest() {
  const nest = useStore((s) => s.stats.clownNest);
  const kit = useMemo(
    () => ({
      egg: new THREE.SphereGeometry(1, 8, 6),
      eggMat: new THREE.MeshStandardMaterial({ color: '#ff9a3d', roughness: 0.3, emissive: '#ff6a00', emissiveIntensity: 0.15 }),
      eye: new THREE.MeshBasicMaterial({ color: '#2a2a35' }),
      baby: babyGeometry(),
      babyMat: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4 }),
      hit: new THREE.SphereGeometry(1, 8, 6),
      hidden: new THREE.MeshBasicMaterial({ visible: false }),
      rock: new THREE.MeshStandardMaterial({ color: '#8d877c', roughness: 0.95 }),
    }),
    [],
  );
  useEffect(() => () => Object.values(kit).forEach((x) => x.dispose()), [kit]);

  const eggs = useRef();
  const eyeDots = useRef();
  const babies = useRef();
  const swimmers = useMemo(
    () =>
      Array.from({ length: 4 }, (_, i) => ({
        pos: ANEMONE.clone().add(new THREE.Vector3(rand(-0.4, 0.4), rand(-0.2, 0.3), rand(-0.3, 0.3))),
        vel: new THREE.Vector3(),
        target: ANEMONE.clone(),
        yaw: rand(0, 6),
        wait: rand(0, 2),
        phase: i,
      })),
    [],
  );

  // Eggs sit in a tidy patch; positions are fixed so they never jump.
  useEffect(() => {
    if (!eggs.current) return;
    const rnd = seeded(77);
    for (let i = 0; i < EGGS; i++) {
      const a = rnd() * Math.PI * 2;
      const r = Math.sqrt(rnd()) * 0.16;
      tmpObj.position.set(NEST.x + Math.cos(a) * r, NEST.y + Math.sin(a) * r * 0.7, NEST.z);
      tmpObj.scale.setScalar(0.022);
      tmpObj.rotation.set(0, 0, 0);
      tmpObj.updateMatrix();
      eggs.current.setMatrixAt(i, tmpObj.matrix);
      // A tiny dark eye shows in each egg a day before hatching.
      tmpObj.position.z += 0.02;
      tmpObj.scale.setScalar(0.007);
      tmpObj.updateMatrix();
      eyeDots.current.setMatrixAt(i, tmpObj.matrix);
    }
    eggs.current.instanceMatrix.needsUpdate = true;
    eyeDots.current.instanceMatrix.needsUpdate = true;
  }, [nest?.stage]);

  const stage = nest?.stage || null;
  const count = stage === 'babies' ? nest.babies || 3 : 0;
  const growth = stage === 'babies' ? Math.min(1, (nest.days - nest.hatchDay) / 7) : 0;

  useEffect(() => {
    world.nest = stage === 'eggs' ? NEST : null;
    return () => {
      world.nest = null;
    };
  }, [stage]);

  useFrame((_, rawDt) => {
    if (stage === 'eggs') {
      kit.eggMat.emissiveIntensity = 0.12 + Math.sin(world.time * 2) * 0.04; // a soft glint as the dad fans them
      return;
    }
    if (!count) return;
    const dt = Math.min(rawDt, 0.1);
    const m = babies.current;
    const size = 0.55 + growth * 0.6;
    swimmers.forEach((f, i) => {
      if (i >= count) return;
      // Babies dart between short hovers, never far from the anemone (their safe home).
      f.wait -= dt;
      if (f.wait <= 0) {
        f.wait = rand(0.8, 2.5);
        f.target.copy(ANEMONE).add(tmpObj.position.set(rand(-0.5, 0.5), rand(-0.25, 0.35), rand(-0.35, 0.35)));
      }
      const want = tmpObj.position.subVectors(f.target, f.pos);
      const d = want.length();
      want.multiplyScalar(d > 0.02 ? Math.min(0.6, d * 2) / d : 0);
      f.vel.lerp(want, 1 - Math.exp(-dt * 4));
      f.pos.addScaledVector(f.vel, dt);
      if (f.vel.lengthSq() > 0.002) f.yaw += Math.atan2(Math.sin(Math.atan2(f.vel.x, f.vel.z) - f.yaw), Math.cos(Math.atan2(f.vel.x, f.vel.z) - f.yaw)) * (1 - Math.exp(-dt * 6));
      f.phase += dt * (6 + f.vel.length() * 20);
      tmpObj.position.copy(f.pos);
      tmpObj.rotation.set(0, f.yaw + Math.sin(f.phase) * 0.15, 0, 'YXZ');
      tmpObj.scale.setScalar(size);
      tmpObj.updateMatrix();
      m.setMatrixAt(i, tmpObj.matrix);
    });
    m.count = count;
    m.instanceMatrix.needsUpdate = true;
  });

  const onTapBaby = (e) => {
    e.stopPropagation();
    sfx('giggle');
    queueEffect('hearts', ANEMONE.clone().setY(ANEMONE.y + 0.4), 3);
  };

  return (
    <group>
      {/* the flat nesting rock beside the anemone */}
      <mesh geometry={kit.egg} material={kit.rock} position={ROCK} scale={[0.32, 0.2, 0.24]} />
      {stage === 'eggs' && (
        <>
          <instancedMesh ref={eggs} args={[kit.egg, kit.eggMat, EGGS]} frustumCulled={false} />
          <instancedMesh ref={eyeDots} args={[kit.egg, kit.eye, EGGS]} frustumCulled={false} visible={nest.days - nest.laidDay >= 1} />
        </>
      )}
      {stage === 'babies' && (
        <>
          <instancedMesh ref={babies} args={[kit.baby, kit.babyMat, 4]} frustumCulled={false} />
          <mesh geometry={kit.hit} material={kit.hidden} position={ANEMONE} scale={0.8} onClick={onTapBaby} />
        </>
      )}
    </group>
  );
}
