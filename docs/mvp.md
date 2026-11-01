# Wander: London, at your pace

## The one journey

Open the map → allow location (or explore the explicitly labeled Westminster preview) → recognize a nearby landmark → tap Listen or Big Ben's Look closer → hear a short, sourced story with an optional coordinated Three.js view → choose another landmark.

Built for independent visitors, especially family members who want a clear explanation without a tour group's schedule, pace or route.

## MVP scope

The hackathon project is English-only. Additional languages are outside this scope.

- Five landmarks around Westminster: Big Ben, Westminster Abbey, London Eye, St James's Park and Trafalgar Square.
- Real interactive map, flat north-up navigation by default, recognizable landmarks, numbered anchors and an opt-in location dot. Perspective is an optional toggle, never the initial navigation mode.
- Actual Three.js landmark geometry integrated with MapLibre. Build one complete Big Ben visual-and-audio experience first, then extend the treatment across the other landmarks. Existing illustrated miniatures remain a fallback and are not described as interactive 3D models.
- Nearest-landmark suggestion within 150 metres when location is fresh and sufficiently accurate. Never autoplay.
- Short original English scripts with visible primary-source links, transcript and OpenAI-generated narration. Generate and review the five core recordings ahead of playback; use a warm, clear delivery and show an AI-voice disclosure. Browser speech is a clearly identified fallback, not the target listening experience.
- Big Ben is the first complete narrated 3D moment: use an exterior-only model and move the camera between a few visible details as the story mentions them. Start with the whole tower, frame the clock face and surrounding stonework, show the upper tower from outside when discussing the bell, then return to the wider setting. No interior modelling or cutaway. Drive camera cues from the recording's playback time.
- Play, pause, resume, restart, completion and next-story flow.
- Clearly labeled preview location for an indoor hackathon demo; no simulated people or live-GPS claims.
- Responsive phone and desktop layouts, usable transcript and landmark list when map or narration is unavailable.

## Deliberately after the MVP

Shared sessions and group location tracking are nice-to-have, explicitly excluded by the user. Live voice conversation and spoken follow-up questions come after the core 3D-and-audio journey works. Also excluded: accounts, worldwide generation, turn-by-turn navigation, custom walking routes, photorealistic city reconstruction, purchases and background location tracking. Stylized interactive landmark models are in scope; they are illustrative rather than architecturally exact.

## Delivery order and acceptance

This scope was expanded on 1 November 2026 to include Three.js and OpenAI voice. The user subsequently confirmed exterior-only views and approved device voice for the first implementation because no OpenAI API key was configured.

Delivered for this iteration: Big Ben's Look closer opens a lazy-loaded, illustrative Three.js exterior model with four composed views, manual detail selection and dragging, shared playback, transcript, restart, completion and next-landmark navigation. Actual sentence-start events drive the camera; pause freezes its transition. Reduced motion keeps one stable camera, and WebGL failure falls back to photography. The geographic map retains its existing illustrated markers. No bell cutaway or live conversation is included. The following recorded-audio work remains a target, not a shipped feature.

1. Complete Big Ben end to end: recognizable exterior-only Three.js model, reviewed English OpenAI narration, and synchronized camera stops at the details being described.
2. Provide reviewed OpenAI recordings for all five landmarks, preserving transcripts, sources and player controls.
3. Extend the Three.js treatment across the remaining landmarks, beginning with the London Eye. The first complete Big Ben moment is the minimum visual acceptance bar; additional scenes follow only after it works well on a phone.
4. Consider live conversation only after this core journey is complete; it is not required for MVP acceptance.

The Big Ben experience must pause, resume and restart visuals with the audio; reset correctly on landmark changes; and avoid duplicate playback. Navigation stays top-down by default. Any cinematic perspective is an explicit user choice and offers a return to the map. Respect reduced-motion preferences, keep playback controls accessible, and preserve the transcript/list fallback if audio or WebGL fails. Test recognition and playback on a phone, not only the desktop demo.

Use three or four composed views per story, with short, gentle transitions and enough time holding each view to inspect the detail. Avoid continuous orbiting. Enter this guided camera experience through Look closer; ordinary map listening does not move the navigation camera. Provide a static view with highlights for reduced motion. Only model exterior features needed for recognition and the story. Interior reveals, cutaways and moving building parts are excluded from the hackathon scope.

## Implementation

TypeScript, React, Vite, MapLibre GL JS, Three.js and OpenFreeMap (OpenStreetMap data). MapLibre handles geographic navigation; Three.js supplies the landmark models and story visuals. Browser Geolocation is permission-based; positions remain in memory on the device. HTTPS is required for phone geolocation (localhost is allowed for development).

Generate OpenAI audio with a trusted local script or server, then serve the reviewed recordings as static audio assets. Generation requires API access; visitors need no account or API key, and credentials must never be bundled into the browser. Use the audio player's current time as the source of truth for visual cues. Device speech remains a degraded fallback without pretending to have the recorded audio's exact cue timings.

Author camera cues alongside each reviewed recording: timestamp, camera position, look-at target and transition duration. Derive the view from audio time so pause, resume and restart stay synchronized. Set cue timestamps after listening to the final recording; the outline above specifies candidate shots, not a fixed sequence that overrides the script.

Check the supported voice API at implementation time. The current [OpenAI speech guide](https://developers.openai.com/api/docs/guides/text-to-speech) marks the older Speech API models as deprecated and directs new migration work to the Realtime API; do not assume a replacement model works at the old speech endpoint. [Realtime conversations](https://developers.openai.com/api/docs/guides/realtime-conversations) documents the later conversational path. [MapLibre's Three.js example](https://maplibre.org/maplibre-gl-js/docs/examples/add-3d-tiles-3d-objects-and-models-using-threejs/) provides an integration reference.

## Demo, under 90 seconds

1. Explain the family trip pain: fixed tours and clumsy audio guides.
2. Show Westminster preview and recognizable landmarks on the map.
3. Pick Big Ben, open Look closer, and show the camera framing exterior details in time with its OpenAI-voiced story.
4. Pause/resume the coordinated scene and open the transcript/source.
5. Choose another landmark; demonstrate location permission if GPS is available.
6. End: the city at your pace. Codex helped define the cut, research the scripts, build and test the journey.

## Submission checklist

The supplied guide lists a 17:00 London deadline on 1 November 2026. Prepare the public repository, setup instructions, asset credits and a working demo video of no more than 90 seconds. The original event PDF contains venue access details: review/redact it before making this repository public. Local implementation is not a public deployment.
