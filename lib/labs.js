// Registry of every lab. Each lab is a self-contained page in /public/labs that
// talks to the platform through postMessage (see app/lab/[id]/LabClient.js).

export const MODULES = [
  { id: 'analog', name: 'Analog & Signals', code: 'ENTC-201', blurb: 'Amplifiers, gain, clipping, waveforms' },
  { id: 'semi', name: 'Semiconductor Devices', code: 'ENTC-203', blurb: 'PN junctions, diodes, band diagrams' },
  { id: 'digital', name: 'Digital Electronics', code: 'ENTC-202', blurb: 'Logic gates, Boolean algebra, universal gates' },
  { id: 'iot', name: 'Embedded & IoT', code: 'ENTC-305', blurb: 'Microcontrollers, sensors, on-device ML' }
];

export const LABS = {
  'opamp': {
    id: 'opamp',
    module: 'analog',
    title: 'Op-Amp Repair',
    file: '/labs/opamp.html',
    minutes: 12,
    scenario: {
      title: 'The singer’s mic sounds broken',
      text: 'At the college fest, the stage microphone preamp makes every word sound harsh and fuzzy. The preamp is an inverting op-amp. Predict what its output looks like, find the fault, and repair it without buying new parts.'
    },
    skills: ['Inverting amplifier gain', 'Phase inversion', 'Clipping at the supply rails'],
    keywords: ['op-amp', 'opamp', 'op amp', 'operational amplifier', 'inverting', 'non-inverting', 'gain', 'feedback resistor', 'clipping', 'virtual ground', 'amplifier'],
    fallback: {
      default: 'An inverting amplifier has gain Av = −Rf / Rin. The output can never go past the supply rails (about Vcc − 1 V for this op-amp). If Av × Vin is bigger than that limit, the tops of the wave get cut flat. That is clipping, and it is what makes the mic sound harsh.',
      clipping: 'Look at the gain first: multiply the input peak by Rf / Rin. Is the answer bigger than the output limit shown on the scope? If so, which resistor could you change to bring the gain down?',
      clean: 'The output is clean now. Check how close the peak is to the limit. A good preamp uses most of the available swing without touching the rails.',
      phase: 'The minus sign in Av = −Rf / Rin means the output is upside down compared with the input: a 180° phase shift. For audio this is fine, the ear cannot hear it.'
    }
  },
  'pn-junction': {
    id: 'pn-junction',
    module: 'semi',
    title: 'PN Junction 3D',
    file: '/labs/pn-junction.html',
    minutes: 10,
    scenario: {
      title: 'Why the charger survives',
      text: 'Plug a cheap phone charger’s DC input in backwards and nothing burns. A diode is protecting it. Step inside the silicon, apply forward and reverse bias, and see why current only flows one way.'
    },
    skills: ['Depletion region', 'Forward vs reverse bias', 'I–V curve and knee voltage', 'Energy band diagram'],
    keywords: ['pn junction', 'p-n junction', 'diode', 'depletion', 'forward bias', 'reverse bias', 'semiconductor', 'barrier potential', 'knee voltage', 'doping', 'holes', 'band diagram'],
    fallback: {
      default: 'In a PN junction, holes from the P side and electrons from the N side diffuse across and leave behind fixed charged ions. Those ions form the depletion region and a built-in barrier of about 0.7 V in silicon. Forward bias lowers the barrier so current flows. Reverse bias raises it so only a tiny leakage current flows.',
      reverse: 'In reverse bias the battery pulls carriers away from the junction, so more fixed ions are uncovered. Watch the depletion width readout as you move the slider left.',
      forward: 'Current rises exponentially with forward voltage. Below about 0.6 V it is still tiny. Watch the I–V dot as you cross the knee.'
    }
  },
  'logic': {
    id: 'logic',
    module: 'digital',
    title: 'Digital Logic',
    file: '/labs/logic.html',
    minutes: 12,
    scenario: {
      title: 'The fire alarm that rings for toast',
      text: 'The hostel fire alarm goes off every time someone makes toast, and nobody trusts it any more. Learn the gates, then design alarm, staircase-light and level-crossing circuits that behave exactly as specified. Finish with a 60-second Gate Blitz.'
    },
    skills: ['AND, OR, NOT, NAND, NOR, XOR', 'Truth tables', 'Combinational circuit design', 'Universal gates'],
    keywords: ['logic gate', 'boolean', 'truth table', 'nand', 'nor', 'xor', 'and gate', 'or gate', 'not gate', 'combinational', 'digital logic', 'k-map', 'karnaugh', 'universal gate', 'flip-flop'],
    fallback: {
      default: 'Every gate is a rule from inputs to one output. AND needs all inputs 1, OR needs at least one, XOR needs them to differ, and NAND/NOR are AND/OR followed by NOT. To design a circuit, write the truth table from the requirement first, then pick gates that produce it.',
      build: 'Turn the sentence into logic words. “and”, “or”, “but not” map to AND, OR and AND-with-NOT. Then compare your column with the required column in the truth table: the red rows show the input combinations you still get wrong.',
      blitz: 'In Gate Blitz, think of the one special case for each gate: AND is 1 only for 1,1. OR is 0 only for 0,0. NAND is 0 only for 1,1. NOR is 1 only for 0,0. XOR is 1 when the inputs differ.'
    }
  },
  'iot': {
    id: 'iot',
    module: 'iot',
    title: 'Smart Classroom IoT + ML',
    file: '/labs/iot.html',
    minutes: 20,
    scenario: {
      title: 'Lights left on in empty classrooms',
      text: 'The college pays for lights burning in empty rooms all evening. Program the room controller in Arduino-style code, test it against a simulated day, then train a small AI model on room-sensor data to detect when people are really there.'
    },
    skills: ['Arduino-style programming', 'Analog sensor thresholds', 'Fail-safe design', 'Training a classifier on sensor data'],
    keywords: ['arduino', 'microcontroller', 'sensor', 'ldr', 'iot', 'embedded', 'analogread', 'digitalwrite', 'gpio', 'smart home', 'automation', 'machine learning', 'occupancy', 'adc'],
    fallback: {
      default: 'The controller reads the light sensor with analogRead(A0), which returns a number from 0 (dark) to 1023 (bright). Your code compares it with a threshold and switches the lamp with digitalWrite. Run the code and compare your timeline row with the target row to see exactly where they differ.',
      code: 'Read the first mismatch message under the timeline. It tells you the time and what your LED did versus the target. Then look for the line in your code that decides that output.',
      ml: 'A classifier learns a weight for each sensor. Sensors with large weights matter most. Try training with one sensor at a time and compare the accuracy.'
    }
  }
};

export const LAB_LIST = Object.values(LABS);

// Keyword fallback for slide → lab matching (used when the AI call fails)
export function matchByKeywords(text) {
  const t = (text || '').toLowerCase();
  let best = null, bestScore = 0;
  for (const lab of LAB_LIST) {
    const score = lab.keywords.reduce((n, k) => n + (t.includes(k) ? (k.length > 6 ? 2 : 1) : 0), 0);
    if (score > bestScore) { best = lab.id; bestScore = score; }
  }
  return bestScore >= 2 ? best : null;
}
