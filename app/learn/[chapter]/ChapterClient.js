'use client';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { chapterById, subjectById, chaptersOf } from '@/lib/curriculum';
import { LABS } from '@/lib/labs';
import { WORKBENCHES } from '@/lib/workbench';
import { getProfile, markChapter } from '@/lib/progress';
import { logEvent } from '@/lib/events';
import s from './chapter.module.css';

const TABS = [['teach', 'AI Teacher'], ['summary', 'Summary & formulas'], ['steps', 'Step-wise breakdown'], ['sims', 'Simulators'], ['courses', 'Suggested courses']];

export default function ChapterClient({ id }) {
  const ch = chapterById(id), sub = subjectById(ch.subject);
  const [mats, setMats] = useState([]);
  const [matSel, setMatSel] = useState(0);
  const [page, setPage] = useState(0);
  const [tab, setTab] = useState('teach');
  const [ai, setAi] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const end = useRef(null);

  useEffect(() => {
    markChapter(id, { lastOpen: Date.now() });
    fetch('/api/materials?chapter=' + id, { cache: 'no-store' }).then(r => r.json()).then(j => setMats(j.items || [])).catch(() => {});
  }, [id]);

  // What the student is studying: the professor's uploaded deck if there is one, else the built-in slides
  const doc = useMemo(() => {
    const m = mats[matSel];
    if (m) return { name: m.name, kind: m.kind, fileId: m.id, uploader: m.uploader, pages: m.pages.length ? m.pages : [{ title: m.name, text: '' }] };
    return { name: `${sub.code} · Unit ${ch.unit} slides`, kind: 'builtin', uploader: sub.faculty, pages: ch.material.map(x => ({ title: x.title, text: x.bullets.join('\n') })) };
  }, [mats, matSel, ch, sub]);
  const pg = doc.pages[Math.min(page, doc.pages.length - 1)];
  const docText = useMemo(() => doc.pages.map((p, i) => `[Slide ${i + 1}] ${p.title}\n${p.text}`).join('\n\n').slice(0, 14000), [doc]);

  // Ask the AI for a fresh summary/formulas/steps built from the professor's own material
  useEffect(() => {
    let cancel = false; setAi(null);
    fetch('/api/ai', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'chapter', chapter: id, material: doc.kind === 'builtin' ? null : docText }) })
      .then(r => r.json()).then(j => { if (!cancel) setAi(j); }).catch(() => {});
    return () => { cancel = true; };
  }, [id, docText, doc.kind]);

  const summary = ai?.summary || ch.summary, formulas = ai?.formulas?.length ? ai.formulas : ch.formulas, steps = ai?.steps?.length ? ai.steps : ch.steps;
  useEffect(() => { setMsgs([{ role: 'ai', text: `Hi ${getProfile().name.split(' ')[0] || ''}! I’m your AI teacher for “${ch.title}”. I’ve read ${doc.kind === 'builtin' ? `${sub.faculty}’s slides` : `“${doc.name}”`}. Ask me anything, or tap “Teach me from the start”.` }]); }, [id, doc.name]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [msgs]);

  async function ask(question, mode = 'qa') {
    const text = (question ?? q).trim(); if (!text || busy) return;
    setQ(''); setBusy(true); setTab('teach');
    setMsgs(m => [...m, { role: 'me', text }]);
    const p = getProfile();
    logEvent({ class_code: p.classCode || 'DEMO', student: p.name || 'Anonymous', lab: 'chapter:' + id, type: 'ai_question', question: `slide-${page + 1}`, choice: text.slice(0, 200), payload: { chapter: id, slideTitle: pg?.title, mode } });
    try {
      const r = await fetch('/api/ai', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'teach', chapter: id, mode, question: text, slide: pg, material: docText, history: msgs.slice(-6) }) });
      const j = await r.json();
      setMsgs(m => [...m, { role: 'ai', text: j.text, steps: j.steps, sim: j.sim, source: j.source }]);
    } catch { setMsgs(m => [...m, { role: 'ai', text: summary, source: 'fallback' }]); }
    setBusy(false);
  }

  const simHref = sm => sm.kind === 'workbench' ? `/workbench/${sm.id}?chapter=${id}` : `/lab/${sm.id}${sm.params ? '?' + new URLSearchParams(sm.params) : ''}`;
  const simTitle = sm => sm.kind === 'workbench' ? WORKBENCHES[sm.id]?.title : LABS[sm.id]?.title;
  const others = chaptersOf(ch.subject).filter(c => c.id !== id);

  return (
    <main className={s.page}>
      <div className={s.head}>
        <div className={s.crumbs}><Link href="/">Curriculum</Link><span>›</span><span>{sub.name}</span><span>›</span><b>Unit {ch.unit}</b></div>
        <div className={s.titleRow}>
          <h1 className={s.h1}>{ch.title}</h1>
          <div className={s.headActs}>
            {ch.sims.map(sm => <Link key={sm.id + sm.kind} className="btn btn-ghost" href={simHref(sm)}>▶ {sm.kind === 'workbench' ? 'Build circuit' : 'Open simulator'}</Link>)}
            <button className="btn btn-primary" onClick={() => ask('Teach me this chapter from the start, step by step.', 'teach')}>Teach me from the start</button>
          </div>
        </div>
      </div>

      <div className={s.body}>
        {/* Professor's material */}
        <section className={s.doc}>
          <div className={s.docBar}>
            <div className={s.docName}>
              <span className="eyebrow">Study material · uploaded by {doc.uploader}</span>
              {mats.length > 1 ? (
                <select className={s.sel} value={matSel} onChange={e => { setMatSel(+e.target.value); setPage(0); }} aria-label="Choose material">
                  {mats.map((m, i) => <option key={m.id} value={i}>{m.name}</option>)}
                </select>
              ) : <b>{doc.name}</b>}
            </div>
            {doc.fileId && <a className="btn btn-ghost" href={`/api/materials?file=${doc.fileId}`} target="_blank" rel="noreferrer">{doc.kind === 'pdf' ? 'Open PDF' : 'Download PPTX'}</a>}
          </div>
          <div className={s.slide}>
            <div className={s.slideTop}><span>{sub.code} · Unit {ch.unit}</span><span>{page + 1} / {doc.pages.length}</span></div>
            <h2>{pg.title}</h2>
            <ul>{pg.text.split('\n').filter(Boolean).slice(0, 9).map((l, i) => <li key={i}>{l}</li>)}</ul>
          </div>
          <div className={s.docNav}>
            <button className="btn btn-ghost" disabled={page === 0} onClick={() => setPage(p => p - 1)} aria-label="Previous slide">←</button>
            <button className="btn btn-ghost" onClick={() => ask(`Explain slide ${page + 1}, “${pg.title}”, in simple words with an example.`, 'slide')}>Explain this slide</button>
            <button className="btn btn-ghost" disabled={page >= doc.pages.length - 1} onClick={() => setPage(p => p + 1)} aria-label="Next slide">→</button>
          </div>
          <div className={s.thumbs}>{doc.pages.map((p, i) => <button key={i} className={i === page ? s.thOn : ''} onClick={() => setPage(i)}>{i + 1}. {p.title}</button>)}</div>
        </section>

        {/* AI mode */}
        <section className={s.ai}>
          <div className={s.aiHead}><span className={s.dot} /><b>AI mode</b><span className={s.src}>{ai ? (ai.source === 'ai' ? 'Generated from this material' : 'Built-in chapter notes') : 'Reading the material…'}</span></div>
          <div className={s.tabs} role="tablist">{TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{l}</button>)}</div>

          <div className={s.pane}>
            {tab === 'teach' && (
              <div className={s.chat}>
                {msgs.map((m, i) => (
                  <div key={i} className={m.role === 'me' ? s.me : s.bot}>
                    {m.text}
                    {m.steps?.length > 0 && <ol className={s.inlineSteps}>{m.steps.map((x, k) => <li key={k}><b>{x.title}</b> {x.body}</li>)}</ol>}
                    {m.sim && ch.sims.find(x => x.id === m.sim) && (() => { const sm = ch.sims.find(x => x.id === m.sim); return <Link className="btn btn-ghost" style={{ marginTop: 8 }} href={simHref(sm)}>▶ Try it: {simTitle(sm)}</Link>; })()}
                    {m.source === 'fallback' && <span className={s.tag}>built-in answer</span>}
                  </div>
                ))}
                {busy && <div className={s.bot}><span className={s.typing}>Thinking…</span></div>}
                <div ref={end} />
              </div>
            )}
            {tab === 'summary' && (
              <div className={s.sum}>
                <h3>Summary</h3><p>{summary}</p>
                <h3>Key formulas</h3>
                <div className={s.formulas}>{formulas.map((f, i) => <div key={i}><span>{f.name}</span><code>{f.expr}</code></div>)}</div>
              </div>
            )}
            {tab === 'steps' && (
              <div className={s.stepper}>
                <div className={s.stepDots}>{steps.map((_, i) => <button key={i} className={i === stepIdx ? s.stepOn : i < stepIdx ? s.stepDone : ''} onClick={() => setStepIdx(i)} aria-label={`Step ${i + 1}`}>{i + 1}</button>)}</div>
                <h3>Step {stepIdx + 1}: {steps[stepIdx].title}</h3>
                <p>{steps[stepIdx].body}</p>
                <div className={s.row}>
                  <button className="btn btn-ghost" disabled={stepIdx === 0} onClick={() => setStepIdx(i => i - 1)}>Back</button>
                  {stepIdx < steps.length - 1 ? <button className="btn btn-primary" onClick={() => setStepIdx(i => i + 1)}>Next step</button>
                    : <button className="btn btn-primary" onClick={() => { markChapter(id, { done: true }); setTab('sims'); }}>I understand, show simulators</button>}
                  <button className="btn btn-ghost" onClick={() => ask(`I don’t understand step ${stepIdx + 1}: “${steps[stepIdx].title}”. Explain it differently.`, 'step')}>I don’t get this step</button>
                </div>
              </div>
            )}
            {tab === 'sims' && (
              <div className={s.sims}>
                {ch.sims.map(sm => (
                  <Link key={sm.id + sm.kind} href={simHref(sm)} className={`card ${s.simCard}`}>
                    <span className="eyebrow" style={{ color: sm.kind === 'workbench' ? 'var(--ok)' : 'var(--blue)' }}>{sm.kind === 'workbench' ? 'Build it yourself · reference + workbench' : '3D model / simulator'}</span>
                    <b>{sm.title}</b><span>{sm.blurb}</span>
                  </Link>
                ))}
              </div>
            )}
            {tab === 'courses' && (
              <div className={s.courses}>
                <p className={s.muted}>Based on this chapter’s material, these will take you deeper:</p>
                {(ai?.courses?.length ? ai.courses : ch.courses).map((c, i) => <div key={i} className={`card ${s.course}`}><b>{c}</b></div>)}
                {others.length > 0 && <><h3>Next in {sub.name}</h3>{others.map(o => <Link key={o.id} href={`/learn/${o.id}`} className={`card ${s.course}`}><b>Unit {o.unit}: {o.title}</b><span>Open chapter →</span></Link>)}</>}
              </div>
            )}
          </div>

          <div className={s.quick}>
            {[`Summarize slide ${page + 1}`, 'What formulas must I remember?', 'Give me a real-life example', 'Quiz me with 3 questions'].map(x => <button key={x} disabled={busy} onClick={() => ask(x)}>{x}</button>)}
          </div>
          <form className={s.ask} onSubmit={e => { e.preventDefault(); ask(); }}>
            <input className="field" value={q} onChange={e => setQ(e.target.value)} placeholder={`Ask about “${ch.title}”…`} aria-label="Ask the AI teacher" />
            <button className="btn btn-primary" disabled={busy || !q.trim()}>Ask</button>
          </form>
        </section>
      </div>
    </main>
  );
}
