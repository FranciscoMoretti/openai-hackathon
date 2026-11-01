# Wander design system

Active reference: `wander-flat-map-concept.png`, revised with the built-in Image Gen tool after the user supplied `../references/landmark-map-reference.png`. `wander-concept.png` is the superseded perspective concept. The user subsequently requested an optional perspective control while retaining top-down navigation as the default.

- Background and panels: true white `#ffffff`; primary `#193c34`; text `#24332f`; sage selection `#e9f0e9`; borders `#e5e9e5`.
- Typography: Georgia editorial headings and wordmark; system sans-serif controls, labels and body. 40px main heading, 29px story title, 15px body, 12px secondary. Mobile reduces heading/card sizes.
- Desktop: 68px header, 340px sidebar, full remaining map canvas. Flat north-up geographic map with architectural miniatures, clear streets and a preview/live location point. Story card floats near map bottom with photographic crop, title, summary and primary action. Actual geography replaces the concept's approximate geometry. Optional perspective control is explicitly user-requested.
- Mobile: compact header, horizontally scrollable landmark list, full map and compact bottom story sheet; transcript opens as a modal. No stacked desktop sidebar taking over the map.
- Images: real credited landmark photography plus `public/images/landmarks-atlas.png`, a transparent 3×2 Image Gen sprite sheet. Five miniature illustrations anchor to actual coordinates; empty sixth cell. These provide a 3D appearance on the 2D map. Concept photos are illustrative only.
- Icons: Lucide, 18–20px, 1.7px stroke, green/currentColor; compass brand is code-native SVG.
- Actions: solid green listen/location buttons, white map controls, subtle selected states, visible keyboard focus. All controls have real actions.
- Language: English-only for the hackathon. Omit the language selector shown in the earlier concept images.
- Required extensions: GPS error/status copy, narration support errors, transcript/source dialog, completion and replay states. No unsolicited automatic narration.

## Generation briefs

### Approved MVP extension: Three.js and OpenAI voice

The user approved this extension on 1 November 2026; it is the next implementation target. Preserve the flat north-up map and optional perspective preference above. Add actual stylized Three.js landmark geometry on the geographic map, beginning with one complete Big Ben experience. As the reviewed OpenAI narration explains the name, an illustrative cutaway reveals the bell. Visual cues follow audio playback time, including pause/resume/restart and landmark changes. Camera changes into perspective require an explicit user choice; reduced-motion mode uses stable views and simple highlights.

Provide reviewed English OpenAI recordings for all five landmarks. Extend the landmark treatment after the first scene works, with the London Eye next. Keep current illustrated miniatures as fallbacks. Label illustrative reconstructions and AI narration accurately. Live voice conversation remains after the MVP. See [the updated scope and acceptance criteria](../mvp.md).

### Original image assets

Built-in Image Gen was used throughout (no API credential). Active UI brief: preserve the white Wander header/sidebar/story card from the original concept; replace the tilted map with a flat north-up Westminster street map; use pale land, green parks, blue Thames, white roads, and five dimensional illustrated landmark miniatures at geographic positions. The new user-supplied tourist map informed this update. An optional perspective control was then added per the user's follow-up.

Atlas brief: transparent 1536×1024 sheet, three columns and two rows of equal square cells. Top row: Big Ben and adjoining Parliament wing; Westminster Abbey twin towers and nave; London Eye. Bottom row: St James's Park trees, lake, bridge and pelican; Trafalgar Square column, lions and fountains; empty cell. Fine pen linework, dimensional watercolor shading, natural stone cream/tan, muted green/blue, generous transparent margins, no labels or borders. Final asset: `../../public/images/landmarks-atlas.png`.
