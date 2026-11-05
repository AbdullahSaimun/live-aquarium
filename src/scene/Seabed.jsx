import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { world } from '../sim/world';
import { ROCKS, SAND_DROP, SAND_Z, sandRelief, reefTime, reefLight } from './reefLayout';

const sandVertex = /* glsl */ `
  attribute float aShade;
  varying float vShade;
  varying vec3 vNormalW;
  varying vec2 vXZ;
  #include <fog_pars_vertex>
  void main() {
    vShade = aShade;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vec4 world = modelMatrix * vec4(position, 1.0);
    vXZ = world.xz;
    vec4 mvPosition = viewMatrix * world;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const sandFragment = /* glsl */ `
  uniform float uTime;
  uniform vec3 uSandA;
  uniform vec3 uSandB;
  uniform float uLight;
  uniform float uDusk;
  uniform vec3 uRocks[ROCK_COUNT];
  varying float vShade;
  varying vec3 vNormalW;
  varying vec2 vXZ;
  #include <fog_pars_fragment>
  float sHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float sNoise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(sHash(i), sHash(i + vec2(1.0, 0.0)), f.x), mix(sHash(i + vec2(0.0, 1.0)), sHash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  float caustic(vec2 p, float t) {
    float a = sin(p.x * 1.7 + t * 0.9 + sin(p.y * 1.3 + t * 0.6) * 1.6);
    float b = sin(p.y * 1.9 - t * 0.7 + sin(p.x * 1.1 - t * 0.5) * 1.6);
    float c = 1.0 - abs(a + b) * 0.5;
    return pow(clamp(c, 0.0, 1.0), 7.0);
  }
  void main() {
    vec3 base = mix(uSandA, uSandB, vShade);
    // Ripples left by the current: wavy bands bent by slow noise, sharper on one side like real sand.
    float bend = sNoise(vXZ * 0.35) * 3.0;
    float wave = sin(vXZ.x * 2.6 + vXZ.y * 0.9 + bend);
    float ripple = smoothstep(-0.2, 0.9, wave) - smoothstep(0.9, 1.0, wave) * 0.4;
    base *= 0.93 + ripple * 0.09;
    // Damp, darker patches and a fine grain.
    float damp = smoothstep(0.55, 0.85, sNoise(vXZ * 0.22 + 11.0));
    base = mix(base, base * vec3(0.8, 0.78, 0.74), damp * 0.6);
    float grain = sHash(floor(vXZ * 48.0));
    base *= 0.94 + grain * 0.1;
    if (grain > 0.985) base = mix(base, vec3(1.0, 0.97, 0.9), 0.5);
    // Soft shade where boulders sit in the sand.
    float ao = 1.0;
    for (int i = 0; i < ROCK_COUNT; i++) {
      float d = length(vXZ - uRocks[i].xy) / max(uRocks[i].z, 0.01);
      ao *= mix(0.62, 1.0, smoothstep(0.75, 1.7, d));
    }
    base *= ao;
    float light = 0.62 + 0.38 * max(dot(vNormalW, normalize(vec3(0.3, 1.0, 0.4))), 0.0);
    float c = caustic(vXZ * 0.9, uTime) * 0.6 + caustic(vXZ * 1.6 + 3.0, uTime * 1.3) * 0.35;
    // Moonlit blue at night, a warm glow at sunset; ripples of light fade in the dark.
    vec3 tint = mix(vec3(0.3, 0.38, 0.62), vec3(1.0), uLight) * mix(vec3(1.0), vec3(1.05, 0.82, 0.74), uDusk);
    float glow = 0.2 + 0.8 * uLight;
    gl_FragColor = vec4(base * light * tint + vec3(0.75, 0.95, 1.0) * c * 0.45 * glow, 1.0);
    #include <fog_fragment>
  }
`;

const rayVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const rayFragment = /* glsl */ `
  uniform float uTime;
  uniform float uPhase;
  uniform float uLight;
  varying vec2 vUv;
  void main() {
    float edge = smoothstep(0.0, 0.5, vUv.x) * smoothstep(1.0, 0.5, vUv.x);
    float fall = pow(vUv.y, 1.6);
    float flicker = 0.65 + 0.35 * sin(uTime * 0.6 + uPhase);
    // Sunbeams by day, faint blue moonbeams at night.
    vec3 tint = mix(vec3(0.55, 0.7, 1.0), vec3(0.85, 0.97, 1.0), uLight);
    gl_FragColor = vec4(tint, edge * fall * flicker * 0.22 * (0.3 + 0.7 * uLight));
  }
`;

function buildSand() {
  const geo = new THREE.PlaneGeometry(44, 20, 88, 40);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const shade = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    // Rolling dunes rising towards the back of the tank (shared with everything that sits on the sand).
    pos.setY(i, sandRelief(x, z + SAND_Z));
    shade[i] = 0.5 + 0.5 * Math.sin(x * 2.3 + z * 1.7) * Math.cos(x * 0.7 - z * 2.1);
  }
  geo.setAttribute('aShade', new THREE.BufferAttribute(shade, 1));
  geo.computeVertexNormals();
  return geo;
}

const RAYS = [
  [-6, -4.5, 0.25, 2.2],
  [-2.5, -5.5, 0.12, 1.6],
  [1.5, -4, -0.1, 2.6],
  [5, -5, -0.22, 1.8],
  [8, -6, -0.3, 2.4],
];

export default function Seabed() {
  const sandGeo = useMemo(buildSand, []);
  const sandMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: sandVertex,
        fragmentShader: sandFragment,
        fog: true,
        uniforms: {
          ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
          uTime: { value: 0 },
          uSandA: { value: new THREE.Color('#e6c99a') },
          uSandB: { value: new THREE.Color('#f6e2bf') },
          uLight: { value: 1 },
          uDusk: { value: 0 },
          uRocks: { value: ROCKS.map(([x, z, s]) => new THREE.Vector3(x, z, s * 1.15)) },
        },
        defines: { ROCK_COUNT: ROCKS.length },
      }),
    [],
  );
  const rayGeo = useMemo(() => new THREE.PlaneGeometry(1, 16), []);
  const rayMats = useMemo(
    () =>
      RAYS.map(
        (r, i) =>
          new THREE.ShaderMaterial({
            vertexShader: rayVertex,
            fragmentShader: rayFragment,
            uniforms: { uTime: { value: 0 }, uPhase: { value: i * 1.7 }, uLight: { value: 1 } },
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
          }),
      ),
    [],
  );
  const rays = useRef([]);

  useEffect(
    () => () => {
      sandGeo.dispose();
      sandMat.dispose();
      rayGeo.dispose();
      rayMats.forEach((m) => m.dispose());
    },
    [sandGeo, sandMat, rayGeo, rayMats],
  );

  useFrame(() => {
    reefTime.value = world.time;
    reefLight.value = world.light;
    sandMat.uniforms.uTime.value = world.time;
    sandMat.uniforms.uLight.value = world.light;
    sandMat.uniforms.uDusk.value = world.dusk;
    rayMats.forEach((m) => {
      m.uniforms.uTime.value = world.time;
      m.uniforms.uLight.value = world.light;
    });
    // Light through moving waves: the beams lean slowly back and forth.
    rays.current.forEach((r, i) => {
      if (r) r.rotation.z = RAYS[i][2] + Math.sin(world.time * 0.18 + i * 1.9) * 0.06;
    });
  });

  return (
    <group>
      <mesh geometry={sandGeo} material={sandMat} position={[0, world.floorY - SAND_DROP, SAND_Z]} />
      {RAYS.map(([x, z, rot, w], i) => (
        <mesh
          key={i}
          ref={(el) => (rays.current[i] = el)}
          geometry={rayGeo}
          material={rayMats[i]}
          position={[x, 2.5, z]}
          rotation={[0, 0, rot]}
          scale={[w, 1, 1]}
        />
      ))}
    </group>
  );
}
