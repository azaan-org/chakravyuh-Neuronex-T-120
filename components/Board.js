'use client';
import { useEffect, useRef, useState } from 'react';
import { TYPES, termPos, allTerms, anodeOf, termLabel } from '@/lib/workbench';

const WIRE = ['#ff6f5e', '#46b6ff', '#5fd38d', '#ffd27a', '#b693ff', '#ffb84d', '#4fd1c5', '#f0abfc'];
const STROKE = '#8495a7', BODY = '#1a2633';

function wirePath([x1, y1], [x2, y2]) {
  const sag = Math.min(90, 30 + Math.hypot(x2 - x1, y2 - y1) * 0.18);
  return `M${x1} ${y1} C${x1} ${y1 + sag}, ${x2} ${y2 + sag}, ${x2} ${y2}`;
}

function Polyline({ pts, x, y, w, h, range, color, dash }) {
  if (!pts?.length) return null;
  const d = pts.map((v, k) => `${k ? 'L' : 'M'}${(x + k / (pts.length - 1) * w).toFixed(1)} ${(y + h / 2 - v / range * (h / 2 - 4)).toFixed(1)}`).join(' ');
  return <path d={d} fill="none" stroke={color} strokeWidth={dash ? 1.4 : 2.2} strokeDasharray={dash ? '4 3' : undefined} />;
}

