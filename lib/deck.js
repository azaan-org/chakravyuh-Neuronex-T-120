'use client';
import JSZip from 'jszip';

// Built-in lecture deck so the Studio always has something to present.
export const SAMPLE_DECK = {
  name: 'ENTC Unit 3 · Devices, Amplifiers & Logic (sample)',
  slides: [
    { title: 'Unit 3: From Devices to Systems', bullets: ['Prof. R. Deshmukh · B.E. ENTC, Semester V', 'PN junction → op-amp → logic → embedded systems', 'Today: predict first, then watch it happen'] },
    { title: 'PN Junction: the depletion region', bullets: ['Holes diffuse from P to N, electrons from N to P', 'Fixed ions left behind build the barrier (≈ 0.7 V in Si)', 'Reverse bias widens the depletion region'], lab: 'pn-junction', params: { v: '-3' }, prompt: 'Ask: what happens to the depletion width at −3 V?' },
    { title: 'Diode I–V characteristics', bullets: ['I = Is (e^(V/VT) − 1)', 'Knee voltage ≈ 0.7 V (Si), 0.3 V (Ge)', 'Reverse saturation current is tiny but not zero'], lab: 'pn-junction', params: { v: '0.7' }, prompt: 'Slide the bias across the knee and watch the I–V dot.' },
    { title: 'Inverting amplifier', bullets: ['Av = −Rf / Rin', 'Virtual ground at the inverting terminal', 'Output is 180° out of phase'], lab: 'opamp', params: { rin: '10000', rf: '47000' }, prompt: 'Ask: with Rf = 47 kΩ, how big is the output?' },
    { title: 'Output saturation (clipping)', bullets: ['Output limited to about ±(Vcc − 1 V)', 'Too much gain flattens the peaks', 'Audible as harsh distortion'], lab: 'opamp', params: { rin: '10000', rf: '100000', mode: 'predict' }, prompt: 'Run the predict questions with the class, then press Hear it.' },
    { title: 'Logic gates and universal gates', bullets: ['AND, OR, NOT, NAND, NOR, XOR', 'NAND and NOR can build any circuit', 'Design starts from the truth table'], lab: 'logic', params: { mode: 'predict' }, prompt: 'Predict: NAND with both inputs 1?' },
    { title: 'Combinational design: safety alarms', bullets: ['Alarm = Smoke · (Heat + Button)', 'Level crossing = (L + R) · K̅', 'Verify every row of the truth table'], lab: 'logic', params: { view: 'build' }, prompt: 'Let a student build the fire alarm live.' },
    { title: 'Embedded systems: sensing the room', bullets: ['analogRead(A0) → 0 to 1023', 'Threshold logic switches the lamp', 'Fail-safe design for broken sensors'], lab: 'iot', params: { level: '2' }, prompt: 'Fix the dark-room lamp bug together.' },
    { title: 'AI at the edge', bullets: ['Train a classifier on room-sensor data', 'Compare a rule vs a learned model', 'Export the model as Arduino code'], lab: 'iot', params: { level: '4' }, prompt: 'Which sensor best detects people? Vote, then train.' },
    { title: 'Assignment 3', bullets: ['Q1–Q5 from the textbook', 'Complete all four PulseENTC labs', 'Submit by Friday'] }
  ]
};

const ENT = s => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");

// Read a .pptx in the browser: text per slide + the first picture on each slide.
export async function readPptx(file) {
  const zip = await JSZip.loadAsync(file);
  const names = Object.keys(zip.files).filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n)).sort((a, b) => +a.match(/(\d+)\.xml/)[1] - +b.match(/(\d+)\.xml/)[1]);
  const slides = [];
  for (const n of names) {
    const xml = await zip.file(n).async('string');
    const paras = xml.split(/<\/a:p>/).map(p => ENT([...p.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map(m => m[1]).join('')).trim()).filter(Boolean);
    let image = null;
    try {
      const relName = n.replace('slides/', 'slides/_rels/') + '.rels';
      const rel = zip.file(relName) ? await zip.file(relName).async('string') : '';
      const m = [...rel.matchAll(/Target="\.\.\/media\/([^"]+\.(png|jpe?g|gif|webp))"/gi)][0];
      if (m) { const blob = await zip.file('ppt/media/' + m[1]).async('blob'); image = URL.createObjectURL(blob); }
    } catch {}
    slides.push({ title: paras[0] || `Slide ${slides.length + 1}`, bullets: paras.slice(1, 7), image, text: paras.join('\n') });
  }
  if (!slides.length) throw new Error('No slides found. Save the deck as .pptx and try again.');
  return { name: file.name, slides };
}

export const DEFAULT_PARAMS = { 'opamp': { mode: 'predict' }, 'pn-junction': { mode: 'predict' }, 'logic': { mode: 'predict' }, 'iot': {} };

export async function tagSlides(slides) {
  try {
    const r = await fetch('/api/ai', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'match', slides: slides.map(s => s.text || [s.title, ...s.bullets].join('\n')) }) });
    const j = await r.json();
    return { tags: j.slides || [], source: j.source };
  } catch { return { tags: [], source: 'fallback' }; }
}
