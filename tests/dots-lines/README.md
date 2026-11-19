# Dots & lines

Particle visuals that answer a user's choice. Everything is dots, plus lines between dots that are
close. Each choice gives the particles a **character**, a few behaviour axes (0…1). When the
choice changes, the particles ease into the new character.

| Axis | What the particles do |
| --- | --- |
| roughness | jitter and sudden snaps, square dots, jagged lines that crackle |
| smoothness | follow one broad, coherent flow; long trails, gently arcing lines |
| softness | bigger dots with a halo; fainter lines that reach further |
| weight | slower; sink down and come back at the top |
| order | snap to a grid; lines only along the grid |
| grain | flow runs one way (horizontal); lines run along it |
| lines | how readily dots connect |
| scatter | how much dot sizes differ |

Choices (`src/choices.js`): concrete, oak, glass, plaster, tiles, terrazzo, the materials from the
proof of concept. The particles only answer choices; they don't react to the mouse.

The sliders (top left) show the character as it moves, and you can set any axis by hand.

## Run

```bash
npm install
npm run dev
```

`?c=glass` starts on a choice. Keys: `1–6` choice · `space` pause ·
`r` reseed · `f` fullscreen · `s` save PNG · `h` hide controls.

## Files

- `src/choices.js`: the choices and their characters. Add a choice = add an entry.
- `src/sim.js`: the particles: movement, lines (nearest neighbours) and dots.
- `src/main.js`: easing between characters, UI and keys.
- `src/noise.js`: the value noise behind the flow field.
