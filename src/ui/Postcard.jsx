import { useEffect, useState } from 'react';
import { world } from '../sim/world';
import { useStore, openPanel, getState, sfx } from '../state/store';
import { moonIcon } from '../data/oceanCalendar';
import { PHASE_ICON } from '../state/daylight';

const W = 1200;
const H = 900;

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

// Renders one fresh frame of the tank and turns it into a framed postcard (a PNG data URL).
function makePostcard(lang, focus = null) {
  return new Promise((resolve) => {
    const r = world.renderer;
    if (!r) return resolve(null);
    requestAnimationFrame(() => {
      r.gl.render(r.scene, r.camera);
      const src = r.gl.domElement;
      const out = document.createElement('canvas');
      out.width = W;
      out.height = H;
      const g = out.getContext('2d');
      // Paper.
      g.fillStyle = '#fffaf2';
      roundRect(g, 0, 0, W, H, 36);
      g.fill();
      // The photo, cropped to fill its window.
      const px = 40;
      const py = 40;
      const pw = W - 80;
      const ph = H - 220;
      const zoom = focus ? 1.8 : 1; // the submarine's camera sees a closer view
      const scale = Math.max(pw / src.width, ph / src.height) * zoom;
      const sw = pw / scale;
      const sh = ph / scale;
      let cx = src.width / 2;
      let cy = src.height / 2;
      if (focus) {
        const p = focus.clone().project(r.camera);
        cx = ((p.x + 1) / 2) * src.width + (world.sub.dir || 1) * sw * 0.25; // look ahead of the sub
        cy = ((1 - p.y) / 2) * src.height;
        cx = Math.min(src.width - sw / 2, Math.max(sw / 2, cx));
        cy = Math.min(src.height - sh / 2, Math.max(sh / 2, cy));
      }
      g.save();
      roundRect(g, px, py, pw, ph, 24);
      g.clip();
      // The tank's water colour sits behind the see-through 3D canvas, so paint it in first.
      const night = 1 - world.light;
      const water = g.createLinearGradient(0, py, 0, py + ph);
      water.addColorStop(0, night > 0.5 ? '#1d3f78' : '#7fd6f2');
      water.addColorStop(1, night > 0.5 ? '#0b1d3f' : '#2a86c2');
      g.fillStyle = water;
      g.fillRect(px, py, pw, ph);
      g.drawImage(src, cx - sw / 2, cy - sh / 2, sw, sh, px, py, pw, ph);
      g.restore();
      // Writing on the card.
      const s = getState();
      const bn = lang === 'bn';
      const date = new Date().toLocaleDateString(bn ? 'bn-BD' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      const weather = world.weather.rain > 0.3 ? '🌧️' : PHASE_ICON[s.daylight];
      g.fillStyle = '#1f3b57';
      g.font = 'bold 44px system-ui, sans-serif';
      g.fillText(`🐠 ${bn ? 'আমার ছোট্ট সাগর' : 'My Little Ocean'}`, 48, H - 118);
      g.font = '30px system-ui, sans-serif';
      g.fillStyle = '#4a6a86';
      g.textAlign = 'right';
      g.fillText(`${date}  ${weather} ${moonIcon()}`, W - 48, H - 118);
      g.textAlign = 'left';
      const names = s.fish.map((f) => f.name).join(' · ');
      g.font = '28px system-ui, sans-serif';
      g.fillStyle = '#5b7a95';
      g.fillText(names.length > 70 ? `${names.slice(0, 68)}…` : names, 48, H - 66);
      resolve(out.toDataURL('image/png'));
    });
  });
}

// The postcard panel: a fresh picture of the tank, ready to save or share. Nothing is uploaded.
export default function Postcard() {
  const lang = useStore((s) => s.settings.factLang);
  const focused = useStore((s) => s.postcardFocus);
  const [url, setUrl] = useState(null);
  const bn = lang === 'bn';
  const take = () => makePostcard(lang, focused && world.sub.phase !== 'idle' ? world.sub.pos : null);
  useEffect(() => {
    if (!focused) sfx('light');
    take().then(setUrl);
    return () => {
      getState().postcardFocus = false;
    };
  }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps
  const file = `my-little-ocean-${new Date().toISOString().slice(0, 10)}.png`;
  const canShare = typeof navigator !== 'undefined' && navigator.canShare;
  const share = async () => {
    try {
      const blob = await (await fetch(url)).blob();
      const f = new File([blob], file, { type: 'image/png' });
      if (navigator.canShare({ files: [f] })) await navigator.share({ files: [f], title: 'My Little Ocean' });
    } catch {
      // the share sheet was closed: nothing to do
    }
  };
  return (
    <aside className="card panel postcard-panel">
      <button className="card-close" onClick={() => openPanel(null)} aria-label="Close">
        ✕
      </button>
      <div className="panel-title">
        <span className="panel-emoji">📷</span>
        <h2 className={bn ? 'bn' : ''}>{bn ? 'পোস্টকার্ড' : 'Postcard'}</h2>
      </div>
      {url ? <img className="postcard-img" src={url} alt={bn ? 'অ্যাকুরিয়ামের ছবি' : 'A picture of the aquarium'} /> : <div className="postcard-img postcard-wait">📷</div>}
      <div className="settings-row">
        <a className={`btn-small btn-soft${url ? '' : ' is-disabled'}`} href={url || undefined} download={file}>
          💾 {bn ? 'ছবি রাখো' : 'Save picture'}
        </a>
        {canShare && url && (
          <button className="btn-small btn-soft" onClick={share}>
            📤 {bn ? 'শেয়ার করো' : 'Share'}
          </button>
        )}
        <button className="btn-small btn-soft" onClick={() => (setUrl(null), take().then(setUrl))}>
          🔄 {bn ? 'আবার তোলো' : 'Take again'}
        </button>
      </div>
    </aside>
  );
}