function Part({ c, bench, st, view, t, blinkOn }) {
  const rot = c.rot === 90 ? `rotate(90 ${c.x} ${c.y})` : undefined;
  const tl = { fill: '#dbe5ee', fontSize: 13, fontFamily: 'IBM Plex Sans, sans-serif' };
  const mono = { fill: '#8495a7', fontSize: 11, fontFamily: 'IBM Plex Mono, monospace' };
  switch (c.type) {
    case 'battery': return (<g>
      <line x1={c.x} y1={c.y - 58} x2={c.x} y2={c.y - 42} stroke={STROKE} strokeWidth="3" /><line x1={c.x} y1={c.y + 42} x2={c.x} y2={c.y + 58} stroke={STROKE} strokeWidth="3" />
      <rect x={c.x - 30} y={c.y - 42} width="60" height="84" rx="8" fill="#1d3a2d" stroke="#5fd38d" strokeWidth="1.5" />
      <rect x={c.x - 12} y={c.y - 48} width="24" height="7" rx="2" fill="#5fd38d" />
      <text x={c.x} y={c.y - 14} textAnchor="middle" style={{ ...tl, fontSize: 20, fontWeight: 700 }}>+</text>
      <text x={c.x} y={c.y + 30} textAnchor="middle" style={{ ...tl, fontSize: 20, fontWeight: 700 }}>−</text>
      <text x={c.x} y={c.y + 8} textAnchor="middle" style={{ ...mono, fill: '#5fd38d' }}>{c.v} V</text>
      <text x={c.x + 42} y={c.y + 4} style={tl}>{c.label}</text>
    </g>);
    case 'ac': case 'sig': return (<g>
      <line x1={c.x} y1={c.y - 58} x2={c.x} y2={c.y - 34} stroke={STROKE} strokeWidth="3" /><line x1={c.x} y1={c.y + 34} x2={c.x} y2={c.y + 58} stroke={STROKE} strokeWidth="3" />
      {c.type === 'ac' ? <circle cx={c.x} cy={c.y} r="34" fill={BODY} stroke={STROKE} strokeWidth="2" /> : <rect x={c.x - 38} y={c.y - 34} width="76" height="68" rx="8" fill={BODY} stroke={STROKE} strokeWidth="2" />}
      <path d={`M${c.x - 20} ${c.y} q10 -18 20 0 t20 0`} fill="none" stroke="#ffd27a" strokeWidth="2.4" />
      <text x={c.x - 6} y={c.y - 40} textAnchor="end" style={mono}>{c.type === 'ac' ? 'L' : 'SIG'}</text>
      <text x={c.x - 6} y={c.y + 50} textAnchor="end" style={mono}>{c.type === 'ac' ? 'N' : 'COM'}</text>
      <foreignObject x={c.x + 44} y={c.y - 20} width="150" height="44"><div style={{ color: '#dbe5ee', fontSize: 12.5, lineHeight: 1.25, fontFamily: 'IBM Plex Sans, sans-serif' }}>{c.label}</div></foreignObject>
    </g>);
    case 'resistor': {
      const n = 6, w = 64, x0 = c.x - w / 2;
      let d = `M${c.x - 60} ${c.y} H${x0}`; for (let i = 0; i < n * 2; i++) d += ` L${x0 + w / (n * 2) * (i + 0.5)} ${c.y + (i % 2 ? 9 : -9)}`; d += ` L${x0 + w} ${c.y} H${c.x + 60}`;
      const v = st.values?.[c.id] ?? c.value, txt = v >= 1000 ? v / 1000 + ' kΩ' : v + ' Ω';
      return (<g>
        <g transform={rot}><path d={d} fill="none" stroke="#c9a35a" strokeWidth="3" strokeLinejoin="round" /></g>
        <text x={c.rot === 90 ? c.x + 18 : c.x} y={c.rot === 90 ? c.y + 4 : c.y - 18} textAnchor={c.rot === 90 ? 'start' : 'middle'} style={tl}>{c.label} <tspan style={{ ...mono, fill: '#ffd27a' }}>{txt}</tspan></text>
      </g>);
    }
    case 'led': case 'diode': {
      const an = anodeOf(bench, st, c.id), right = an === 'p1'; // triangle points from anode to cathode
      const tip = right ? c.x + 14 : c.x - 14, base = right ? c.x - 14 : c.x + 14;
      const v = view?.[c.id] || {}, lit = v.lit && (!v.blink || blinkOn) ? v.lit : 0;
      return (<g>
        {lit > 0 && <circle cx={c.x} cy={c.y} r={34 + lit * 16} fill="url(#ledGlow)" opacity={0.4 + lit * 0.6} />}
        <g transform={rot}>
          <line x1={c.x - 50} y1={c.y} x2={c.x + 50} y2={c.y} stroke={STROKE} strokeWidth="3" />
          <path d={`M${base} ${c.y - 15} L${tip} ${c.y} L${base} ${c.y + 15} Z`} fill={v.burnt ? '#2a2a2a' : c.type === 'led' ? (lit ? '#ff8a7b' : '#5a2320') : '#2b3542'} stroke={c.type === 'led' ? '#ff6f5e' : '#dbe5ee'} strokeWidth="2" />
          <line x1={tip} y1={c.y - 15} x2={tip} y2={c.y + 15} stroke={c.type === 'led' ? '#ff6f5e' : '#dbe5ee'} strokeWidth="3" />
          {c.type === 'led' && <g stroke="#ff6f5e" strokeWidth="1.6" fill="none"><path d={`M${c.x - 2} ${c.y - 20} l8 -12 m-6 0 h6 v6`} /><path d={`M${c.x + 8} ${c.y - 18} l8 -12 m-6 0 h6 v6`} /></g>}
        </g>
        {v.burnt && <g><circle cx={c.x + 8} cy={c.y - 34} r="10" fill="#6b7480" opacity=".55" /><circle cx={c.x - 6} cy={c.y - 50} r="13" fill="#6b7480" opacity=".4" /><circle cx={c.x + 10} cy={c.y - 66} r="9" fill="#6b7480" opacity=".3" /></g>}
        <text x={c.rot === 90 ? c.x + 26 : c.x} y={c.rot === 90 ? c.y + 5 : c.y + 34} textAnchor={c.rot === 90 ? 'start' : 'middle'} style={tl}>{c.label}{v.burnt ? ' · burnt' : ''}</text>
        <text x={c.rot === 90 ? c.x + 26 : c.x} y={c.rot === 90 ? c.y + 21 : c.y + 50} textAnchor={c.rot === 90 ? 'start' : 'middle'} style={mono}>long leg = anode</text>
      </g>);
    }
    case 'gnd': return (<g stroke={STROKE} strokeWidth="2.5"><line x1={c.x} y1={c.y - 24} x2={c.x} y2={c.y} /><line x1={c.x - 18} y1={c.y} x2={c.x + 18} y2={c.y} /><line x1={c.x - 11} y1={c.y + 7} x2={c.x + 11} y2={c.y + 7} /><line x1={c.x - 5} y1={c.y + 14} x2={c.x + 5} y2={c.y + 14} /><text x={c.x + 26} y={c.y + 6} style={{ ...tl, stroke: 'none' }}>Ground</text></g>);
    case 'opamp': return (<g>
      <line x1={c.x - 72} y1={c.y - 28} x2={c.x - 50} y2={c.y - 28} stroke={STROKE} strokeWidth="3" /><line x1={c.x - 72} y1={c.y + 28} x2={c.x - 50} y2={c.y + 28} stroke={STROKE} strokeWidth="3" /><line x1={c.x + 52} y1={c.y} x2={c.x + 76} y2={c.y} stroke={STROKE} strokeWidth="3" />
      <path d={`M${c.x - 50} ${c.y - 56} L${c.x - 50} ${c.y + 56} L${c.x + 52} ${c.y} Z`} fill={BODY} stroke={STROKE} strokeWidth="2.5" />
      <text x={c.x - 42} y={c.y - 22} style={{ ...tl, fontSize: 20 }}>−</text><text x={c.x - 43} y={c.y + 35} style={{ ...tl, fontSize: 18 }}>+</text>
      <line x1={c.x} y1={c.y - 28} x2={c.x} y2={c.y - 48} stroke={STROKE} strokeWidth="2" /><text x={c.x + 4} y={c.y - 40} style={mono}>+5V</text>
      <line x1={c.x} y1={c.y + 28} x2={c.x} y2={c.y + 48} stroke={STROKE} strokeWidth="2" /><text x={c.x + 4} y={c.y + 46} style={mono}>−5V</text>
      <text x={c.x - 4} y={c.y + 76} textAnchor="middle" style={tl}>{c.label}</text>
    </g>);
    case 'scope': {
      const W = 150, H = 110, x0 = c.x - W / 2, y0 = c.y - H / 2, tr = view?.scope?.traces || [], range = view?.scope?.range || 6;
      return (<g>
        <rect x={x0} y={y0} width={W} height={H} rx="8" fill="#223041" stroke={STROKE} strokeWidth="1.5" />
        <rect x={x0 + 8} y={y0 + 8} width={W - 16} height={H - 30} rx="4" fill="#06120d" />
        {[1, 2, 3].map(i => <line key={i} x1={x0 + 8 + i * (W - 16) / 4} y1={y0 + 8} x2={x0 + 8 + i * (W - 16) / 4} y2={y0 + H - 22} stroke="#123222" />)}
        <line x1={x0 + 8} y1={y0 + 8 + (H - 30) / 2} x2={x0 + W - 8} y2={y0 + 8 + (H - 30) / 2} stroke="#1d4a33" />
        {tr.map((t, i) => <Polyline key={i} pts={t.pts} x={x0 + 8} y={y0 + 8} w={W - 16} h={H - 30} range={range} color={t.color} dash={t.ghost} />)}
        {!tr.some(t => !t.ghost) && <text x={c.x} y={y0 + 8 + (H - 30) / 2 + 4} textAnchor="middle" style={{ ...mono, fill: '#2f7a55' }}>no signal</text>}
        <text x={x0 + 10} y={y0 + H - 7} style={mono}>{c.label}</text>
        <line x1={c.x - 40} y1={y0 + H} x2={c.x - 40} y2={c.y + 72} stroke="#46b6ff" strokeWidth="2.5" /><line x1={c.x + 40} y1={y0 + H} x2={c.x + 40} y2={c.y + 72} stroke="#111" strokeWidth="2.5" />
        <text x={c.x - 46} y={c.y + 90} textAnchor="middle" style={mono}>tip</text><text x={c.x + 46} y={c.y + 90} textAnchor="middle" style={mono}>gnd</text>
      </g>);
    }
    case 'arduino': {
      const v = view?.led1 || {}, onboard = v.blink && blinkOn;
      return (<g>
        <rect x={c.x - 120} y={c.y - 78} width="240" height="156" rx="10" fill="#0f4c5c" stroke="#2c8aa0" strokeWidth="2" />
        <rect x={c.x - 96} y={c.y - 88} width="186" height="16" rx="3" fill="#111a22" />
        {[['d13', -70, '13'], ['d12', -30, '12'], ['v5', 25, '5V'], ['gnd', 70, 'GND']].map(([k, dx, l]) => <text key={k} x={c.x + dx} y={c.y - 58} textAnchor="middle" style={{ ...mono, fill: '#b8e3ee' }}>{l}</text>)}
        <rect x={c.x - 34} y={c.y - 22} width="88" height="44" rx="4" fill="#111a22" /><text x={c.x + 10} y={c.y + 5} textAnchor="middle" style={{ ...mono, fill: '#5d8a96' }}>ATmega328P</text>
        <circle cx={c.x - 80} cy={c.y - 30} r="5" fill={onboard ? '#ffb84d' : '#3b2f1a'} /><text x={c.x - 80} y={c.y - 14} textAnchor="middle" style={{ ...mono, fill: '#b8e3ee' }}>L</text>
        <rect x={c.x - 120} y={c.y + 28} width="26" height="34" rx="3" fill="#c0c7cf" />
        <text x={c.x} y={c.y + 100} textAnchor="middle" style={tl}>{c.label}</text>
      </g>);
    }
    default: return null;
  }
}

