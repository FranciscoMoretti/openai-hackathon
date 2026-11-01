# Wander exterior-camera prototype — option 02

A separate, disposable implementation to compare with the main app. It asks: **can a narrated tour of an exterior model make the story clearer and more memorable?** No main application files, package files or routes are modified. This is one alternative to the implementation in the other chat, not a second production app.

## Run

From this folder:

```sh
npm install
npm run dev
```

Open http://localhost:5188. The strict port prevents accidentally landing on the main app. Build with `npm run build`. All dependencies and build output stay inside this folder.

## Try

- Play the 67-second story. Four composed camera views follow the recording.
- Matching numbered checkpoints appear on the audio timeline and at world-space positions on the exterior model. Click either to seek to the same chapter and frame its view. Selection highlights in both places and the sidebar. Paused audio stays paused; playing audio keeps playing.
- Model checkpoints hide when outside the view or obscured by the landmark. The timeline always provides all four chapters. Reduced-motion checkpoint selection changes the view once, without enabling automatic camera motion.
- Pause, scrub, restart, or jump to a chapter. The camera derives its pose from audio time; no separate animation clock can drift.
- Drag to explore. That switches off camera following; turn **Follow the story** back on to rejoin.
- Disable following for a static camera while listening. Reduced-motion preference disables following initially.
- Open the transcript on desktop or mobile.

The camera gently transitions during the final 2.7 seconds of a chapter, arriving at the next exterior detail as its narration starts. Chapter selection seeks to its exact beginning without skipping words.

## Deliberate limits

This demonstrates technical feasibility of synchronized exterior views and bidirectional chapter navigation. It does not establish whether real visitors learn more, find landmarks more easily, or enjoy it more; those require user testing. Integration into the map/GPS app, other landmarks, OpenAI audio and real-phone field/performance checks remain to be done.

One illustrative Big Ben / Elizabeth Tower exterior, simplified Parliament context, no interiors, no geographic map or live GPS. The environment is an architectural diorama, not a surveyed model. Clock-face artwork and all geometry are drawn in code. The original map-first flow is represented by the main app, not duplicated here.

**Audio is a local macOS Daniel recording, not OpenAI narration.** This lets us test a seekable recorded soundtrack and synchronized camera today. Replace `public/audio/story.mp3` and update `public/audio/chapters.json` timings after the OpenAI recording is ready. The interface labels the current voice accurately. No API key is used or required.

`make-audio.py` regenerates the placeholder track on macOS with `say`, `ffmpeg` and `ffprobe`. The reviewed text lives in `public/audio/script.json`. The British Parliament [tower chronology](https://www.parliament.uk/about/living-heritage/building/palace/big-ben/building-clock-tower/key-dates-/) is the source for the clock/bell dates, carried over from the app's sourced script.

Three.js powers the scene; Vite serves/builds it. DM Sans loads from Google Fonts with a sans-serif fallback. Playback/3D assets are local. There is no persistence or analytics.
