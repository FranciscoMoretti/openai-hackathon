# Tower Bridge — a moving audio guide

A single-attraction, English-language demo for a visitor standing by Tower Bridge. Press **Play** once: four checkpoints advance automatically through a 93-second recorded story. Checkpoints on the model, chapter list, transcript and audio timeline all seek to the same recording. No interaction gates progress.

## Run

```sh
npm install
npm run dev
```

Open http://localhost:5190/. From the repository root, append `--prefix prototypes/tower-bridge` to the npm commands.

```sh
npm test
npm run build
```

## What the visitor sees

- Present-day bridge, then the river before the crossing. A prominent period overlay stays on the scene.
- 1886–1894: piers, steel framing, stone cladding, upper walkways, and roadway appear in sequence.
- 1894: bascules lift automatically; a sailing ship clears the crossing before the road closes.
- 1976: a labeled **3D schematic** shows two complete models in sequence: steam machinery (boiler, engine, water pump), then electric machinery (motor, oil pump, reservoir). The switch is immediate, with no shrinking or morphing; each system stays fully visible long enough to read its labels.
- 1977: brown metalwork changes to a simplified red, white, and blue scheme.
- Today: return to the familiar bridge and invite the visitor to look at the real attraction.

Drag to orbit, use Explore / Resume guide, pause, restart, mute, or seek. These controls are optional. Selecting a checkpoint preserves paused/playing state. The transcript includes source links. Reduced motion uses still milestone views and disables continuous water, machinery and camera motion. Audio and transcript remain available if WebGL is unavailable.

## Narration and synchronization

The checked-in MP3 is generated using the local macOS **Daniel** voice, explicitly approved for this build. It is **not OpenAI narration**. `npm run audio` regenerates it on macOS with `say`, `ffmpeg`, and `ffprobe` installed. Each sentence is measured from its recording; `public/audio/chapters.json` stores actual sentence and chapter offsets. `timeline.ts` derives dates, construction, paint, bridge opening, ship motion and power changes from that media time. Seeking backwards is deterministic; there is no independent animation clock.

To replace the voice later, regenerate both the audio and measured cue manifest. Never reuse the local recording's timings with a different voice. Keep provider credentials out of browser code.

## Scope and accuracy

This is a procedural, illustrative Three.js model, not a survey, digital twin, AR overlay or reconstruction of a specific ship voyage. Geometry and colours are approximate. Construction order is simplified for explanation; exact intermediate construction dates are not asserted. The lift is accelerated. The machinery is a separate, labeled explanatory schematic, not a view of equipment visible from the river. Warehouses and the ship are generic context. This demo does not request location, align with the user's heading, or integrate the main app's map. Real-device outdoor testing remains necessary.

## Sources

- [Why does Tower Bridge open?](https://www.towerbridge.org.uk/stories/why-does-tower-bridge-open)
- [How was Tower Bridge built?](https://www.towerbridge.org.uk/stories/how-was-tower-bridge-built)
- [Construction and opening timeline](https://www.towerbridge.org.uk/stories/timeline-the-construction-of-tower-bridge)
- [How does Tower Bridge work?](https://www.towerbridge.org.uk/stories/how-does-tower-bridge-work)
- [Royal connections and the 1977 colour scheme](https://www.towerbridge.org.uk/stories/royal-connections-to-tower-bridge)

Checkpoint/audio interaction reference: `../exterior-camera` (the bigben1 chat). This implementation is isolated from both Big Ben versions.

The Image Gen layout concept is in `design/concept.png`. The implementation retains its white navigation rail, green typography, dominant 3D scene and floating player. Intentional differences: code-native procedural geometry instead of photorealistic imagery; functional playback/animation controls instead of generated search/menu controls; user-requested historical period overlay and machinery schematic. No generated screenshot is used as the UI or as a substitute for interactive 3D.