export default function Board({ bench, st, view, readOnly, onAddWire, onRemoveWire, onFlip, faultTerms = [], small }) {
  const svg = useRef(null);
  const [sel, setSel] = useState(null);
  const [hover, setHover] = useState(null);
  const [mouse, setMouse] = useState(null);
  const [blinkOn, setBlinkOn] = useState(true);
  useEffect(() => { const t = setInterval(() => setBlinkOn(b => !b), 500); return () => clearInterval(t); }, []);
  useEffect(() => { const k = e => e.key === 'Escape' && setSel(null); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, []);
  const bad = new Set(faultTerms);
  function pt(e) { const s = svg.current; const p = s.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; const r = p.matrixTransform(s.getScreenCTM().inverse()); return [r.x, r.y]; }
  function clickTerm(t) {
    if (readOnly) return;
    if (!sel) setSel(t);
    else if (sel === t) setSel(null);
    else { onAddWire?.(sel, t); setSel(null); }
  }
  const polar = bench.comps.filter(c => TYPES[c.type].polar);
  return (
    <svg ref={svg} viewBox="0 0 820 480" className={small ? 'board board-small' : 'board'} role="img" aria-label={readOnly ? 'Reference circuit' : 'Your circuit workbench'}
      onPointerMove={e => !readOnly && sel && setMouse(pt(e))} onPointerLeave={() => setMouse(null)} onClick={e => { if (e.target === svg.current) setSel(null); }}>
      <defs>
        <radialGradient id="ledGlow"><stop offset="0" stopColor="#ff8a7b" stopOpacity=".9" /><stop offset=".5" stopColor="#ff6f5e" stopOpacity=".35" /><stop offset="1" stopColor="#ff6f5e" stopOpacity="0" /></radialGradient>
        <pattern id="holes" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="10" cy="10" r="1.6" fill="#1b2a36" /></pattern>
      </defs>
      <rect x="0" y="0" width="820" height="480" rx="14" fill="#0d151d" /><rect x="0" y="0" width="820" height="480" rx="14" fill="url(#holes)" />
      {bench.comps.map(c => <Part key={c.id} c={c} bench={bench} st={st} view={view} blinkOn={blinkOn} />)}
      {st.wires.map(([a, b], i) => {
        const d = wirePath(termPos(bench, a), termPos(bench, b));
        return (<g key={a + b + i} className={readOnly ? '' : 'wire'} onClick={e => { e.stopPropagation(); !readOnly && onRemoveWire?.(i); }}>
          <path d={d} fill="none" stroke="#000" strokeOpacity=".35" strokeWidth="7" strokeLinecap="round" />
          <path d={d} fill="none" stroke={WIRE[i % WIRE.length]} strokeWidth="4" strokeLinecap="round" />
          {!readOnly && <path d={d} fill="none" stroke="transparent" strokeWidth="16"><title>Click to remove this wire: {termLabel(bench, st, a)} ↔ {termLabel(bench, st, b)}</title></path>}
        </g>);
      })}
      {sel && mouse && <path d={wirePath(termPos(bench, sel), mouse)} fill="none" stroke="#ffd27a" strokeWidth="3" strokeDasharray="6 5" pointerEvents="none" />}
      {allTerms(bench).map(t => {
        const [x, y] = termPos(bench, t), on = sel === t, h = hover === t;
        return (<g key={t} className={readOnly ? '' : 'term'} onClick={e => { e.stopPropagation(); clickTerm(t); }} onPointerEnter={() => setHover(t)} onPointerLeave={() => setHover(null)}>
          <circle cx={x} cy={y} r="15" fill="transparent" />
          {bad.has(t) && <circle cx={x} cy={y} r="13" fill="none" stroke="#ff6f5e" strokeWidth="2.5" className="pulse-ring" />}
          <circle cx={x} cy={y} r={on || h ? 8.5 : 6.5} fill={on ? '#ffd27a' : '#0a0f15'} stroke={on ? '#ffd27a' : bad.has(t) ? '#ff6f5e' : '#dbe5ee'} strokeWidth="2.5" />
          {(h || on) && !readOnly && <g pointerEvents="none"><rect x={x - 4} y={y - 40} width={termLabel(bench, st, t).length * 7 + 14} height="24" rx="5" fill="#0a0f15" stroke="#3a4d62" /><text x={x + 3} y={y - 23} style={{ fill: '#dbe5ee', fontSize: 12.5, fontFamily: 'IBM Plex Sans, sans-serif' }}>{termLabel(bench, st, t)}</text></g>}
        </g>);
      })}
      {!readOnly && polar.map(c => (
        <g key={c.id + 'f'} className="flip" onClick={e => { e.stopPropagation(); onFlip?.(c.id); }}>
          <rect x={c.rot === 90 ? c.x - 92 : c.x - 26} y={c.rot === 90 ? c.y - 14 : c.y - 62} width="56" height="24" rx="12" fill="#151f2a" stroke="#3a4d62" />
          <text x={c.rot === 90 ? c.x - 64 : c.x + 2} y={c.rot === 90 ? c.y + 3 : c.y - 45} textAnchor="middle" style={{ fill: '#dbe5ee', fontSize: 12, fontFamily: 'IBM Plex Sans, sans-serif' }}>↻ Flip</text>
        </g>
      ))}
    </svg>
  );
}
