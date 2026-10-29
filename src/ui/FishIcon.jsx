import { SPECIES } from '../data/species';

export default function FishIcon({ fish, size = 34 }) {
  const def = SPECIES[fish.species];
  const pal = def.colors[fish.colorIdx] || def.colors[0];
  const tall = def.body[1] / def.body[2];
  const ry = Math.min(13, 8 + tall * 5);
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <path d="M8 20 L1 11 L1 29 Z" fill={pal.fin} />
      <ellipse cx="22" cy="20" rx="15" ry={ry} fill={pal.body} />
      {def.stripes && <rect x="19" y={20 - ry} width="3.5" height={ry * 2} rx="1.7" fill={pal.accent} opacity="0.9" />}
      <circle cx="30" cy="17" r="3.4" fill="#fff" />
      <circle cx="30.8" cy="17" r="1.9" fill="#1d1b33" />
    </svg>
  );
}
