import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useCursor } from '@react-three/drei';
import { SPECIES } from '../data/species';
import { world, removePellet } from '../sim/world';
import { createRuntime, updateFish, fishScale } from '../sim/fishBrain';
import { eatPellet, petFish, FLIP_TIME } from '../state/store';
import { labelEls, bumpLabels } from '../state/labels';
import { sphereGeo, hitMat, createFishMaterials, applyPalette, disposeFishMaterials } from './fishParts';
import FishModel from './FishModel';

const screen = new THREE.Vector3();

export default function Fish({ fish }) {
  const def = SPECIES[fish.species];
  const palette = def.colors[fish.colorIdx] || def.colors[0];
  const mats = useMemo(() => createFishMaterials(), []);
  const rt = useMemo(() => createRuntime(fish), [fish]);
  const root = useRef();
  const pose = useRef();
  const parts = useRef();
  const lastEmote = useRef(null);
  const curScale = useRef(fishScale(fish));
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);

  const healthStep = Math.round(fish.health * 10) / 10;
  useEffect(() => applyPalette(mats, palette, healthStep), [mats, palette, healthStep]);
  useEffect(() => () => disposeFishMaterials(mats), [mats]);
  useEffect(() => {
    world.runtime.set(fish.id, rt);
    delete fish.spawnAt;
    return () => world.runtime.delete(fish.id);
  }, [fish, rt]);

  useFrame(({ camera, size }, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const ate = updateFish(fish, rt, dt, world.runtime.values());
    if (ate && ate.active) {
      eatPellet(fish, ate);
      removePellet(ate);
    }

    const t = world.time;
    const target = fishScale(fish);
    curScale.current += (target - curScale.current) * Math.min(1, dt * 1.5);
    const s = curScale.current;

    root.current.position.copy(rt.pos);
    const g = pose.current;
    g.scale.setScalar(s);
    // Barrel roll after a tap: eased full turn around the body axis.
    let roll = 0;
    if (rt.flip > 0) {
      rt.flip = Math.max(0, rt.flip - dt);
      const k = 1 - rt.flip / FLIP_TIME;
      roll = (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2) * Math.PI * 2;
    }
    // A fainted fish rolls belly-up, wobbling a little, until it comes round.
    roll += rt.faint * (Math.PI * 0.85 + Math.sin(t * 2 + rt.tailPhase) * 0.15);
    g.rotation.set(rt.pitch, rt.yaw, roll + Math.sin(t * 13 + rt.tailPhase) * 0.22 * rt.wiggle, 'YXZ');
    g.position.y = Math.abs(Math.sin(t * 7)) * 0.15 * rt.wiggle * (rt.happyTimer > 0 ? 1 : 0.3);

    const p = parts.current;
    if (p) {
      const sway = Math.sin(rt.tailPhase);
      p.tail.current.rotation.y = sway * (0.4 + rt.wiggle * 0.25);
      p.body.current.rotation.y = -sway * 0.06;
      const flap = Math.sin(rt.tailPhase * 1.3) * 0.35;
      p.finL.current.rotation.set(0, 0.5 + flap * 0.5, flap);
      p.finR.current.rotation.set(0, -0.5 - flap * 0.5, -flap);
      const eyeY = 1 - rt.squint * 0.8;
      p.eyeL.current.scale.y = eyeY;
      p.eyeR.current.scale.y = eyeY;
    }

    // Pin this fish's DOM label just above its head.
    const el = labelEls.get(fish.id);
    if (el) {
      screen.copy(rt.pos);
      screen.y += def.body[1] * s + 0.3;
      screen.project(camera);
      if (screen.z < 1) {
        const x = ((screen.x + 1) / 2) * size.width;
        const y = ((1 - screen.y) / 2) * size.height;
        el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      }
    }
    if (rt.emote !== lastEmote.current) {
      lastEmote.current = rt.emote;
      bumpLabels();
    }
  });

  const onClick = (e) => {
    e.stopPropagation();
    petFish(fish);
  };
  const bz = def.body[2];

  return (
    <group ref={root}>
      <group ref={pose}>
        <FishModel ref={parts} species={fish.species} mats={mats} />
        <mesh
          geometry={sphereGeo}
          material={hitMat}
          scale={[Math.max(0.6, def.body[0] * 1.6), Math.max(0.6, def.body[1] * 1.4), bz * 1.6]}
          onClick={onClick}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        />
      </group>
    </group>
  );
}
