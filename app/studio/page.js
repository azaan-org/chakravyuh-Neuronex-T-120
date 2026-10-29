'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { LABS } from '@/lib/labs';
import { SAMPLE_DECK, readPptx, tagSlides, DEFAULT_PARAMS } from '@/lib/deck';
import s from './studio.module.css';

function labSrc(slide) {
  if (!slide?.lab) return null;
  const p = new URLSearchParams({ ...(DEFAULT_PARAMS[slide.lab] || {}), ...(slide.params || {}) });
  return LABS[slide.lab].file + (p.toString() ? '?' + p : '');
}

export default function Studio() {
  const [deck, setDeck] = useState(SAMPLE_DECK);
  const [i, setI] = useState(0);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('Sample lecture deck. Upload your own .pptx to turn it into live labs.');
  const [qr, setQr] = useState(null);
  const [code, setCode] = useState('DEMO');
  const [base, setBase] = useState('');
  const [full, setFull] = useState(false);
  const stage = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    let b = location.origin;
    try { b = localStorage.getItem('pulse.prof.base') || b; setCode(localStorage.getItem('pulse.prof.class') || 'DEMO'); } catch {}
    setBase(b);
    const onFs = () => setFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const n = deck.slides.length, slide = deck.slides[i];
  const go = useCallback(d => setI(x => Math.max(0, Math.min(n - 1, x + d))), [n]);
  useEffect(() => {
    const k = e => { if (e.target.closest && e.target.closest('input, textarea')) return; if (['ArrowRight', 'PageDown'].includes(e.key)) go(1); if (['ArrowLeft', 'PageUp'].includes(e.key)) go(-1); };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [go]);

  async function upload(file) {
    setBusy(true); setNote('Reading your slides…');
    try {
      const d = await readPptx(file);
      setNote('Matching each slide to a simulation…');
      const { tags, source } = await tagSlides(d.slides);
      d.slides = d.slides.map((sl, k) => ({ ...sl, lab: tags[k]?.lab || null, summary: tags[k]?.summary || null }));
      setDeck(d); setI(0);
      const linked = d.slides.filter(x => x.lab).length;
      setNote(`${d.slides.length} slides · ${linked} turned into live labs · ${source === 'ai' ? 'matched by AI' : 'matched by the built-in topic matcher'}`);
    } catch (e) { setNote(e.message || 'Could not read that file. Upload a .pptx deck.'); }
    setBusy(false);
  }
  async function showQr() {
    if (!slide.lab) return;
    const p = new URLSearchParams({ class: code, ...(slide.params || {}) });
    const url = `${base}/lab/${slide.lab}?${p}`;
    setQr({ url, img: await QRCode.toDataURL(url, { margin: 1, width: 480, color: { dark: '#0a0f15', light: '#ffffff' } }) });
  }
  function present() {
    if (document.fullscreenElement) document.exitFullscreen?.(); else stage.current?.requestFullscreen?.().catch(() => {});
  }

  const lab = slide.lab ? LABS[slide.lab] : null;
  return (
    <main className={s.page}>
      <div className={s.bar}>
        <div className={s.deckName}><span className="eyebrow">Lecture Studio</span><b>{deck.name}</b></div>
        <span className={s.note}>{note}</span>
        <div className={s.actions}>
          <button className="btn btn-ghost" onClick={() => fileRef.current?.click()} disabled={busy}>{busy ? 'Working…' : 'Upload .pptx'}</button>
          {deck !== SAMPLE_DECK && <button className="btn btn-ghost" onClick={() => { setDeck(SAMPLE_DECK); setI(0); setNote('Sample lecture deck.'); }}>Sample deck</button>}
          <button className="btn btn-primary" onClick={present}>{full ? 'Exit full screen' : 'Present'}</button>
          <input ref={fileRef} type="file" accept=".pptx" hidden onChange={e => e.target.files?.[0] && upload(e.target.files[0])} />
        </div>
      </div>

      <div ref={stage} className={`${s.stage} ${full ? s.full : ''}`}>
        <nav className={s.thumbs} aria-label="Slides">
          {deck.slides.map((sl, k) => (
            <button key={k} className={`${s.thumb} ${k === i ? s.cur : ''}`} onClick={() => setI(k)} aria-current={k === i ? 'true' : undefined}>
              <span className={s.tn}>{k + 1}</span>
              <span className={s.tt}>{sl.title}</span>
              {sl.lab && <span className={s.tl}>▶ {LABS[sl.lab].title}</span>}
            </button>
          ))}
        </nav>

        <section className={s.slideWrap}>
          <div className={s.slide}>
            <div className={s.slideTop}><span>{deck.name.replace(/\.pptx$/i, '')}</span><span>{i + 1} / {n}</span></div>
            <h1 className={s.st}>{slide.title}</h1>
            <div className={s.sbody}>
              <ul>{(slide.bullets || []).map((b, k) => <li key={k}>{b}</li>)}</ul>
              {slide.image && <img src={slide.image} alt="" className={s.simg} />}
            </div>
            {lab && <div className={s.liveTag}><i />Live simulation attached: {lab.title}</div>}
          </div>
          <div className={s.nav}>
            <button className="btn btn-ghost" onClick={() => go(-1)} disabled={i === 0} aria-label="Previous slide">←</button>
            <span className={s.prompt}>{slide.prompt || (lab ? lab.scenario.title : slide.summary || 'Use ← → keys to move between slides.')}</span>
            <button className="btn btn-ghost" onClick={() => go(1)} disabled={i === n - 1} aria-label="Next slide">→</button>
          </div>
        </section>

        <section className={s.sim}>
          {lab ? (
            <>
              <div className={s.simHead}>
                <div><span className="eyebrow" style={{ color: 'var(--accent)' }}>Live on this slide</span><b>{lab.title}</b></div>
                <div className={s.simActions}>
                  <button className="btn btn-ghost" onClick={showQr}>Class QR</button>
                  <a className="btn btn-ghost" href={`/lab/${slide.lab}?${new URLSearchParams(slide.params || {})}`} target="_blank" rel="noreferrer">Open full lab</a>
                </div>
              </div>
              <iframe key={i + (slide.lab || '')} src={labSrc(slide)} title={lab.title} className={s.frame} allow="autoplay; clipboard-write" />
            </>
          ) : (
            <div className={s.noSim}>
              <span className="eyebrow">No simulation needed</span>
              <h2>{slide.title}</h2>
              <p>{slide.summary || 'This slide is context or admin, so PulseENTC keeps the screen on your slide.'}</p>
              <div className={s.upNext}>
                {deck.slides.slice(i + 1).filter(x => x.lab).slice(0, 2).map((x, k) => <span key={k} className="chip">Coming up: {x.title} · {LABS[x.lab].title}</span>)}
              </div>
            </div>
          )}
        </section>
      </div>

      {qr && (
        <div className="modal-back" onClick={() => setQr(null)} role="dialog" aria-modal="true" aria-label="Class QR code">
          <div className={`card ${s.qrBox}`} onClick={e => e.stopPropagation()}>
            <span className="eyebrow" style={{ color: 'var(--accent)' }}>Scan to open on your phone · class {code}</span>
            <h2 className="display" style={{ fontSize: 28 }}>{lab?.title}</h2>
            <img src={qr.img} alt="QR code for this lab" className={s.qrImg} />
            <span className={s.mono}>{qr.url.replace(/^https?:\/\//, '')}</span>
            {/localhost|127\.0\.0\.1/.test(base) && <span style={{ color: 'var(--coral)', fontSize: 13 }}>Phones can’t open localhost. Set the laptop’s Wi-Fi address on the Professor page.</span>}
            <button className="btn btn-ghost" onClick={() => setQr(null)}>Close</button>
          </div>
        </div>
      )}
    </main>
  );
}
