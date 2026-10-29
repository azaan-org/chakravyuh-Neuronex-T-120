'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { LABS, MODULES } from '@/lib/labs';
import { CONCEPTS } from '@/lib/concepts';
import { getProgress, recordEvent, getProfile } from '@/lib/progress';
import { logEvent } from '@/lib/events';
import s from './miner.module.css';

const STATUS = {
  active: { label: 'Misconception', color: 'var(--coral)' },
  fixed: { label: 'Fixed', color: 'var(--ok)' },
  solid: { label: 'Solid', color: 'var(--blue)' },
  untested: { label: 'Not tested', color: 'var(--muted)' }
};

function statusOf(preds, c) {
  const mine = preds.filter(p => p.lab === c.lab && p.q === c.q);
  if (!mine.length) return { st: 'untested' };
  const lastMis = [...mine].reverse().find(p => p.mis);
  const last = mine[mine.length - 1];
  if (!last.correct) return { st: 'active', mis: last.mis || lastMis?.mis };
  return lastMis ? { st: 'fixed', mis: lastMis.mis } : { st: 'solid' };
}

// Sample answers so the Mind Map can be shown before anyone has used the labs
const SAMPLE = [
  ['opamp', 'output-peak', false, 'An op-amp output can go beyond its supply rails'], ['opamp', 'phase', true], ['opamp', 'fix', false, 'A bigger feedback resistor reduces gain'],
  ['pn-junction', 'reverse-width', true], ['pn-junction', 'forward-knee', false, 'A diode conducts fully as soon as it is forward biased'],
  ['logic', 'nand-11', false, 'NAND behaves like AND'], ['logic', 'nand-11', true], ['logic', 'xor-11', true], ['iot', 'best-sensor', false, 'Room temperature reacts quickly to people']
];

