# Wander — Tower Bridge

An interactive 3D audio tour for curious London visitors. Explore Tower Bridge’s construction and moving roadway, interrupt the live guide with questions, and ask it to show you details. Built for the DevDay Exchange Community Hackathon, London, 1 November 2026.

## Run locally

Requires Node.js 22.12+ and an OpenAI API key with Realtime access and available credits.

```sh
npm install
npm run openai:setup
npm run dev
```

Open [localhost:5173](http://localhost:5173/). The setup wizard saves your key in Git-ignored `.env.local`. See [.env.example](.env.example) for configuration; restart the server after changes. `npm run openai:check` checks authentication without generating audio.

## Try it

1. Press **Start voice tour** and allow microphone access. The guide takes you through four story stops.
2. Interrupt with “How does the bridge open?” or “Show me the walkways.” Say “carry on” to resume the story.
3. Select a checkpoint to jump to another stop, or use the voice controls to pause, mute, show captions, or end the tour.

You can explore the 3D scene without an API key. The map at `/#map` opens the tour when you select Tower Bridge; **Use my location** is optional.

## How it works

React, TypeScript, Vite and Three.js power the app. OpenAI Realtime provides the live voice guide over WebRTC, using scene snapshots and tools to focus features, animate the bridge and navigate stops. The API key stays on the server in [server/realtime.ts](server/realtime.ts). Voice defaults to Marin; the model is configurable in `.env.example`.

```sh
npm test         # unit tests
npm run build   # type-check and production build
npm run preview # serve the build locally, including the voice endpoint
```

The voice endpoint accepts localhost requests only. Public hosting needs an authenticated backend and HTTPS; a static deployment alone cannot run the voice guide. Starting voice sends microphone audio and scene context to OpenAI. Location stays in device memory.

## Hackathon work and credits

Project work includes the Tower Bridge model, four-stop story, map navigation and live guide integration. A concrete Codex contribution: it changed the map pin to open the tour directly, then verified the click, back navigation and production build.

Reused components and assets:

- React, Three.js, React Three Fiber/Drei, Vite, MapLibre and Lucide; map data and tiles from OpenStreetMap contributors and OpenFreeMap.
- ElevenLabs UI Orb, adapted under MIT: [attribution](public/licenses/elevenlabs-ui/NOTICE) and [license](public/licenses/elevenlabs-ui/LICENSE). Voice audio uses OpenAI.
- Historical sources are linked in the tour’s story notes. The geometry and engineering animations are illustrative.
- Bundled landmark photo credits: [image-credits.json](public/image-credits.json). Generated visual concepts are design references; legacy recordings are not used by the live guide.
