'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { MODULES, LAB_LIST } from '@/lib/labs';
import { getProgress, summarize, getProfile, setProfile, resetProgress } from '@/lib/progress';
import { ProfileModal } from '@/components/Nav';
import Hero3D from '@/components/Hero3D';
import s from './home.module.css';

export default function Home() {
  const [sum, setSum] = useState(null);
  const [prog, setProg] = useState(null);
  const [prof, setProf] = useState(null);
  const [ask, setAsk] = useState(false);
  useEffect(() => {
    try { const c = new URLSearchParams(location.search).get('class'); if (c) setProfile({ classCode: c.toUpperCase() }); } catch {}
    const sync = () => { const p = getProgress(); setProg(p); setSum(summarize(p)); setProf(getProfile()); };
    sync(); window.addEventListener('pulse-progress', sync);
    if (!getProfile().name) setAsk(true);
    return () => window.removeEventListener('pulse-progress', sync);
  }, []);

  const status = id => { const l = prog?.labs[id]; return !l ? 'new' : l.done ? 'done' : 'started'; };
  const STATUS = { new: ['Not started', 'var(--muted)'], started: ['In progress', 'var(--warn)'], done: ['Completed', 'var(--ok)'] };

  return (
    <main className="wrap" style={{ paddingBlock: '20px 60px' }}>
      <section className={s.hero}>
        <Hero3D className={s.hero3d} />
        <div className={s.heroText}>
          <div className="eyebrow" style={{ color: 'var(--accent)' }}>{prof?.name ? `Welcome back, ${prof.name.split(' ')[0]} · ` : ''}B.E. Electronics &amp; Telecommunication · Semester V</div>
          <h1 className={`display ${s.h1}`}>See the physics. Fix what you believe.</h1>
          <p className={s.lead}>Every lab starts with a real problem. Predict what will happen, watch it in a live simulation, then repair or code the fix. PulseAI maps what you misunderstand and builds your path to fix it.</p>
          <div className={s.ctas}>
            <Link href={`/lab/${LAB_LIST[0].id}`} className="btn btn-primary">Start with the mic repair →</Link>
            <Link href="/miner" className="btn btn-ghost">My Mind Map</Link>
            <Link href="/studio" className="btn btn-ghost">Lecture Studio</Link>
          </div>
          <div className={s.loop} aria-label="How each lab works">
            {['Predict', 'Observe', 'Repair / Code', 'Explain'].map((t, i) => (
              <span key={t} className={s.loopStep}><span>{i + 1}</span>{t}</span>
            ))}
          </div>
        </div>
      </section>

      <section className={`card ${s.progress}`} aria-label="Your progress">
        <div className={s.stat}><b>{sum ? sum.labsDone : 0}<small>/{LAB_LIST.length}</small></b><span>Labs completed</span></div>
        <div className={s.stat}><b>{sum ? sum.correct : 0}<small>/{sum ? sum.predictions : 0}</small></b><span>Predictions correct</span></div>
        <div className={s.stat}><b>{sum ? sum.fixed : 0}<small>/{sum ? sum.misconceptions : 0}</small></b><span>Misconceptions fixed</span></div>
        <div className={s.stat}><b>{sum ? sum.repairs + sum.challenges : 0}</b><span>Repairs &amp; code challenges</span></div>
        <div className={s.stat}><b>{sum?.quizBest || '—'}</b><span>Gate Blitz best</span></div>
        <div className={s.stat}><b>{sum?.ml ? Math.round(sum.ml.accuracy * 100) + '%' : '—'}</b><span>Your best AI model</span></div>
        {sum && sum.open.length > 0 && (
          <div className={s.open}>
            <span className="eyebrow" style={{ color: 'var(--coral)' }}>Still to fix</span>
            {sum.open.slice(0, 4).map(m => <span key={m} className="chip" style={{ borderColor: 'rgba(255,111,94,.5)', color: 'var(--fg)' }}>{m}</span>)}
          </div>
        )}
      </section>

      {MODULES.map(mod => (
        <section key={mod.id} className={s.module}>
          <div className={s.modHead}>
            <span className="eyebrow">{mod.code}</span>
            <h2 className={s.h2}>{mod.name}</h2>
            <span className={s.modBlurb}>{mod.blurb}</span>
          </div>
          {LAB_LIST.filter(l => l.module === mod.id).map(lab => {
            const st = STATUS[status(lab.id)];
            return (
              <Link key={lab.id} href={`/lab/${lab.id}`} className={`card ${s.lab}`}>
                <div className={s.labMain}>
                  <div className={s.labTop}>
                    <span className="eyebrow">{lab.title} · {lab.minutes} min</span>
                    <span className="pill" style={{ color: st[1] }}>{st[0]}</span>
                  </div>
                  <h3 className={s.h3}>{lab.scenario.title}</h3>
                  <p className={s.scen}>{lab.scenario.text}</p>
                  <div className={s.skills}>{lab.skills.map(k => <span key={k} className="chip">{k}</span>)}</div>
                </div>
                <span className={`btn btn-primary ${s.cta}`}>{status(lab.id) === 'new' ? 'Start lab' : 'Continue'} →</span>
              </Link>
            );
          })}
        </section>
      ))}

      <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 30 }}>
        Progress is saved in this browser. <button onClick={() => { resetProgress(); }} style={{ background: 'none', border: 0, color: 'var(--blue)', cursor: 'pointer', padding: 0 }}>Reset my progress</button>
      </p>
      {ask && <ProfileModal onClose={() => { setAsk(false); setProf(getProfile()); }} />}
    </main>
  );
}
