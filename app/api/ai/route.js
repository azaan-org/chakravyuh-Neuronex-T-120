import { LABS, matchByKeywords, LAB_LIST } from '@/lib/labs';
import { chapterById } from '@/lib/curriculum';

// All AI calls go through here, so keys never reach the browser.
// Provider chain: Gemini (if GEMINI_API_KEY and internet) → local Ollama model (if OLLAMA_MODEL set,
// runs fully offline on the laptop) → deterministic built-in answers. The demo never breaks.
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || '';

async function withTimeout(ms, fn) {
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), ms);
  try { return await fn(ctrl.signal); } catch (e) { console.warn('ai provider failed:', e.message); return null; } finally { clearTimeout(t); }
}

async function viaGemini({ system, prompt, json, maxTokens }) {
  const key = process.env.GEMINI_API_KEY; if (!key) return null;
  return withTimeout(9000, async signal => {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`, {
      method: 'POST', signal, headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: maxTokens, ...(json ? { responseMimeType: 'application/json' } : {}), thinkingConfig: { thinkingBudget: 0 } }
      })
    });
    if (!r.ok) { console.warn('gemini', r.status); return null; }
    const j = await r.json();
    return j.candidates?.[0]?.content?.parts?.map(p => p.text).join('').trim() || null;
  });
}

async function viaOllama({ system, prompt, json, maxTokens }) {
  if (!OLLAMA_MODEL) return null;
  return withTimeout(25000, async signal => {
    const r = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST', signal, headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model: OLLAMA_MODEL, stream: false, ...(json ? { format: 'json' } : {}), options: { temperature: 0.4, num_predict: maxTokens },
        messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }] })
    });
    if (!r.ok) { console.warn('ollama', r.status); return null; }
    const j = await r.json();
    return j.message?.content?.trim() || null;
  });
}

async function gemini(opts) {
  const o = { json: false, maxTokens: 450, ...opts };
  const g = await viaGemini(o); if (g) return g;
  return viaOllama(o);
}


// ---------- Chapter teaching helpers (fallbacks work with no AI at all) ----------
const STOP = new Set('the a an is are of to in and or for on what why how does do me my this that with it be can you give explain about from i im not get step slide'.split(' '));
const words = t => (t || '').toLowerCase().replace(/[^a-z0-9.\s]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !STOP.has(w));
function bestStep(ch, q) {
  const qs = new Set(words(q)); let best = null, score = 0;
  ch.steps.forEach((st, i) => { const sc = words(st.title + ' ' + st.body).filter(w => qs.has(w)).length; if (sc > score) { score = sc; best = i; } });
  return score ? best : null;
}
function teachFallback(ch, mode, q, slide) {
  const ql = (q || '').toLowerCase();
  const simFor = () => ch.sims[0]?.id || null;
  if (mode === 'teach' || ql.includes('from the start')) return { text: `Here is “${ch.title}” in ${ch.steps.length} steps. Read one at a time, then open the simulator to see it happen.`, steps: ch.steps, sim: simFor() };
  if (ql.includes('formula')) return { text: 'These are the formulas to remember for this chapter:\n' + ch.formulas.map(f => `• ${f.name}: ${f.expr}`).join('\n') };
  if (ql.includes('quiz')) {
    const st = ch.steps;
    return { text: `Try these without looking back:\n1. In your own words: ${st[1]?.title.toLowerCase()}?\n2. Which formula links ${ch.formulas[0]?.name.toLowerCase()}? Write it down.\n3. Predict what the simulator will show for “${st[st.length - 1]?.title.toLowerCase()}”, then open it and check.\nTell me your answers and I’ll check them.`, sim: simFor() };
  }
  if (ql.includes('example') || ql.includes('real-life') || ql.includes('real life')) return { text: `A real-life place you meet this: ${ch.sims.map(x => x.blurb).join(' ')} Open the simulator to try it with your own hands.`, sim: simFor() };
  if (mode === 'slide' || ql.startsWith('summarize slide') || ql.startsWith('explain slide')) {
    const lines = (slide?.text || '').split('\n').filter(Boolean);
    const k = bestStep(ch, (slide?.title || '') + ' ' + lines.join(' '));
    return { text: `Slide: “${slide?.title || ch.title}”.\n${lines.length ? 'Its key points: ' + lines.join('; ') + '.\n' : ''}${k !== null ? 'In plain words: ' + ch.steps[k].body : ch.summary}`, sim: simFor() };
  }
  const k = bestStep(ch, q);
  if (mode === 'step' && k !== null) return { text: `Let me put it another way. ${ch.steps[k].body} ${k + 1 < ch.steps.length ? 'This leads straight into the next idea: ' + ch.steps[k + 1].title.toLowerCase() + '.' : ''} The simulator shows this live.`, sim: simFor() };
  if (k !== null) return { text: ch.steps[k].body + (k + 1 < ch.steps.length ? `\n\nNext: ${ch.steps[k + 1].title}. ${ch.steps[k + 1].body}` : ''), sim: simFor() };
  return { text: ch.summary + '\n\nAsk me about a specific slide or step and I’ll break it down.', sim: simFor() };
}

function tutorFallback(labId, q, st) {
  const lab = LABS[labId], f = lab.fallback, ql = (q || '').toLowerCase();
  if (labId === 'opamp') {
    const live = st ? ` Right now Rin = ${st.rin}, Rf = ${st.rf}, so the gain is ${st.gain} and the circuit asks for ${st.idealPeakV} V against a ${st.outputLimitV} V limit.` : '';
    if (ql.includes('phase') || ql.includes('invert')) return f.phase;
    if (st?.clipping) return f.clipping + live;
    if (st && st.fault === 'too-quiet') return 'The wave is clean but small. The gain Rf / Rin needs to be between 6 and 8 for a 3–4 V peak from the 0.5 V mic.' + live;
    if (st && st.fault === 'clean') return f.clean + live;
    return f.default + live;
  }
  if (labId === 'pn-junction') {
    const live = st ? ` At ${st.biasV} V the diode is in “${st.regime}”: current ${st.current}, depletion width ${st.depletionWidthUm} µm, barrier ${st.barrierEV} eV.` : '';
    if (ql.includes('band')) return 'The band diagram shows electron energy. The P side sits higher by the barrier q(Vbi − V). Forward bias shrinks that step so electrons can climb over it; reverse bias makes it taller.' + live;
    if (st?.regime === 'Reverse bias' || ql.includes('widen') || ql.includes('reverse')) return f.reverse + live;
    if (ql.includes('knee') || st?.regime === 'Conducting' || st?.regime === 'Below knee') return f.forward + live;
    return f.default + live;
  }
  if (labId === 'logic') {
    if (ql.includes('blitz') || ql.includes('tips')) return f.blitz;
    if (st?.section === 'build' || ql.includes('design') || ql.includes('alarm')) return f.build + (st && st.wrongRows ? ` Right now ${st.wrongRows} rows of “${st.circuit}” are still wrong.` : '');
    if (ql.includes('universal')) return 'Tie both inputs of a NAND together and it becomes NOT. A NAND followed by that NOT is AND. Put NOT on each input of a NAND and you get OR. Since AND, OR and NOT can build any logic, NAND alone can too.';
    return f.default;
  }
  if (st?.level === 4 || ql.includes('model') || ql.includes('sensor matters')) return f.ml + (st?.accuracyPercent ? ` Your current model scores ${st.accuracyPercent}% using ${st.features.join(', ')}.` : '');
  if (st?.mismatches?.length) return f.code + ' Your latest run says: ' + st.mismatches[0];
  return f.default;
}

export async function POST(req) {
  let body; try { body = await req.json(); } catch { return Response.json({ error: 'bad json' }, { status: 400 }); }
  const { kind } = body;

  if (kind === 'tutor') {
    const lab = LABS[body.lab]; if (!lab) return Response.json({ error: 'unknown lab' }, { status: 400 });
    const system = `You are PulseAI, a Socratic tutor inside an engineering lab simulator for B.E. Electronics & Telecommunication students in India.
Lab: ${lab.title}. Scenario: ${lab.scenario.text}
Rules: Answer in at most 110 words, plain sentences, no markdown headings. Use the LIVE LAB STATE numbers when relevant; it is computed by the simulator and is always correct, never contradict it. If the student is working on a repair or code challenge, give a hint that moves them one step forward instead of the full solution, unless they have clearly tried several times. Name and gently correct any misconception you see. Physics must be textbook-correct.`;
    const prompt = `LIVE LAB STATE: ${JSON.stringify(body.state || {})}
RECENT STUDENT EVENTS: ${JSON.stringify((body.recent || []).slice(-6))}
CONVERSATION SO FAR: ${(body.history || []).map(m => (m.role === 'me' ? 'Student: ' : 'Tutor: ') + m.text).join('\n')}
STUDENT ASKS: ${body.question}`;
    const text = await gemini({ system, prompt });
    return Response.json(text ? { text, source: 'ai' } : { text: tutorFallback(body.lab, body.question, body.state), source: 'fallback' });
  }

  if (kind === 'match') {
    const slides = (body.slides || []).slice(0, 60).map((t, i) => ({ i, text: String(t).slice(0, 600) }));
    const fallback = slides.map(sl => ({ i: sl.i, lab: matchByKeywords(sl.text), summary: null }));
    const system = `You tag lecture slides from Indian ENTC engineering courses. For each slide decide which interactive lab fits best, or none. Labs: ${LAB_LIST.map(l => `"${l.id}" = ${l.title} (${l.skills.join(', ')})`).join('; ')}. Only pick a lab when the slide clearly teaches that concept. Also write a one-sentence plain-English summary (max 20 words) of each slide. Reply JSON: {"slides":[{"i":0,"lab":"opamp"|"pn-junction"|"iot"|null,"summary":"..."}]}`;
    const text = await gemini({ system, prompt: JSON.stringify(slides), json: true, maxTokens: 1800 });
    if (text) {
      try {
        const j = JSON.parse(text);
        const out = slides.map(sl => { const m = (j.slides || []).find(x => x.i === sl.i) || {}; return { i: sl.i, lab: LABS[m.lab] ? m.lab : null, summary: m.summary || null }; });
        return Response.json({ slides: out, source: 'ai' });
      } catch {}
    }
    return Response.json({ slides: fallback, source: 'fallback' });
  }

  if (kind === 'chapter') {
    const ch = chapterById(body.chapter); if (!ch) return Response.json({ error: 'unknown chapter' }, { status: 400 });
    const base = { summary: ch.summary, formulas: ch.formulas, steps: ch.steps, courses: ch.courses };
    if (!body.material) return Response.json({ ...base, source: 'fallback' });
    const text = await gemini({ json: true, maxTokens: 1400,
      system: 'You are an ENTC engineering teacher. From the professor\'s lecture material, produce JSON: {"summary": "4-5 sentence plain-English summary", "formulas": [{"name": "...", "expr": "..."}] (up to 6, only formulas in or implied by the material), "steps": [{"title": "...", "body": "2-3 sentences"}] (4-6 steps that teach the chapter in order), "courses": ["3 short online course or topic suggestions (NPTEL, SWAYAM, Coursera, edX) to go deeper"]}. Be accurate.',
      prompt: `Chapter: ${ch.title}\nMATERIAL:\n${String(body.material).slice(0, 14000)}` });
    if (text) { try { const j = JSON.parse(text); return Response.json({ summary: j.summary || ch.summary, formulas: (j.formulas || []).slice(0, 6), steps: (j.steps || []).slice(0, 7), courses: (j.courses || []).slice(0, 4), source: 'ai' }); } catch {} }
    return Response.json({ ...base, source: 'fallback' });
  }

  if (kind === 'teach') {
    const ch = chapterById(body.chapter); if (!ch) return Response.json({ error: 'unknown chapter' }, { status: 400 });
    const fb = teachFallback(ch, body.mode, body.question, body.slide);
    const system = `You are PulseAI, an AI teacher for B.E. Electronics & Telecommunication students in India, teaching the chapter "${ch.title}". Teach from the professor's material below. Explain simply, with an Indian everyday example when useful. When asked to teach or break something down, use numbered steps. Keep answers under 170 words unless teaching the whole chapter. Physics must be textbook-correct. Available simulators for this chapter: ${ch.sims.map(x => x.title).join('; ')}; suggest opening one when it would help. Plain text only, no markdown symbols like ** or #.`;
    const prompt = `PROFESSOR'S MATERIAL:\n${String(body.material || ch.material.map(x => x.title + '\n' + x.bullets.join('\n')).join('\n\n')).slice(0, 12000)}\n\nCURRENT SLIDE: ${body.slide?.title || ''}\n${body.slide?.text || ''}\n\nCONVERSATION:\n${(body.history || []).map(m => (m.role === 'me' ? 'Student: ' : 'Teacher: ') + m.text).join('\n')}\n\nSTUDENT: ${body.question}`;
    const text = await gemini({ system, prompt, maxTokens: body.mode === 'teach' ? 900 : 450 });
    return Response.json(text ? { text, sim: fb.sim, source: 'ai' } : { ...fb, source: 'fallback' });
  }

  if (kind === 'fault') {
    const faults = (body.faults || []).slice(0, 6), wiring = (body.wiring || []).slice(0, 30);
    const fb = faults.length
      ? faults.filter(f => f.level !== 'open').concat(faults.filter(f => f.level === 'open')).slice(0, 2).map((f, i) => `${i ? 'Also: ' : ''}${f.title}. ${f.explain} Try this: ${f.fix}`).join('\n\n')
      : 'Every connection matches the reference and the circuit behaves as intended. Explain to yourself why each wire is needed; that is what the viva will ask.';
    const text = await gemini({ maxTokens: 320,
      system: 'You are PulseAI, a lab assistant checking a student\'s breadboard circuit. A deterministic checker has already found the faults listed; never contradict it and never invent other faults. In at most 110 words: explain the most important fault in plain words, why it breaks the circuit physically, and give one concrete next step. If there are no faults, praise briefly and ask one viva-style question. Plain text, no markdown.',
      prompt: JSON.stringify({ circuit: body.bench, wiring, faults, values: body.values }) });
    return Response.json({ text: text || fb, source: text ? 'ai' : 'fallback' });
  }

  if (kind === 'coach') {
    const list = (body.concepts || []).slice(0, 12);
    const act = list.filter(c => c.status === 'active'), fixed = list.filter(c => c.status === 'fixed'), solid = list.filter(c => c.status === 'solid');
    const name = (body.name || '').split(' ')[0];
    const fb = act.length
      ? `${name ? name + ', y' : 'Y'}ou have ${act.length} concept${act.length > 1 ? 's' : ''} to fix. Start with ${act[0].concept} in the ${act[0].lab} lab: you believe “${act[0].belief}”, and the simulation will show you why that breaks. ${fixed.length ? `You already fixed ${fixed.map(c => c.concept).join(', ')}, nice work.` : ''} ${solid.length ? `${solid.length} concept${solid.length > 1 ? 's are' : ' is'} solid.` : ''}`.replace(/\s+/g, ' ').trim()
      : `${name ? name + ', n' : 'N'}o open misconceptions right now. ${fixed.length ? `You fixed ${fixed.map(c => c.concept).join(', ')}.` : ''} Try a lab you haven't opened yet to keep mapping what you know.`.replace(/\s+/g, ' ').trim();
    const text = await gemini({ system: 'You are PulseAI, a warm, direct study coach for an engineering student. In at most 3 short sentences: tell them which misconception to fix first and why, mention one thing they already fixed or know well, and end with one concrete next action. Plain text, no markdown.', prompt: JSON.stringify({ student: name, concepts: list }), maxTokens: 200 });
    return Response.json({ text: text || fb, source: text ? 'ai' : 'fallback' });
  }

  if (kind === 'insight') {
    const top = (body.top || []).slice(0, 5), chapters = (body.chapters || []).slice(0, 4), faults = (body.faults || []).slice(0, 4), qs = (body.questions || []).slice(0, 12);
    const parts = [];
    if (chapters[0]) parts.push(`Spend the first 15 minutes of your next lecture on “${chapters[0].chapter}”: ${chapters[0].students} students asked the AI ${chapters[0].aiQuestions} questions about it and made ${chapters[0].circuitFaults} circuit mistakes.`);
    if (faults[0]) parts.push(`The most common lab mistake is “${faults[0].fault}” in the ${faults[0].circuit} (${faults[0].students} students). Wire it wrong on purpose in front of the class and let them spot the fault.`);
    if (top[0]) parts.push(`Address the misconception “${top[0].misconception}” directly: ${top[0].wrong} of ${top[0].total} students hold it. Ask the class to predict first, then show the simulator.`);
    if (chapters[1]) parts.push(`Next priority: “${chapters[1].chapter}”.`);
    const fb = parts.length ? parts.join(' ') : 'No class data yet. Share the join QR code and ask students to open a chapter in AI mode.';
    const text = await gemini({ system: 'You are a teaching assistant for an Indian ENTC engineering professor. From class learning data, write a concrete plan for the next lecture in 3-4 short sentences: which chapter to focus on and why (cite the numbers), which circuit mistake to demonstrate, and which misconception to address. Plain text, no markdown.', prompt: JSON.stringify({ chapters, faults, misconceptions: top, sampleQuestions: qs }), maxTokens: 260 });
    return Response.json({ text: text || fb, source: text ? 'ai' : 'fallback' });
  }

  return Response.json({ error: 'unknown kind' }, { status: 400 });
}
