# PulseENTC · Team Neuronex (T-120)

**CHAKRAVYUH AI Vibe Coding Challenge — Smart ENTC Learning & Innovation Platform**

ENTC students learn from static slides and crowded labs, so theory rarely meets practice. PulseENTC turns each lecture topic into a hands-on virtual lab where students **predict, experiment, repair and code**, while AI finds what each student misunderstands and shows the professor where the whole class is stuck.

## What's inside

| Lab | Real-world scenario | Student does | Topics |
|---|---|---|---|
| **Op-Amp Repair** | The singer's mic preamp sounds harsh at the college fest | Predict the output, see clipping on a live scope, hear it, repair the gain | Analog, signal processing |
| **PN Junction 3D** | Why a phone charger survives reverse plugging | Bias a 3D diode, watch carriers and depletion region, I–V curve, band diagram | Semiconductors |
| **Smart Classroom IoT + ML** | Lights left on in empty classrooms | Write Arduino-style code run on a virtual board over a simulated day (3 graded levels), then train an occupancy classifier in the browser and export it as Arduino code | Microcontrollers, sensors, IoT, ML |

**Platform features**
- **Predict → Observe → Explain** in every lab, with each wrong answer mapped to a named misconception (*Misconception Miner*).
- **PulseAI tutor** beside every lab. It receives the live simulator state, so it can't contradict the physics, and gives hints before answers.
- **AI Fault Inspector**: the fault is detected by deterministic rules, the explanation is a hint ladder.
- **Professor dashboard**: upload a `.pptx` deck → each slide is tagged with the matching lab → "Show to class" QR code → live misconception heatmap, lab stumbling blocks, AI teaching suggestion.
- **Student progress**: labs done, predictions correct, misconceptions fixed, challenges passed, best model accuracy.
- Every AI call has an offline fallback, so the demo never breaks.

## Feature coverage vs problem statement

| Suggested feature | PulseENTC |
|---|---|
| Interactive learning | Slide → lab matching, predict-first labs |
| Virtual electronics lab | Op-amp, PN junction, virtual microcontroller board |
| AI learning assistant | PulseAI tutor with live lab state, Fault Inspector |
| Coding challenges | Arduino-style IoT levels, op-amp repair challenge |
| Quizzes & mini-games | Predict questions in every lab |
| Real-world simulations | Every lab is a real scenario; smart classroom IoT |
| Progress tracking | Student progress strip + professor analytics |

## Architecture

```
Next.js (App Router), served from the presenting laptop
├── /                    Student home: modules, labs, progress
├── /lab/[id]            Scenario + lab iframe + PulseAI tutor
├── /professor           Deck upload, QR, live heatmap, AI suggestion
├── /api/ai              Gemini calls (key stays on the server) + fallbacks
└── /public/labs/*.html  Self-contained labs (work offline)
Supabase
└── events               Every prediction/repair/challenge, Realtime → heatmap
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
3. The laptop needs internet for the live heatmap (Supabase) and the Gemini tutor. Without internet, labs, progress and offline AI answers still work.

For development: `npm run dev`.

## Physics & sources
- Op-amp: ideal inverting amplifier, Av = −Rf/Rin, output limited to ±(Vcc − 1 V). Gayakwad, *Op-Amps and Linear Integrated Circuits*; Sedra & Smith, *Microelectronic Circuits*.
- PN junction: Shockley diode equation (n = 1, 300 K), depletion approximation, NA = ND = 10¹⁶ cm⁻³. Boylestad & Nashelsky; Streetman & Banerjee.
- Occupancy model: logistic regression trained in the browser; data columns follow the UCI Occupancy Detection dataset (Candanedo & Feldheim, 2016).
