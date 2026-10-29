'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getProfile, setProfile, logout } from '@/lib/progress';

export function Logo() {
  return (
    <span className="logo">
      <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
        <rect x="1" y="1" width="24" height="24" rx="6" fill="#151f2a" stroke="#243242" />
        <path d="M4 14h4l2-6 3 11 2.5-8 1.5 3h5" fill="none" stroke="#ffd27a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>Pulse<b>ENTC</b></span>
    </span>
  );
}

// Kept for older pages that ask for a name inline
export function ProfileModal({ onClose, initialClass }) {
  const p = getProfile();
  const [name, setName] = useState(p.name || '');
  const [code, setCode] = useState(initialClass || p.classCode || 'DEMO');
  return (
    <div className="modal-back" role="dialog" aria-modal="true" aria-labelledby="pmTitle">
      <form className="card modal" onSubmit={e => { e.preventDefault(); setProfile({ role: p.role || 'student', name: name.trim().slice(0, 40) || 'Student', classCode: code.trim().toUpperCase().slice(0, 12) || 'DEMO' }); onClose(); }}>
        <div className="eyebrow">Join your class</div>
        <h2 id="pmTitle" style={{ fontSize: 20 }}>Who is learning today?</h2>
        <label htmlFor="pmName" style={{ fontSize: 13, color: 'var(--muted)' }}>Your name</label>
        <input id="pmName" className="field" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Aisha Khan" autoFocus />
        <label htmlFor="pmCode" style={{ fontSize: 13, color: 'var(--muted)' }}>Class code (from your professor)</label>
        <input id="pmCode" className="field" value={code} onChange={e => setCode(e.target.value)} placeholder="DEMO" style={{ fontFamily: 'var(--mono)', textTransform: 'uppercase' }} />
        <button className="btn btn-primary" type="submit" style={{ alignSelf: 'flex-start' }}>Start learning</button>
      </form>
    </div>
  );
}

const STUDENT = [['/', 'Curriculum', p => p === '/' || p.startsWith('/learn')], ['/labs', 'Simulators', p => p.startsWith('/labs') || p.startsWith('/lab/') || p.startsWith('/workbench')], ['/miner', 'My Progress', p => p.startsWith('/miner')], ['/network', 'Network', p => p.startsWith('/network') || p.startsWith('/forum')]];
const PROF = [['/professor', 'Insights', p => p === '/professor'], ['/professor/materials', 'Study Materials', p => p.startsWith('/professor/materials')], ['/studio', 'Lecture Studio', p => p.startsWith('/studio')], ['/network', 'Network', p => p.startsWith('/network')]];

export default function Nav() {
  const path = usePathname();
  const router = useRouter();
  const [prof, setProf] = useState({ name: '', classCode: 'DEMO', role: '' });
  useEffect(() => {
    const sync = () => setProf(getProfile());
    sync(); window.addEventListener('pulse-progress', sync);
    return () => window.removeEventListener('pulse-progress', sync);
  }, []);
  const role = prof.role || (path.startsWith('/professor') || path.startsWith('/studio') ? 'professor' : 'student');
  const links = role === 'professor' ? PROF : STUDENT;
  if (path.startsWith('/login')) return (
    <nav className="nav"><div className="wrap"><Link href="/login" aria-label="PulseENTC"><Logo /></Link><div className="navright"><span className="lms"><i />Moodle · Juno integration (demo)</span></div></div></nav>
  );
  return (
    <nav className="nav">
      <div className="wrap">
        <Link href={role === 'professor' ? '/professor' : '/'} aria-label="PulseENTC home"><Logo /></Link>
        <div className="navlinks">
          {links.map(([href, label, active]) => <Link key={href} href={href} aria-current={active(path) ? 'page' : undefined}>{label}</Link>)}
        </div>
        <div className="navright">
          <span className="lms" title="Demo integration"><i />Synced with Moodle · Juno (demo)</span>
          {prof.name ? (
            <button className="who" onClick={() => { logout(); router.push('/login'); }} title="Sign out" aria-label={`Signed in as ${prof.name}. Sign out`}>
              <span>{prof.name} · <span style={{ fontFamily: 'var(--mono)', color: 'var(--muted)' }}>{role === 'professor' ? 'Professor' : prof.classCode}</span></span>
              <span className="av" style={{ background: role === 'professor' ? 'var(--accent)' : 'var(--blue)' }}>{prof.name.slice(0, 1).toUpperCase()}</span>
            </button>
          ) : <Link className="btn btn-primary" href="/login" style={{ padding: '6px 14px' }}>Sign in</Link>}
        </div>
      </div>
    </nav>
  );
}
