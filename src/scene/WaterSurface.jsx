import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { world } from '../sim/world';

const vertex = /* glsl */ `
  varying vec2 vXZ;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vXZ = w.xz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const fragment = /* glsl */ `
  uniform float uTime;
  uniform float uLight;
  uniform float uDusk;
  varying vec2 vXZ;
  float wave(vec2 p, float t) {
    float a = sin(p.x * 1.3 + t * 0.8 + sin(p.y * 1.1 + t * 0.5) * 1.8);
    float b = sin(p.y * 1.6 - t * 0.6 + sin(p.x * 0.9 - t * 0.4) * 1.8);
    return pow(clamp(1.0 - abs(a + b) * 0.5, 0.0, 1.0), 5.0);
  }
  void main() {
    // The underside of the waves: bright, moving light lines over a soft sheen.
    float c = wave(vXZ * 0.8, uTime) * 0.7 + wave(vXZ * 1.7 + 4.0, uTime * 1.25) * 0.4;
    vec3 day = vec3(0.85, 0.97, 1.0);
    vec3 col = mix(vec3(0.45, 0.6, 0.95), day, uLight);
    col = mix(col, vec3(1.0, 0.82, 0.68), uDusk * 0.7);
    // Fade out towards the far back and the front edge (per pixel: the plane has only 4 corners).
    float fade = smoothstep(-14.0, -6.0, vXZ.y) * (1.0 - smoothstep(1.5, 6.0, vXZ.y)) * (1.0 - smoothstep(12.0, 20.0, abs(vXZ.x)));
    float a = (0.1 + c * 0.55) * fade * (0.35 + 0.65 * uLight);
    gl_FragColor = vec4(col, a);
  }
`;

// The rippling water surface seen from below, at the top of the tank.
export default function WaterSurface() {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(40, 20, 1, 1);
    g.rotateX(Math.PI / 2); // facing down, towards the fish
    return g;
  }, []);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        uniforms: { uTime: { value: 0 }, uLight: { value: 1 }, uDusk: { value: 0 } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    [],
  );
  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat],
  );
  useFrame(() => {
    mat.uniforms.uTime.value = world.time;
    mat.uniforms.uLight.value = world.light;
    mat.uniforms.uDusk.value = world.dusk;
  });
  return <mesh geometry={geo} material={mat} position={[0, world.surfaceY + 0.9, -4]} renderOrder={-1} />;
}
