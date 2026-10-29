// Circuit workbench engine: component layouts, reference wiring, and deterministic
// fault detection from the student's wiring (netlist). Pure JS, usable on client and server.

// Terminal offsets relative to a component's centre (before rotation)
export const TYPES = {
  battery: { terms: { pos: [0, -58], neg: [0, 58] }, names: { pos: '+ terminal', neg: '− terminal' } },
  ac: { terms: { L: [0, -58], N: [0, 58] }, names: { L: 'live (top) terminal', N: 'neutral (bottom) terminal' } },
  sig: { terms: { sig: [0, -58], com: [0, 58] }, names: { sig: 'signal output', com: 'common (ground) terminal' } },
  resistor: { terms: { a: [-60, 0], b: [60, 0] }, names: { a: 'first leg', b: 'second leg' } },
  led: { terms: { p1: [-50, 0], p2: [50, 0] }, polar: true },
  diode: { terms: { p1: [-50, 0], p2: [50, 0] }, polar: true },
  gnd: { terms: { g: [0, -24] }, names: { g: 'ground' } },
  opamp: { terms: { inv: [-72, -28], non: [-72, 28], out: [76, 0] }, names: { inv: 'inverting (−) input', non: 'non-inverting (+) input', out: 'output' } },
  scope: { terms: { tip: [-40, 72], com: [40, 72] }, names: { tip: 'probe tip (CH1)', com: 'probe ground clip' } },
  arduino: { terms: { d13: [-70, -90], d12: [-30, -90], v5: [25, -90], gnd: [70, -90] }, names: { d13: 'pin 13', d12: 'pin 12', v5: '5V pin', gnd: 'GND pin' } }
};

