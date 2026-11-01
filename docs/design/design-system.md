# Wander interface

The attraction is the main experience. The app opens on the Tower Bridge tour, with a map available through the header. One root application and build serve both views. Earlier concept images are historical design references, not alternative applications.

## Tour

Large Three.js scene, compact attraction header, narration player and numbered timeline checkpoints. Desktop has a slim chapter rail; mobile uses a chapter sheet. A period overlay remains visible during narration, pause and exploration. Options contain sources, transcript, sound, restart and motion preference. The guide integration may add a contextual question control without replacing the recorded journey.

The scene follows actual recording time. The user does not have to click anything after Play. Camera exploration and optional guide questions must not lose the saved tour position. Architecture, movement, historical changes and the explanation itself are the primary areas for iteration.

## Map

Secondary discovery screen for Tower Bridge. Top-down by default, with optional perspective. One landmark preview, actual geographic position, optional device location and a single Open the tour action. Preview location is explicitly labeled. Do not imply walking directions or GPS alignment in the 3D scene.

## Visual language

White app chrome, forest-green text and controls, pale sage 3D setting, subtle brass accents. Serif chapter and attraction headings; legible sans-serif controls. Responsive layouts prioritize model visibility and primary playback. No large introductory panel on the tour screen.

## Active files

- src/App.tsx and src/app-navigation.css: navigation and map preview.
- src/tour/tour-shell.ts and tour-shell.css: presentation around the tour.
- src/tour/main.ts, model.ts, machinery.ts and timeline.ts: guided attraction.
- docs/design/tower-bridge-concept.png: visual concept, not an implementation screenshot.
