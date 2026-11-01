# Hackathon MVP

The visitor is standing near Tower Bridge. Open the attraction, press Play, and hear an English story while a 3D scene directs attention and demonstrates the changes being described. The recording proceeds through every checkpoint without requiring interaction.

## Current product

One app at localhost:5173. Default: Tower Bridge tour. Secondary route: #map, with a Tower Bridge preview and optional live location. Map → Open the tour → Play → Pause/explore/revisit → Map is one connected journey.

The active implementation lives in src/tour. The earlier standalone Big Ben prototypes have been removed. Work on model quality, narration, historical accuracy, timing, and guide interaction takes priority over adding attractions or discovery features.

## Core controls

- Play/pause and one seekable timeline with numbered checkpoints.
- Matching checkpoint anchors on the model.
- Free camera exploration and Resume guide.
- Mobile chapter sheet; desktop chapter rail.
- Transcript, sources, narration sound, restart, and motion preference.
- Visible historical period synchronized with the scene.

## Limits

English only. One attraction. No groups, accounts, route planning, background tracking, or worldwide tour generation. Scene changes are illustrative, accelerated, and sourced. Recorded narration currently uses the local Daniel voice. Optional OpenAI live-guide integration is developed in the same app.

## Demo

Start on the tour, show a construction checkpoint, play the bridge opening, briefly explore the model, then return to the map. No location permission or checkpoint action is required to complete the recorded guide.
