# Test me

One hall chooses a material (full screen, no room), the other puts it in the room. Roles swap every turn.

First time: `npm install`

## One Mac (split screen)

`npm run dev` → open the link → **This Mac** → **Open both windows**.

## Two MacBooks

`npm run dev:lan` on MacBook 1 → open `https://localhost:5173` → **Two MacBooks** → **Open player A**.
Open the link the launcher shows on MacBook 2.

Both screens wait until both players stand in front of them (close, facing the screen, still for a
moment). The other screen pulses to call its player over. Testing alone? Press **P** in a window to
pretend someone is there.

No second person? Stand at one screen and wait 6 s: the computer joins as the other hall. Close the
other window mid-game and the computer takes over; open it again and that person takes over back.

Browser says "not private"? Click through it (needed for the camera).
"Can't reach the server"? Same Wi-Fi? Otherwise use a phone hotspot.
