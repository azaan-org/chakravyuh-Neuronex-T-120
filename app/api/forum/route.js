import { promises as fs } from 'fs';
import path from 'path';
import { CONCEPTS } from '@/lib/concepts';

// Local discussion forum, stored on the presenting laptop (data/forum.json). Works offline.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const FILE = path.join(process.cwd(), 'data', 'forum.json');
const SEED_TITLES = {
  saturation: 'Why does my op-amp output stop at 4 V instead of 5 V?',
  gain: 'Does a bigger Rf increase or decrease the gain?',
  phase: 'Why is the output wave upside down?',
  depletion: 'Why does the depletion region get wider in reverse bias?',
  knee: 'Is 0.7 V a hard on/off switch for a diode?',
  leakage: 'If a diode blocks reverse current, where does leakage come from?',
  nand: 'NAND vs AND: what actually changes?',
  xor: 'How is XOR different from OR?',
  universal: 'How can NAND alone build every circuit?',
  sensors: 'Why is temperature a weak sign that people are in a room?'
};
const g = globalThis;
g.__pulseForum = g.__pulseForum || { loaded: false, threads: [], nextId: 1 };
const F = g.__pulseForum;

function seed() {
  const t0 = Date.now() - 3600e3;
  F.threads = CONCEPTS.map((c, k) => ({
    id: F.nextId++, lab: c.lab, concept: c.id, title: SEED_TITLES[c.id], author: 'PulseAI', ai: true, pinned: true,
    body: `Many students get stuck here in the ${c.name.toLowerCase()} part of this lab. Post what confused you, or answer someone else. Explaining it is the fastest way to learn it.`,
    created: new Date(t0 + k * 1000).toISOString(),
    replies: [{ id: 1, author: 'PulseAI', ai: true, body: c.model, created: new Date(t0 + k * 1000 + 500).toISOString() }]
  }));
}
async function load() {
  if (F.loaded) return;
  try { const j = JSON.parse(await fs.readFile(FILE, 'utf8')); F.threads = j.threads || []; F.nextId = j.nextId || 1; } catch {}
  if (!F.threads.length) seed();
  F.loaded = true;
}
let timer = null;
function save() {
  clearTimeout(timer);
  timer = setTimeout(async () => { try { await fs.mkdir(path.dirname(FILE), { recursive: true }); await fs.writeFile(FILE, JSON.stringify({ nextId: F.nextId, threads: F.threads })); } catch (e) { console.warn('forum save', e.message); } }, 300);
}
const clip = (v, n) => String(v || '').trim().slice(0, n);
const last = t => t.replies.length ? t.replies[t.replies.length - 1].created : t.created;

export async function GET(req) {
  await load();
  const lab = new URL(req.url).searchParams.get('lab');
  const list = F.threads.filter(t => !lab || t.lab === lab).sort((a, b) => (b.pinned && !a.pinned ? -1 : 0) || last(b).localeCompare(last(a)));
  return Response.json({ threads: list });
}

export async function POST(req) {
  await load();
  let b; try { b = await req.json(); } catch { return Response.json({ error: 'bad json' }, { status: 400 }); }
  const now = new Date().toISOString();
  if (b.action === 'thread') {
    const title = clip(b.title, 140); if (!title) return Response.json({ error: 'Add a title for your question.' }, { status: 400 });
    const t = { id: F.nextId++, lab: clip(b.lab, 30) || 'general', concept: null, title, body: clip(b.body, 2000), author: clip(b.author, 60) || 'Anonymous', ai: false, created: now, replies: [] };
    F.threads.push(t); save(); return Response.json({ thread: t });
  }
  if (b.action === 'reply') {
    const t = F.threads.find(x => x.id === +b.threadId); if (!t) return Response.json({ error: 'Thread not found' }, { status: 404 });
    const body = clip(b.body, 2000); if (!body) return Response.json({ error: 'Write a reply first.' }, { status: 400 });
    const r = { id: (t.replies.at(-1)?.id || 0) + 1, author: b.ai ? 'PulseAI' : clip(b.author, 60) || 'Anonymous', ai: !!b.ai, body, created: now };
    t.replies.push(r); save(); return Response.json({ reply: r });
  }
  return Response.json({ error: 'unknown action' }, { status: 400 });
}
