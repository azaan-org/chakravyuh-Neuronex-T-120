'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { SUBJECTS, chaptersOf } from '@/lib/curriculum';
import { getProfile } from '@/lib/progress';
import s from './materials.module.css';

const size = b => b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';

function ChapterRow({ ch, items, onUploaded, onDelete }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [drag, setDrag] = useState(false);
  const [confirm, setConfirm] = useState(null);
  async function upload(files) {
    setErr('');
    for (const f of files) {
      setBusy(f.name);
      const fd = new FormData(); fd.append('file', f); fd.append('chapter', ch.id); fd.append('uploader', getProfile().name || 'Professor');
      try { const r = await fetch('/api/materials', { method: 'POST', body: fd }); const j = await r.json(); if (!r.ok) setErr(j.error || 'Upload failed.'); else onUploaded(j.item); }
      catch { setErr('Upload failed. Check that the PulseENTC server is still running.'); }
    }
    setBusy(false);
  }
  return (
    <div className={`${s.ch} ${drag ? s.drag : ''}`} onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={e => { e.preventDefault(); setDrag(false); upload([...e.dataTransfer.files]); }}>
      <div className={s.chHead}>
        <div><span className={s.unit}>Unit {ch.unit}</span><b>{ch.title}</b></div>
        <div className={s.acts}>
          <Link className="btn btn-ghost" href={`/learn/${ch.id}`} target="_blank">Preview as student</Link>
          <button className="btn btn-primary" onClick={() => input.current?.click()} disabled={!!busy}>{busy ? 'Uploading…' : 'Upload PPTX / PDF'}</button>
          <input ref={input} type="file" accept=".pptx,.pdf" multiple hidden onChange={e => { upload([...e.target.files]); e.target.value = ''; }} />
        </div>
      </div>
      {items.length === 0 ? <p className={s.none}>No files yet. Students see the built-in chapter slides. Drag a .pptx or .pdf here.</p> : (
        <ul className={s.files}>{items.map(m => (
          <li key={m.id}>
            <span className={s.kind} data-k={m.kind}>{m.kind.toUpperCase()}</span>
            <a href={`/api/materials?file=${m.id}`} target="_blank" rel="noreferrer" className={s.fname}>{m.name}</a>
            <span className={s.meta}>{m.pages.length} {m.kind === 'pdf' ? 'pages' : 'slides'} read by AI · {size(m.size)} · {new Date(m.uploaded).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
            {confirm === m.id ? <button className={s.del} style={{ color: 'var(--coral)' }} onClick={() => { onDelete(m.id); setConfirm(null); }}>Confirm remove</button>
              : <button className={s.del} onClick={() => { setConfirm(m.id); setTimeout(() => setConfirm(c => c === m.id ? null : c), 4000); }}>Remove</button>}
          </li>))}
        </ul>
      )}
      {err && <p className={s.err}>{err}</p>}
    </div>
  );
}

export default function Materials() {
  const [sub, setSub] = useState(SUBJECTS[0].id);
  const [items, setItems] = useState([]);
  useEffect(() => {
    const p = getProfile(); if (p.subject && SUBJECTS.find(x => x.id === p.subject)) setSub(p.subject);
    fetch('/api/materials', { cache: 'no-store' }).then(r => r.json()).then(j => setItems(j.items || [])).catch(() => {});
  }, []);
  const del = async id => { const r = await fetch('/api/materials?id=' + id, { method: 'DELETE' }); if (r.ok) setItems(x => x.filter(m => m.id !== id)); };
  const subject = SUBJECTS.find(x => x.id === sub);
  return (
    <main className="wrap" style={{ paddingBlock: '24px 60px', maxWidth: 1050 }}>
      <div className="eyebrow">Professor · Study materials</div>
      <h1 className="display" style={{ fontSize: 'clamp(26px,3.6vw,38px)', margin: '4px 0 6px' }}>Upload material chapter by chapter</h1>
      <p className={s.lead}>Each PPT or PDF you upload appears in that chapter for every student. PulseENTC reads it so the AI teacher can summarise it, list the formulas and break it down step by step.</p>
      <div className={s.subjects} role="tablist" aria-label="Subject">
        {SUBJECTS.map(x => <button key={x.id} role="tab" aria-selected={x.id === sub} onClick={() => setSub(x.id)} style={{ '--sc': x.color }}><span>{x.code}</span>{x.name}<small>{items.filter(m => chaptersOf(x.id).some(c => c.id === m.chapter)).length} files</small></button>)}
      </div>
      <div className={`card ${s.list}`} style={{ '--sc': subject.color }}>
        <div className={s.listHead}><b>{subject.name}</b><span className="chip"><i className={s.dot} />Syllabus synced from Moodle · Juno (demo)</span></div>
        {chaptersOf(sub).map(ch => <ChapterRow key={ch.id} ch={ch} items={items.filter(m => m.chapter === ch.id)} onUploaded={it => setItems(x => [...x, it])} onDelete={del} />)}
      </div>
    </main>
  );
}
