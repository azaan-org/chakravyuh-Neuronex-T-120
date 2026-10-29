'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import { LABS, LAB_LIST, MODULES } from '@/lib/labs';
import { QUESTIONS, questionKey } from '@/lib/questions';
import { CHAPTERS, chapterById, subjectById } from '@/lib/curriculum';
import { WORKBENCHES } from '@/lib/workbench';
import { fetchEvents, insertEvents, clearClass } from '@/lib/events';
import s from './prof.module.css';

const pct = (n, d) => d ? Math.round(n / d * 100) : 0;
const heat = p => `rgba(255,111,94,${0.08 + Math.min(1, p / 70) * 0.55})`;
const chapterOfEvent = e => e.lab?.startsWith('chapter:') ? e.lab.slice(8) : e.lab?.startsWith('workbench:') ? WORKBENCHES[e.lab.slice(10)]?.chapter : CHAPTERS.find(c => c.sims.some(sm => sm.kind === 'lab' && sm.id === e.lab))?.id;
const FAULT_NAMES = {};
Object.values(WORKBENCHES).forEach(() => {});

const DEMO_QUESTIONS = {
  'pn-diode': ['Why does the depletion region widen in reverse bias?', 'What is the difference between knee voltage and barrier potential?', 'Why is reverse current not zero?'],
  'rectifiers': ['Why is the output only positive humps?', 'What happens if I reverse the diode?'],
  'opamp-basics': ['Why does the output clip at 4 V and not 5 V?', 'What is virtual ground exactly?', 'Why is the output inverted?', 'How do I choose Rf for a gain of 5?'],
  'logic-gates': ['How is XOR different from OR?', 'Why is NAND called universal?'],
  'arduino': ['Why do I need a resistor with the LED?', 'What does pinMode do?'],
  'combinational': ['How do I get the expression from a truth table?'],
  'iot': ['What does analogRead return?']
};
const DEMO_FAULTS = { led: [['no-resistor', 'No current-limiting resistor: the LED burns out', .34], ['reversed', 'The LED is connected backwards', .3]], rectifier: [['reversed', 'The diode is backwards: the output is negative', .28], ['no-diode', 'The diode is not in the current path', .12]], opamp: [['positive-feedback', 'Rf gives positive feedback', .42], ['non-ground', 'The + input is not grounded', .3], ['no-feedback', 'No feedback path: the op-amp runs open loop', .18]], blink: [['wrong-pin-5v', 'LED is on the 5V pin, not pin 13', .22], ['no-resistor', 'No resistor: pin 13 is overloaded', .2]] };

