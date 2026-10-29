// Sample B.E. ENTC curriculum (as synced from the college LMS). Each chapter carries the
// professor's built-in material (used until a real PPT/PDF is uploaded), the AI teaching
// content used when no AI model is reachable, and the simulators that belong to it.

export const SUBJECTS = [
  { id: 'edc', code: 'ENTC-201', name: 'Electronic Devices & Circuits', year: 'SE · Sem III', faculty: 'Prof. R. Deshmukh', color: '#ff6f5e' },
  { id: 'de', code: 'ENTC-202', name: 'Digital Electronics', year: 'SE · Sem III', faculty: 'Prof. S. Kulkarni', color: '#5fd38d' },
  { id: 'lic', code: 'ENTC-301', name: 'Linear Integrated Circuits', year: 'TE · Sem V', faculty: 'Prof. A. Patil', color: '#46b6ff' },
  { id: 'mc', code: 'ENTC-305', name: 'Microcontrollers & IoT', year: 'TE · Sem V', faculty: 'Prof. N. Joshi', color: '#ffb84d' }
];

export const CHAPTERS = [
  {
    id: 'pn-diode', subject: 'edc', unit: 1, title: 'PN Junction Diode',
    summary: 'A PN junction forms when P-type and N-type silicon meet. Carriers diffuse across the junction and leave behind fixed ions, creating a depletion region with a built-in barrier of about 0.7 V in silicon. Forward bias lowers this barrier and current rises exponentially past the knee voltage; reverse bias widens the depletion region and only a tiny leakage current flows.',
    formulas: [
      { name: 'Shockley diode equation', expr: 'I = Iₛ (e^(V / ηV_T) − 1)' },
      { name: 'Thermal voltage at 300 K', expr: 'V_T = kT / q ≈ 25.9 mV' },
      { name: 'Barrier under bias', expr: 'V_barrier = V_bi − V' },
      { name: 'Depletion width', expr: 'W ∝ √(V_bi − V)' }
    ],
    steps: [
      { title: 'Doping creates P and N regions', body: 'Adding boron gives P-type silicon with extra holes; adding phosphorus gives N-type silicon with extra free electrons.' },
      { title: 'Diffusion builds the depletion region', body: 'At the junction holes and electrons diffuse across and recombine. The fixed ions they leave behind form a charged layer with no free carriers.' },
      { title: 'The built-in field stops diffusion', body: 'Those ions create an electric field pointing from N to P. It pushes carriers back until diffusion and drift balance. The barrier is about 0.7 V for Si and 0.3 V for Ge.' },
      { title: 'Forward bias', body: 'Connecting + to P lowers the barrier to V_bi − V. Below about 0.6 V almost nothing flows; past the knee the current grows about 10× for every extra 60 mV.' },
      { title: 'Reverse bias', body: 'Connecting + to N raises the barrier and widens the depletion region. Only thermally generated pairs cross: the reverse saturation current Iₛ, which roughly doubles every 10 °C.' }
    ],
    material: [
      { title: 'Unit 1: PN Junction Diode', bullets: ['Electronic Devices & Circuits · SE ENTC', 'Prof. R. Deshmukh'] },
      { title: 'Formation of the PN junction', bullets: ['Diffusion of majority carriers', 'Depletion region of fixed ions', 'Barrier potential 0.7 V (Si), 0.3 V (Ge)'] },
      { title: 'Biasing the diode', bullets: ['Forward bias: barrier reduces, current flows', 'Reverse bias: depletion region widens', 'Reverse saturation current Is'] },
      { title: 'V–I characteristics', bullets: ['Knee voltage', 'Shockley equation I = Is(e^(V/ηVT) − 1)', 'Breakdown region'] },
      { title: 'Practical: forward-biased LED', bullets: ['Series resistor limits current', 'LED forward voltage ≈ 2 V', 'R = (Vs − Vf) / I'] }
    ],
    sims: [{ kind: 'lab', id: 'pn-junction', title: '3D PN junction model', blurb: 'Step inside the silicon: bias it and watch carriers, ions and the band diagram.' },
           { kind: 'workbench', id: 'led', title: 'Build: forward-biased LED circuit', blurb: 'Wire a battery, resistor and LED yourself. The AI checks every connection.' }],
    courses: ['Semiconductor Devices (NPTEL / SWAYAM)', 'Electronic Devices & Circuits fundamentals (Coursera / edX)', 'Next in PulseENTC: Diode Rectifiers']
  },
  {
    id: 'rectifiers', subject: 'edc', unit: 2, title: 'Diode Applications: Rectifiers',
    summary: 'A rectifier converts AC to DC using diodes. A half-wave rectifier passes only one half of each cycle, so the output is a series of positive humps with an average value of Vm/π. Diode orientation decides which half passes; a filter capacitor smooths the output into nearly steady DC.',
    formulas: [
      { name: 'Half-wave average output', expr: 'V_dc = V_m / π ≈ 0.318 V_m' },
      { name: 'Half-wave RMS output', expr: 'V_rms = V_m / 2' },
      { name: 'Ripple factor (half-wave)', expr: 'γ = 1.21' },
      { name: 'Peak output with real diode', expr: 'V_out,peak = V_m − 0.7 V' }
    ],
    steps: [
      { title: 'Why rectify?', body: 'Chargers and power supplies get AC from the mains but electronics need DC. A diode lets current flow only one way.' },
      { title: 'Positive half-cycle', body: 'The anode is more positive than the cathode, the diode is forward biased and the input appears across the load (minus about 0.7 V).' },
      { title: 'Negative half-cycle', body: 'The diode is reverse biased and blocks. The load sees 0 V.' },
      { title: 'Output', body: 'The load voltage is a train of positive humps: pulsating DC with average V_m / π.' },
      { title: 'Reversing the diode', body: 'Flip the diode and only the negative halves pass: the output becomes negative pulsating DC.' }
    ],
    material: [
      { title: 'Unit 2: Diode Applications', bullets: ['Half-wave and full-wave rectifiers', 'Filters, clippers and clampers'] },
      { title: 'Half-wave rectifier', bullets: ['Single diode in series with the load', 'Conducts in the positive half-cycle only', 'Vdc = Vm / π'] },
      { title: 'Performance parameters', bullets: ['Ripple factor 1.21', 'Efficiency 40.6 %', 'PIV = Vm'] }
    ],
    sims: [{ kind: 'workbench', id: 'rectifier', title: 'Build: half-wave rectifier', blurb: 'Connect the AC source, diode and load. See the output on the scope.' },
           { kind: 'lab', id: 'pn-junction', title: '3D diode under bias', blurb: 'See why the diode blocks the negative half-cycle.', params: { v: '-3' } }],
    courses: ['Power Electronics basics (NPTEL / SWAYAM)', 'Analog circuits: rectifiers and regulators (Coursera)', 'Next in PulseENTC: Op-Amp fundamentals']
  },
  {
    id: 'logic-gates', subject: 'de', unit: 1, title: 'Logic Gates & Boolean Algebra',
    summary: 'Digital circuits work with two levels, 0 and 1. Basic gates (AND, OR, NOT) and their combinations (NAND, NOR, XOR) implement Boolean functions. Every gate is fully described by its truth table, and NAND and NOR are universal: any circuit can be built from either alone.',
    formulas: [
      { name: 'AND / OR', expr: 'Y = A · B   |   Y = A + B' },
      { name: 'NAND / NOR', expr: 'Y = (A · B)′   |   Y = (A + B)′' },
      { name: 'XOR', expr: 'Y = A ⊕ B = A·B′ + A′·B' },
      { name: 'De Morgan', expr: '(A · B)′ = A′ + B′   |   (A + B)′ = A′ · B′' }
    ],
    steps: [
      { title: 'Two logic levels', body: '0 means low voltage, 1 means high voltage. Gates combine inputs into one output.' },
      { title: 'Basic gates', body: 'AND is 1 only if all inputs are 1. OR is 1 if any input is 1. NOT inverts.' },
      { title: 'Derived gates', body: 'NAND and NOR are AND/OR followed by NOT. XOR is 1 when inputs differ.' },
      { title: 'Universal gates', body: 'Tie a NAND’s inputs together to get NOT; combine NANDs to make AND and OR. So NAND alone builds anything.' },
      { title: 'Design from the truth table', body: 'Write the required output for every input combination, then choose gates that produce it.' }
    ],
    material: [
      { title: 'Unit 1: Logic Gates', bullets: ['Digital Electronics · SE ENTC', 'Prof. S. Kulkarni'] },
      { title: 'Basic and universal gates', bullets: ['AND, OR, NOT', 'NAND and NOR as universal gates', 'XOR and XNOR'] },
      { title: 'Boolean algebra', bullets: ['Laws and De Morgan’s theorems', 'Simplification', 'Truth tables'] }
    ],
    sims: [{ kind: 'lab', id: 'logic', title: 'Logic gate lab + circuit design', blurb: 'Explore every gate, design a fire alarm and play Gate Blitz.' }],
    courses: ['Digital Circuits (NPTEL / SWAYAM)', 'Digital systems: from logic gates to processors (Coursera)', 'Next in PulseENTC: Combinational circuits']
  },
  {
    id: 'combinational', subject: 'de', unit: 2, title: 'Combinational Circuit Design',
    summary: 'A combinational circuit’s output depends only on its present inputs. Designing one means turning a word specification into a truth table, simplifying the Boolean expression, and implementing it with gates. Real systems like alarms and safety interlocks are built this way.',
    formulas: [
      { name: 'Sum of products', expr: 'Y = Σ m (rows where Y = 1)' },
      { name: 'Fire alarm', expr: 'Alarm = Smoke · (Heat + Button)' },
      { name: 'Level crossing', expr: 'Barrier = (L + R) · K′' }
    ],
    steps: [
      { title: 'Read the specification', body: 'Underline the words “and”, “or”, “not”, “unless”. They map to gates.' },
      { title: 'Write the truth table', body: 'List every input combination and the output the specification demands.' },
      { title: 'Simplify', body: 'Use Boolean laws or a K-map to get the smallest expression.' },
      { title: 'Implement and verify', body: 'Build it with gates and check every row of the truth table.' }
    ],
    material: [
      { title: 'Unit 2: Combinational Circuits', bullets: ['Design procedure', 'K-map simplification', 'Practical examples'] },
      { title: 'Design examples', bullets: ['Hostel fire alarm', 'Two-way staircase light (XOR)', 'Railway level-crossing interlock'] }
    ],
    sims: [{ kind: 'lab', id: 'logic', title: 'Design the fire alarm circuit', blurb: 'Pick gates until every truth-table row matches.', params: { view: 'build' } }],
    courses: ['Digital Circuits (NPTEL / SWAYAM)', 'Next in PulseENTC: Sequential circuits']
  },
  {
    id: 'opamp-basics', subject: 'lic', unit: 1, title: 'Op-Amp Fundamentals',
    summary: 'An operational amplifier is a high-gain differential amplifier. With negative feedback the inverting amplifier has a gain of −Rf/Rin that depends only on the resistors. The output can only swing to about 1 V inside the supply rails, so too much gain clips the waveform.',
    formulas: [
      { name: 'Inverting amplifier gain', expr: 'A_v = −R_f / R_in' },
      { name: 'Output', expr: 'V_out = A_v · V_in' },
      { name: 'Output limit', expr: '|V_out| ≤ V_cc − 1 V' },
      { name: 'Virtual ground', expr: 'V₋ ≈ V₊ = 0 V' }
    ],
    steps: [
      { title: 'The ideal op-amp', body: 'Huge open-loop gain, almost no input current, near-zero output resistance.' },
      { title: 'Negative feedback', body: 'Rf connects the output back to the inverting (−) input. The op-amp drives its output until V₋ equals V₊.' },
      { title: 'Virtual ground', body: 'With + grounded, the − input sits at 0 V. The input current Vin/Rin all flows through Rf.' },
      { title: 'Gain', body: 'So Vout = −(Rf/Rin) · Vin. The minus sign is a 180° phase inversion.' },
      { title: 'Clipping', body: 'If |Av · Vin| exceeds about Vcc − 1 V, the peaks flatten. That is distortion you can hear.' }
    ],
    material: [
      { title: 'Unit 1: Operational Amplifiers', bullets: ['Linear Integrated Circuits · TE ENTC', 'Prof. A. Patil'] },
      { title: 'Ideal op-amp characteristics', bullets: ['Infinite open-loop gain', 'Infinite input impedance', 'Zero output impedance'] },
      { title: 'Inverting amplifier', bullets: ['Vout = −(Rf / Rin) · Vin', 'Virtual ground', '180° phase shift'] },
      { title: 'Output saturation', bullets: ['Swing limited to ±(Vcc − 1 V)', 'Clipping when gain is too high'] }
    ],
    sims: [{ kind: 'workbench', id: 'opamp', title: 'Build: inverting amplifier', blurb: 'Wire the op-amp, Rin and Rf yourself. The AI catches feedback and ground mistakes.' },
           { kind: 'lab', id: 'opamp', title: 'Mic preamp repair (clipping)', blurb: 'Predict, see and hear clipping, then repair the gain.' }],
    courses: ['Analog Circuits with op-amps (NPTEL / SWAYAM)', 'Op-amp applications (Coursera / edX)', 'Next in PulseENTC: Microcontroller basics']
  },
  {
    id: 'arduino', subject: 'mc', unit: 1, title: 'Microcontroller Basics: GPIO',
    summary: 'A microcontroller drives the outside world through its GPIO pins. digitalWrite sets a pin HIGH (5 V) or LOW (0 V), and a series resistor protects an LED connected to it. Timing with delay() turns this into a blink, the “hello world” of embedded systems.',
    formulas: [
      { name: 'LED series resistor', expr: 'R = (V_pin − V_LED) / I_LED' },
      { name: 'Example', expr: 'R = (5 − 2) V / 10 mA = 300 Ω → use 330 Ω' },
      { name: 'Blink frequency', expr: 'f = 1 / (t_on + t_off)' }
    ],
    steps: [
      { title: 'GPIO pins', body: 'Each digital pin can be an output (HIGH = 5 V, LOW = 0 V) or an input.' },
      { title: 'Protect the LED', body: 'Without a resistor the LED draws too much current. 330 Ω limits it to about 9 mA.' },
      { title: 'Polarity', body: 'The LED’s anode (long leg) goes toward the pin, the cathode toward GND.' },
      { title: 'The program', body: 'setup() runs once to set pinMode; loop() repeats forever, toggling the pin with delay() between.' }
    ],
    material: [
      { title: 'Unit 1: Microcontroller Basics', bullets: ['Microcontrollers & IoT · TE ENTC', 'Prof. N. Joshi'] },
      { title: 'GPIO and digital output', bullets: ['pinMode, digitalWrite', 'Current limiting resistor', 'LED polarity'] },
      { title: 'First program: Blink', bullets: ['setup() and loop()', 'delay() timing', '1 Hz = 500 ms on + 500 ms off'] }
    ],
    sims: [{ kind: 'workbench', id: 'blink', title: 'Build: LED on pin 13', blurb: 'Wire the LED and resistor to the board, then watch your circuit blink.' },
           { kind: 'lab', id: 'iot', title: 'Code it: Blink at 1 Hz', blurb: 'Fix the Arduino code and verify it on the logic analyzer.', params: { level: '1' } }],
    courses: ['Embedded Systems / Microcontrollers (NPTEL / SWAYAM)', 'Introduction to Arduino (Coursera)', 'Next in PulseENTC: Sensors & IoT']
  },
  {
    id: 'iot', subject: 'mc', unit: 2, title: 'Sensors, IoT & Edge AI',
    summary: 'Sensors turn the physical world into voltages that the ADC reads as numbers (0–1023 on a 10-bit Arduino). Threshold logic turns readings into actions, fail-safe code handles broken sensors, and a small machine-learning model trained on sensor data can make smarter decisions directly on the device.',
    formulas: [
      { name: '10-bit ADC', expr: 'N = V_in / V_ref × 1023' },
      { name: 'LDR voltage divider', expr: 'V_out = V_cc · R_fixed / (R_LDR + R_fixed)' },
      { name: 'Logistic model', expr: 'p = 1 / (1 + e^−(w·x + b))' }
    ],
    steps: [
      { title: 'Read the sensor', body: 'analogRead(A0) returns 0 for 0 V and 1023 for 5 V.' },
      { title: 'Decide with a threshold', body: 'Turn the lamp on when the light reading is below a chosen level, e.g. 300.' },
      { title: 'Design for failure', body: 'A cut wire reads 0, a shorted one 1023. Detect these and fail safe.' },
      { title: 'Learn from data', body: 'Train a classifier on light, CO₂ and temperature to detect people, then put its weights back into the Arduino code.' }
    ],
    material: [
      { title: 'Unit 2: Sensors & IoT', bullets: ['ADC and analog sensors', 'Threshold control', 'Fail-safe design'] },
      { title: 'Edge AI', bullets: ['Collecting sensor data', 'Training a simple classifier', 'Deploying on a microcontroller'] }
    ],
    sims: [{ kind: 'lab', id: 'iot', title: 'Smart classroom: code + 3D twin + ML', blurb: 'Program the controller, watch the 3D classroom react, train a model.', params: { level: '2' } }],
    courses: ['Introduction to Internet of Things (NPTEL / SWAYAM)', 'TinyML / Edge AI (edX)', 'Machine learning foundations (Coursera)']
  }
];

export const chaptersOf = sid => CHAPTERS.filter(c => c.subject === sid).sort((a, b) => a.unit - b.unit);
export const chapterById = id => CHAPTERS.find(c => c.id === id);
export const subjectById = id => SUBJECTS.find(s => s.id === id);
