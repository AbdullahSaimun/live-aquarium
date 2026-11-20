import { useEffect, useState } from 'react';
import { useStore } from '../state/store';
import { todayInOcean, moonIcon, oceanDate } from '../data/oceanCalendar';

// "Today in the ocean": a small chip beside the time badge. It shows today's event (or the moon), and
// a tap opens a short note in English or Bangla. Special days give the chip a gentle glow.
export default function OceanToday() {
  const lang = useStore((s) => s.settings.factLang);
  const [open, setOpen] = useState(false);
  const day = oceanDate();
  const events = todayInOcean(day);
  const special = events[0].id !== 'plain';
  useEffect(() => {
    if (!open) return undefined;
    const close = () => setOpen(false);
    const id = setTimeout(close, 9000);
    return () => clearTimeout(id);
  }, [open]);
  const bn = lang === 'bn';
  return (
    <div className="ocean-today">
      <button
        className={`ocean-chip${special ? ' is-special' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={bn ? 'আজ সাগরে' : 'Today in the ocean'}
        title={bn ? 'আজ সাগরে' : 'Today in the ocean'}
      >
        {events[0].icon}
      </button>
      {open && (
        <div className={`ocean-note card${bn ? ' bn' : ''}`} role="status">
          <strong>
            {bn ? 'আজ সাগরে' : 'Today in the ocean'} <span aria-hidden="true">{moonIcon(day)}</span>
          </strong>
          {events.map((e) => (
            <p key={e.id}>
              <span aria-hidden="true">{e.icon} </span>
              {bn ? e.bn : e.en}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