export default function Professor() {
  const [code, setCode] = useState('DEMO');
  const [events, setEvents] = useState([]);
  const [live, setLive] = useState(false);
  const [joinQR, setJoinQR] = useState('');
  const [origin, setOrigin] = useState('');
  const [insight, setInsight] = useState(null);
  const [seeding, setSeeding] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [confirmClear, setConfirmClear] = useState(false);
  const [mats, setMats] = useState([]);

  useEffect(() => {
    let o = location.origin; try { const c = localStorage.getItem('pulse.prof.class'); if (c) setCode(c); const b = localStorage.getItem('pulse.prof.base'); if (b) o = b; } catch {} setOrigin(o);
    fetch('/api/materials', { cache: 'no-store' }).then(r => r.json()).then(j => setMats(j.items || [])).catch(() => {});
  }, []);
  useEffect(() => { if (origin) try { localStorage.setItem('pulse.prof.base', origin); } catch {} }, [origin]);
  useEffect(() => { try { localStorage.setItem('pulse.prof.class', code); } catch {} }, [code]);
  useEffect(() => { if (origin) QRCode.toDataURL(`${origin}/login?class=${code}`, { margin: 1, width: 360, color: { dark: '#0a0f15', light: '#ffffff' } }).then(setJoinQR); }, [origin, code]);
  const isLocal = /localhost|127\.0\.0\.1/.test(origin);

  useEffect(() => {
    let cancelled = false, last = 0, timer; setEvents([]);
    const tick = async () => {
      try {
        const j = await fetchEvents(code, last); if (cancelled) return;
        if (j.lastId < last) { last = 0; setEvents([]); }
        else if (j.events.length) { last = j.events[j.events.length - 1].id; setEvents(ev => [...j.events.reverse(), ...ev].slice(0, 5000)); }
        setLive(true);
      } catch { if (!cancelled) setLive(false); }
      if (!cancelled) timer = setTimeout(tick, 1500);
    };
    tick(); return () => { cancelled = true; clearTimeout(timer); };
  }, [code, resetKey]);

  const A = useMemo(() => {
    const students = [...new Set(events.map(e => e.student).filter(Boolean))];
    // Chapter difficulty: questions asked to the AI, circuit faults, wrong predictions
    const chap = CHAPTERS.map(c => ({ c, questions: 0, faults: 0, wrong: 0, total: 0, done: 0, who: new Set() }));
    const byId = Object.fromEntries(chap.map(x => [x.c.id, x]));
    events.forEach(e => {
      const x = byId[chapterOfEvent(e)]; if (!x) return; x.who.add(e.student);
      if (e.type === 'ai_question') x.questions++;
      if (e.type === 'fault') x.faults++;
      if (e.type === 'workbench' && e.correct) x.done++;
      if (e.type === 'prediction' || e.type === 'challenge') { x.total++; if (!e.correct) x.wrong++; }
    });
    chap.forEach(x => { x.score = x.questions * 1 + x.faults * 1.6 + x.wrong * 1.3; x.students = x.who.size; });
    const ranked = chap.filter(x => x.score > 0).sort((a, b) => b.score - a.score);
    const maxScore = ranked[0]?.score || 1;
    // Circuit faults
    const faultMap = {};
    events.filter(e => e.type === 'fault').forEach(e => { const b = e.lab.slice(10), k = b + ':' + e.question; const f = faultMap[k] = faultMap[k] || { bench: b, code: e.question, title: e.misconception || e.question, n: 0, who: new Set() }; f.n++; f.who.add(e.student); });
    const faults = Object.values(faultMap).map(f => ({ ...f, students: f.who.size })).sort((a, b) => b.students - a.students).slice(0, 8);
    // AI questions
    const qs = events.filter(e => e.type === 'ai_question' && e.choice).slice(0, 400);
    const qByChapter = {};
    qs.forEach(e => { const c = chapterOfEvent(e); (qByChapter[c] = qByChapter[c] || []).push(e); });
    // Misconceptions (predict questions)
    const preds = events.filter(e => e.type === 'prediction'), byQ = {};
    preds.forEach(e => { const k = questionKey(e.lab, e.question); const q = byQ[k] = byQ[k] || { key: k, lab: e.lab, total: 0, wrong: 0, mis: {} }; q.total++; if (!e.correct) { q.wrong++; if (e.misconception) q.mis[e.misconception] = (q.mis[e.misconception] || 0) + 1; } });
    const rows = Object.values(byQ).map(q => { const top = Object.entries(q.mis).sort((a, b) => b[1] - a[1])[0]; return { ...q, p: pct(q.wrong, q.total), top: top?.[0], topN: top?.[1] || 0 }; });
    const misRank = rows.filter(r => r.top).map(r => ({ misconception: r.top, wrong: r.topN, total: r.total, lab: r.lab })).sort((a, b) => b.wrong / b.total - a.wrong / a.total);
    // Per student
    const per = students.map(name => {
      const ev = events.filter(e => e.student === name), pr = ev.filter(e => e.type === 'prediction');
      const f = ev.filter(e => e.type === 'fault').length, built = new Set(ev.filter(e => e.type === 'workbench' && e.correct).map(e => e.lab)).size;
      const acc = pr.length ? pr.filter(e => e.correct).length / pr.length : null;
      const chs = new Set(ev.map(chapterOfEvent).filter(Boolean));
      const risk = (acc !== null && acc < 0.5 ? 2 : 0) + (f >= 4 ? 2 : f >= 2 ? 1 : 0) + (built === 0 && f > 0 ? 1 : 0);
      return { name, preds: pr.length, acc, faults: f, built, questions: ev.filter(e => e.type === 'ai_question').length, chapters: chs.size, risk, last: ev[0]?.created_at };
    }).sort((a, b) => b.risk - a.risk || b.faults - a.faults);
    return { students, ranked, maxScore, faults, qByChapter, qs, rows, misRank, per, preds: preds.length, correct: preds.filter(e => e.correct).length, faultsTotal: events.filter(e => e.type === 'fault').length, built: events.filter(e => e.type === 'workbench' && e.correct).length, questions: qs.length };
  }, [events]);

  async function seed() {
    setSeeding(true);
    let r = 11; const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
    const names = ['Aarav Shah', 'Diya Patil', 'Kabir Joshi', 'Ananya Kulkarni', 'Vihaan Deshpande', 'Isha More', 'Arjun Nair', 'Sneha Pawar', 'Rohan Gupta', 'Meera Iyer', 'Siddharth Rao', 'Pooja Jadhav', 'Aditya Kale', 'Neha Sharma', 'Omkar Bhosale', 'Riya Menon', 'Tanmay Gokhale', 'Shruti Desai', 'Yash Chavan', 'Kavya Reddy', 'Harsh Mehta', 'Tanvi Shinde', 'Nikhil Verma', 'Aditi Apte'];
    const rows = [];
    names.forEach((n, si) => {
      const student = n + ' (demo)', weak = si % 5 === 0;
      Object.entries(QUESTIONS).forEach(([k, q]) => {
        if (rnd() < 0.15) return; const [lab, qid] = k.split(':'); let x = rnd() * (weak ? 0.6 : 1), mis = null;
        for (const [m, p] of q.wrong) { if (x < p) { mis = m; break; } x -= p; }
        rows.push({ class_code: code, student, lab, type: 'prediction', question: qid, correct: !mis, misconception: mis, payload: { demo: true } });
      });
      Object.entries(DEMO_QUESTIONS).forEach(([ch, list]) => list.forEach(q => { if (rnd() < (ch === 'opamp-basics' ? 0.55 : 0.28)) rows.push({ class_code: code, student, lab: 'chapter:' + ch, type: 'ai_question', question: 'slide-' + (1 + Math.floor(rnd() * 4)), choice: q, payload: { demo: true } }); }));
      Object.entries(DEMO_FAULTS).forEach(([b, list]) => {
        let failed = false;
        list.forEach(([c, t, p]) => { if (rnd() < p * (weak ? 1.8 : 1)) { failed = true; rows.push({ class_code: code, student, lab: 'workbench:' + b, type: 'fault', question: c, correct: false, misconception: t, payload: { demo: true } }); } });
        if (rnd() < (weak ? 0.35 : 0.8)) rows.push({ class_code: code, student, lab: 'workbench:' + b, type: 'workbench', question: 'complete', correct: true, payload: { demo: true, afterFault: failed } });
      });
    });
    await insertEvents(rows); setSeeding(false);
  }
  async function suggest() {
    setInsight({ text: 'Reading your class data…' });
    const chapters = A.ranked.slice(0, 4).map(x => ({ chapter: x.c.title, aiQuestions: x.questions, circuitFaults: x.faults, wrongAnswers: x.wrong, students: x.students }));
    try { const r = await fetch('/api/ai', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'insight', top: A.misRank, chapters, faults: A.faults.slice(0, 4).map(f => ({ circuit: WORKBENCHES[f.bench]?.title, fault: f.title, students: f.students })), questions: A.qs.slice(0, 12).map(e => e.choice) }) }); setInsight(await r.json()); }
    catch { setInsight({ text: 'Could not reach the AI. Start with the top chapter in “Where students are lagging”.' }); }
  }

  const empty = !events.length;
  return (
    <main className="wrap" style={{ paddingBlock: '24px 60px' }}>
      <div className={s.top}>
        <div>
          <div className="eyebrow">Professor · Class insights</div>
          <h1 className="display" style={{ fontSize: 'clamp(26px,3.6vw,38px)', marginTop: 4 }}>Where is your class struggling?</h1>
        </div>
        <div className={s.classBox}>
          <label htmlFor="cls" className="eyebrow">Class code</label>
          <input id="cls" className="field" value={code} onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 12) || 'DEMO')} style={{ fontFamily: 'var(--mono)', width: 130 }} />
          <span className={s.live}><i style={{ background: live ? 'var(--ok)' : 'var(--muted)' }} />{live ? 'Live' : 'Connecting'}</span>
        </div>
      </div>

      <section className={`card ${s.stats}`}>
        <div><b>{A.students.length}</b><span>Students active</span></div>
        <div><b>{A.questions}</b><span>Questions asked to AI</span></div>
        <div><b>{A.faultsTotal}</b><span>Circuit faults detected</span></div>
        <div><b>{A.built}</b><span>Circuits built correctly</span></div>
        <div><b>{pct(A.correct, A.preds)}%</b><span>Predictions correct</span></div>
        <div><b>{mats.length}</b><span>Materials uploaded</span></div>
      </section>

      {empty && (
        <div className={`card ${s.pad}`} style={{ marginBottom: 16 }}>
          <b>No student activity yet for class {code}.</b>
          <span className={s.muted}>Share the join QR code with your class, or add demo class data to see how insights look.</span>
          <div className={s.row}><button className="btn btn-primary" onClick={seed} disabled={seeding}>{seeding ? 'Adding…' : 'Add demo class data'}</button><Link className="btn btn-ghost" href="/professor/materials">Upload study materials</Link></div>
        </div>
      )}

      <section className={s.grid2}>
        <div className={`card ${s.pad}`}>
          <div className={s.secHead}><h2 className={s.h2}>Where students are lagging</h2><span className={s.muted} style={{ fontSize: 13 }}>Ranked by AI questions, circuit faults and wrong answers</span></div>
          {A.ranked.length === 0 ? <div className={s.empty}>Chapters will be ranked here as students learn.</div> : A.ranked.map((x, i) => (
            <div key={x.c.id} className={s.lag}>
              <span className={s.rank}>{i + 1}</span>
              <div className={s.lagMain}>
                <div className={s.lagTop}><b>{x.c.title}</b><span className={s.muted} style={{ fontSize: 12.5 }}>{subjectById(x.c.subject).code} · Unit {x.c.unit}</span></div>
                <div className={s.bar}><i style={{ width: `${x.score / A.maxScore * 100}%`, background: i === 0 ? 'var(--coral)' : i < 3 ? 'var(--warn)' : 'var(--blue)' }} /></div>
                <span className={s.lagMeta}>{x.questions} AI questions · {x.faults} circuit faults · {x.wrong} wrong answers · {x.students} students</span>
              </div>
            </div>
          ))}
        </div>
        <div className={s.side}>
          <div className={`card ${s.pad}`}>
            <h2 className={s.h2}>What to teach next</h2>
            <p className={s.muted}>PulseAI turns this data into a plan for your next lecture.</p>
            <button className="btn btn-primary" onClick={suggest} disabled={empty} style={{ alignSelf: 'flex-start' }}>Suggest my next lecture focus</button>
            {insight && <p className={s.insight}>{insight.text}{insight.source === 'fallback' && <small className={s.muted}> · built-in suggestion</small>}</p>}
          </div>
          <div className={`card ${s.pad}`}>
            <h2 className={s.h2}>Most common circuit mistakes</h2>
            {A.faults.length === 0 ? <span className={s.muted}>Faults caught by the AI inspector appear here.</span> : A.faults.map(f => (
              <div key={f.bench + f.code} className={s.block}><b>{f.title}</b><span>{WORKBENCHES[f.bench]?.title} · {f.students} student{f.students > 1 ? 's' : ''}</span></div>
            ))}
          </div>
        </div>
      </section>

      <section className={s.grid2}>
        <div className={`card ${s.pad}`}>
          <div className={s.secHead}><h2 className={s.h2}>Students who need attention</h2><span className={s.muted} style={{ fontSize: 13 }}>Low prediction accuracy or repeated circuit faults</span></div>
          {A.per.length === 0 ? <div className={s.empty}>No students yet.</div> : (
            <div className={s.tableWrap}>
              <table className={s.table}>
                <thead><tr><th>Student</th><th>Status</th><th>Chapters</th><th>Predictions</th><th>Circuit faults</th><th>Circuits built</th><th>AI questions</th></tr></thead>
                <tbody>{A.per.slice(0, 40).map(p => (
                  <tr key={p.name}>
                    <td>{p.name}</td>
                    <td><span className="pill" style={{ color: p.risk >= 3 ? 'var(--coral)' : p.risk >= 1 ? 'var(--warn)' : 'var(--ok)' }}>{p.risk >= 3 ? 'Needs help' : p.risk >= 1 ? 'Watch' : 'On track'}</span></td>
                    <td className={s.num}>{p.chapters}</td>
                    <td className={s.num}>{p.acc === null ? '—' : `${Math.round(p.acc * 100)}% of ${p.preds}`}</td>
                    <td className={s.num}>{p.faults}</td><td className={s.num}>{p.built}</td><td className={s.num}>{p.questions}</td>
                  </tr>))}</tbody>
              </table>
            </div>
          )}
        </div>
        <div className={s.side}>
          <div className={`card ${s.pad}`}>
            <h2 className={s.h2}>What students are asking the AI</h2>
            {A.qs.length === 0 ? <span className={s.muted}>Questions from AI mode appear here.</span> : A.ranked.filter(x => A.qByChapter[x.c.id]?.length).slice(0, 3).map(x => (
              <div key={x.c.id} className={s.qGroup}>
                <span className="eyebrow" style={{ color: 'var(--accent)' }}>{x.c.title} · {A.qByChapter[x.c.id].length}</span>
                {[...new Set(A.qByChapter[x.c.id].map(e => e.choice))].slice(0, 3).map(q => <span key={q} className={s.q}>“{q}”</span>)}
              </div>
            ))}
          </div>
          <div className={`card ${s.pad} ${s.join}`}>
            <h2 className={s.h2}>Students join here</h2>
            {joinQR ? <img src={joinQR} alt={`QR code to join class ${code}`} className={s.qr} /> : <div className={s.qr} />}
            <label htmlFor="base" className="eyebrow" style={{ alignSelf: 'stretch', textAlign: 'left' }}>Address phones use to reach this laptop</label>
            <input id="base" className="field" value={origin} onChange={e => setOrigin(e.target.value.trim().replace(/\/$/, ''))} placeholder="http://192.168.1.20:3000" style={{ fontFamily: 'var(--mono)', fontSize: 13 }} />
            {isLocal && <span className={s.err} style={{ fontSize: 12.5 }}>Phones can’t open “localhost”. Use this laptop’s Wi-Fi address, e.g. http://192.168.1.20:3000.</span>}
            <div className={s.row} style={{ justifyContent: 'center' }}>
              <button className="btn btn-ghost" onClick={seed} disabled={seeding}>{seeding ? 'Adding…' : 'Add demo class data'}</button>
              {confirmClear ? <button className="btn btn-ghost" style={{ borderColor: 'var(--coral)', color: 'var(--coral)' }} onClick={async () => { await clearClass(code); setConfirmClear(false); setResetKey(k => k + 1); }}>Yes, clear {code}</button>
                : <button className="btn btn-ghost" onClick={() => { setConfirmClear(true); setTimeout(() => setConfirmClear(false), 4000); }} disabled={empty}>Clear class data</button>}
            </div>
          </div>
        </div>
      </section>

      <section className={`card ${s.pad}`}>
        <div className={s.secHead}><h2 className={s.h2}>Misconception heatmap</h2><span className={s.muted} style={{ fontSize: 13 }}>From predict-first questions in the simulators · darker = more of the class got it wrong</span></div>
        {A.rows.length === 0 ? <div className={s.empty}>No predictions yet.</div> : (
          <div className={s.heat} role="table">
            <div className={s.heatHead} role="row"><span>Concept question</span><span>Wrong</span><span>Most common wrong belief</span></div>
            {MODULES.map(m => LAB_LIST.filter(l => l.module === m.id).map(l => {
              const rows = A.rows.filter(r => r.lab === l.id).sort((a, b) => b.p - a.p); if (!rows.length) return null;
              return (<div key={l.id} className={s.heatGroup}><div className={s.heatLab}>{l.title}</div>
                {rows.map(r => (<div key={r.key} className={s.heatRow} role="row" style={{ background: heat(r.p) }}>
                  <span>{QUESTIONS[r.key]?.text || r.key}</span><span className={s.mono}>{r.p}%<small> of {r.total}</small></span>
                  <span>{r.top ? <>“{r.top}” <small className={s.muted}>({r.topN})</small></> : <small className={s.muted}>None</small>}</span>
                </div>))}</div>);
            }))}
          </div>
        )}
      </section>
    </main>
  );
}
