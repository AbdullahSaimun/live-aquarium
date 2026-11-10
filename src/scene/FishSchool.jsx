import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { useFrame } from '@react-three/fiber';
import { world } from '../sim/world';
import { sharkActive } from '../sim/sharkBrain';
import { tmpObj, tmpColor } from './reefLayout';

const Z = -5.6; // far behind the pet fish, in front of the rock wall
const DEPTH = 0.9;
const Y_MIN = -1.6;
const Y_MAX = 1.9;
const SILVER = new THREE.Color('#d6e6ef');
const FLASH = new THREE.Color('#ffffff');
const up = new THREE.Vector3(0, 1, 0);
const fwd = new THREE.Vector3(1, 0, 0);
const v = new THREE.Vector3();
const steer = new THREE.Vector3();
const center = new THREE.Vector3();
const align = new THREE.Vector3();
const apart = new THREE.Vector3();

// One tiny fish: a slim body with a forked tail, pointing along +x.
function fishGeometry() {
  const body = new THREE.SphereGeometry(1, 10, 6);
  body.scale(0.12, 0.035, 0.025);
  const tail = new THREE.ConeGeometry(0.035, 0.06, 3);
  tail.rotateZ(Math.PI / 2);
  tail.scale(1, 1, 0.3);
  tail.translate(-0.14, 0, 0);
  const g = mergeGeometries([body.toNonIndexed(), tail.toNonIndexed()]);
  body.dispose();
  tail.dispose();
  return g;
}

// A shoal of tiny silver fish that swims as one flock far in the background. They follow a slow
// wandering leader, keep a little space, swerve away from the shark, and glint as they turn.
export default function FishSchool({ detail = 'high', calm }) {
  const count = detail === 'low' || calm ? 25 : 40;
  const geo = useMemo(fishGeometry, []);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 0.55, roughness: 0.28 }), []);
  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat],
  );
  const mesh = useRef();
  const fish = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        pos: new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 1.2, Z + (Math.random() - 0.5) * DEPTH),
        vel: new THREE.Vector3(0.6, 0, 0).applyAxisAngle(up, (Math.random() - 0.5) * 0.4),
        flash: 0,
        wobble: i * 0.7,
      })),
    [count],
  );
  const leader = useRef({ pos: new THREE.Vector3(0, 0.6, Z), goal: new THREE.Vector3(3, 0.6, Z), wait: 0 });

  useLayoutEffect(() => {
    fish.forEach((_, i) => mesh.current.setColorAt(i, SILVER));
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
  }, [fish]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const t = world.time;
    const night = 1 - world.light;
    const speed = (calm ? 0.55 : 0.85) * (1 - night * 0.4);
    // Stay where narrow screens can still see them.
    const range = Math.min(7, world.bounds.maxX + 1.8);

    // The leader wanders between random goals.
    const L = leader.current;
    L.wait -= dt;
    if (L.wait <= 0 || L.pos.distanceTo(L.goal) < 0.5) {
      L.goal.set((Math.random() * 2 - 1) * range * 0.85, Y_MIN + 0.4 + Math.random() * (Y_MAX - Y_MIN - 0.8), Z);
      L.wait = 6 + Math.random() * 6;
    }
    v.subVectors(L.goal, L.pos);
    L.pos.addScaledVector(v.normalize(), speed * 0.8 * dt);

    const scared = sharkActive() && Math.abs(world.shark.pos.z - Z) < 5;
    const m = mesh.current;
    let colorsDirty = false;
    fish.forEach((f, i) => {
      // Classic flocking: move to the middle, match neighbours, keep a little space.
      center.set(0, 0, 0);
      align.set(0, 0, 0);
      apart.set(0, 0, 0);
      let n = 0;
      for (let j = 0; j < fish.length; j++) {
        if (j === i) continue;
        const o = fish[j];
        const d = f.pos.distanceTo(o.pos);
        if (d > 1.2) continue;
        center.add(o.pos);
        align.add(o.vel);
        if (d < 0.22) apart.add(v.subVectors(f.pos, o.pos).divideScalar(Math.max(d * d, 0.01)));
        n++;
      }
      steer.set(0, 0, 0);
      if (n) {
        steer.addScaledVector(center.divideScalar(n).sub(f.pos), scared ? 1.6 : 0.6);
        steer.addScaledVector(align.divideScalar(n).sub(f.vel), 0.9);
      }
      steer.addScaledVector(apart, scared ? 0.004 : 0.012);
      steer.addScaledVector(v.subVectors(L.pos, f.pos), 0.35);
      // Swerve away from the shark.
      if (scared) {
        v.subVectors(f.pos, world.shark.pos);
        const d = v.length();
        if (d < 4) steer.addScaledVector(v.normalize(), (4 - d) * 2.5);
      }
      // Stay in the back layer and inside the tank.
      steer.z += (Z - f.pos.z) * 1.5;
      if (f.pos.y < Y_MIN) steer.y += 1.5;
      if (f.pos.y > Y_MAX) steer.y -= 1.5;
      if (Math.abs(f.pos.x) > range) steer.x -= Math.sign(f.pos.x) * 2;

      const before = f.vel.x;
      f.vel.addScaledVector(steer, dt);
      const max = speed * (scared ? 2.2 : 1);
      const len = f.vel.length();
      if (len > max) f.vel.multiplyScalar(max / len);
      if (len < speed * 0.4) f.vel.multiplyScalar((speed * 0.4) / Math.max(len, 0.001));
      f.pos.addScaledVector(f.vel, dt);

      // Glint when turning: the side of the body catches the light.
      if (Math.sign(before) !== Math.sign(f.vel.x)) f.flash = 0.5;
      if (f.flash > 0) {
        f.flash -= dt;
        m.setColorAt(i, tmpColor.copy(SILVER).lerp(FLASH, Math.max(0, f.flash) * 2));
        colorsDirty = true;
      }

      tmpObj.position.copy(f.pos);
      tmpObj.quaternion.setFromUnitVectors(fwd, v.copy(f.vel).normalize());
      // Lean into turns: the heading change since last frame, eased.
      const heading = Math.atan2(f.vel.x, f.vel.z);
      let turn = heading - (f.heading ?? heading);
      turn = Math.atan2(Math.sin(turn), Math.cos(turn));
      f.heading = heading;
      f.bank = (f.bank || 0) + (THREE.MathUtils.clamp(-turn / Math.max(dt, 0.001) * 0.25, -0.6, 0.6) - (f.bank || 0)) * Math.min(1, dt * 4);
      tmpObj.rotateX(f.bank);
      tmpObj.rotateY(Math.sin(t * 12 + f.wobble) * 0.18); // a quick tail-beat wiggle
      tmpObj.scale.setScalar(1);
      tmpObj.updateMatrix();
      m.setMatrixAt(i, tmpObj.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    if (colorsDirty && m.instanceColor) m.instanceColor.needsUpdate = true;
  });

  return <instancedMesh key={count} ref={mesh} args={[geo, mat, count]} frustumCulled={false} />;
}
