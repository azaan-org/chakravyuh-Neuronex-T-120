import { LABS, matchByKeywords, LAB_LIST } from '@/lib/labs';

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
    const top = (body.top || []).slice(0, 5);
    const fb = top.length
      ? `Start the next lecture with the “${top[0].misconception}” misconception: ${top[0].wrong} of ${top[0].total} students chose it. Show the ${LABS[top[0].lab]?.title || 'matching'} lab live, ask the class to predict first, then reveal. ${top[1] ? `Next, revisit “${top[1].misconception}”.` : ''}`
      : 'No class data yet. Share the class QR code and ask students to open a lab in Predict mode.';
    const text = await gemini({ system: 'You are a teaching assistant for an ENTC professor. Given class misconception data, write a 3-sentence teaching plan for the next 10 minutes of class. Be concrete, no markdown.', prompt: JSON.stringify(top), maxTokens: 220 });
    return Response.json({ text: text || fb, source: text ? 'ai' : 'fallback' });
  }

  return Response.json({ error: 'unknown kind' }, { status: 400 });
}
