// Predict-question catalogue used by the professor dashboard (mirrors the questions inside each lab).
export const QUESTIONS = {
  'opamp:output-peak': { lab: 'opamp', text: 'Output of a gain −10 amp with a 0.5 V input on ±5 V', wrong: [['An op-amp output can go beyond its supply rails', 0.48], ['The feedback resistor does not set the gain', 0.14]] },
  'opamp:phase': { lab: 'opamp', text: 'Phase of an inverting amplifier’s output', wrong: [['An amplifier never changes the phase', 0.22], ['Inverting means a 90° shift', 0.1]] },
  'opamp:fix': { lab: 'opamp', text: 'How to stop clipping without changing the supply', wrong: [['A bigger feedback resistor reduces gain', 0.2], ['Swapping inputs only changes the phase, not the size', 0.06]] },
  'pn-junction:reverse-width': { lab: 'pn-junction', text: 'Depletion region under reverse bias', wrong: [['Reverse bias pushes carriers into the junction', 0.28], ['Depletion width is fixed by the material', 0.12]] },
  'pn-junction:forward-knee': { lab: 'pn-junction', text: 'Current in a Si diode at 0.3 V forward', wrong: [['A diode conducts fully as soon as it is forward biased', 0.38], ['Current is zero until a fixed threshold, then jumps on', 0.18]] },
  'pn-junction:reverse-current': { lab: 'pn-junction', text: 'Current through a diode at −5 V', wrong: [['A reverse-biased diode blocks all current', 0.3], ['Reversing the battery reverses the current', 0.06]] },
  'logic:nand-11': { lab: 'logic', text: 'NAND output with both inputs 1', wrong: [['NAND behaves like AND', 0.34]] },
  'logic:xor-11': { lab: 'logic', text: 'XOR output with both inputs 1', wrong: [['XOR is the same as OR', 0.42]] },
  'logic:nand-universal': { lab: 'logic', text: 'Can NAND alone build any circuit?', wrong: [['NAND gates are less useful than AND and OR', 0.3]] },
  'iot:best-sensor': { lab: 'iot', text: 'Best single sensor for detecting people', wrong: [['Room temperature reacts quickly to people', 0.36], ['Humidity is a strong sign of people', 0.14]] }
};

export function questionKey(lab, q) { return lab + ':' + q; }
