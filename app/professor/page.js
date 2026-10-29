'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import JSZip from 'jszip';
import { LABS, LAB_LIST, MODULES } from '@/lib/labs';
import { QUESTIONS, questionKey } from '@/lib/questions';
import { supabase } from '@/lib/supabase';
import s from './prof.module.css';

const SAMPLE_DECK = [
  'Unit 3: Linear Integrated Circuits\nProf. R. Deshmukh · ENTC-201',
  'Op-Amp Basics\nIdeal op-amp characteristics: infinite open-loop gain, infinite input impedance, zero output impedance',
  'Inverting Amplifier\nVout = −(Rf / Rin) · Vin\nVirtual ground at the inverting terminal',
  'Output Saturation\nOutput swing limited to approximately ±(Vcc − 1 V); clipping when the gain is too high',
  'Unit 2 Recap: PN Junction Diode\nDepletion region, barrier potential 0.7 V (Si), forward and reverse bias',
  'Diode I–V Characteristics\nKnee voltage, reverse saturation current, Shockley equation',
  'Applications in Embedded Systems\nArduino reads an LDR sensor with analogRead; IoT smart classroom automation',
  'Assignment 3\nSubmit by Friday · Q1–Q5 from the textbook'
];

function pct(n, d) { return d ? Math.round(n / d * 100) : 0; }
function heat(p) { const a = Math.min(1, p / 70); return `rgba(255,111,94,${0.08 + a * 0.55})`; }

