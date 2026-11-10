import * as THREE from 'three';
import { world } from '../sim/world';
import { reefTime, reefLight } from './reefLayout';

// How strongly the moving light pattern shows (0 in calm mode, lower on phones).
export const underwaterStrength = { value: 1 };

const FLOOR = world.floorY.toFixed(2);

const PARS = /* glsl */ `
  uniform float uUwTime;
  uniform float uUwLight;
  uniform float uUwStrength;
  varying vec3 vUwPos;
  float uwCaustic(vec2 p, float t) {
    float a = sin(p.x * 1.7 + t * 0.9 + sin(p.y * 1.3 + t * 0.6) * 1.6);
    float b = sin(p.y * 1.9 - t * 0.7 + sin(p.x * 1.1 - t * 0.5) * 1.6);
    return pow(clamp(1.0 - abs(a + b) * 0.5, 0.0, 1.0), 7.0);
  }
`;

// Same light ripples as the sand (Seabed.jsx), on every surface that faces up, plus the way real
// water steals red and dulls colours with distance.
const BODY = /* glsl */ `
  float uwUp = max(inverseTransformDirection(normal, viewMatrix).y, 0.0);
  float uwLow = clamp(1.0 - (vUwPos.y - (${FLOOR})) / 3.6, 0.0, 1.0);
  float uwC = uwCaustic(vUwPos.xz * 0.9, uUwTime) * 0.6 + uwCaustic(vUwPos.xz * 1.6 + 3.0, uUwTime * 1.3) * 0.35;
  gl_FragColor.rgb += vec3(0.75, 0.95, 1.0) * uwC * uwUp * (0.3 + 0.7 * uwLow) * 0.4 * (0.2 + 0.8 * uUwLight) * uUwStrength;
  float uwFar = clamp((length(vUwPos - cameraPosition) - 9.0) / 13.0, 0.0, 1.0);
  float uwGrey = dot(gl_FragColor.rgb, vec3(0.3, 0.59, 0.11));
  gl_FragColor.rgb = mix(gl_FragColor.rgb, uwGrey * vec3(0.68, 0.96, 1.1), uwFar * 0.6);
`;

// Every lit built-in material gets this by default. Materials with their own onBeforeCompile call
// `THREE.Material.prototype.onBeforeCompile.call(material, shader)` first.
THREE.Material.prototype.onBeforeCompile = function (shader) {
  const f = shader.fragmentShader;
  if (this.isShaderMaterial || !f.includes('#include <lights_fragment_begin>') || !f.includes('#include <tonemapping_fragment>')) return;
  shader.uniforms.uUwTime = reefTime;
  shader.uniforms.uUwLight = reefLight;
  shader.uniforms.uUwStrength = underwaterStrength;
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vUwPos;')
    .replace(
      '#include <project_vertex>',
      `#include <project_vertex>
      vec4 uwP = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        uwP = instanceMatrix * uwP;
      #endif
      vUwPos = (modelMatrix * uwP).xyz;`,
    );
  shader.fragmentShader = f
    .replace('#include <common>', `#include <common>\n${PARS}`)
    .replace('#include <tonemapping_fragment>', `${BODY}\n#include <tonemapping_fragment>`);
};
