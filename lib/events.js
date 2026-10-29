'use client';
// Talks to the local event store on the presenting laptop (app/api/events).
// Events that fail to send (laptop briefly unreachable) are queued and retried.
const QUEUE = 'pulseentc.outbox.v1';
let flushing = false;

function readQ() { try { return JSON.parse(localStorage.getItem(QUEUE) || '[]'); } catch { return []; } }
function writeQ(q) { try { localStorage.setItem(QUEUE, JSON.stringify(q.slice(-500))); } catch {} }

async function flush() {
  if (flushing) return; const q = readQ(); if (!q.length) return;
  flushing = true;
  try {
    const r = await fetch('/api/events', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(q) });
    if (r.ok) writeQ(readQ().slice(q.length));
  } catch {} finally { flushing = false; }
}
if (typeof window !== 'undefined') setInterval(flush, 5000);

export async function logEvent(row) {
  writeQ([...readQ(), row]);
  await flush();
}

export async function fetchEvents(classCode, after = 0) {
  const r = await fetch(`/api/events?class=${encodeURIComponent(classCode)}&after=${after}`, { cache: 'no-store' });
  if (!r.ok) throw new Error('events ' + r.status);
  return r.json();
}

export async function insertEvents(rows) {
  const r = await fetch('/api/events', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(rows) });
  return r.ok;
}

export async function clearClass(classCode) {
  const r = await fetch(`/api/events?class=${encodeURIComponent(classCode)}`, { method: 'DELETE' });
  return r.ok;
}
