'use client';
import { useState } from 'react';
import Forum from '@/components/Forum';
import { LAB_LIST } from '@/lib/labs';

export default function ForumPage() {
  const [lab, setLab] = useState('');
  return (
    <main className="wrap" style={{ paddingBlock: '24px 60px', maxWidth: 900 }}>
      <div className="eyebrow">Peer learning</div>
      <h1 className="display" style={{ fontSize: 'clamp(28px,4vw,40px)', margin: '4px 0 6px' }}>Class Forum</h1>
      <p style={{ color: 'var(--muted)', margin: '0 0 16px', maxWidth: '62ch' }}>Each lab has its own discussion. PulseAI starts a thread for every concept students usually get wrong, so there is always something to answer. Ask a question, explain it to a classmate, or let PulseAI reply.</p>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }} role="group" aria-label="Filter by lab">
        <button className={`btn ${lab === '' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setLab('')}>All labs</button>
        {LAB_LIST.map(l => <button key={l.id} className={`btn ${lab === l.id ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setLab(l.id)}>{l.title}</button>)}
      </div>
      <Forum key={lab} lab={lab || undefined} />
    </main>
  );
}
