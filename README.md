# Wander — Tower Bridge

An interactive 3D audio tour for curious London visitors. Explore Tower Bridge’s construction and moving roadway, interrupt the live guide with questions, and ask it to show you details. Built for the DevDay Exchange Community Hackathon, London, 1 November 2026.

## Run locally

Requires Node.js 22.12+ and an OpenAI API key with Live and Responses access and available credits.

```sh
npm install
npm run openai:setup
npm run dev
```

Open [localhost:5173](http://localhost:5173/). The setup wizard saves your key in Git-ignored `.env.local`. See [.env.example](.env.example) for configuration; restart the server after changes. `npm run openai:check` checks authentication without generating audio.

## Try it

1. Press **Start voice tour** and allow microphone access. The guide takes you through three story stops.
2. Interrupt with “How does the bridge open?” or “Show me the walkways.” Say “carry on” to resume the story.
3. Select a checkpoint to jump to another stop, or use the voice controls to pause, mute, show captions, or end the tour.

You can explore the 3D scene without an API key. The map at `/#map` opens the tour when you select Tower Bridge; **Use my location** is optional.

## How it works

React, TypeScript, Vite and Three.js power the app. OpenAI GPT-Live provides the live voice guide over WebRTC, using scene snapshots and tools to focus features, animate the bridge and navigate stops. The API key stays on the server in [server/live.ts](server/live.ts). Voice defaults to Marin and `gpt-live-1`; `gpt-5.6-terra` handles delegated reasoning and scene images. Both models are configurable in `.env.example`.

Normal checkpoint transitions stay in the browser. Each narration brief includes a natural closing sentence; the app recognises it in the transcript and waits for incoming audio to go quiet before advancing. Demonstrations start with the narration. Missing closing wording is requested directly from the voice. Questions and requested scene actions use the Responses backend, whose tool results do not restart narration.

Muting disables the microphone track while keeping the WebRTC connection running with silence, so listening-only tours continue. Pause and End release the microphone and close the session. Resume keeps the checkpoint but starts a fresh conversation.

```sh
npm test         # unit tests
npm run build   # type-check and production build
npm run preview # serve the build locally, including the voice endpoint
```

The local voice endpoint accepts localhost requests only. Vercel hosts the same endpoint as a server function, allowing only the configured HTTPS website origins. Session cleanup uses signed, expiring tokens so it works across function instances. The demo has a per-instance connection limit; it does not require visitor accounts. Starting voice sends microphone audio and scene context to OpenAI. Location stays in device memory.

## Hackathon work and credits

Project work includes the Tower Bridge model, three-stop story, map navigation and live guide integration. A concrete Codex contribution: it changed the map pin to open the tour directly, then verified the click, back navigation and production build.

Reused components and assets:

- React, Three.js, React Three Fiber/Drei, Vite, MapLibre and Lucide; map data and tiles from OpenStreetMap contributors and OpenFreeMap.
- ElevenLabs UI Orb, adapted under MIT: [attribution](public/licenses/elevenlabs-ui/NOTICE) and [license](public/licenses/elevenlabs-ui/LICENSE). Voice audio uses OpenAI.
- Historical sources are linked in the tour’s story notes. The geometry and engineering animations are illustrative.
- Bundled landmark photo credits: [image-credits.json](public/image-credits.json). Generated visual concepts are design references; legacy recordings are not used by the live guide.

## Deploy to Vercel

The live app is [wander-london.vercel.app](https://wander-london.vercel.app/). The Vercel project is `wander-london`, connected to this GitHub repository for automatic deployments. The repository includes the Vite build and a Node function for `/api/live/session` and `/api/live/session/close`; audio streams directly over WebRTC after setup.

Set `OPENAI_API_KEY` and a random `OPENAI_SESSION_SECRET` as server-only secrets in Vercel. Configure `OPENAI_LIVE_MODEL=gpt-live-1` and `OPENAI_LIVE_BACKEND_MODEL=gpt-5.6-terra`. Production and preview Vercel hostnames are read from system variables; add custom domains to `APP_ALLOWED_HOSTS` (comma-separated hostnames without a scheme). Never prefix secrets with `VITE_`.

Run `vercel --prod` from the linked checkout. `.env.local` is excluded from Git and deployment uploads. Vercel environment variables supply the production secrets.
