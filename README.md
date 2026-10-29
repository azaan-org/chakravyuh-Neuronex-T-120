# PulseENTC · Team Neuronex (T-120)

**CHAKRAVYUH AI Vibe Coding Challenge — Smart ENTC Learning & Innovation Platform**

ENTC students learn from static slides and crowded labs, so theory rarely meets practice. PulseENTC turns each lecture topic into a hands-on virtual lab where students **predict, experiment, repair and code**, while AI finds what each student misunderstands and shows the professor where the whole class is stuck.

## How it works

**Problem:** many colleges have limited lab equipment and little practical teaching. PulseENTC lets ENTC students learn every concept in a practical, digital way, and shows professors exactly where students struggle.

### Student
1. **Login** → the college's **ENTC curriculum** (subjects → chapters), synced from Moodle/Juno (demo).
2. **Chapter page:** the professor's uploaded **PPT/PDF** on the left, **AI mode** on the right:
   - **AI Teacher:** teaches from the professor's material, answers questions, "Explain this slide".
   - **Summary & key formulas**, **step-wise breakdown**, **suggested courses**.
   - **Simulators** for the chapter (3D models and circuit workbenches).
3. **Circuit workbench:** a **reference simulator** with the correct circuit beside a breadboard where the student **wires the circuit themselves**. The **AI Fault Inspector** detects wrong connections (short circuit, reversed LED/diode, missing resistor, positive feedback, floating input, wrong pin, scope in the wrong place) and suggests the fix. Workbenches: LED circuit, half-wave rectifier, inverting op-amp, Arduino pin 13 LED.
4. **Network:** study groups per subject, class discussions (AI-seeded), classmates list; "Ask classmates" posts a circuit with the AI's diagnosis.
5. **My Progress:** personal misconception mind map with fix paths.

### Professor
1. **Study Materials:** upload PPTX/PDF per chapter; text is extracted so the AI can teach from it.
2. **Insights:** chapters where students are lagging (AI questions, circuit faults, wrong answers), most common circuit mistakes, what students ask the AI, students who need attention, misconception heatmap, and an AI suggestion for the next lecture.
3. **Lecture Studio:** present slides with the matching simulation live beside each slide, with a class QR code.

### Also included
3D PN junction, Op-Amp clipping repair (with sound), Digital Logic lab with Gate Blitz, Smart Classroom IoT lab (Arduino code + 3D digital twin + in-browser ML).

## Feature coverage vs problem statement

| Suggested feature | PulseENTC |
|---|---|
| Interactive learning | Slide → lab matching, predict-first labs |
| Virtual electronics lab | Op-amp, PN junction, logic gates, virtual microcontroller board |
| AI learning assistant | PulseAI tutor with live lab state, Fault Inspector |
| Coding challenges | Arduino-style IoT levels, logic circuit design, op-amp repair challenge |
| Quizzes & mini-games | Predict questions in every lab, 60-second Gate Blitz timed quiz |
| Real-world simulations | Every lab is a real scenario; smart classroom IoT |
| Progress tracking | Student progress strip + professor analytics |

## Architecture

```
Next.js (App Router), served from the presenting laptop
├── /login               Student / professor sign-in
├── /                    Student curriculum
├── /learn/[chapter]     Professor material + AI mode
├── /workbench/[id]      Reference + build-it-yourself circuit + AI fault inspector
├── /network             Study groups, discussions, classmates
├── /lab/[id]            3D / interactive simulators + PulseAI tutor
├── /professor           Insights dashboard
├── /professor/materials PPTX/PDF upload per chapter (/api/materials)
├── /api/ai              Gemini calls (key stays on the server) + fallbacks
└── /public/labs/*.html  Self-contained labs (work offline)
/api/events              Local event store on the laptop (data/events.json); the dashboard polls it
```

**Lab contract:** each lab reads URL params (`?mode=predict`) and posts `postMessage` events (`prediction`, `summary`, `repair`, `challenge`, `ml`, `inspect`, `state`) to the platform. New labs plug in without platform changes.

## Run the demo (local, no deployment)

```bash
npm install
cp .env.example .env.local   # add GEMINI_API_KEY (optional; offline answers work without it)
npm run demo                 # builds and serves on port 3000, reachable from phones on the same Wi-Fi
```

1. Find the laptop's Wi-Fi address: `ipconfig` (Windows) or `ipconfig getifaddr en0` (Mac), e.g. `192.168.1.20`.
2. Open `http://192.168.1.20:3000/professor` on the laptop and put `http://192.168.1.20:3000` in **Address phones use to reach this laptop**. The QR codes then work on phones connected to the same Wi-Fi or hotspot.
3. **No internet needed.** Fonts, the 3D library and the event store all run from the laptop. The AI tutor uses Gemini if a key and internet are available, otherwise a local Ollama model if `OLLAMA_MODEL` is set, otherwise built-in answers that still use the live lab numbers.
4. Reset between demo runs with **Clear class data** on the Professor page.

For development: `npm run dev`.

## Physics & sources
- Op-amp: ideal inverting amplifier, Av = −Rf/Rin, output limited to ±(Vcc − 1 V). Gayakwad, *Op-Amps and Linear Integrated Circuits*; Sedra & Smith, *Microelectronic Circuits*.
- PN junction: Shockley diode equation (n = 1, 300 K), depletion approximation, NA = ND = 10¹⁶ cm⁻³. Boylestad & Nashelsky; Streetman & Banerjee.
- Occupancy model: logistic regression trained in the browser; data columns follow the UCI Occupancy Detection dataset (Candanedo & Feldheim, 2016).
