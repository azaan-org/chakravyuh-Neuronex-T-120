'use client';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import Board from '@/components/Board';
import { WORKBENCHES, analyze, describeWiring } from '@/lib/workbench';
import { chapterById } from '@/lib/curriculum';
import { getProfile, markWorkbench } from '@/lib/progress';
import { logEvent } from '@/lib/events';
import s from './workbench.module.css';

const LEVEL = { error: ['Fault', 'var(--coral)'], warn: ['Warning', 'var(--warn)'], open: ['Incomplete', 'var(--muted)'] };

export default function WorkbenchClient({ id }) {
  const bench = WORKBENCHES[id], ch = chapterById(bench.chapter);
  const initValues = Object.fromEntries(bench.comps.filter(c => c.value).map(c => [c.id, c.value]));
  const [st, setSt] = useState({ wires: [], flips: {}, values: initValues });
  const [hist, setHist] = useState([]);
  const [checked, setChecked] = useState(false);
  const [explain, setExplain] = useState(null);
  const [busy, setBusy] = useState(false);
  const [shared, setShared] = useState(null);
  const [toast, setToast] = useState(null);
  const lastLogged = useRef('');
  const solvedOnce = useRef(false);

  const refSt = useMemo(() => ({ wires: bench.ref, flips: {}, values: initValues }), [bench]); // eslint-disable-line react-hooks/exhaustive-deps
  const refRes = useMemo(() => analyze(bench, refSt), [bench, refSt]);
  const res = useMemo(() => analyze(bench, st), [bench, st]);
  const live = [...res.errors, ...res.warns];            // shown automatically
  const shown = checked ? res.faults : live;             // after “Check” also list missing connections

  // Report detected faults (and success) to the professor's insights
  useEffect(() => {
    const p = getProfile(), base = { class_code: p.classCode || 'DEMO', student: p.name || 'Anonymous', lab: 'workbench:' + id };
    const key = res.errors.map(f => f.code).join(',');
    if (key && key !== lastLogged.current) { res.errors.forEach(f => logEvent({ ...base, type: 'fault', question: f.code, correct: false, misconception: f.title, payload: { wiring: describeWiring(bench, st) } })); }
    lastLogged.current = key;
    if (res.solved && !solvedOnce.current) {
      solvedOnce.current = true; markWorkbench(id, { done: true, at: Date.now() });
      logEvent({ ...base, type: 'workbench', question: 'complete', correct: true, payload: { wires: st.wires.length } });
      flash('Circuit works ✓ Saved to your progress');
    }
    if (!res.solved) solvedOnce.current = false;
    setExplain(null);
  }, [res]); // eslint-disable-line react-hooks/exhaustive-deps

  function flash(t) { setToast(t); setTimeout(() => setToast(null), 2600); }
  const push = next => { setHist(h => [...h.slice(-30), st]); setSt(next); setShared(null); };
  const addWire = (a, b) => { if (st.wires.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) return; push({ ...st, wires: [...st.wires, [a, b]] }); };
  const removeWire = i => push({ ...st, wires: st.wires.filter((_, k) => k !== i) });
  const flip = cid => push({ ...st, flips: { ...st.flips, [cid]: !st.flips[cid] } });
  const undo = () => { if (!hist.length) return; setSt(hist[hist.length - 1]); setHist(h => h.slice(0, -1)); };

  async function askAI() {
    setBusy(true); setChecked(true);
    try {
      const r = await fetch('/api/ai', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'fault', bench: id, wiring: describeWiring(bench, st), faults: res.faults.map(f => ({ title: f.title, explain: f.explain, fix: f.fix, level: f.level })), values: st.values }) });
      setExplain(await r.json());
    } catch { setExplain({ text: res.faults[0] ? `${res.faults[0].explain} ${res.faults[0].fix}` : 'Your circuit matches the reference.', source: 'fallback' }); }
    setBusy(false);
  }
  async function share() {
    const p = getProfile(), f = res.faults[0];
    const body = `Circuit: ${bench.title}\nMy wiring:\n${describeWiring(bench, st).map(x => '• ' + x).join('\n') || '(no wires yet)'}\n\nPulseAI says: ${f ? f.title + '. ' + f.explain : 'it works, but I want to understand why.'}`;
    const r = await fetch('/api/forum', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'thread', lab: bench.lab, title: `Help: my ${bench.title.toLowerCase()}${f ? ' · ' + f.title.toLowerCase() : ''}`, body, author: p.name || 'Anonymous' }) });
    const j = await r.json(); if (j.thread) { setShared(j.thread.id); flash('Shared with your class network'); }
  }

  const resistors = bench.comps.filter(c => c.values?.length > 1);
  const faultTerms = shown.flatMap(f => f.terms);

  return (
    <main className={s.page}>
      <div className={s.head}>
        <div className={s.crumbs}><Link href="/">Curriculum</Link><span>›</span><Link href={`/learn/${ch.id}`}>{ch.title}</Link><span>›</span><b>Circuit workbench</b></div>
        <div className={s.titleRow}>
          <div><h1 className={s.h1}>{bench.title}</h1><p className={s.goal}>{bench.goal}</p></div>
          <div className={s.score}><b>{res.solved ? '✓' : `${res.matched}/${res.total}`}</b><span>{res.solved ? 'Circuit works' : 'reference connections made'}</span></div>
        </div>
      </div>

      <div className={s.grid}>
        <section className={`card ${s.refCard}`}>
          <div className={s.cardHead}><span className="eyebrow" style={{ color: 'var(--blue)' }}>Reference simulator</span><span className={s.okPill}>Working circuit</span></div>
          <Board bench={bench} st={refSt} view={refRes.view} readOnly small />
          <ol className={s.steps}>{bench.steps.map((x, i) => <li key={i}>{x}</li>)}</ol>
        </section>

        <section className={`card ${s.benchCard}`}>
          <div className={s.cardHead}>
            <span className="eyebrow" style={{ color: 'var(--ok)' }}>Your workbench · click a terminal, then another, to connect a wire</span>
            <div className={s.tools}>
              <button className="btn btn-ghost" onClick={undo} disabled={!hist.length}>Undo</button>
              <button className="btn btn-ghost" onClick={() => push({ ...st, wires: [] })} disabled={!st.wires.length}>Clear</button>
              <button className="btn btn-ghost" onClick={() => push({ ...st, wires: bench.broken.wires, flips: bench.broken.flips || {} })} title="Load a circuit with a common mistake">Load a faulty circuit</button>
            </div>
          </div>
          <Board bench={bench} st={st} view={res.view} onAddWire={addWire} onRemoveWire={removeWire} onFlip={flip} faultTerms={faultTerms} />
          <div className={s.controls}>
            {resistors.map(c => (
              <label key={c.id} className={s.ctl}>{c.label}
                <select value={st.values[c.id]} onChange={e => push({ ...st, values: { ...st.values, [c.id]: +e.target.value } })}>
                  {c.values.map(v => <option key={v} value={v}>{v >= 1000 ? v / 1000 + ' kΩ' : v + ' Ω'}</option>)}
                </select>
              </label>
            ))}
            {res.view.current !== undefined && <span className={s.meter}>LED current <b>{(res.view.current * 1000).toFixed(1)} mA</b></span>}
            {res.view.gain !== undefined && <span className={s.meter}>Gain −Rf/Rin <b>{res.view.gain.toFixed(1)}</b></span>}
            <span className={s.hint}>Click a wire to remove it · Esc cancels</span>
          </div>
        </section>
      </div>

      <section className={`card ${s.inspector} ${res.solved ? s.win : live.some(f => f.level === 'error') ? s.alert : ''}`}>
        <div className={s.inspHead}>
          <div className={s.inspTitle}><span className={s.dot} /><b>AI Fault Inspector</b>
            <span className={s.status}>{res.solved ? 'Circuit works and matches the goal.' : live.length ? `${live.length} problem${live.length > 1 ? 's' : ''} detected in your wiring` : st.wires.length ? 'No faults so far. Keep wiring.' : 'Start by connecting the first wire.'}</span>
          </div>
          <div className={s.tools}>
            <button className="btn btn-primary" onClick={askAI} disabled={busy}>{busy ? 'PulseAI is checking…' : 'Check my circuit with AI'}</button>
            <button className="btn btn-ghost" onClick={share} disabled={!!shared}>{shared ? 'Shared to Network ✓' : 'Ask classmates'}</button>
            {shared && <Link className="btn btn-ghost" href="/network">Open Network →</Link>}
          </div>
        </div>
        {res.solved && <p className={s.winText}>Every connection is correct. {res.view.current ? `The LED carries ${(res.view.current * 1000).toFixed(1)} mA.` : ''} {res.view.gain ? `The output is inverted with a gain of ${res.view.gain.toFixed(1)}.` : ''} Go back to the chapter or try “Load a faulty circuit” to see how the AI catches mistakes.</p>}
        <div className={s.faults}>
          {shown.map((f, i) => (
            <div key={f.code + i} className={s.fault} style={{ borderLeftColor: LEVEL[f.level][1] }}>
              <span className={s.lvl} style={{ color: LEVEL[f.level][1] }}>{LEVEL[f.level][0]}</span>
              <b>{f.title}</b><p>{f.explain}</p><p className={s.fix}><span>Suggested fix:</span> {f.fix}</p>
            </div>
          ))}
        </div>
        {explain && <div className={s.ai}><span className={s.aiTag}>PulseAI{explain.source !== 'ai' ? ' · built-in' : ''}</span><p>{explain.text}</p></div>}
      </section>
      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}
