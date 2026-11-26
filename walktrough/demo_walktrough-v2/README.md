# Concept Walkthrough

3D walkthrough of the arrival concept: a wide black entrance room (16 × 14 m) behind a glass door, a 50 m corridor (8 m wide, 6 m high) with a kiosk totem (2 m, 65" landscape screen, like a self-order kiosk) showing a house along each wall, and an installation in the hall at each end. Each installation is two walls, mirrored on the axis of the hall and facing each other, each with a 3 × 2 m screen: the game on one, the particle screen on the other. The halls are black; only the installation (its walls and platform) is white. The game is not playable: it runs a scripted loop (Hall B places materials, sometimes Hall A sends some), and the particles react to those choices. Both halls show the same particles.

## Open locally
Terminal in this folder: `npm run dev` (opens http://localhost:5173).
Or: VS Code → install *Live Server* → right-click `index.html` → *Open with Live Server*.

## Put online
Commit and push to `main`, then GitHub → Settings → Pages → *Deploy from a branch* → `main` / `(root)`.

## Files
- `index.html`, `style.css`: page, HUD and panels
- `main.js`: 3D scene, the two-wall installations, controls, flow
- `materials.js`: materials, bathroom drawing, scoring
- `particles.js`: placeholder for the particle wall (the real engine is in `tests/material-particles`)
- `anim.js`: placeholder animations on the screen cubes (replace with Blender / After Effects videos later)