export const WORKBENCHES = {
  led: {
    id: 'led', title: 'Forward-biased LED circuit', chapter: 'pn-diode', lab: 'pn-junction',
    goal: 'Make the LED glow safely from a 5 V battery: about 10 mA through the LED.',
    steps: ['Connect the battery + terminal to one leg of the resistor.', 'Connect the other resistor leg to the LED anode (long leg, the triangle side).', 'Connect the LED cathode (short leg, the bar side) back to the battery − terminal.', 'Choose a resistor: R = (5 V − 2 V) / 10 mA ≈ 330 Ω.'],
    comps: [
      { id: 'bat', type: 'battery', x: 130, y: 250, label: '5 V battery', v: 5 },
      { id: 'r1', type: 'resistor', x: 410, y: 110, label: 'Resistor', values: [47, 150, 330, 1000], value: 330 },
      { id: 'led1', type: 'led', x: 650, y: 260, rot: 90, label: 'Red LED', anode: 'p1' }
    ],
    ref: [['bat.pos', 'r1.a'], ['r1.b', 'led1.p1'], ['led1.p2', 'bat.neg']],
    broken: { wires: [['bat.pos', 'r1.a'], ['r1.b', 'led1.p2'], ['led1.p1', 'bat.neg']] }
  },
  rectifier: {
    id: 'rectifier', title: 'Half-wave rectifier', chapter: 'rectifiers', lab: 'pn-junction',
    goal: 'Turn 10 V peak AC into positive pulsating DC across the load, and see it on the oscilloscope.',
    steps: ['Connect the AC live terminal to the diode anode (triangle side).', 'Connect the diode cathode (bar side) to the top of the load resistor.', 'Connect the bottom of the load back to the AC neutral terminal.', 'Clip the scope probe tip on the top of the load and its ground clip on the bottom.'],
    comps: [
      { id: 'ac', type: 'ac', x: 120, y: 250, label: 'AC source 10 V peak, 50 Hz', vm: 10 },
      { id: 'd1', type: 'diode', x: 350, y: 120, label: '1N4007 diode', anode: 'p1' },
      { id: 'rl', type: 'resistor', x: 520, y: 260, rot: 90, label: 'Load 1 kΩ', value: 1000 },
      { id: 'sc', type: 'scope', x: 705, y: 230, label: 'Oscilloscope' }
    ],
    ref: [['ac.L', 'd1.p1'], ['d1.p2', 'rl.a'], ['rl.b', 'ac.N'], ['sc.tip', 'rl.a'], ['sc.com', 'rl.b']],
    broken: { wires: [['ac.L', 'd1.p2'], ['d1.p1', 'rl.a'], ['rl.b', 'ac.N'], ['sc.tip', 'ac.L'], ['sc.com', 'ac.N']] }
  },
  opamp: {
    id: 'opamp', title: 'Inverting amplifier', chapter: 'opamp-basics', lab: 'opamp',
    goal: 'Build an inverting amplifier with a gain of about −4.7 and see the inverted, unclipped output on the scope.',
    steps: ['Function generator signal → Rin → op-amp inverting (−) input.', 'Feedback: connect Rf from the op-amp output back to the (−) input.', 'Ground the non-inverting (+) input and the generator common.', 'Scope probe tip on the output, ground clip on ground.'],
    comps: [
      { id: 'vs', type: 'sig', x: 95, y: 250, label: 'Function generator 0.5 V peak, 1 kHz', vin: 0.5 },
      { id: 'rin', type: 'resistor', x: 250, y: 170, label: 'Rin', value: 10000, values: [10000] },
      { id: 'rf', type: 'resistor', x: 470, y: 95, label: 'Rf', value: 47000, values: [10000, 22000, 47000, 68000, 100000] },
      { id: 'op', type: 'opamp', x: 470, y: 250, label: 'Op-amp (±5 V supply)' },
      { id: 'g', type: 'gnd', x: 330, y: 410, label: 'Ground' },
      { id: 'sc', type: 'scope', x: 705, y: 285, label: 'Oscilloscope' }
    ],
    ref: [['vs.sig', 'rin.a'], ['rin.b', 'op.inv'], ['op.inv', 'rf.a'], ['rf.b', 'op.out'], ['op.non', 'g.g'], ['vs.com', 'g.g'], ['sc.tip', 'op.out'], ['sc.com', 'g.g']],
    broken: { wires: [['vs.sig', 'rin.a'], ['rin.b', 'op.inv'], ['op.non', 'rf.a'], ['rf.b', 'op.out'], ['vs.com', 'g.g'], ['sc.tip', 'op.out'], ['sc.com', 'g.g']] }
  },
  blink: {
    id: 'blink', title: 'LED on Arduino pin 13', chapter: 'arduino', lab: 'iot',
    goal: 'Wire an LED so the Blink program (pin 13, 1 Hz) makes it flash, without overloading the pin.',
    steps: ['Connect pin 13 to one leg of the resistor.', 'Connect the other resistor leg to the LED anode (long leg).', 'Connect the LED cathode (short leg) to a GND pin.', 'Use 220–330 Ω so the pin supplies about 10 mA.'],
    comps: [
      { id: 'uno', type: 'arduino', x: 200, y: 285, label: 'Arduino Uno · running Blink on pin 13' },
      { id: 'r1', type: 'resistor', x: 470, y: 110, label: 'Resistor', values: [47, 150, 330, 1000], value: 330 },
      { id: 'led1', type: 'led', x: 660, y: 270, rot: 90, label: 'Red LED', anode: 'p1' }
    ],
    optional: ['uno.d12', 'uno.v5'],
    ref: [['uno.d13', 'r1.a'], ['r1.b', 'led1.p1'], ['led1.p2', 'uno.gnd']],
    broken: { wires: [['uno.v5', 'r1.a'], ['r1.b', 'led1.p1'], ['led1.p2', 'uno.gnd']] }
  }
};

/* ---------- geometry ---------- */
export function termPos(bench, tid) {
  const [cid, t] = tid.split('.'); const c = bench.comps.find(x => x.id === cid); const [dx, dy] = TYPES[c.type].terms[t];
  return c.rot === 90 ? [c.x - dy, c.y + dx] : [c.x + dx, c.y + dy];
}
export function allTerms(bench) { return bench.comps.flatMap(c => Object.keys(TYPES[c.type].terms).map(t => c.id + '.' + t)); }

export function anodeOf(bench, st, cid) {
  const c = bench.comps.find(x => x.id === cid); const base = c.anode || 'p1';
  return st.flips?.[cid] ? (base === 'p1' ? 'p2' : 'p1') : base;
}
export function termLabel(bench, st, tid) {
  const [cid, t] = tid.split('.'); const c = bench.comps.find(x => x.id === cid), T = TYPES[c.type];
  const part = c.type === 'led' ? 'LED' : c.type === 'diode' ? 'diode' : c.label.split(' (')[0];
  if (T.polar) return `${part} ${anodeOf(bench, st, cid) === t ? (c.type === 'led' ? 'anode (long leg)' : 'anode') : (c.type === 'led' ? 'cathode (short leg)' : 'cathode')}`;
  return `${part} ${T.names[t]}`;
}
export function describeWiring(bench, st) { return st.wires.map(([a, b]) => `${termLabel(bench, st, a)} ↔ ${termLabel(bench, st, b)}`); }