export default function Professor() {
  const [code, setCode] = useState('DEMO');
  const [events, setEvents] = useState([]);
  const [live, setLive] = useState(false);
  const [joinQR, setJoinQR] = useState('');
  const [origin, setOrigin] = useState('');
  const [deck, setDeck] = useState(null);
  const [deckBusy, setDeckBusy] = useState(false);
  const [deckSrc, setDeckSrc] = useState('');
  const [show, setShow] = useState(null); // { title, url, qr }
  const [insight, setInsight] = useState(null);
  const [seeding, setSeeding] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => { setOrigin(location.origin); try { const c = localStorage.getItem('pulse.prof.class'); if (c) setCode(c); } catch {} }, []);
  useEffect(() => { try { localStorage.setItem('pulse.prof.class', code); } catch {} }, [code]);
  useEffect(() => { if (origin) QRCode.toDataURL(`${origin}/?class=${code}`, { margin: 1, width: 360, color: { dark: '#0a0f15', light: '#ffffff' } }).then(setJoinQR); }, [origin, code]);

  // Load + subscribe to this class's events
  useEffect(() => {
    let cancelled = false;
    const sb = supabase();
    sb.from('events').select('*').eq('class_code', code).order('created_at', { ascending: false }).limit(3000)
      .then(({ data }) => { if (!cancelled && data) setEvents(data); });
    const ch = sb.channel('class-' + code)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'events', filter: `class_code=eq.${code}` }, p => setEvents(ev => [p.new, ...ev].slice(0, 3000)))
      .subscribe(st => setLive(st === 'SUBSCRIBED'));
    return () => { cancelled = true; sb.removeChannel(ch); };
  }, [code]);

  const agg = useMemo(() => {
    const preds = events.filter(e => e.type === 'prediction');
    const students = new Set(events.map(e => e.student).filter(Boolean));
    const byQ = {};
    preds.forEach(e => {
      const k = questionKey(e.lab, e.question); const q = byQ[k] = byQ[k] || { key: k, lab: e.lab, total: 0, wrong: 0, mis: {} };
      q.total++; if (!e.correct) { q.wrong++; if (e.misconception) q.mis[e.misconception] = (q.mis[e.misconception] || 0) + 1; }
    });
    const rows = Object.values(byQ).map(q => { const top = Object.entries(q.mis).sort((a, b) => b[1] - a[1])[0]; return { ...q, p: pct(q.wrong, q.total), top: top ? top[0] : null, topN: top ? top[1] : 0 }; });
    const repairs = events.filter(e => e.type === 'repair' && e.correct).length;
    const levels = events.filter(e => e.type === 'challenge');
    const ml = events.filter(e => e.type === 'ml').map(e => e.payload?.accuracy).filter(Boolean);
    const hints = events.filter(e => e.type === 'inspect').length;
    const perLab = LAB_LIST.map(l => {
      const ev = events.filter(e => e.lab === l.id);
      return { lab: l, students: new Set(ev.map(e => e.student)).size, hints: ev.filter(e => e.type === 'inspect').length, fails: ev.filter(e => (e.type === 'challenge' && !e.correct) || (e.type === 'prediction' && !e.correct)).length };
    });
    const misRank = rows.filter(r => r.top).map(r => ({ misconception: r.top, wrong: r.topN, total: r.total, lab: r.lab })).sort((a, b) => b.wrong / b.total - a.wrong / a.total);
    return { preds: preds.length, correct: preds.filter(e => e.correct).length, students: students.size, rows, repairs, levelsPassed: levels.filter(e => e.correct).length, levelsTried: levels.length, ml, hints, perLab, misRank };
  }, [events]);

  async function openDeck(file) {
    setDeckBusy(true); setDeck(null);
    try {
      const zip = await JSZip.loadAsync(file);
      const names = Object.keys(zip.files).filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n)).sort((a, b) => +a.match(/(\d+)\.xml/)[1] - +b.match(/(\d+)\.xml/)[1]);
      const slides = [];
      for (const n of names) {
        const xml = await zip.file(n).async('string');
        const paras = xml.split(/<\/a:p>/).map(p => [...p.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map(m => m[1]).join('')).filter(Boolean);
        slides.push(paras.join('\n').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'"));
      }
      if (!slides.length) throw new Error('No slides found. Save the deck as .pptx and try again.');
      await tag(slides, file.name);
    } catch (e) { setDeck({ error: e.message || 'Could not read that file. Upload a .pptx deck.' }); setDeckBusy(false); }
  }
  async function tag(slides, name) {
    setDeckBusy(true);
    let tags = [];
    try { const r = await fetch('/api/ai', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'match', slides }) }); const j = await r.json(); tags = j.slides || []; setDeckSrc(j.source === 'ai' ? 'Tagged by Gemini' : 'Tagged by keyword matcher (AI offline)'); } catch { setDeckSrc('Tagged by keyword matcher (AI offline)'); }
    setDeck({ name, slides: slides.map((t, i) => ({ i, title: t.split('\n')[0] || `Slide ${i + 1}`, body: t.split('\n').slice(1).join(' · '), lab: tags[i]?.lab || null, summary: tags[i]?.summary || null })) });
    setDeckBusy(false);
  }
  async function present(labId) {
    const url = `${origin}/lab/${labId}?class=${code}`;
    const qr = await QRCode.toDataURL(url, { margin: 1, width: 520, color: { dark: '#0a0f15', light: '#ffffff' } });
    setShow({ title: LABS[labId].title, scenario: LABS[labId].scenario.title, url, qr });
  }
  async function seed() {
    setSeeding(true);
    let r = 7; const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
    const rows = [];
    for (let st = 1; st <= 28; st++) {
      const student = 'Demo student ' + String(st).padStart(2, '0');
      Object.entries(QUESTIONS).forEach(([k, q]) => {
        if (rnd() < 0.15) return;
        const [lab, qid] = k.split(':'); let x = rnd(), mis = null;
        for (const [m, p] of q.wrong) { if (x < p) { mis = m; break; } x -= p; }
        rows.push({ class_code: code, student, lab, type: 'prediction', question: qid, correct: !mis, misconception: mis, choice: mis ? 'demo wrong answer' : 'demo correct answer', payload: { demo: true } });
      });
      if (rnd() < 0.7) rows.push({ class_code: code, student, lab: 'opamp', type: 'repair', question: 'repair', correct: true, payload: { demo: true, hintsUsed: Math.floor(rnd() * 3) } });
      for (let lv = 1; lv <= 3; lv++) if (rnd() < 0.8 - lv * 0.15) rows.push({ class_code: code, student, lab: 'iot', type: 'challenge', question: 'level-' + lv, correct: rnd() < 0.75, payload: { demo: true, level: lv } });
      if (rnd() < 0.5) rows.push({ class_code: code, student, lab: 'iot', type: 'ml', question: 'ml', correct: true, payload: { demo: true, accuracy: 0.9 + rnd() * 0.08 } });
      if (rnd() < 0.6) rows.push({ class_code: code, student, lab: 'opamp', type: 'inspect', question: 'clipping', payload: { demo: true } });
    }
    await supabase().from('events').insert(rows);
    setSeeding(false);
  }
  async function suggest() {
    setInsight({ text: 'Thinking about your class…' });
    try { const r = await fetch('/api/ai', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'insight', top: agg.misRank }) }); setInsight(await r.json()); } catch { setInsight({ text: 'Could not reach the AI. Check the heatmap: the darkest row is the concept to reteach first.' }); }
  }

  return (
    <main className="wrap" style={{ paddingBlock: '24px 60px' }}>
      <div className={s.top}>
        <div>
          <div className="eyebrow">Professor dashboard</div>
          <h1 className="display" style={{ fontSize: 'clamp(26px,3.6vw,38px)', marginTop: 4 }}>See what your class really believes.</h1>
        </div>
        <div className={s.classBox}>
          <label htmlFor="cls" className="eyebrow">Class code</label>
          <input id="cls" className="field" value={code} onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 12) || 'DEMO')} style={{ fontFamily: 'var(--mono)', width: 140 }} />
          <span className={s.live}><i style={{ background: live ? 'var(--ok)' : 'var(--muted)' }} />{live ? 'Live' : 'Connecting'}</span>
        </div>
      </div>

      <section className={s.grid2}>
        {/* Deck */}
        <div className={`card ${s.pad}`}>
          <div className={s.secHead}><h2 className={s.h2}>1 · Turn your slides into labs</h2></div>
          <p className={s.muted}>Upload your lecture deck (.pptx). PulseENTC reads every slide and attaches the matching interactive lab.</p>
          <div className={s.row}>
            <button className="btn btn-primary" onClick={() => fileRef.current?.click()} disabled={deckBusy}>{deckBusy ? 'Reading slides…' : 'Upload .pptx deck'}</button>
            <button className="btn btn-ghost" onClick={() => tag(SAMPLE_DECK, 'Unit 3 – Linear ICs (sample).pptx')} disabled={deckBusy}>Use sample deck</button>
            <input ref={fileRef} type="file" accept=".pptx" hidden onChange={e => e.target.files?.[0] && openDeck(e.target.files[0])} />
          </div>
          {deck?.error && <p className={s.err}>{deck.error}</p>}
          {deck?.slides && (
            <div className={s.slides}>
              <div className={s.deckMeta}><b>{deck.name}</b><span>{deck.slides.length} slides · {deck.slides.filter(x => x.lab).length} with labs · {deckSrc}</span></div>
              {deck.slides.map(sl => (
                <div key={sl.i} className={`${s.slide} ${sl.lab ? s.hasLab : ''}`}>
                  <span className={s.num}>{sl.i + 1}</span>
                  <div className={s.slideText}><b>{sl.title}</b><span>{sl.summary || sl.body}</span></div>
                  {sl.lab ? (
                    <div className={s.slideAct}>
                      <span className="chip" style={{ color: 'var(--accent)', borderColor: 'rgba(255,210,122,.4)' }}>{LABS[sl.lab].title}</span>
                      <button className="btn btn-ghost" onClick={() => present(sl.lab)}>Show to class</button>
                    </div>
                  ) : <span className={s.none}>No lab needed</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Join */}
        <div className={`card ${s.pad} ${s.join}`}>
          <h2 className={s.h2}>Students join here</h2>
          {joinQR ? <img src={joinQR} alt={`QR code to join class ${code}`} className={s.qr} /> : <div className={s.qr} />}
          <span className={s.mono}>{origin.replace(/^https?:\/\//, '')}/?class={code}</span>
          <div className={s.row} style={{ justifyContent: 'center' }}>
            <button className="btn btn-ghost" onClick={seed} disabled={seeding}>{seeding ? 'Adding…' : 'Add demo class data'}</button>
          </div>
          <span className={s.muted} style={{ fontSize: 12 }}>Demo data adds 28 sample students, labelled “Demo student”.</span>
        </div>
      </section>

      {/* Stats */}
      <section className={`card ${s.stats}`}>
        <div><b>{agg.students}</b><span>Students active</span></div>
        <div><b>{agg.preds}</b><span>Predictions made</span></div>
        <div><b>{pct(agg.correct, agg.preds)}%</b><span>Predicted correctly</span></div>
        <div><b>{agg.repairs}</b><span>Op-amp repairs solved</span></div>
        <div><b>{agg.levelsPassed}<small>/{agg.levelsTried}</small></b><span>Code levels passed</span></div>
        <div><b>{agg.ml.length ? Math.round(agg.ml.reduce((a, b) => a + b, 0) / agg.ml.length * 100) + '%' : '—'}</b><span>Avg AI model accuracy</span></div>
      </section>

      <section className={s.grid2}>
        <div className={`card ${s.pad}`}>
          <div className={s.secHead}><h2 className={s.h2}>2 · Misconception heatmap</h2><span className={s.muted} style={{ fontSize: 13 }}>Darker = more of the class got it wrong</span></div>
          {agg.rows.length === 0 ? (
            <div className={s.empty}>No predictions yet. Ask students to scan the QR code and open a lab, or add demo class data.</div>
          ) : (
            <div className={s.heat} role="table">
              <div className={s.heatHead} role="row"><span>Concept question</span><span>Wrong</span><span>Most common wrong belief</span></div>
              {MODULES.map(m => LAB_LIST.filter(l => l.module === m.id).map(l => {
                const rows = agg.rows.filter(r => r.lab === l.id).sort((a, b) => b.p - a.p); if (!rows.length) return null;
                return (
                  <div key={l.id} className={s.heatGroup}>
                    <div className={s.heatLab}>{l.title}</div>
                    {rows.map(r => (
                      <div key={r.key} className={s.heatRow} role="row" style={{ background: heat(r.p) }}>
                        <span>{QUESTIONS[r.key]?.text || r.key}</span>
                        <span className={s.mono}>{r.p}%<small> of {r.total}</small></span>
                        <span>{r.top ? <>“{r.top}” <small className={s.muted}>({r.topN})</small></> : <small className={s.muted}>None</small>}</span>
                      </div>
                    ))}
                  </div>
                );
              }))}
            </div>
          )}
        </div>
        <div className={s.side}>
          <div className={`card ${s.pad}`}>
            <h2 className={s.h2}>AI teaching suggestion</h2>
            <p className={s.muted}>Turns the heatmap into a plan for your next 10 minutes.</p>
            <button className="btn btn-primary" onClick={suggest} disabled={!agg.misRank.length} style={{ alignSelf: 'flex-start' }}>Suggest what to reteach</button>
            {insight && <p className={s.insight}>{insight.text}{insight.source === 'fallback' && <small className={s.muted}> · offline suggestion</small>}</p>}
          </div>
          <div className={`card ${s.pad}`}>
            <h2 className={s.h2}>Lab stumbling blocks</h2>
            {agg.perLab.map(p => (
              <div key={p.lab.id} className={s.block}>
                <b>{p.lab.title}</b>
                <span>{p.students} students · {p.fails} wrong answers or failed runs · {p.hints} AI hints asked</span>
              </div>
            ))}
          </div>
          <div className={`card ${s.pad}`}>
            <h2 className={s.h2}>Live activity</h2>
            {events.slice(0, 7).map(e => (
              <div key={e.id} className={s.feed}><span className={s.mono}>{new Date(e.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span><span><b>{e.student}</b> · {LABS[e.lab]?.title} · {e.type}{e.correct === false ? ' ✗' : e.correct ? ' ✓' : ''}</span></div>
            ))}
            {!events.length && <span className={s.muted}>Waiting for students…</span>}
          </div>
        </div>
      </section>

      {show && (
        <div className="modal-back" onClick={() => setShow(null)} role="dialog" aria-modal="true" aria-label="Show lab to class">
          <div className={`card ${s.present}`} onClick={e => e.stopPropagation()}>
            <div className="eyebrow" style={{ color: 'var(--accent)' }}>Scan to open on your phone · Predict first</div>
            <h2 className="display" style={{ fontSize: 30 }}>{show.title}</h2>
            <p className={s.muted} style={{ margin: 0 }}>{show.scenario}</p>
            <img src={show.qr} alt={`QR code for ${show.title}`} className={s.qrBig} />
            <span className={s.mono}>{show.url.replace(/^https?:\/\//, '')}</span>
            <div className={s.row} style={{ justifyContent: 'center' }}>
              <Link className="btn btn-primary" href={show.url.replace(origin, '')} target="_blank">Open lab on this screen</Link>
              <button className="btn btn-ghost" onClick={() => setShow(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
