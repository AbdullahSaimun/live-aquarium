import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { world } from '../sim/world';
import { getState, useStore } from '../state/store';

const p = new THREE.Vector3();
const SPEED = 4; // the sonar ring grows this many units per second (SubGear.jsx)
const LABEL = {
  en: { crab: 'Crab', octopus: 'Octopus', trash: 'Rubbish', treasure: 'Treasure', target: 'Target', bottle: 'Bottle', bag: 'Plastic bag', can: 'Can', net: 'Fishing net', conch: 'Conch shell', pearl: 'Pearl', coin: 'Gold coin', message: 'Message bottle' },
  bn: { crab: 'কাঁকড়া', octopus: 'অক্টোপাস', trash: 'ময়লা', treasure: 'গুপ্তধন', target: 'নিশানা', bottle: 'বোতল', bag: 'প্লাস্টিকের ব্যাগ', can: 'ক্যান', net: 'মাছ ধরার জাল', conch: 'শঙ্খ', pearl: 'মুক্তা', coin: 'সোনার মুদ্রা', message: 'চিঠির বোতল' },
};

// Sonar name tags: as the ping's ring passes something, a little tag pops up over it for a moment.
export default function SonarTags() {
  const lang = useStore((s) => s.settings.factLang);
  const [tags, setTags] = useState([]);
  const pinged = useRef(-Infinity);
  const seen = useRef(new Set());
  const els = useRef(new Map());

  useEffect(() => {
    let id;
    const L = LABEL[lang] || LABEL.en;
    const frame = () => {
      id = requestAnimationFrame(frame);
      const r = world.renderer;
      if (!r) return;
      const g = world.gear;
      if (g.sonar.t !== pinged.current) {
        pinged.current = g.sonar.t;
        seen.current = new Set();
        setTags([]);
      }
      const age = world.time - g.sonar.t;
      if (age < 0 || age > 6) {
        if (tags.length) setTags([]);
        return;
      }
      // Who has the ring reached?
      const radius = age * SPEED;
      const found = [];
      const names = new Map(getState().fish.map((f) => [f.id, f.name]));
      for (const [id2, rt] of world.runtime) found.push([`f${id2}`, `🐠 ${names.get(id2) || ''}`, rt.pos]);
      if (world.crabPos.y > -20) found.push(['crab', `🦀 ${L.crab}`, world.crabPos]);
      if (world.octopusPos.y > -20) found.push(['octopus', `🐙 ${L.octopus}`, world.octopusPos]);
      g.items.forEach((it, i) => {
        if (!it.active) return;
        const icon = it.kind === 'treasure' ? '💎' : it.kind === 'target' ? '🎯' : '🗑️';
        found.push([`i${i}`, `${icon} ${L[it.type] || L[it.kind]}`, it.pos]);
      });
      const fresh = found.filter(([key, , pos]) => !seen.current.has(key) && pos.distanceTo(g.sonar.origin) < radius && age < 2.5);
      if (fresh.length) {
        fresh.forEach(([key]) => seen.current.add(key));
        setTags((old) => [...old, ...fresh.map(([key, label, pos]) => ({ key, label, pos, born: world.time }))]);
      }
      // Keep each tag over its owner.
      const { camera, size } = r;
      els.current.forEach((el, key) => {
        const tag = el && el.__tag;
        if (!tag) return;
        p.copy(tag.pos).project(camera);
        const x = ((p.x + 1) / 2) * size.width;
        const y = ((1 - p.y) / 2) * size.height - 26;
        const fade = Math.max(0, 1 - (world.time - tag.born - 2.5) / 0.6);
        el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -100%)`;
        el.style.opacity = String(fade);
        if (key && fade <= 0) el.style.display = 'none';
      });
    };
    id = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(id);
  }, [lang, tags.length]);

  if (!tags.length) return null;
  return (
    <div className="sonar-tags" aria-hidden="true">
      {tags.map((t) => (
        <span
          key={t.key}
          className="sonar-tag"
          ref={(el) => {
            if (el) {
              el.__tag = t;
              els.current.set(t.key, el);
            } else els.current.delete(t.key);
          }}
        >
          {t.label}
        </span>
      ))}
    </div>
  );
}
