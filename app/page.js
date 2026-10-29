'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Hero3D from '@/components/Hero3D';
import { SUBJECTS, chaptersOf } from '@/lib/curriculum';
import { getProfile, getProgress } from '@/lib/progress';
import s from './curriculum.module.css';

export default function Curriculum() {
  const router = useRouter();
  const [prof, setProf] = useState(null);
  const [prog, setProg] = useState(null);
  const [mats, setMats] = useState([]);
  useEffect(() => {
    const p = getProfile();
    if (!p.name) { router.replace('/login'); return; }
    if (p.role === 'professor') { router.replace('/professor'); return; }
    setProf(p); setProg(getProgress());
    fetch('/api/materials', { cache: 'no-store' }).then(r => r.json()).then(j => setMats(j.items || [])).catch(() => {});
  }, [router]);
  if (!prof) return null;

  const chOpened = id => prog?.chapters?.[id];
  const all = SUBJECTS.flatMap(x => chaptersOf(x.id));
  const started = all.filter(c => chOpened(c.id)).length;
  const next = all.find(c => !chOpened(c.id)) || all[0];

  return (
    <main className="wrap" style={{ paddingBlock: '20px 60px' }}>
      <section className={s.hero}>
        <Hero3D className={s.hero3d} />
        <div className={s.heroText}>
          <span className="eyebrow" style={{ color: 'var(--accent)' }}>Welcome, {prof.name.split(' ')[0]} · B.E. Electronics &amp; Telecommunication · Class {prof.classCode}</span>
          <h1 className="display">Your ENTC curriculum, as a lab.</h1>
          <p>Open a chapter: your professor’s slides are already there. Switch on AI mode to be taught step by step, then build each circuit yourself in the simulator.</p>
          <div className={s.ctas}>
            <Link className="btn btn-primary" href={`/learn/${next.id}`}>{started ? 'Continue' : 'Start'}: {next.title} →</Link>
            <span className={s.prog}>{started} of {all.length} chapters started</span>
          </div>
        </div>
      </section>

      <div className={s.syncRow}>
        <h2 className={s.h2}>Semester curriculum</h2>
        <span className="chip"><i className={s.dot} />Imported from Moodle · Juno (demo)</span>
      </div>

      <div className={s.subjects}>
        {SUBJECTS.map(sub => (
          <section key={sub.id} className={`card ${s.subject}`} style={{ '--sc': sub.color }}>
            <header>
              <span className="eyebrow">{sub.code} · {sub.year}</span>
              <h3>{sub.name}</h3>
              <span className={s.fac}>{sub.faculty}</span>
            </header>
            <ol className={s.chapters}>
              {chaptersOf(sub.id).map(ch => {
                const up = mats.filter(m => m.chapter === ch.id);
                const c = chOpened(ch.id);
                return (
                  <li key={ch.id}>
                    <Link href={`/learn/${ch.id}`} className={s.ch}>
                      <span className={s.unit}>Unit {ch.unit}</span>
                      <span className={s.chMain}>
                        <b>{ch.title}</b>
                        <span className={s.tags}>
                          <span className={s.tag}>{up.length ? `${up.length} file${up.length > 1 ? 's' : ''} from professor` : 'Professor’s slides'}</span>
                          <span className={s.tag}>AI mode</span>
                          <span className={s.tag}>{ch.sims.length} simulator{ch.sims.length > 1 ? 's' : ''}</span>
                        </span>
                      </span>
                      <span className={s.state} style={{ color: c?.done ? 'var(--ok)' : c ? 'var(--warn)' : 'var(--muted)' }}>{c?.done ? 'Done' : c ? 'In progress' : 'Open →'}</span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
    </main>
  );
}