export default function Miner() {
  const [prog, setProg] = useState(null);
  const [sel, setSel] = useState(null);
  const [coach, setCoach] = useState(null);
  const [pick, setPick] = useState(null);

  useEffect(() => {
    const sync = () => setProg(getProgress());
    sync(); window.addEventListener('pulse-progress', sync);
    return () => window.removeEventListener('pulse-progress', sync);
  }, []);

  const rows = useMemo(() => prog ? CONCEPTS.map(c => ({ c, ...statusOf(prog.predictions, c) })) : [], [prog]);
  const counts = rows.reduce((a, r) => (a[r.st]++, a), { active: 0, fixed: 0, solid: 0, untested: 0 });
  const active = rows.filter(r => r.st === 'active');
  const cur = rows.find(r => r.c.id === sel) || active[0] || rows.find(r => r.st === 'fixed') || rows[0];

  useEffect(() => {
    if (!prog) return;
    const list = rows.filter(r => r.st !== 'untested').map(r => ({ concept: r.c.name, lab: LABS[r.c.lab].title, status: r.st, belief: r.mis || null }));
    if (!list.length) { setCoach(null); return; }
    let cancel = false;
    fetch('/api/ai', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'coach', name: getProfile().name, concepts: list }) })
      .then(r => r.json()).then(j => { if (!cancel) setCoach(j); }).catch(() => {});
    return () => { cancel = true; };
  }, [prog?.predictions.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { setPick(null); }, [cur?.c.id]);

  function loadSample() { SAMPLE.forEach(([lab, q, correct, mis]) => recordEvent(lab, { type: 'prediction', question: q, correct, misconception: mis || null })); }
  function retry(i) {
    const c = cur.c, ok = i === c.check.ok;
    setPick({ i, ok });
    const msg = { type: 'prediction', question: c.q, choice: c.check.opts[i], correct: ok, misconception: ok ? null : (cur.mis || 'Still unsure about ' + c.name.toLowerCase()) };
    recordEvent(c.lab, msg);
    const p = getProfile();
    logEvent({ class_code: p.classCode || 'DEMO', student: p.name || 'Anonymous', lab: c.lab, ...msg, payload: { source: 'mind-map-retry', concept: c.id } });
  }

  // Mind-map layout: four lab hubs around the student, concepts around each hub
  const W = 760, H = 520, cx = W / 2, cy = H / 2;
  const hubs = MODULES.map((m, k) => { const a = -Math.PI / 2 + k * Math.PI / 2 + Math.PI / 4; return { m, x: cx + Math.cos(a) * 190, y: cy + Math.sin(a) * 150, a }; });

  return (
    <main className="wrap" style={{ paddingBlock: '24px 60px' }}>
      <div className={s.head}>
        <div>
          <div className="eyebrow">Misconception Miner</div>
          <h1 className="display" style={{ fontSize: 'clamp(28px,4vw,42px)', marginTop: 4 }}>My Mind Map</h1>
          <p className={s.lead}>Every prediction you make in a lab tells PulseENTC what you believe. Red concepts are beliefs that don’t match the physics yet. Each one gets its own fix path.</p>
        </div>
        <div className={s.counts}>
          {Object.entries(counts).map(([k, v]) => <div key={k}><b style={{ color: STATUS[k].color }}>{v}</b><span>{STATUS[k].label}</span></div>)}
        </div>
      </div>

      {prog && prog.predictions.length === 0 && (
        <div className={`card ${s.empty}`}>
          <b>Your map is empty.</b> Open any lab and answer its Predict questions, or <button className="btn btn-ghost" onClick={loadSample}>load a sample student</button> to see how the Miner works.
        </div>
      )}

      {coach && (
        <div className={`card ${s.coach}`}>
          <span className={s.coachTag}><i />PulseAI coach{coach.source !== 'ai' && ' · built-in'}</span>
          <p>{coach.text}</p>
        </div>
      )}

      <div className={s.grid}>
        <div className={`card ${s.mapCard}`}>
          <svg viewBox={`0 0 ${W} ${H}`} className={s.map} role="img" aria-label="Concept map of your understanding">
            {hubs.map(h => <line key={h.m.id} x1={cx} y1={cy} x2={h.x} y2={h.y} stroke="#243242" strokeWidth="2" />)}
            {hubs.map(h => {
              const cs = rows.filter(r => LABS[r.c.lab].module === h.m.id);
              return cs.map((r, j) => {
                const spread = cs.length > 1 ? (j / (cs.length - 1) - 0.5) * 1.5 : 0, ang = h.a + spread, x = h.x + Math.cos(ang) * 105, y = h.y + Math.sin(ang) * 82;
                const col = STATUS[r.st].color, on = cur && r.c.id === cur.c.id;
                return (
                  <g key={r.c.id} className={s.node} onClick={() => setSel(r.c.id)} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && setSel(r.c.id)} aria-label={`${r.c.name}: ${STATUS[r.st].label}`}>
                    <line x1={h.x} y1={h.y} x2={x} y2={y} stroke={col} strokeOpacity=".4" strokeWidth="1.5" />
                    <circle cx={x} cy={y} r={on ? 15 : 11} fill={r.st === 'untested' ? '#151f2a' : col} fillOpacity={r.st === 'untested' ? 1 : .85} stroke={on ? '#fff' : col} strokeWidth={on ? 2.5 : 1.5} className={r.st === 'active' ? s.throb : ''} />
                    <text x={x} y={y + (y > h.y ? 30 : -20)} textAnchor="middle" className={s.nl}>{r.c.name}</text>
                  </g>
                );
              });
            })}
            {hubs.map(h => (
              <g key={h.m.id + 'h'}>
                <circle cx={h.x} cy={h.y} r="30" fill="#151f2a" stroke="#3a4d62" strokeWidth="2" />
                <text x={h.x} y={h.y + 4} textAnchor="middle" className={s.hl}>{h.m.name.split(' ')[0]}</text>
              </g>
            ))}
            <circle cx={cx} cy={cy} r="38" fill="#ffd27a" />
            <text x={cx} y={cy + 6} textAnchor="middle" className={s.you}>{(getProfile().name || 'You').split(' ')[0].slice(0, 9)}</text>
          </svg>
          <div className={s.legend}>{Object.entries(STATUS).map(([k, v]) => <span key={k}><i style={{ background: v.color }} />{v.label}</span>)}</div>
        </div>

        {cur && (
          <div className={`card ${s.fix}`}>
            <div className={s.fixHead}>
              <div><span className="eyebrow">{LABS[cur.c.lab].title}</span><h2>{cur.c.name}</h2></div>
              <span className="pill" style={{ color: STATUS[cur.st].color }}>{STATUS[cur.st].label}</span>
            </div>
            {cur.mis && (
              <div className={s.belief}><span>{cur.st === 'fixed' ? 'You used to believe' : 'What you believe right now'}</span>“{cur.mis}”</div>
            )}
            <ol className={s.steps}>
              <li><b>Understand</b><p>{cur.c.model}</p></li>
              <li><b>Watch it happen</b><p>{cur.c.watchText}</p>
                <Link className="btn btn-ghost" href={`/lab/${cur.c.lab}?${new URLSearchParams(cur.c.watch)}`}>Open the simulation →</Link></li>
              <li><b>Prove it with a fresh question</b><p>{cur.c.check.q}</p>
                <div className={s.opts}>
                  {cur.c.check.opts.map((o, i) => (
                    <button key={i} disabled={!!pick} onClick={() => retry(i)} className={pick ? (i === cur.c.check.ok ? s.ok : i === pick.i ? s.no : '') : ''}>{o}</button>
                  ))}
                </div>
                {pick && <p className={pick.ok ? s.okT : s.noT}>{pick.ok ? 'Correct. This concept is now marked as fixed, and your professor’s heatmap updates.' : 'Not yet. Read step 1 again, try the simulation, then come back.'}</p>}
              </li>
            </ol>
            {active.length > 1 && <div className={s.next}>Also to fix: {active.filter(r => r.c.id !== cur.c.id).map(r => <button key={r.c.id} className="chip" onClick={() => setSel(r.c.id)}>{r.c.name}</button>)}</div>}
          </div>
        )}
      </div>
    </main>
  );
}