/* ---------- netlist ---------- */
export function netsOf(wires) {
  const parent = {};
  const find = x => { if (parent[x] === undefined) parent[x] = x; while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
  wires.forEach(([a, b]) => { const ra = find(a), rb = find(b); if (ra !== rb) parent[ra] = rb; });
  return find;
}
function permute(a) { if (a.length <= 1) return [a]; return a.flatMap((x, i) => permute([...a.slice(0, i), ...a.slice(i + 1)]).map(p => [x, ...p])); }
function seriesPath(N, from, to, parts) {
  for (const perm of permute(parts)) {
    let cur = from, ok = true; const order = [];
    for (const p of perm) {
      const na = N(p.t[0]), nb = N(p.t[1]);
      if (na === cur && nb !== cur) { order.push({ id: p.id, enter: p.t[0], exit: p.t[1] }); cur = nb; }
      else if (nb === cur && na !== cur) { order.push({ id: p.id, enter: p.t[1], exit: p.t[0] }); cur = na; }
      else { ok = false; break; }
    }
    if (ok && cur === to) return order;
  }
  return null;
}
const F = (code, level, title, explain, fix, terms = []) => ({ code, level, title, explain, fix, terms });
const sine = (amp, n = 120, cycles = 2) => Array.from({ length: n }, (_, k) => amp * Math.sin(2 * Math.PI * cycles * k / (n - 1)));

function openFaults(bench, st, used, extraMsg) {
  const skip = new Set(bench.optional || []);
  const loose = allTerms(bench).filter(t => !used.has(t) && !skip.has(t));
  if (loose.length) return [F('open', 'open', `${loose.length} connection${loose.length > 1 ? 's' : ''} still missing`, `Nothing is connected to: ${loose.slice(0, 4).map(t => termLabel(bench, st, t)).join(', ')}${loose.length > 4 ? '…' : ''}.`, 'Follow the build steps and connect every terminal shown in the reference circuit.', loose)];
  return [F('open', 'open', 'The loop is not closed', extraMsg || 'Every terminal has a wire, but current leaving the source cannot find a path back to it.', 'Trace the reference circuit from the source, part by part, and compare it with yours.')];
}

/* ---------- analysis per bench ---------- */
function analyzeLoop(bench, st, { src, sink, partIds, srcName, vSrc }) {
  const N = netsOf(st.wires), used = new Set(st.wires.flat()), faults = [];
  const comp = id => bench.comps.find(c => c.id === id);
  const parts = partIds.map(id => ({ id, t: Object.keys(TYPES[comp(id).type].terms).map(t => id + '.' + t) }));
  if (N(src) === N(sink) && used.has(src)) faults.push(F('short', 'error', `Short circuit across the ${srcName}`, `The ${termLabel(bench, st, src)} and ${termLabel(bench, st, sink)} are joined by wire alone, so a huge current flows and nothing else in the circuit gets any.`, 'Remove the wire that joins them directly. Current must pass through the parts.', [src, sink]));
  parts.forEach(p => { if (used.has(p.t[0]) && N(p.t[0]) === N(p.t[1])) faults.push(F('bypassed', 'error', `${comp(p.id).label} is bypassed`, `Both legs of the ${comp(p.id).label.toLowerCase()} are on the same connection, so current flows around it instead of through it.`, 'Remove the wire that links its two legs.', p.t)); });
  return { N, used, faults, parts, path: faults.length ? null : seriesPath(N, N(src), N(sink), parts), comp };
}

const ANALYZE = {
  led(bench, st) {
    const L = analyzeLoop(bench, st, { src: 'bat.pos', sink: 'bat.neg', partIds: ['r1', 'led1'], srcName: 'battery' });
    const R = (st.values?.r1) || 330, an = anodeOf(bench, st, 'led1');
    const view = { led1: { lit: 0, burnt: false } };
    let { faults } = L;
    if (L.path) {
      const ledStep = L.path.find(p => p.id === 'led1');
      if (ledStep.enter.split('.')[1] !== an) faults.push(F('reversed', 'error', 'The LED is connected backwards', 'The LED’s cathode (short leg) faces the battery +, so the LED is reverse biased. Its depletion region widens and no current flows, exactly like the reverse-bias case in the PN junction model.', 'Flip the LED (or swap its two wires) so the anode, the long leg, faces the + side.', ['led1.p1', 'led1.p2']));
      else {
        const I = (5 - 2) / R; view.led1.lit = Math.min(1, I / 0.015); view.current = I;
        if (I > 0.03) { faults.push(F('resistor-low', 'warn', `Too much current: ${(I * 1000).toFixed(0)} mA`, `With ${R} Ω the LED gets (5 − 2) V / ${R} Ω = ${(I * 1000).toFixed(0)} mA. A standard red LED is rated about 20 mA, so it will overheat and fail early.`, 'Pick a bigger resistor: 150 Ω gives 20 mA, 330 Ω gives about 9 mA.', ['r1.a', 'r1.b'])); view.led1.lit = 1; }
      }
    } else if (!faults.length) {
      const N = L.N, ledOnly = seriesPath(N, N('bat.pos'), N('bat.neg'), L.parts.filter(p => p.id === 'led1'));
      const rOnly = seriesPath(N, N('bat.pos'), N('bat.neg'), L.parts.filter(p => p.id === 'r1'));
      if (ledOnly) {
        if (ledOnly[0].enter.split('.')[1] === an) { faults.push(F('no-resistor', 'error', 'No current-limiting resistor: the LED burns out', 'The LED is connected straight across 5 V. Above about 2 V its current rises exponentially (the Shockley equation), so it draws far more than 20 mA and burns out in a moment.', 'Put the resistor in series between the battery + and the LED anode.', ['led1.p1', 'led1.p2'])); view.led1.burnt = true; }
        else faults.push(F('reversed', 'error', 'LED is backwards, and there is no resistor', 'The LED is reverse biased, so nothing lights. If you flip it as it is, it would burn out because there is no resistor limiting the current.', 'Add the resistor in series, then flip the LED so its long leg faces +.', ['led1.p1', 'led1.p2']));
      } else if (rOnly) faults.push(F('no-led', 'error', 'The resistor is across the battery, the LED is not in the loop', 'Current flows from + through the resistor straight back to −. The LED is not part of that path, so it stays dark.', 'Break that loop: the resistor’s second leg should go to the LED anode, and the LED cathode to −.', ['r1.a', 'r1.b']));
      else faults.push(...openFaults(bench, st, L.used));
    }
    return { faults, view };
  },

  blink(bench, st) {
    const L = analyzeLoop(bench, st, { src: 'uno.d13', sink: 'uno.gnd', partIds: ['r1', 'led1'], srcName: 'pin 13 and GND' });
    const N = L.N, R = (st.values?.r1) || 330, an = anodeOf(bench, st, 'led1');
    const view = { led1: { lit: 0, burnt: false, blink: false } };
    let { faults } = L;
    if (L.used.has('uno.v5') && N('uno.v5') === N('uno.gnd')) faults.push(F('short', 'error', '5V is shorted to GND', 'A wire joins the 5V pin directly to GND. The USB supply overloads and the board resets or shuts down.', 'Remove the wire between 5V and GND.', ['uno.v5', 'uno.gnd']));
    const fwd = path => path.find(p => p.id === 'led1').enter.split('.')[1] === an;
    if (!faults.length && L.path) {
      if (!fwd(L.path)) faults.push(F('reversed', 'error', 'The LED is connected backwards', 'Pin 13 drives the LED’s short leg (cathode), so the LED is reverse biased and never lights, even when the pin is HIGH.', 'Flip the LED so the long leg faces pin 13 and the short leg faces GND.', ['led1.p1', 'led1.p2']));
      else {
        const I = 3 / R; view.led1.lit = Math.min(1, I / 0.015); view.led1.blink = true; view.current = I;
        if (I > 0.025) faults.push(F('resistor-low', 'warn', `Pin overloaded: ${(I * 1000).toFixed(0)} mA`, `An Arduino pin should supply at most about 20 mA (40 mA absolute maximum). With ${R} Ω the LED draws ${(I * 1000).toFixed(0)} mA.`, 'Use 220–330 Ω.', ['r1.a', 'r1.b']));
      }
    } else if (!faults.length) {
      const parts = L.parts;
      const p5 = seriesPath(N, N('uno.v5'), N('uno.gnd'), parts), p12 = seriesPath(N, N('uno.d12'), N('uno.gnd'), parts);
      const ledOnly = seriesPath(N, N('uno.d13'), N('uno.gnd'), parts.filter(p => p.id === 'led1'));
      if (p5) { faults.push(F('wrong-pin-5v', 'error', 'LED is on the 5V pin, not pin 13', 'The 5V pin is always on, so the LED lights but can never blink. Your program is switching pin 13, which has nothing connected.', 'Move the wire from the 5V pin to pin 13.', ['uno.v5', 'uno.d13'])); if (fwd(p5)) view.led1.lit = Math.min(1, (3 / R) / 0.015); }
      else if (p12) faults.push(F('wrong-pin', 'error', 'LED is on pin 12, but the program uses pin 13', 'The Blink sketch calls digitalWrite(13, …). Pin 12 never changes, so the LED stays off.', 'Move the wire from pin 12 to pin 13, or change the code to use pin 12.', ['uno.d12', 'uno.d13']));
      else if (ledOnly && fwd(ledOnly)) { faults.push(F('no-resistor', 'error', 'No resistor: pin 13 is overloaded', 'The LED sits directly between pin 13 and GND. It tries to draw well over the 40 mA a pin can survive, which can permanently damage the microcontroller.', 'Put the resistor between pin 13 and the LED anode.', ['uno.d13', 'led1.p1', 'led1.p2'])); view.led1.burnt = true; }
      else faults.push(...openFaults(bench, st, L.used));
    }
    return { faults, view };
  },

  rectifier(bench, st) {
    const L = analyzeLoop(bench, st, { src: 'ac.L', sink: 'ac.N', partIds: ['d1', 'rl'], srcName: 'AC source' });
    const N = L.N, an = anodeOf(bench, st, 'd1'), vm = 10, faults = L.faults, n = 120;
    const vin = sine(vm, n), view = { scope: { traces: [] } };
    let netV = null; // net -> samples
    if (!faults.length && L.path) {
      const dStep = L.path.find(p => p.id === 'd1'), dir = dStep.enter.split('.')[1] === an ? 1 : -1;
      netV = {}; netV[N('ac.L')] = vin; netV[N('ac.N')] = vin.map(() => 0);
      let cur = vin.slice();
      L.path.forEach(step => {
        const drop = vin.map((v, k) => { const on = dir * v > 0.7; if (step.id === 'rl') return on ? v - dir * 0.7 : 0; return on ? dir * 0.7 : v; });
        cur = cur.map((v, k) => v - drop[k]);
        netV[N(step.exit)] = netV[N(step.exit)] || cur.slice();
      });
      if (dir < 0) faults.push(F('reversed', 'warn', 'The diode is backwards: the output is negative', 'With the cathode facing the AC live terminal, the diode conducts only on the negative half-cycles. You get negative pulsating DC instead of positive.', 'Flip the diode so its anode (triangle side) faces the AC live terminal.', ['d1.p1', 'd1.p2']));
    } else if (!faults.length) {
      const dOnly = seriesPath(N, N('ac.L'), N('ac.N'), L.parts.filter(p => p.id === 'd1')), rOnly = seriesPath(N, N('ac.L'), N('ac.N'), L.parts.filter(p => p.id === 'rl'));
      if (rOnly) { faults.push(F('no-diode', 'error', 'The diode is not in the current path', 'The load is connected straight across the AC source, so it sees the full sine wave, both halves. Nothing is being rectified.', 'Put the diode in series between the AC live terminal and the top of the load.', ['d1.p1', 'd1.p2'])); netV = { [N('ac.L')]: vin, [N('ac.N')]: vin.map(() => 0) }; }
      else if (dOnly) faults.push(F('no-load', 'error', 'The diode is directly across the AC source', 'With no load in series, the diode short-circuits the source on every forward half-cycle. The current is limited only by the source, and the diode overheats.', 'Connect the load resistor in series with the diode.', ['rl.a', 'rl.b']));
      else faults.push(...openFaults(bench, st, L.used));
    }
    // Scope reading
    if (netV && L.used.has('sc.tip') && L.used.has('sc.com')) {
      const vt = netV[N('sc.tip')], vc = netV[N('sc.com')];
      if (vt && vc) {
        view.scope.traces.push({ color: '#46b6ff', label: 'CH1', pts: vt.map((v, k) => v - vc[k]) });
        const across = new Set([N('rl.a'), N('rl.b')]);
        if (!(across.has(N('sc.tip')) && across.has(N('sc.com')) && N('sc.tip') !== N('sc.com'))) {
          if (N('sc.tip') === N('ac.L') && N('sc.com') === N('ac.N')) faults.push(F('scope-input', 'warn', 'The scope is measuring the input, not the output', 'Both probe connections are on the AC source, so the screen shows the original sine wave.', 'Move the probe tip to the top of the load and the ground clip to the bottom of the load.', ['sc.tip', 'sc.com']));
          else faults.push(F('scope-place', 'warn', 'The scope is not across the load', 'To see the rectified output, the probe must measure the voltage across the load resistor.', 'Probe tip on the load’s top, ground clip on the load’s bottom.', ['sc.tip', 'sc.com']));
        }
      }
    } else if (netV && !faults.some(f => f.level === 'open')) faults.push(F('scope-open', 'open', 'Connect the oscilloscope', 'The circuit works, but the scope probe is not connected, so you cannot see the output.', 'Clip the probe tip on the top of the load and the ground clip on the bottom.', ['sc.tip', 'sc.com']));
    view.scope.traces.unshift({ color: 'rgba(255,210,122,.55)', label: 'AC in', pts: vin, ghost: true });
    view.scope.range = 11;
    return { faults, view };
  },

  opamp(bench, st) {
    const N = netsOf(st.wires), used = new Set(st.wires.flat()), faults = [], n = 120;
    const t = k => N(k), G = used.has('g.g') ? t('g.g') : t('vs.com');
    const Rin = 10000, Rf = st.values?.rf || 47000, gain = -Rf / Rin, vin = sine(0.5, n), lim = 4;
    const view = { scope: { traces: [{ color: 'rgba(255,210,122,.55)', label: 'Vin', pts: vin, ghost: true }], range: 5.5 } };
    const pair = (a, b) => new Set([t(a), t(b)]);
    const is = (set, x, y) => set.size === 2 && set.has(x) && set.has(y);
    const rinS = pair('rin.a', 'rin.b'), rfS = pair('rf.a', 'rf.b');
    if (used.has('vs.sig') && (t('vs.sig') === t('vs.com') || t('vs.sig') === G)) faults.push(F('short', 'error', 'The signal generator is shorted', 'Its signal output is wired straight to ground, so no signal reaches the amplifier.', 'Remove the wire between the generator’s signal and ground.', ['vs.sig', 'vs.com']));
    if (used.has('op.out') && t('op.out') === G) faults.push(F('out-short', 'error', 'The op-amp output is shorted to ground', 'The output is forced to 0 V. The op-amp will overheat trying to drive it.', 'The output should connect only to Rf and the scope probe.', ['op.out']));
    if (used.has('op.inv') && t('op.inv') === t('op.non')) faults.push(F('inputs-short', 'error', 'The two inputs are shorted together', 'With − and + joined, the op-amp has no difference to amplify.', 'Keep the inputs separate: Rin and Rf meet at −, and + goes to ground.', ['op.inv', 'op.non']));
    let mode = null;
    if (!faults.length) {
      const rinOK = is(rinS, t('vs.sig'), t('op.inv')), rfWired = used.has('rf.a') && used.has('rf.b');
      if (used.has('rin.a') && used.has('rin.b') && is(rinS, t('vs.sig'), t('op.non'))) faults.push(F('rin-non', 'error', 'The input goes to the + input', 'Rin feeds the non-inverting (+) input, so this is not an inverting amplifier: the gain will not be −Rf/Rin.', 'Connect Rin to the inverting (−) input instead.', ['rin.a', 'rin.b', 'op.non']));
      if (rfWired && is(rfS, t('op.out'), t('op.non'))) { faults.push(F('positive-feedback', 'error', 'Rf gives positive feedback', 'Rf connects the output to the + input. Any change at the output pushes the input further the same way, so the output slams into the ±4 V rail and stays there, like a comparator.', 'Move Rf so it goes from the output to the inverting (−) input.', ['rf.a', 'rf.b', 'op.non'])); mode = 'rail'; }
      else if (rinOK && !is(rfS, t('op.out'), t('op.inv'))) {
        mode = 'open';
        if (rfWired) faults.push(F('no-feedback', 'error', 'No feedback path: the op-amp runs open loop', 'Rf is not connected between the output and the − input, so the gain is the op-amp’s full open-loop gain (about 100 000). The tiny input drives the output straight to the rails: a square wave.', 'Connect Rf from the output to the inverting (−) input.', ['rf.a', 'rf.b']));
      }
      if (!used.has('op.non')) { if (used.has('op.inv') && used.has('op.out')) faults.push(F('floating', 'error', 'The + input is floating', 'The non-inverting input is not connected to anything. It picks up noise, and the virtual ground at the − input disappears.', 'Wire the + input to ground.', ['op.non'])); }
      else if (t('op.non') !== G) faults.push(F('non-ground', 'error', 'The + input is not grounded', 'For an inverting amplifier the + input must sit at 0 V. That is what creates the virtual ground at the − input.', 'Connect the + input to the ground symbol.', ['op.non', 'g.g']));
      if (used.has('vs.com') && t('vs.com') !== G) faults.push(F('no-return', 'error', 'The generator’s common is not grounded', 'The signal current has no return path, so the circuit has no common reference.', 'Connect the generator common terminal to ground.', ['vs.com', 'g.g']));
    }
    const coreOK = is(rinS, t('vs.sig'), t('op.inv')) && is(rfS, t('op.out'), t('op.inv')) && t('op.non') === G && t('vs.com') === G && !faults.some(f => f.level === 'error');
    let out = null;
    if (coreOK) { out = vin.map(v => Math.max(-lim, Math.min(lim, gain * v))); if (Math.abs(gain * 0.5) > lim) faults.push(F('clipping', 'warn', `Output clips at ±${lim} V`, `The gain is ${gain.toFixed(1)}, so the circuit asks for ${Math.abs(gain * 0.5).toFixed(1)} V peak, but the output can only reach Vcc − 1 = ${lim} V. The tops are cut flat.`, 'Use a smaller Rf: 68 kΩ or less keeps the peak under 4 V.', ['rf.a', 'rf.b'])); }
    else if (mode) out = vin.map(v => (mode === 'rail' ? lim : (v > 0 ? -lim : lim)));
    if (!faults.length && !coreOK) faults.push(...openFaults(bench, st, used, 'Compare each connection with the reference: signal → Rin → (−) input, Rf from output to (−), (+) to ground.'));
    if (out && used.has('sc.tip') && used.has('sc.com')) {
      const v = { [t('op.out')]: out, [t('vs.sig')]: vin, [G]: vin.map(() => 0) };
      const vt = v[t('sc.tip')], vc = v[t('sc.com')] || (t('sc.com') === G ? vin.map(() => 0) : null);
      if (vt && vc) view.scope.traces.push({ color: '#46b6ff', label: 'Vout', pts: vt.map((x, k) => x - vc[k]) });
      if (t('sc.tip') !== t('op.out')) faults.push(F('scope-place', 'warn', 'The scope probe is not on the output', 'The probe tip is on another point of the circuit, so the screen is not showing Vout.', 'Clip the probe tip on the op-amp output.', ['sc.tip']));
      if (t('sc.com') !== G) faults.push(F('scope-ground', 'warn', 'The scope ground clip is not on ground', 'A scope measures relative to its ground clip. Without it on circuit ground the reading is meaningless.', 'Clip the scope ground to the ground symbol.', ['sc.com']));
    } else if (out && !faults.some(f => f.level === 'open')) faults.push(F('scope-open', 'open', 'Connect the oscilloscope', 'The amplifier is wired, but the scope is not, so you cannot see the output yet.', 'Probe tip on the op-amp output, ground clip on ground.', ['sc.tip', 'sc.com']));
    view.gain = gain;
    return { faults, view };
  }
};

export function analyze(bench, st) {
  const r = ANALYZE[bench.id](bench, st);
  const N = netsOf(st.wires);
  const matched = bench.ref.filter(([a, b]) => N(a) === N(b)).length;
  const errors = r.faults.filter(f => f.level === 'error'), warns = r.faults.filter(f => f.level === 'warn'), open = r.faults.filter(f => f.level === 'open');
  return { ...r, matched, total: bench.ref.length, errors, warns, open, solved: !r.faults.length };
}

export const WORKBENCH_LIST = Object.values(WORKBENCHES);
