# Concept Walkthrough

3D walkthrough of the arrival concept: a wide black entrance room (16 × 14 m) behind a glass door, a 50 m corridor (8 m wide, 6 m high) with a kiosk totem (2 m, 65" landscape screen, like a self-order kiosk) showing a house along each wall, and an installation in the hall at each end. Each installation is two walls, mirrored on the axis of the hall and facing each other 6 m apart (6.6 m wide in all, within the 7 m available), each with a 3 × 2 m screen: the game on one, the particle screen on the other, joined by a flat roof on top. The halls are black, and so is the installation, in a charcoal a step lighter so it still stands out; only its platform is white. The game is not playable: the screens show what the real PoC (`demo/proof-of-concept-v3`) looks like, played by a scripted loop: one hall picks a material and sends it, the other puts it on a part of the house (facade, roof, terrace, front door), the roles swap. When the house is finished it moves to the two kiosks in the corridor, where it turns slowly. The particles react to those choices; both halls show the same particles.

## Open locally
Terminal in this folder: `npm run dev` (opens http://localhost:5173).
Or: VS Code → install *Live Server* → right-click `index.html` → *Open with Live Server*.

## Put online
Commit and push to `main`, then GitHub → Settings → Pages → *Deploy from a branch* → `main` / `(root)`.

## Files
- `index.html`, `style.css`: page, HUD and panels
- `main.js`: 3D scene, the installations (two walls and a roof), controls, flow
- `catalogue.js`, `catalogue.data.js`: a selection of the real PoC's materials (same rows), categories, the parts of the house
- `textures/`: the real PoC's texture painters, copied (`demo/proof-of-concept-v3/src/textures`), so the materials look the same
- `house3d.js`: the 3D house (a part not filled in yet is a line drawing), rendered into the kiosk and game screens
- `particles.js`: placeholder for the particle wall (the real engine is in `tests/material-particles`)
- `anim.js`: placeholder animations on the screen cubes (replace with Blender / After Effects videos later)
