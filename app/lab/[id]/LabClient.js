'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { LABS, MODULES } from '@/lib/labs';
import { recordEvent, markOpened, getProfile, setProfile } from '@/lib/progress';
import { logEvent } from '@/lib/events';
import { ProfileModal } from '@/components/Nav';
import s from './lab.module.css';

const QUICK = {
  'opamp': ['Why is the sound harsh?', 'Explain the gain formula', 'Give me a hint for the repair'],
  'pn-junction': ['Why does the depletion region widen?', 'What is the knee voltage?', 'Explain the band diagram'],
  'logic': ['How do I design the fire alarm?', 'Why is NAND universal?', 'Tips for Gate Blitz'],
  'iot': ['Why is my code failing?', 'What does analogRead return?', 'Which sensor matters most for the model?']
};

export default function LabClient({ labId }) {
  const lab = LABS[labId];
  const mod = MODULES.find(m => m.id === lab.module);
  const frame = useRef(null);
  const state = useRef(null);
  const recent = useRef([]);
  const [msgs, setMsgs] = useState([{ role: 'ai', text: `Hi! I’m PulseAI. I can see your ${lab.title} lab live, so ask me about anything on screen. I’ll give hints first, not the answer.` }]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [ask, setAsk] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const chatEnd = useRef(null);

  useEffect(() => {
    markOpened(labId);
    try { const c = new URLSearchParams(location.search).get('class'); if (c) setProfile({ classCode: c.toUpperCase() }); } catch {}
    if (!getProfile().name) setAsk(true);
    const onMsg = e => {
      const d = e.data;
      if (!d || d.source !== 'pulse-lab' || (frame.current && e.source !== frame.current.contentWindow)) return;
      if (d.type === 'state') { state.current = d.state; return; }
      recent.current = [...recent.current.slice(-9), d];
      recordEvent(labId, d);
      const p = getProfile();
      logEvent({ class_code: p.classCode || 'DEMO', student: p.name || 'Anonymous', lab: labId, type: d.type, question: d.question || (d.level ? 'level-' + d.level : d.fault || null), choice: d.choice || null, correct: d.correct ?? d.passed ?? d.success ?? null, misconception: d.misconception || null, payload: d });
      if (d.type === 'repair' && d.success) flash('Repair saved to your progress ✓');
      if (d.type === 'challenge' && d.passed) flash(labId === 'logic' ? `Circuit ${d.level} works ✓` : `Level ${d.level} passed ✓`);
      if (d.type === 'quiz') flash(`Gate Blitz score: ${d.score}`);
      if (d.type === 'ml') flash(`Model trained: ${Math.round(d.accuracy * 100)}% accuracy`);
      if (d.type === 'prediction' && d.misconception) setMsgs(m => [...m, { role: 'ai', text: `I noticed a common misconception: “${d.misconception}”. Watch the simulation closely, then ask me if it still feels strange.`, tag: 'Misconception Miner' }]);
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [labId]);

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [msgs]);

  function flash(t) { setToast(t); setTimeout(() => setToast(null), 2600); }

  async function send(q) {
    const question = (q || input).trim(); if (!question || busy) return;
    setInput(''); setBusy(true);
    const history = msgs.slice(-6).map(m => ({ role: m.role, text: m.text }));
    setMsgs(m => [...m, { role: 'me', text: question }]);
    try {
      const r = await fetch('/api/ai', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'tutor', lab: labId, question, state: state.current, recent: recent.current, history }) });
      const j = await r.json();
      setMsgs(m => [...m, { role: 'ai', text: j.text, tag: j.source === 'ai' ? null : 'built-in answer' }]);
    } catch {
      setMsgs(m => [...m, { role: 'ai', text: lab.fallback.default, tag: 'built-in answer' }]);
    }
    setBusy(false);
  }

  const src = lab.file + (labId === 'iot' ? '' : '?mode=predict');

  return (
    <main className={s.page}>
      <div className={s.head}>
        <div className={s.crumbs}><Link href="/">Labs</Link><span>›</span><span>{mod.name}</span><span>›</span><b>{lab.title}</b></div>
        <div className={s.scenario}>
          <span className="eyebrow" style={{ color: 'var(--accent)' }}>Real-world scenario</span>
          <h1 className={s.h1}>{lab.scenario.title}</h1>
          <p>{lab.scenario.text}</p>
        </div>
        <button className={`btn btn-ghost ${s.chatToggle}`} onClick={() => setChatOpen(o => !o)} aria-expanded={chatOpen}>{chatOpen ? 'Hide' : 'Ask'} PulseAI</button>
      </div>
      <div className={`${s.body} ${chatOpen ? '' : s.full}`}>
        <iframe ref={frame} src={src} title={lab.title} className={s.frame} allow="autoplay; clipboard-write" />
        {chatOpen && (
          <aside className={s.chat} aria-label="AI tutor">
            <div className={s.chatHead}><span className={s.dot} /> <b>PulseAI tutor</b><span className="chip" style={{ marginLeft: 'auto' }}>sees your live lab</span></div>
            <div className={s.msgs}>
              {msgs.map((m, i) => (
                <div key={i} className={m.role === 'me' ? s.me : s.ai}>
                  {m.tag && <span className={s.tag}>{m.tag}</span>}
                  {m.text}
                </div>
              ))}
              {busy && <div className={s.ai}><span className={s.typing}>Thinking…</span></div>}
              <div ref={chatEnd} />
            </div>
            <div className={s.quick}>{QUICK[labId].map(q => <button key={q} onClick={() => send(q)} disabled={busy}>{q}</button>)}</div>
            <form className={s.ask} onSubmit={e => { e.preventDefault(); send(); }}>
              <input className="field" id="ask" value={input} onChange={e => setInput(e.target.value)} placeholder="Ask about what you see…" aria-label="Ask PulseAI" />
              <button className="btn btn-primary" disabled={busy || !input.trim()}>Ask</button>
            </form>
          </aside>
        )}
      </div>
      {toast && <div className="toast" role="status">{toast}</div>}
      {ask && <ProfileModal onClose={() => setAsk(false)} />}
    </main>
  );
}
