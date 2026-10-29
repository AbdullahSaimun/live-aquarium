import { forwardRef, useImperativeHandle, useRef } from 'react';
import { SPECIES } from '../data/species';
import { sphereGeo, smallSphereGeo, TAILS, DORSALS, eyeWhiteMat, pupilMat, shineMat, blushMat } from './fishParts';

// Ellipsoid cross-section factor at a given z, used to fit stripes onto the body.
const sectionAt = (z, bz) => Math.sqrt(Math.max(0, 1 - (z / bz) ** 2));

function Eye({ side, bx, by, bz, eyeRef }) {
  const r = Math.min(0.2, by * 0.32);
  return (
    <group ref={eyeRef} position={[side * bx * 0.72, by * 0.22, bz * 0.6]}>
      <mesh geometry={sphereGeo} material={eyeWhiteMat} scale={r} />
      <mesh geometry={smallSphereGeo} material={pupilMat} scale={r * 0.62} position={[side * r * 0.45, 0, r * 0.4]} />
      <mesh geometry={smallSphereGeo} material={shineMat} scale={r * 0.2} position={[side * r * 0.75, r * 0.3, r * 0.6]} />
    </group>
  );
}

/**
 * Procedural cartoon fish facing +Z. Exposes animated parts through the ref.
 */
const FishModel = forwardRef(function FishModel({ species, mats }, ref) {
  const def = SPECIES[species];
  const [bx, by, bz] = def.body;
  const tail = useRef();
  const finL = useRef();
  const finR = useRef();
  const body = useRef();
  const eyeL = useRef();
  const eyeR = useRef();

  useImperativeHandle(ref, () => ({ tail, finL, finR, body, eyeL, eyeR }), []);

  const finScale = bz * 1.05;
  const stripeZs = def.stripes ? (species === 'clownfish' ? [0.42, -0.2, -0.72] : [0.25, -0.15]) : [];
  const stripeDepth = species === 'clownfish' ? 0.09 : 0.05;
  const hasBelly = def.dorsal === 'sail' || def.dorsal === 'tall' || def.dorsal === 'flowy';

  return (
    <group ref={body}>
      <mesh geometry={sphereGeo} material={mats.body} scale={[bx, by, bz]} />
      {stripeZs.map((z) => {
        const zz = z * bz;
        const f = sectionAt(zz, bz) * 1.05;
        return (
          <mesh
            key={z}
            geometry={sphereGeo}
            material={mats.accent}
            position={[0, 0, zz]}
            scale={[bx * f, by * f, stripeDepth]}
          />
        );
      })}

      <mesh
        geometry={DORSALS[def.dorsal]}
        material={mats.fin}
        position={[0, by * 0.82, -bz * 0.05]}
        scale={finScale}
      />
      {hasBelly && (
        <mesh
          geometry={DORSALS[def.dorsal]}
          material={mats.fin}
          position={[0, -by * 0.82, -bz * 0.1]}
          scale={[finScale, -finScale * 0.8, finScale]}
        />
      )}

      <group ref={tail} position={[0, 0, -bz * 0.9]}>
        <mesh geometry={TAILS[def.tail]} material={mats.fin} scale={[1, by * 1.25, bz * 0.95]} />
      </group>

      {[
        [finL, 1],
        [finR, -1],
      ].map(([r, side]) => (
        <group key={side} ref={r} position={[side * bx * 0.85, -by * 0.3, bz * 0.15]}>
          <mesh
            geometry={smallSphereGeo}
            material={mats.fin}
            scale={[bz * 0.2, 0.025, bz * 0.13]}
            position={[side * bz * 0.15, 0, -bz * 0.06]}
          />
        </group>
      ))}

      <Eye side={1} bx={bx} by={by} bz={bz} eyeRef={eyeL} />
      <Eye side={-1} bx={bx} by={by} bz={bz} eyeRef={eyeR} />

      {[1, -1].map((side) => (
        <mesh
          key={side}
          geometry={smallSphereGeo}
          material={blushMat}
          position={[side * bx * 0.7, -by * 0.18, bz * 0.7]}
          scale={[0.02, by * 0.11, bz * 0.1]}
        />
      ))}
    </group>
  );
});

export default FishModel;
