import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useCursor } from '@react-three/drei';
import { SPECIES } from '../data/species';
import { world, removePellet, queueEffect } from '../sim/world';
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
    // At night, a fish swimming briskly stirs up glowing plankton behind it.
    if (world.light < 0.35 && world.detail !== 'low' && rt.vel.lengthSq() > 0.25) {
      rt.glowTrail = (rt.glowTrail || 0) - dt;
      if (rt.glowTrail <= 0) {
        rt.glowTrail = 0.35 + Math.random() * 0.4;
        queueEffect('sparkles', rt.pos, 1);
      }
    }
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
    // Glance: turn the head a little towards whatever caught its eye.
    let glance = 0;
    if (rt.lookTime > 0) {
      const want = Math.atan2(rt.look.x - rt.pos.x, rt.look.z - rt.pos.z) - rt.yaw;
      glance = THREE.MathUtils.clamp(Math.atan2(Math.sin(want), Math.cos(want)), -0.5, 0.5) * Math.min(1, rt.lookTime);
    }
    rt.glance += (glance - rt.glance) * Math.min(1, dt * 3);
    // The head leads into a turn, the body follows.
    const lead = THREE.MathUtils.clamp(rt.turnRate * 0.12, -0.25, 0.25);
    g.rotation.set(rt.pitch, rt.yaw + lead + rt.glance, roll + rt.bank + Math.sin(t * 13 + rt.tailPhase) * 0.22 * rt.wiggle, 'YXZ');
    g.position.y = Math.abs(Math.sin(t * 7)) * 0.15 * rt.wiggle * (rt.happyTimer > 0 ? 1 : 0.3);

    const p = parts.current;
    if (p) {
      const sway = Math.sin(rt.tailPhase);
      // The faster it swims, the wider the tail sweeps; the body bends the other way in an S.
      const drive = Math.min(1, rt.thrust * 0.8 + rt.vel.length() / 3);
      const flinch = rt.startle > 0 ? 0.45 : 0;
      p.tail.current.rotation.y = sway * (0.1 + drive * 0.42 + rt.wiggle * 0.25 + flinch);
      p.body.current.rotation.y = -sway * (0.03 + drive * 0.08 + flinch * 0.3);
      // Pectoral fins scull quickly while hovering and tuck in during a fast burst.
      const scull = rt.hover > 0 ? 1 : 1 - drive * 0.6;
      const flap = Math.sin(t * (rt.hover > 0 ? 9 : 5) * rt.tempo + rt.tailPhase * 0.3) * 0.35 * scull;
      p.finL.current.rotation.set(0, 0.5 + flap * 0.5, flap);
      p.finR.current.rotation.set(0, -0.5 - flap * 0.5, -flap);
      // Pufferfish: blow up into a round, spiky ball.
      if (p.spikes.current) {
        p.body.current.scale.setScalar(1 + rt.puff * 0.6);
      } else {
        // Breathing: a slow, barely-there swell of the body.
        const breath = 1 + Math.sin(t * rt.breathRate) * 0.012;
        p.body.current.scale.set(breath, breath, 1);
      }
      if (p.spikes.current) {
        p.spikes.current.visible = rt.puff > 0.04;
        p.spikes.current.children.forEach((m) => m.scale.setScalar(Math.max(0.001, rt.puff)));
      }
      p.hat.current.visible = world.party;
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
