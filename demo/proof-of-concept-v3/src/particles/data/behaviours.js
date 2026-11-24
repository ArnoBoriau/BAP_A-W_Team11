// The seven spatial behaviours: the architectural meaning visitors read from
// the animation. Each one has its own base pattern (engine/patterns.js,
// board step 5). Texts from the board's "Animation rules" table.

export const BEHAVIOURS = {
  // v3: not one of the board's seven. A material without a place yet has no
  // behaviour: it's only its characteristics, filling the screen.
  material: {
    label: 'No place yet',
    meaning: 'Only the material: its characteristics, without a form.',
    rule: 'Wait for a place.',
  },
  filtering: {
    label: 'Filtering',
    meaning: 'Lets light, views, air and movement through, while changing them.',
    rule: 'Let information pass through.',
  },
  enclosing: {
    label: 'Enclosing',
    meaning: 'Creates shelter and boundaries.',
    rule: 'Create boundaries.',
  },
  connecting: {
    label: 'Connecting',
    meaning: 'Links people, spaces, things and functions.',
    rule: 'Create links between clusters.',
  },
  directing: {
    label: 'Directing',
    meaning: 'Guides movement, attention and space.',
    rule: 'Create directional movement.',
  },
  supporting: {
    label: 'Supporting',
    meaning: 'Carries, structures and stabilises.',
    rule: 'Create stable foundations.',
  },
  reflecting: {
    label: 'Reflecting',
    meaning: 'Bounces back light, sound and views.',
    rule: 'Duplicate, mirror or echo existing forms and movements.',
  },
  layering: {
    label: 'Layering',
    meaning: 'Creates depth, transition and hierarchy.',
    rule: 'Stack, overlap and create depth between multiple elements.',
  },
}
