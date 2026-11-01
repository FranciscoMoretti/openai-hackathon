/** Semantic stops for the live guide. These have no audio timestamps. */
export const checkpointIds = ['construction', 'opening', 'legacy'] as const;
export type CheckpointId = typeof checkpointIds[number];
export const tourStops = [
  { id: 'construction', animation: 'construction', title: 'A bridge takes shape', era: '1886–1894', detail: 'Steel beneath the stone',
    notes: 'In 1876 London needed a crossing east of London Bridge, but tall ships still needed access to the upstream docks. Construction began in 1886 and lasted eight years. Foundations and piers support a steel framework clad in stone. The towers look medieval but conceal Victorian engineering. The high-level walkways connect the towers; they do not lift. The roadway between the towers has two moving sections.',
    direction: 'The construction animation runs for 12 seconds from your first words: foundations, steel towers, stone cladding, then the deck. Use only 25–35 words total. Start with “Watch Tower Bridge rise.” Give the river-crossing dilemma in one short sentence, point out the steel beneath the stone, and say they can interrupt. No separate welcome, date list, or lengthy explanation. Then finish so the roadway demonstration can begin.' },
  { id: 'opening', animation: 'bridge_opening', title: 'Make way for the river', era: '1894', detail: 'The moving roadway',
    notes: 'Tower Bridge opened in June 1894. The two moving roadway sections are called bascules, from the French word for seesaw. Counterbalanced around pivots, they rise to let tall ships pass. The upper walkways stay fixed. The river remains open while road traffic waits.',
    direction: 'The app starts the bridge-opening animation when you speak. Explain the bascules and counterbalances as the road rises. Make the river-crossing dilemma feel resolved.' },
  { id: 'legacy', animation: 'power_change', title: 'Look again', era: '1976 → Today', detail: 'A familiar bridge, changed',
    notes: 'In 1976 electric pumps replaced the steam-powered hydraulic system. The working fluid changed from water to oil; the hydraulic principle remained. In 1977 the older chocolate-brown paint gave way to red, white and blue for Queen Elizabeth II’s Silver Jubilee. The need to keep the river open has endured.',
    direction: 'The app starts the power-change animation when you speak. End with the continuity of the river and a warm invitation to keep talking about anything the visitor is curious about. This is the final stop; do not restart the tour.' },
] as const;
