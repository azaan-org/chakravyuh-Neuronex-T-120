import { promises as fs } from 'fs';
import path from 'path';

// Local event store. Runs on the presenting laptop; phones on the same Wi-Fi post here.
// Events are kept in memory and saved to data/events.json, so nothing needs the internet.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const FILE = path.join(process.cwd(), 'data', 'events.json');
const MAX = 20000;
const g = globalThis;
g.__pulseStore = g.__pulseStore || { loaded: false, events: [], nextId: 1, saving: null };
const store = g.__pulseStore;

async function load() {
  if (store.loaded) return;
  try { const j = JSON.parse(await fs.readFile(FILE, 'utf8')); store.events = j.events || []; store.nextId = j.nextId || (store.events.at(-1)?.id || 0) + 1; } catch {}
  store.loaded = true;
}
function save() {
  if (store.saving) return;
  store.saving = setTimeout(async () => {
    store.saving = null;
    try { await fs.mkdir(path.dirname(FILE), { recursive: true }); await fs.writeFile(FILE, JSON.stringify({ nextId: store.nextId, events: store.events })); } catch (e) { console.warn('event save failed', e.message); }
  }, 400);
}
const str = (v, n) => (v === null || v === undefined ? null : String(v).slice(0, n));
function clean(r) {
  return {
    id: store.nextId++,
    created_at: new Date().toISOString(),
    class_code: (str(r.class_code, 12) || 'DEMO').toUpperCase(),
    student: str(r.student, 60) || 'Anonymous',
    lab: str(r.lab, 30) || 'unknown',
    type: str(r.type, 20) || 'event',
    question: str(r.question, 60),
    choice: str(r.choice, 200),
    correct: typeof r.correct === 'boolean' ? r.correct : null,
    misconception: str(r.misconception, 200),
    payload: r.payload && typeof r.payload === 'object' ? (JSON.stringify(r.payload).length <= 4000 ? r.payload : { truncated: true }) : null
  };
}

export async function POST(req) {
  await load();
  let body; try { body = await req.json(); } catch { return Response.json({ error: 'bad json' }, { status: 400 }); }
  const rows = (Array.isArray(body) ? body : [body]).slice(0, 1000).map(r => { try { return clean(r); } catch { return null; } }).filter(Boolean);
  store.events.push(...rows);
  if (store.events.length > MAX) store.events.splice(0, store.events.length - MAX);
  save();
  return Response.json({ ok: true, count: rows.length, lastId: store.nextId - 1 });
}

export async function GET(req) {
  await load();
  const u = new URL(req.url);
  const cls = (u.searchParams.get('class') || 'DEMO').toUpperCase();
  const after = +u.searchParams.get('after') || 0;
  const list = store.events.filter(e => e.class_code === cls && e.id > after);
  return Response.json({ events: list.slice(-3000), lastId: store.nextId - 1 });
}

export async function DELETE(req) {
  await load();
  const cls = (new URL(req.url).searchParams.get('class') || '').toUpperCase();
  if (!cls) return Response.json({ error: 'class required' }, { status: 400 });
  const before = store.events.length;
  store.events = store.events.filter(e => e.class_code !== cls);
  save();
  return Response.json({ ok: true, removed: before - store.events.length });
}
