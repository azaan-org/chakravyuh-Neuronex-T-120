'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getProfile, setProfile } from '@/lib/progress';

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

export function ProfileModal({ onClose, initialClass }) {
  const p = getProfile();
  const [name, setName] = useState(p.name || '');
  const [code, setCode] = useState(initialClass || p.classCode || 'DEMO');
  return (
    <div className="modal-back" role="dialog" aria-modal="true" aria-labelledby="pmTitle">
      <form className="card modal" onSubmit={e => { e.preventDefault(); setProfile({ name: name.trim().slice(0, 40) || 'Student', classCode: code.trim().toUpperCase().slice(0, 12) || 'DEMO' }); onClose(); }}>
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

export default function Nav() {
  const path = usePathname();
  const [prof, setProf] = useState({ name: '', classCode: 'DEMO' });
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const sync = () => setProf(getProfile());
    sync(); window.addEventListener('pulse-progress', sync);
    return () => window.removeEventListener('pulse-progress', sync);
  }, []);
  const isProf = path.startsWith('/professor');
  return (
    <nav className="nav">
      <div className="wrap">
        <Link href="/" aria-label="PulseENTC home"><Logo /></Link>
        <div className="navlinks">
          <Link href="/" aria-current={!isProf ? 'page' : undefined}>Student</Link>
          <Link href="/professor" aria-current={isProf ? 'page' : undefined}>Professor</Link>
        </div>
        <div className="navright">
          <span className="lms" title="Demo integration"><i />Moodle · Juno sync (demo)</span>
          {!isProf && (
            <button className="who" onClick={() => setOpen(true)} aria-label="Change name or class">
              <span>{prof.name || 'Join class'} · <span style={{ fontFamily: 'var(--mono)', color: 'var(--muted)' }}>{prof.classCode}</span></span>
              <span className="av">{(prof.name || '?').slice(0, 1).toUpperCase()}</span>
            </button>
          )}
        </div>
      </div>
      {open && <ProfileModal onClose={() => setOpen(false)} />}
    </nav>
  );
}
