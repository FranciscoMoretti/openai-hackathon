/** Semantic stops for the live guide. These have no audio timestamps. */
export const checkpointIds = ['river', 'construction', 'opening', 'legacy'] as const;
export type CheckpointId = typeof checkpointIds[number];
export const tourStops = [
  { id: 'river', title: 'A river without a crossing', era: '1876', detail: 'The river comes first',
    notes: 'In 1876 London needed another crossing east of London Bridge. Tall ships still needed access to the upstream docks and warehouses. Explain the tension between road traffic and river traffic. Invite the visitor to imagine this stretch of Thames before Tower Bridge. Save the engineering solution for the later stops.',
    direction: 'Begin with a brief personal welcome only on the first visit. Say the visitor can interrupt you at any time. Set up the river-crossing dilemma. Do not ask a question that requires an answer; the tour continues naturally.' },
  { id: 'construction', title: 'A bridge takes shape', era: '1886–1894', detail: 'Steel beneath the stone',
    notes: 'Construction began in 1886 and lasted eight years. Foundations and piers support a steel framework clad in stone. The towers look medieval but conceal Victorian engineering. The high-level walkways connect the towers; they do not lift. The roadway between the towers has two moving sections.',
    direction: 'Use play_animation construction once, then explain the steel hidden beneath the castle-like stone exterior. Draw attention to the high walkways.' },
  { id: 'opening', title: 'Make way for the river', era: '1894', detail: 'The moving roadway',
    notes: 'Tower Bridge opened in June 1894. The two moving roadway sections are called bascules, from the French word for seesaw. Counterbalanced around pivots, they rise to let tall ships pass. The upper walkways stay fixed. The river remains open while road traffic waits.',
    direction: 'Use play_animation bridge_opening once. Explain the bascules and counterbalances as the road rises. Make the river-crossing dilemma feel resolved.' },
  { id: 'legacy', title: 'Look again', era: '1976 → Today', detail: 'A familiar bridge, changed',
    notes: 'In 1976 electric pumps replaced the steam-powered hydraulic system. The working fluid changed from water to oil; the hydraulic principle remained. In 1977 the older chocolate-brown paint gave way to red, white and blue for Queen Elizabeth II’s Silver Jubilee. The need to keep the river open has endured.',
    direction: 'Use play_animation power_change once if helpful. End with the continuity of the river and a warm invitation to keep talking about anything the visitor is curious about. This is the final stop; do not restart the tour.' },
] as const;
