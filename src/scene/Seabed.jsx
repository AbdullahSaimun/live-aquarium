import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { world } from '../sim/world';

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
  varying float vShade;
  varying vec3 vNormalW;
  varying vec2 vXZ;
  #include <fog_pars_fragment>
  float caustic(vec2 p, float t) {
    float a = sin(p.x * 1.7 + t * 0.9 + sin(p.y * 1.3 + t * 0.6) * 1.6);
    float b = sin(p.y * 1.9 - t * 0.7 + sin(p.x * 1.1 - t * 0.5) * 1.6);
    float c = 1.0 - abs(a + b) * 0.5;
    return pow(clamp(c, 0.0, 1.0), 7.0);
  }
  void main() {
    vec3 base = mix(uSandA, uSandB, vShade);
    float light = 0.62 + 0.38 * max(dot(vNormalW, normalize(vec3(0.3, 1.0, 0.4))), 0.0);
    float c = caustic(vXZ * 0.9, uTime) * 0.6 + caustic(vXZ * 1.6 + 3.0, uTime * 1.3) * 0.35;
    gl_FragColor = vec4(base * light + vec3(0.75, 0.95, 1.0) * c * 0.45, 1.0);
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
  varying vec2 vUv;
  void main() {
    float edge = smoothstep(0.0, 0.5, vUv.x) * smoothstep(1.0, 0.5, vUv.x);
    float fall = pow(vUv.y, 1.6);
    float flicker = 0.65 + 0.35 * sin(uTime * 0.6 + uPhase);
    gl_FragColor = vec4(vec3(0.85, 0.97, 1.0), edge * fall * flicker * 0.22);
  }
`;

function buildSand() {
  const geo = new THREE.PlaneGeometry(44, 20, 60, 28);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const shade = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    // Rolling dunes rising towards the back of the tank.
    const h = Math.sin(x * 0.45) * 0.18 + Math.cos(z * 0.6 + x * 0.2) * 0.14 + Math.max(0, -z - 3) * 0.12;
    pos.setY(i, h);
    shade[i] = 0.5 + 0.5 * Math.sin(x * 2.3 + z * 1.7) * Math.cos(x * 0.7 - z * 2.1);
  }
  geo.setAttribute('aShade', new THREE.BufferAttribute(shade, 1));
  geo.computeVertexNormals();
  return geo;
}

const ROCKS = [
  [-7.5, -2.9, -4.5, 1.6, '#7d86b8'],
  [-5.8, -3.0, -5.6, 1.2, '#8f84c0'],
  [6.8, -2.9, -4.2, 1.8, '#7d86b8'],
  [8.6, -2.6, -6.0, 2.2, '#6f7aad'],
  [-2.5, -3.1, -6.5, 1.4, '#8f84c0'],
  [2.6, -3.2, -5.6, 1.0, '#9a90c9'],
  [4.6, -3.2, 0.8, 0.45, '#a99fd4'],
  [-3.6, -3.25, 1.4, 0.35, '#a99fd4'],
];

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
          uSandA: { value: new THREE.Color('#f1cf94') },
          uSandB: { value: new THREE.Color('#ffe7bd') },
        },
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
            uniforms: { uTime: { value: 0 }, uPhase: { value: i * 1.7 } },
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
          }),
      ),
    [],
  );
  const rockGeo = useMemo(() => new THREE.DodecahedronGeometry(1, 1), []);
  const rockMats = useMemo(() => {
    const map = new Map();
    ROCKS.forEach((r) => {
      if (!map.has(r[4])) map.set(r[4], new THREE.MeshStandardMaterial({ color: r[4], roughness: 0.9, flatShading: true }));
    });
    return map;
  }, []);

  useEffect(
    () => () => {
      sandGeo.dispose();
      sandMat.dispose();
      rayGeo.dispose();
      rayMats.forEach((m) => m.dispose());
      rockGeo.dispose();
      rockMats.forEach((m) => m.dispose());
    },
    [sandGeo, sandMat, rayGeo, rayMats, rockGeo, rockMats],
  );

  useFrame(() => {
    sandMat.uniforms.uTime.value = world.time;
    rayMats.forEach((m) => (m.uniforms.uTime.value = world.time));
  });

  return (
    <group>
      <mesh geometry={sandGeo} material={sandMat} position={[0, world.floorY - 0.15, -2]} />
      {ROCKS.map(([x, y, z, s, c], i) => (
        <mesh
          key={i}
          geometry={rockGeo}
          material={rockMats.get(c)}
          position={[x, y, z]}
          scale={[s * 1.3, s * 0.8, s]}
          rotation={[i * 0.7, i * 1.3, 0]}
        />
      ))}
      {RAYS.map(([x, z, rot, w], i) => (
        <mesh
          key={i}
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
