'use client';
import { useEffect, useState } from 'react';
import Forum from '@/components/Forum';
import { SUBJECTS } from '@/lib/curriculum';
import { getProfile } from '@/lib/progress';
import { fetchEvents } from '@/lib/events';
import s from './network.module.css';

// Each subject group's discussion lives on the lab id its simulators use
const GROUPS = [
  { id: 'general', name: 'ENTC Class Lounge', about: 'Anything about the course, exams and labs', lab: 'general', color: '#b693ff' },
  ...SUBJECTS.map(x => ({ id: x.id, name: `${x.name} study group`, about: `${x.code} · ${x.faculty}`, lab: { edc: 'pn-junction', de: 'logic', lic: 'opamp', mc: 'iot' }[x.id], color: x.color }))
];
const JOINED = 'pulseentc.groups.v1';
const ago = iso => { const m = Math.round((Date.now() - new Date(iso)) / 60000); return m < 2 ? 'active now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`; };

export default function Network() {
  const [g, setG] = useState(GROUPS[1].id);
  const [joined, setJoined] = useState([]);
  const [people, setPeople] = useState([]);
  const [me, setMe] = useState({ name: '', classCode: 'DEMO' });
  useEffect(() => {
    const p = getProfile(); setMe(p);
    try { setJoined(JSON.parse(localStorage.getItem(JOINED) || 'null') || ['general', SUBJECTS[0].id]); } catch { setJoined(['general', SUBJECTS[0].id]); }
    const load = () => fetchEvents(p.classCode || 'DEMO').then(j => {
      const map = {};
      j.events.forEach(e => { if (!e.student) return; const x = map[e.student] = map[e.student] || { name: e.student, last: e.created_at, n: 0, built: 0, labs: new Set() }; x.n++; if (e.created_at > x.last) x.last = e.created_at; if (e.type === 'workbench' && e.correct) x.built++; x.labs.add(e.lab.replace(/^(chapter|workbench):/, '')); });
      setPeople(Object.values(map).sort((a, b) => b.last.localeCompare(a.last)));
    }).catch(() => {});
    load(); const t = setInterval(load, 6000); return () => clearInterval(t);
  }, []);
  const toggle = id => { const next = joined.includes(id) ? joined.filter(x => x !== id) : [...joined, id]; setJoined(next); try { localStorage.setItem(JOINED, JSON.stringify(next)); } catch {} };
  const grp = GROUPS.find(x => x.id === g);
  const online = people.filter(p => Date.now() - new Date(p.last) < 10 * 60000).length;

  return (
    <main className={s.page}>
      <aside className={s.groups}>
        <span className="eyebrow">Study groups</span>
        {GROUPS.map(x => (
          <button key={x.id} className={`${s.group} ${x.id === g ? s.on : ''}`} onClick={() => setG(x.id)} style={{ '--gc': x.color }}>
            <span className={s.gIcon}>{x.name.slice(0, 1)}</span>
            <span className={s.gText}><b>{x.name}</b><small>{x.about}</small></span>
            {joined.includes(x.id) && <span className={s.joinedDot} title="Joined" />}
          </button>
        ))}
      </aside>

      <section className={s.main}>
        <div className={s.mainHead} style={{ '--gc': grp.color }}>
          <div>
            <span className="eyebrow" style={{ color: grp.color }}>Class {me.classCode} · Network</span>
            <h1 className={s.h1}>{grp.name}</h1>
            <span className={s.muted}>{grp.about} · {Math.max(people.length, 1)} members · {online} online</span>
          </div>
          <button className={`btn ${joined.includes(grp.id) ? 'btn-ghost' : 'btn-primary'}`} onClick={() => toggle(grp.id)}>{joined.includes(grp.id) ? 'Joined ✓' : 'Join group'}</button>
        </div>
        <p className={s.tip}>Stuck on a circuit? Press <b>Ask classmates</b> in any workbench to post your wiring here, with the AI’s diagnosis attached.</p>
        <Forum key={grp.lab} lab={grp.lab} label={grp.id === 'general' ? 'whole class' : grp.name} />
      </section>

      <aside className={s.people}>
        <span className="eyebrow">People in your class</span>
        {people.length === 0 && <span className={s.muted}>Classmates appear here once they start learning.</span>}
        {people.slice(0, 30).map(p => {
          const on = Date.now() - new Date(p.last) < 10 * 60000;
          return (
            <div key={p.name} className={s.person}>
              <span className={s.av} style={{ background: `hsl(${[...p.name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360} 55% 62%)` }}>{p.name.slice(0, 1)}<i className={on ? s.online : ''} /></span>
              <span className={s.pText}><b>{p.name}{p.name === me.name ? ' (you)' : ''}</b><small>{ago(p.last)} · {p.built} circuit{p.built === 1 ? '' : 's'} built</small></span>
            </div>
          );
        })}
      </aside>
    </main>
  );
}
