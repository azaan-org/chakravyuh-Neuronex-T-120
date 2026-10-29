import { promises as fs } from 'fs';
import path from 'path';
import JSZip from 'jszip';

// Study materials uploaded by professors, per chapter. Files live on the presenting
// laptop in data/uploads, and their text is extracted so the AI teacher can use it.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DIR = path.join(process.cwd(), 'data');
const UP = path.join(DIR, 'uploads');
const DB = path.join(DIR, 'materials.json');
const MAX = 25 * 1024 * 1024;
const g = globalThis;
g.__pulseMat = g.__pulseMat || { loaded: false, items: [], nextId: 1 };
const M = g.__pulseMat;

async function load() {
  if (M.loaded) return;
  try { const j = JSON.parse(await fs.readFile(DB, 'utf8')); M.items = j.items || []; M.nextId = j.nextId || 1; } catch {}
  M.loaded = true;
}
async function save() { await fs.mkdir(DIR, { recursive: true }); await fs.writeFile(DB, JSON.stringify({ nextId: M.nextId, items: M.items })); }

const ENT = s => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
async function pptxPages(buf) {
  const zip = await JSZip.loadAsync(buf);
  const names = Object.keys(zip.files).filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n)).sort((a, b) => +a.match(/(\d+)\.xml/)[1] - +b.match(/(\d+)\.xml/)[1]);
  const pages = [];
  for (const n of names) {
    const xml = await zip.file(n).async('string');
    const paras = xml.split(/<\/a:p>/).map(p => ENT([...p.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map(m => m[1]).join('')).trim()).filter(Boolean);
    pages.push({ title: paras[0] || `Slide ${pages.length + 1}`, text: paras.slice(1).join('\n') });
  }
  return pages;
}
async function pdfPages(buf) {
  const pdf = (await import('pdf-parse/lib/pdf-parse.js')).default;
  const texts = [];
  await pdf(buf, {
    max: 80,
    pagerender: pd => pd.getTextContent().then(tc => { let last = null, t = ''; for (const it of tc.items) { t += (last === null || last === it.transform[5] ? (t && !t.endsWith(' ') ? ' ' : '') : '\n') + it.str; last = it.transform[5]; } texts.push(t.trim()); return t; })
  });
  return texts.map((t, i) => { const lines = t.split('\n').map(x => x.trim()).filter(Boolean); return { title: (lines[0] || `Page ${i + 1}`).slice(0, 120), text: lines.slice(1).join('\n') }; });
}

export async function GET(req) {
  await load();
  const u = new URL(req.url), id = +u.searchParams.get('file');
  if (id) {
    const it = M.items.find(x => x.id === id); if (!it) return new Response('Not found', { status: 404 });
    try {
      const buf = await fs.readFile(path.join(UP, it.stored));
      const type = it.kind === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
      return new Response(buf, { headers: { 'content-type': type, 'content-disposition': `${it.kind === 'pdf' ? 'inline' : 'attachment'}; filename="${encodeURIComponent(it.name)}"` } });
    } catch { return new Response('File missing', { status: 404 }); }
  }
  const ch = u.searchParams.get('chapter');
  return Response.json({ items: M.items.filter(x => !ch || x.chapter === ch) });
}

export async function POST(req) {
  await load();
  let form; try { form = await req.formData(); } catch { return Response.json({ error: 'Send the file as form data.' }, { status: 400 }); }
  const file = form.get('file'), chapter = String(form.get('chapter') || '').slice(0, 40);
  if (!file || typeof file === 'string') return Response.json({ error: 'Choose a file to upload.' }, { status: 400 });
  if (!chapter) return Response.json({ error: 'Pick the chapter this material belongs to.' }, { status: 400 });
  if (file.size > MAX) return Response.json({ error: 'That file is over 25 MB. Compress it or split it by chapter.' }, { status: 400 });
  const name = String(file.name || 'material').slice(0, 120), ext = name.toLowerCase().split('.').pop();
  if (!['pdf', 'pptx'].includes(ext)) return Response.json({ error: 'Upload a .pptx or .pdf file. Save older .ppt files as .pptx first.' }, { status: 400 });
  const buf = Buffer.from(await file.arrayBuffer());
  let pages = [];
  try { pages = ext === 'pdf' ? await pdfPages(buf) : await pptxPages(buf); }
  catch (e) { return Response.json({ error: `Could not read this ${ext.toUpperCase()}. Check that it opens on your computer and is not password-protected.` }, { status: 400 }); }
  const id = M.nextId++, stored = `${id}-${name.replace(/[^\w.-]+/g, '_')}`;
  await fs.mkdir(UP, { recursive: true });
  await fs.writeFile(path.join(UP, stored), buf);
  const item = { id, chapter, kind: ext, name, size: file.size, stored, uploader: String(form.get('uploader') || 'Professor').slice(0, 60), uploaded: new Date().toISOString(), pages };
  M.items.push(item); await save();
  return Response.json({ item });
}

export async function DELETE(req) {
  await load();
  const id = +new URL(req.url).searchParams.get('id');
  const it = M.items.find(x => x.id === id); if (!it) return Response.json({ error: 'Not found' }, { status: 404 });
  M.items = M.items.filter(x => x.id !== id); await save();
  try { await fs.unlink(path.join(UP, it.stored)); } catch {}
  return Response.json({ ok: true });
}
