'use client';
// Per-student progress kept in the browser, so the progress strip works even offline.
const KEY = 'pulseentc.progress.v1';
const PROFILE = 'pulseentc.profile.v1';

function read(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } }
function write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }

export function getProfile() { return read(PROFILE, { name: '', classCode: 'DEMO' }); }
export function setProfile(p) { write(PROFILE, { ...getProfile(), ...p }); window.dispatchEvent(new Event('pulse-progress')); }

export function getProgress() {
  return read(KEY, { labs: {}, predictions: [], repairs: 0, challenges: {}, ml: null });
}

export function recordEvent(lab, msg) {
  const p = getProgress();
  p.labs[lab] = p.labs[lab] || { opened: Date.now(), done: false };
  if (msg.type === 'prediction') p.predictions.push({ lab, q: msg.question, correct: !!msg.correct, mis: msg.misconception || null, t: Date.now() });
  if (msg.type === 'summary') p.labs[lab].predictDone = true;
  if (msg.type === 'repair' && msg.success) { p.repairs += 1; p.labs[lab].done = true; }
  if (msg.type === 'challenge' && msg.passed) { p.challenges[msg.level] = true; if (Object.keys(p.challenges).length >= 3) p.labs[lab].done = true; }
  if (msg.type === 'ml') p.ml = { accuracy: msg.accuracy, features: msg.features };
  if (msg.type === 'summary' && lab === 'pn-junction') p.labs[lab].done = true;
  write(KEY, p);
  window.dispatchEvent(new Event('pulse-progress'));
}

export function markOpened(lab) {
  const p = getProgress();
  p.labs[lab] = p.labs[lab] || { opened: Date.now(), done: false };
  write(KEY, p);
}

export function summarize(p = getProgress()) {
  const preds = p.predictions;
  const correct = preds.filter(x => x.correct).length;
  // A misconception counts as fixed once the student later answers the same question correctly
  const mis = new Map();
  preds.forEach(x => { const key = x.lab + ':' + x.q; if (x.mis) mis.set(key, { text: x.mis, fixed: false }); else if (mis.has(key)) mis.get(key).fixed = true; });
  const misList = [...mis.values()];
  return {
    labsDone: Object.values(p.labs).filter(l => l.done).length,
    labsOpened: Object.keys(p.labs).length,
    predictions: preds.length,
    correct,
    misconceptions: misList.length,
    fixed: misList.filter(m => m.fixed).length,
    open: misList.filter(m => !m.fixed).map(m => m.text),
    challenges: Object.keys(p.challenges).length,
    repairs: p.repairs,
    ml: p.ml
  };
}

export function resetProgress() { write(KEY, { labs: {}, predictions: [], repairs: 0, challenges: {}, ml: null }); window.dispatchEvent(new Event('pulse-progress')); }
