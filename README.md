# Wander — London, at your pace

A small, working audio walk around Westminster. Open the map, find a landmark, and listen to its story in English. No account, fixed route or tour schedule.

Built with Codex during the DevDay Exchange Community Hackathon in London, 1 November 2026.

## Run it

Requires Node.js 22.12+ and npm.

```sh
npm ci
npm run dev
```

Open the Local URL printed by Vite, normally http://localhost:5173. No API keys or backend are required.

```sh
npm run build   # TypeScript check + production dist/
npm run preview
npm test       # GPS guardrails and narration-to-camera cue checks
```

Deploy `dist/` to any static HTTPS host. This repository currently contains a local app, not a public deployment. Phone geolocation requires HTTPS; opening the LAN HTTP URL lets you explore and listen but generally cannot provide GPS. `localhost` is permitted for development.

## The complete journey

1. Start with the clearly labeled Westminster preview point, or tap **Use my location**.
2. Pan and zoom the flat, north-up map. Landmark illustrations and numbered markers correspond to five real places. The optional **2D/3D** control changes perspective; initial navigation remains top-down.
3. Tap a landmark or its list entry, then **Listen to the story**.
4. On Big Ben, tap **Look closer** to open an interactive Three.js exterior model. Listen as the camera frames the silhouette, upper tower, clock and wider view. Select a detail to explore it yourself; drag the model while idle. Returning to the map pauses playback.
5. Pause, resume or restart. Open **Read story** for the transcript and primary-source link.
6. At completion, the landmark is marked **Listened** and **Explore another story** continues the walk.

GPS positions within 150 metres can trigger a nearby suggestion when accuracy is 100 metres or better and the fix is at most 60 seconds old. Suggestions never interrupt narration or auto-play. The UI distinguishes preview from live location; distances are straight-line measurements, not walking directions. When location is denied or unavailable, every story remains usable.

## Scope and tradeoffs

- **MVP:** Big Ben, Westminster Abbey, London Eye, St James's Park and Trafalgar Square. Roughly one-minute stories in English.
- **Not in MVP:** group sessions/location sharing, accounts, generated worldwide tours, turn-by-turn routing, synchronized audio, background tracking or offline maps.
- **Map:** MapLibre GL JS + OpenFreeMap/OpenStreetMap. Flat map with generated miniature landmark illustrations; these are not precise 3D architectural models. Map tiles require internet and WebGL. The landmark list/transcripts remain usable if the map fails.
- **Audio:** real Web Speech device narration. Voices, pronunciation and behavior differ by browser/OS. No OpenAI inference API is used at runtime. If narration is unsupported or fails, the transcript remains available.
- **Big Ben close-up:** a code-authored, illustrative Three.js exterior model, loaded only when opened. Four camera views follow sentence-start events from the actual device narration. This is sentence-level coordination, not timestamp-accurate recorded audio. Pause freezes camera transitions; restart resets both the view and narration. Reduced motion retains a stable camera. WebGL failure falls back to the photograph and transcript. The user approved device voice for this iteration; reviewed OpenAI recordings remain a follow-up.
- **Privacy:** location is held in memory and never sent to our own backend (there is none). Only listened-story IDs are saved in localStorage. Map tile requests reveal the viewed map area to the map provider. Depending on the chosen system voice, speech services may process the public story text. No analytics.

## Repository guide

- `src/data/landmarks.ts`: coordinates, original English scripts and source URLs.
- `src/components/Map.tsx`: geographic map, illustrated anchors, perspective/overview/recenter.
- `src/components/LandmarkExperience.tsx`: Big Ben close-up, shared audio controls, chapters and transcript.
- `src/components/landmark-scene/`: Three.js model, camera views, rendering lifecycle and responsive styling.
- `src/lib/story-scenes.ts`: narration sentence splitting and Big Ben camera cues.
- `src/hooks/useLocation.ts`: permission-based GPS watch and cleanup.
- `src/hooks/useNarration.ts`: sentence-by-sentence speech, cancellation, progress and completion.
- `docs/mvp.md`: scope and under-90-second demo outline.
- `docs/design/`: original and revised visual concepts and design system.
- `docs/references/`: both supplied map references. The Builders Guide PDF is kept locally and excluded from Git.

## Credits and sources

Existing libraries: React, Vite, TypeScript, MapLibre GL JS, Three.js, Lucide and Vitest. No pre-existing application template was used. The OpenFreeMap Liberty style was adapted to quiet road colors and suppress distracting labels; map attribution is preserved in the UI. Typography uses DM Sans via Google Fonts with system fallbacks and Georgia.

Landmark photography comes from Wikimedia Commons, with author, original-file URL, license and crop/resizing notes in `public/image-credits.json` and the in-app **Credits** dialog. Each photograph retains its original CC license. Generated architectural miniatures and visual concepts were made with OpenAI Image Gen during this build. The user-supplied bus maps are design references only; their artwork is not incorporated into the app.

Stories are original short scripts based on UK Parliament, Westminster Abbey, the London Eye, The Royal Parks and Royal Museums Greenwich. Source links are available in each transcript. Codex helped narrow the MVP, research and draft the English scripts, generate the visual direction, implement the app and verify the core journey.

The supplied event PDF includes venue access details and is excluded from Git. No `.env` file or API credential is needed or included.
