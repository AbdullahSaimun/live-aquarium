import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { world } from '../sim/world';

// Light settings for each look; the scene blends night→day by `world.light`, then towards sunset by `world.dusk`.
const LOOKS = {
  day: { sky: '#bff3ff', ground: '#f2c98c', hemi: 1.4, sun: '#fffaf0', sunI: 1.6, amb: 0.35, fog: '#3a9bd0' },
  sunset: { sky: '#ffd0a8', ground: '#d68f6a', hemi: 1.15, sun: '#ffab73', sunI: 1.25, amb: 0.3, fog: '#b9837e' },
  night: { sky: '#6f8fd6', ground: '#22325a', hemi: 0.6, sun: '#a9c0ff', sunI: 0.55, amb: 0.22, fog: '#0f2a4d' },
};
const C = Object.fromEntries(
  Object.entries(LOOKS).map(([k, v]) => [k, { sky: new THREE.Color(v.sky), ground: new THREE.Color(v.ground), sun: new THREE.Color(v.sun), fog: new THREE.Color(v.fog) }]),
);
const lerp = THREE.MathUtils.lerp;

// Owns the tank's lights and fog, fading smoothly between day, sunset and night.
export default function DayNight() {
  const hemi = useRef();
  const sun = useRef();
  const amb = useRef();
  const scene = useThree((s) => s.scene);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const ease = 1 - Math.exp(-dt * 0.9); // a few seconds to settle
    world.light += (world.lightTarget - world.light) * ease;
    world.dusk += (world.duskTarget - world.dusk) * ease;
    const l = world.light;
    const d = world.dusk;
    const blend = (key, out) => out.copy(C.night[key]).lerp(C.day[key], l).lerp(C.sunset[key], d);
    const num = (key) => lerp(lerp(LOOKS.night[key], LOOKS.day[key], l), LOOKS.sunset[key], d);

    blend('sky', hemi.current.color);
    blend('ground', hemi.current.groundColor);
    hemi.current.intensity = num('hemi');
    blend('sun', sun.current.color);
    sun.current.intensity = num('sunI');
    amb.current.intensity = num('amb');
    if (scene.fog) blend('fog', scene.fog.color);
  });

  return (
    <>
      {/* Starts a little closer so the back of the reef fades into blue, like real depth. */}
      <fog attach="fog" args={[LOOKS.day.fog, 12, 30]} />
      <hemisphereLight ref={hemi} args={[LOOKS.day.sky, LOOKS.day.ground, LOOKS.day.hemi]} />
      <directionalLight ref={sun} position={[3, 10, 6]} intensity={LOOKS.day.sunI} color={LOOKS.day.sun} />
      <ambientLight ref={amb} intensity={LOOKS.day.amb} />
    </>
  );
}
