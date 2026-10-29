'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Hero3D from '@/components/Hero3D';
import { setProfile, getProfile } from '@/lib/progress';
import { SUBJECTS } from '@/lib/curriculum';
import s from './login.module.css';

export default function Login() {
  const router = useRouter();
  const [role, setRole] = useState('student');
  const [name, setName] = useState('');
  const [code, setCode] = useState('DEMO');
  const [subject, setSubject] = useState(SUBJECTS[0].id);
  useEffect(() => { const p = getProfile(); if (p.name) setName(p.name); try { const c = new URLSearchParams(location.search).get('class'); if (c) setCode(c.toUpperCase()); } catch {} }, []);

  function submit(e) {
    e.preventDefault();
    const n = name.trim().slice(0, 40) || (role === 'student' ? 'Student' : 'Professor');
    setProfile({ name: n, role, classCode: (code.trim().toUpperCase() || 'DEMO').slice(0, 12), subject: role === 'professor' ? subject : undefined });
    if (role === 'professor') { try { localStorage.setItem('pulse.prof.class', (code.trim().toUpperCase() || 'DEMO').slice(0, 12)); } catch {} }
    router.push(role === 'student' ? '/' : '/professor');
  }

  return (
    <main className={s.page}>
      <Hero3D className={s.bg} />
      <div className={s.shade} />
      <section className={s.inner}>
        <div className={s.copy}>
          <span className="eyebrow" style={{ color: 'var(--accent)' }}>AI-powered virtual ENTC lab</span>
          <h1 className="display">No lab? No problem.</h1>
          <p>Your professor’s slides become an AI teacher, and every circuit becomes a simulator you wire with your own hands. PulseENTC spots your mistakes, explains them, and tells your professor where the class needs help.</p>
          <ul>
            <li>Learn each chapter with an AI teacher that knows your professor’s material</li>
            <li>Build circuits yourself, the AI catches wrong connections</li>
            <li>Discuss with classmates and study groups</li>
          </ul>
        </div>
        <form className={`card ${s.form}`} onSubmit={submit}>
          <div className={s.roles} role="radiogroup" aria-label="I am a">
            {[['student', 'Student'], ['professor', 'Professor']].map(([k, l]) => (
              <button type="button" key={k} role="radio" aria-checked={role === k} className={role === k ? s.on : ''} onClick={() => setRole(k)}>{l}</button>
            ))}
          </div>
          <label htmlFor="lgName">Full name</label>
          <input id="lgName" className="field" value={name} onChange={e => setName(e.target.value)} placeholder={role === 'student' ? 'e.g. Aisha Khan' : 'e.g. Prof. A. Patil'} autoFocus />
          <label htmlFor="lgCode">{role === 'student' ? 'Class code (from your professor)' : 'Your class code'}</label>
          <input id="lgCode" className="field" value={code} onChange={e => setCode(e.target.value)} style={{ fontFamily: 'var(--mono)', textTransform: 'uppercase' }} />
          {role === 'professor' && (<>
            <label htmlFor="lgSub">Subject you teach</label>
            <select id="lgSub" className="field" value={subject} onChange={e => setSubject(e.target.value)}>{SUBJECTS.map(x => <option key={x.id} value={x.id}>{x.code} · {x.name}</option>)}</select>
          </>)}
          <button className="btn btn-primary" type="submit">{role === 'student' ? 'Enter my curriculum →' : 'Open professor dashboard →'}</button>
          <div className={s.lms}><span className="chip"><i className={s.dot} />Sign in with Moodle</span><span className="chip"><i className={s.dot} />Sign in with Juno</span><small>LMS single sign-on (demo)</small></div>
        </form>
      </section>
    </main>
  );
}
