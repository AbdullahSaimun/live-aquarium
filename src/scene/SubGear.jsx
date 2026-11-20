import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { world } from '../sim/world';
import { tmpObj } from './reefLayout';
import { glowTexture } from './NightLife';

const g = world.gear;
const sub = world.sub;
const look = new THREE.Vector3();
const FLASH_WHITE = new THREE.Color('#ffffff');
const FLASH_ORANGE = new THREE.Color('#ffb24a');

function makeKit() {
  const body = new THREE.CapsuleGeometry(0.06, 0.32, 4, 10);
  body.rotateZ(Math.PI / 2); // along x
  const fin = new THREE.BoxGeometry(0.06, 0.16, 0.16);
  return {
    body,
    fin,
    sphere: new THREE.SphereGeometry(1, 16, 12),
    ring: new THREE.TorusGeometry(1, 0.03, 6, 48),
    chunk: new THREE.DodecahedronGeometry(1, 0),
    cyl: new THREE.CylinderGeometry(1, 1, 1, 8),
    torpedo: new THREE.MeshStandardMaterial({ color: '#4f5d6e', metalness: 0.7, roughness: 0.35 }),
    missile: new THREE.MeshStandardMaterial({ color: '#e9eef2', metalness: 0.4, roughness: 0.3 }),
    tip: new THREE.MeshStandardMaterial({ color: '#e0412f', roughness: 0.4 }),
    engine: new THREE.MeshBasicMaterial({ color: '#ffd27a' }),
    flash: new THREE.SpriteMaterial({ map: glowTexture(), color: '#ffffff', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
    // The gas bubble of an underwater blast: it swells, then collapses.
    bubble: new THREE.MeshStandardMaterial({ color: '#e8f8ff', transparent: true, opacity: 0.35, roughness: 0.05, depthWrite: false, emissive: '#bfe9ff', emissiveIntensity: 0.4 }),
    shock: new THREE.MeshBasicMaterial({ color: '#dff6ff', transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide }),
    debris: new THREE.MeshStandardMaterial({ color: '#4a4440', roughness: 0.8, emissive: '#ff7a2a', emissiveIntensity: 0.6 }),
    cable: new THREE.MeshStandardMaterial({ color: '#2d3540', roughness: 0.6, metalness: 0.4 }),
    claw: new THREE.MeshStandardMaterial({ color: '#f0a020', roughness: 0.4, metalness: 0.5 }),
    sonar: new THREE.MeshBasicMaterial({ color: '#7dffb2', transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }),
  };
}

function Shot({ s, kit }) {
  const ref = useRef();
  const flame = useRef();
  useFrame(() => {
    const on = s.active;
    ref.current.visible = on;
    if (!on) return;
    ref.current.position.copy(s.pos);
    // Point along the direction of travel.
    look.copy(s.pos).add(s.vel);
    ref.current.lookAt(look);
    ref.current.rotateY(-Math.PI / 2);
    const isMissile = s.kind === 'missile';
    ref.current.children[0].material = isMissile ? kit.missile : kit.torpedo;
    flame.current.visible = isMissile;
    flame.current.scale.setScalar(0.08 + Math.random() * 0.05);
  });
  return (
    <group ref={ref} visible={false}>
      <mesh geometry={kit.body} material={kit.torpedo} />
      <mesh geometry={kit.sphere} material={kit.tip} position={[0.22, 0, 0]} scale={0.055} />
      <mesh geometry={kit.fin} material={kit.torpedo} position={[-0.2, 0, 0]} />
      <mesh ref={flame} geometry={kit.sphere} material={kit.engine} position={[-0.27, 0, 0]} />
    </group>
  );
}

function Blast({ b, kit }) {
  const flash = useRef();
  const bubble = useRef();
  const shock = useRef();
  const mats = useMemo(() => ({ flash: kit.flash.clone(), bubble: kit.bubble.clone(), shock: kit.shock.clone() }), [kit]);
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);
  useFrame(({ camera }) => {
    const on = b.active;
    flash.current.visible = bubble.current.visible = shock.current.visible = on;
    if (!on) return;
    const t = b.t;
    // A white-hot flash that cools to orange and fades in a moment.
    flash.current.position.copy(b.pos);
    flash.current.scale.setScalar(0.6 + Math.min(t, 0.25) * 10);
    mats.flash.color.copy(FLASH_WHITE).lerp(FLASH_ORANGE, Math.min(1, t * 4));
    mats.flash.opacity = Math.max(0, 1 - t * 2.2);
    // The gas bubble swells, shrinks, and rises away (real underwater blasts pulse like this).
    const r = t < 0.35 ? (t / 0.35) * 1.0 : Math.max(0.05, 1.0 - (t - 0.35) * 1.2) * (1 + Math.sin(t * 18) * 0.06);
    bubble.current.position.set(b.pos.x, b.pos.y + Math.max(0, t - 0.3) * 1.2, b.pos.z);
    bubble.current.scale.setScalar(r);
    mats.bubble.opacity = 0.35 * Math.max(0, 1 - t * 0.7);
    // The shock wave: a thin ring racing outwards, facing the viewer.
    shock.current.position.copy(b.pos);
    shock.current.quaternion.copy(camera.quaternion);
    shock.current.scale.setScalar(0.2 + t * 6);
    mats.shock.opacity = Math.max(0, 0.6 - t * 1.4);
  });
  return (
    <>
      <sprite ref={flash} material={mats.flash} visible={false} />
      <mesh ref={bubble} geometry={kit.sphere} material={mats.bubble} visible={false} />
      <mesh ref={shock} geometry={kit.ring} material={mats.shock} visible={false} />
    </>
  );
}

// Torpedoes, missiles, blasts, debris, the grabber claw and the sonar ring.
export default function SubGear() {
  const kit = useMemo(makeKit, []);
  useEffect(
    () => () => {
      kit.flash.map.dispose();
      Object.values(kit).forEach((x) => x.dispose());
    },
    [kit],
  );
  const debris = useRef();
  const cable = useRef();
  const claw = useRef();
  const fingers = useRef([]);
  const sonar = useRef();

  useFrame(({ camera }) => {
    // Debris chunks.
    const m = debris.current;
    g.debris.forEach((d, i) => {
      tmpObj.position.copy(d.pos);
      tmpObj.rotation.set(d.spin.x * d.life, d.spin.y * d.life, d.spin.z * d.life);
      tmpObj.scale.setScalar(d.life > 0 ? 0.035 * Math.min(1, d.life * 1.5) : 0.0001);
      tmpObj.updateMatrix();
      m.setMatrixAt(i, tmpObj.matrix);
    });
    m.instanceMatrix.needsUpdate = true;

    // The claw hangs under the hull on its cable.
    const c = g.claw;
    const out = sub.phase !== 'idle' && c.len > 0.01;
    cable.current.visible = claw.current.visible = out;
    if (out) {
      const top = sub.pos.y - 0.3;
      cable.current.position.set(sub.pos.x, top - c.len / 2, sub.pos.z);
      cable.current.scale.set(0.012, c.len, 0.012);
      claw.current.position.set(sub.pos.x, top - c.len - 0.06, sub.pos.z);
      const open = c.state === 'down' ? 0.55 : 0.12;
      fingers.current.forEach((f, i) => f && (f.rotation.z = (i ? -1 : 1) * open));
    }

    // Sonar: a ring sweeping outwards from where it pinged.
    const age = world.time - g.sonar.t;
    const on = age >= 0 && age < 2.5;
    sonar.current.visible = on;
    if (on) {
      sonar.current.position.copy(g.sonar.origin);
      sonar.current.quaternion.copy(camera.quaternion);
      sonar.current.scale.setScalar(0.3 + age * 4);
      kit.sonar.opacity = 0.75 * (1 - age / 2.5);
    }
  });

  return (
    <group>
      {g.shots.map((s, i) => (
        <Shot key={i} s={s} kit={kit} />
      ))}
      {g.blasts.map((b, i) => (
        <Blast key={i} b={b} kit={kit} />
      ))}
      <instancedMesh ref={debris} args={[kit.chunk, kit.debris, g.debris.length]} frustumCulled={false} />
      <mesh ref={cable} geometry={kit.cyl} material={kit.cable} visible={false} />
      <group ref={claw} visible={false}>
        <mesh geometry={kit.sphere} material={kit.claw} scale={[0.07, 0.05, 0.07]} />
        {[0, 1].map((i) => (
          <group key={i} ref={(el) => (fingers.current[i] = el)}>
            <mesh geometry={kit.cyl} material={kit.claw} position={[(i ? 1 : -1) * 0.05, -0.08, 0]} scale={[0.015, 0.14, 0.03]} />
          </group>
        ))}
      </group>
      <mesh ref={sonar} geometry={kit.ring} material={kit.sonar} visible={false} />
    </group>
  );
}
