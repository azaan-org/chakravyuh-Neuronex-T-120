'use client';
import { useCallback, useEffect, useState } from 'react';
import { LABS } from '@/lib/labs';
import { getProfile } from '@/lib/progress';
import s from './forum.module.css';

function ago(iso) {
  const m = Math.round((Date.now() - new Date(iso)) / 60000);
  return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : Math.round(m / 60) + ' h ago';
}

export default function Forum({ lab, compact = false, getState, label }) {
  const [threads, setThreads] = useState([]);
  const [open, setOpen] = useState(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [reply, setReply] = useState('');
  const [asking, setAsking] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    try { const r = await fetch('/api/forum' + (lab ? '?lab=' + lab : ''), { cache: 'no-store' }); const j = await r.json(); setThreads(j.threads || []); } catch {}
  }, [lab]);
  useEffect(() => { load(); const t = setInterval(load, 4000); return () => clearInterval(t); }, [load]);

  const post = async payload => {
    setErr('');
    const r = await fetch('/api/forum', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
    const j = await r.json(); if (!r.ok) { setErr(j.error || 'Could not post.'); return null; }
    await load(); return j;
  };
  async function newThread(e) {
    e.preventDefault();
    const j = await post({ action: 'thread', lab: lab || 'general', title, body, author: getProfile().name || 'Anonymous' });
    if (j) { setTitle(''); setBody(''); setOpen(j.thread.id); }
  }
  async function sendReply(e) {
    e.preventDefault();
    if (await post({ action: 'reply', threadId: open, body: reply, author: getProfile().name || 'Anonymous' })) setReply('');
  }
  async function askAI(t) {
    setAsking(true);
    const convo = [t.title, t.body, ...t.replies.slice(-4).map(r => `${r.author}: ${r.body}`)].filter(Boolean).join('\n');
    try {
      const r = await fetch('/api/ai', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'tutor', lab: t.lab in LABS ? t.lab : 'opamp', question: 'A classmate asked in the forum. Reply to the latest message helpfully:\n' + convo, state: getState?.() || null }) });
      const j = await r.json();
      await post({ action: 'reply', threadId: t.id, body: j.text, ai: true });
    } catch {}
    setAsking(false);
  }

  const t = threads.find(x => x.id === open);
  if (t) return (
    <div className={`${s.wrap} ${compact ? s.compact : ''}`}>
      <button className={s.back} onClick={() => setOpen(null)}>← All discussions</button>
      <div className={s.thread}>
        <span className="eyebrow">{LABS[t.lab]?.title || 'General'}</span>
        <h3>{t.title}</h3>
        {t.body && <p>{t.body}</p>}
        <span className={s.meta}>{t.ai ? <b className={s.ai}>PulseAI</b> : t.author} · {ago(t.created)}</span>
      </div>
      <div className={s.replies}>
        {t.replies.map(r => (
          <div key={r.id} className={`${s.reply} ${r.ai ? s.aiReply : ''}`}>
            <span className={s.meta}>{r.ai ? <b className={s.ai}>PulseAI</b> : <b>{r.author}</b>} · {ago(r.created)}</span>
            <p>{r.body}</p>
          </div>
        ))}
      </div>
      <form onSubmit={sendReply} className={s.form}>
        <textarea className="field" rows={compact ? 2 : 3} value={reply} onChange={e => setReply(e.target.value)} placeholder="Explain it in your own words, or ask a follow-up…" aria-label="Your reply" />
        <div className={s.row}>
          <button className="btn btn-primary" disabled={!reply.trim()}>Reply</button>
          <button type="button" className="btn btn-ghost" onClick={() => askAI(t)} disabled={asking}>{asking ? 'PulseAI is writing…' : 'Ask PulseAI to answer'}</button>
        </div>
        {err && <span className={s.err}>{err}</span>}
      </form>
    </div>
  );

  return (
    <div className={`${s.wrap} ${compact ? s.compact : ''}`}>
      <form onSubmit={newThread} className={s.form}>
        <input className="field" value={title} onChange={e => setTitle(e.target.value)} placeholder={label ? `Ask the ${label}…` : lab ? `Ask the class about ${LABS[lab]?.title || 'this lab'}…` : 'Ask a question…'} aria-label="Question title" />
        {title && <textarea className="field" rows={2} value={body} onChange={e => setBody(e.target.value)} placeholder="Add details: what you tried, what you expected (optional)" aria-label="Details" />}
        {title && <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>Post question</button>}
        {err && <span className={s.err}>{err}</span>}
      </form>
      <div className={s.list}>
        {threads.map(x => (
          <button key={x.id} className={s.item} onClick={() => setOpen(x.id)}>
            <span className={s.itemTop}>{!lab && <span className="eyebrow">{LABS[x.lab]?.title || 'General'}</span>}{x.pinned && <span className={s.seed}>AI-seeded</span>}</span>
            <b>{x.title}</b>
            <span className={s.meta}>{x.replies.length} {x.replies.length === 1 ? 'reply' : 'replies'} · {x.ai ? 'PulseAI' : x.author} · {ago(x.replies.at(-1)?.created || x.created)}</span>
          </button>
        ))}
        {!threads.length && <span className={s.meta}>No discussions yet. Ask the first question.</span>}
      </div>
    </div>
  );
}
