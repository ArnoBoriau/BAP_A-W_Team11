// The particle field: dots that move, and lines between dots that are close.
// How they move and connect comes entirely from the character `c` (the axes
// in choices.js, eased by main.js), so every in-between state exists too:
// halfway from concrete to glass is half as jittery and half as fluid.

import { noise3 } from './noise.js';

const TAU = Math.PI * 2;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

const GRID = 38; // px, cell size the dots snap to when ordered
const MAX_PARTICLES = 2200;
const ALPHA_BUCKETS = 5; // lines are batched into this many opacity levels

export function createField(ctx) {
  let w = 0;
  let h = 0;
  let n = 0;
  let x, y, vx, vy, size;

  function resize(width, height) {
    const first = !w;
    w = width;
    h = height;
    const count = Math.min(MAX_PARTICLES, Math.round((w * h) / 650));
    if (first || count !== n) seed(count);
  }

  function seed(count = n) {
    n = count;
    x = new Float32Array(n);
    y = new Float32Array(n);
    vx = new Float32Array(n);
    vy = new Float32Array(n);
    size = new Float32Array(n); // 0…1, mostly small: only `scatter` turns it into real differences
    for (let i = 0; i < n; i++) {
      x[i] = Math.random() * w;
      y[i] = Math.random() * h;
      size[i] = Math.random() ** 3;
    }
    ctx.fillStyle = '#04050a';
    ctx.fillRect(0, 0, w, h);
  }

  function step(f, t, c) {
    // f: frames elapsed (1 at 60 fps), so behaviour doesn't depend on refresh rate.
    const freq = lerp(0.0055, 0.0011, c.smooth);
    const flowTime = t * lerp(0.22, 0.05, c.smooth);
    const twist = lerp(2, 1, c.smooth);
    const speed = lerp(1.5, 0.35, c.weight) * (1 - c.order * 0.85);
    const follow = (0.015 + c.smooth * 0.11) * f;
    const jitter = c.rough * c.rough * 1.8;
    const snapChance = c.rough * 0.012 * f;
    const fall = c.weight * 0.045 * f;
    const pull = c.order * 0.035 * f;
    const damp = Math.pow(1 - lerp(0.01, 0.09, Math.max(c.rough * 0.5, c.weight * 0.45, c.order * 0.7)), f);

    for (let i = 0; i < n; i++) {
      let px = x[i];
      let py = y[i];

      // Flow: an angle field. Smooth = broad, slow, coherent; rough = tight and nervous.
      let a = noise3(px * freq, py * freq, flowTime) * TAU * twist;
      // Grain: the flow lines up in one direction (horizontal), like wood.
      a = lerp(a, noise3(px * 0.004, py * 0.03, flowTime) * 0.35, c.grain);
      vx[i] += (Math.cos(a) * speed - vx[i]) * follow;
      vy[i] += (Math.sin(a) * speed - vy[i]) * follow;

      // Roughness: constant small jitter, and now and then a sudden snap.
      if (jitter) {
        vx[i] += (Math.random() - 0.5) * jitter * f;
        vy[i] += (Math.random() - 0.5) * jitter * f;
        if (Math.random() < snapChance) {
          vx[i] += (Math.random() - 0.5) * 14 * c.rough;
          vy[i] += (Math.random() - 0.5) * 14 * c.rough;
        }
      }

      vy[i] += fall;

      // Order: pulled onto the nearest grid point.
      if (pull) {
        vx[i] += (Math.round(px / GRID) * GRID - px) * pull;
        vy[i] += (Math.round(py / GRID) * GRID - py) * pull;
      }

      vx[i] *= damp;
      vy[i] *= damp;
      px += vx[i] * f;
      py += vy[i] * f;

      // Wrap around; heavy dots that sink out of view come back at the top.
      if (px < -10) px += w + 20;
      else if (px > w + 10) px -= w + 20;
      if (py > h + 10) {
        py = -10;
        px = Math.random() * w;
      } else if (py < -10) py += h + 20;

      x[i] = px;
      y[i] = py;
    }
  }

  // Neighbour lookup for the lines: a grid with cells the size of the reach.
  const cells = new Map();
  const lineBuckets = Array.from({ length: ALPHA_BUCKETS }, () => []);
  const pairs = new Set();
  const near = [];

  function draw(c, colors) {
    // Trails: smooth leaves long traces, rough stays crisp.
    const fadeAlpha = clamp(0.06 + c.rough * 0.42 + (1 - c.smooth) * 0.12 + c.order * 0.2, 0.05, 0.6);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = `rgba(4, 5, 10, ${fadeAlpha})`;
    ctx.fillRect(0, 0, w, h);

    drawLines(c, colors);
    drawDots(c, colors);
  }

  function drawLines(c, colors) {
    const reach = lerp(26, 115, c.link) * (1 + c.soft * 0.35);
    const maxLinks = 1 + Math.round(c.link * 3);
    const alignOrder = lerp(1.01, 0.1, c.order); // max |sin| from the grid axes
    const alignGrain = lerp(1.01, 0.28, c.grain); // max |sin| from horizontal
    const reach2 = reach * reach;

    cells.clear();
    for (let i = 0; i < n; i++) {
      const key = Math.floor(x[i] / reach) * 4096 + Math.floor(y[i] / reach);
      let cell = cells.get(key);
      if (!cell) cells.set(key, (cell = []));
      cell.push(i);
    }
    for (const b of lineBuckets) b.length = 0;
    pairs.clear();

    // Each dot links to its nearest neighbours (that pass the order/grain
    // filters). Nearest, not first found: otherwise the lines trace the
    // lookup cells and the field breaks up into a regular pattern.
    for (let i = 0; i < n; i++) {
      const cx = Math.floor(x[i] / reach);
      const cy = Math.floor(y[i] / reach);
      near.length = 0;
      for (let ox = -1; ox <= 1; ox++) {
        for (let oy = -1; oy <= 1; oy++) {
          const cell = cells.get((cx + ox) * 4096 + cy + oy);
          if (!cell) continue;
          for (const j of cell) {
            if (j === i) continue;
            const dx = x[j] - x[i];
            const dy = y[j] - y[i];
            const d2 = dx * dx + dy * dy;
            if (d2 > reach2 || d2 < 0.01) continue;
            const d = Math.sqrt(d2);
            const sx = Math.abs(dx) / d;
            const sy = Math.abs(dy) / d;
            if (Math.min(sx, sy) > alignOrder) continue; // ordered: only along the grid
            if (sy > alignGrain) continue; // grain: only along the grain
            near.push(d, j);
          }
        }
      }
      // pick the closest few (small lists: selection beats sorting)
      for (let k = 0; k < maxLinks && near.length; k++) {
        let best = 0;
        for (let m = 2; m < near.length; m += 2) if (near[m] < near[best]) best = m;
        const d = near[best];
        const j = near[best + 1];
        near[best] = Infinity;
        if (d === Infinity) break;
        const key = i < j ? i * MAX_PARTICLES + j : j * MAX_PARTICLES + i;
        if (pairs.has(key)) continue;
        pairs.add(key);
        const strength = 1 - d / reach;
        lineBuckets[Math.min(ALPHA_BUCKETS - 1, Math.floor(strength * ALPHA_BUCKETS))].push(i, j, d);
      }
    }

    const [r, g, b] = colors[0];
    const maxAlpha = lerp(0.6, 0.2, c.soft);
    ctx.lineWidth = 0.5 + c.rough * 0.6 + c.soft * 0.9 + c.weight * 0.4;
    ctx.lineCap = c.rough > 0.5 ? 'butt' : 'round';
    const jagged = c.rough > c.smooth;
    const bend = jagged ? c.rough * 0.45 : c.smooth * 0.22;

    lineBuckets.forEach((list, k) => {
      if (!list.length) return;
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${(((k + 1) / ALPHA_BUCKETS) * maxAlpha).toFixed(3)})`;
      ctx.beginPath();
      for (let m = 0; m < list.length; m += 3) {
        const i = list[m];
        const j = list[m + 1];
        const d = list[m + 2];
        const mx = (x[i] + x[j]) / 2;
        const my = (y[i] + y[j]) / 2;
        // perpendicular
        const px = -(y[j] - y[i]) / d;
        const py = (x[j] - x[i]) / d;
        ctx.moveTo(x[i], y[i]);
        if (jagged) {
          // rough: a kink at a random spot, different every frame (it crackles)
          const o = (Math.random() - 0.5) * d * bend;
          ctx.lineTo(mx + px * o, my + py * o);
          ctx.lineTo(x[j], y[j]);
        } else {
          // smooth: a gentle arc, always bending the same way (it flows)
          const o = d * bend;
          ctx.quadraticCurveTo(mx + px * o, my + py * o, x[j], y[j]);
        }
      }
      ctx.stroke();
    });
  }

  function drawDots(c, colors) {
    const base = lerp(1.1, 2.2, c.soft) * lerp(1, 0.75, c.smooth) + c.weight * 0.5;
    const spread = 1 + c.scatter * 7; // largest dot vs base
    const square = c.rough > 0.45 || c.order > 0.6;

    // Colour k goes to every 4th dot. Softness: a faint halo around every dot.
    if (c.soft > 0.08) {
      for (let k = 0; k < 4; k++) {
        const [r, g, b] = colors[k];
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${(c.soft * 0.07).toFixed(3)})`;
        ctx.beginPath();
        for (let i = k; i < n; i += 4) {
          const s = base * lerp(1, spread, size[i]) * 4;
          ctx.moveTo(x[i] + s, y[i]);
          ctx.arc(x[i], y[i], s, 0, TAU);
        }
        ctx.fill();
      }
    }

    ctx.globalCompositeOperation = c.smooth > 0.7 ? 'lighter' : 'source-over';
    for (let k = 0; k < 4; k++) {
      const [r, g, b] = colors[k];
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${lerp(0.95, 0.75, c.soft).toFixed(3)})`;
      ctx.beginPath();
      for (let i = k; i < n; i += 4) {
        const s = base * lerp(1, spread, size[i]);
        if (square) ctx.rect(x[i] - s, y[i] - s, s * 2, s * 2);
        else {
          ctx.moveTo(x[i] + s, y[i]);
          ctx.arc(x[i], y[i], s, 0, TAU);
        }
      }
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  return { resize, seed: () => seed(), step, draw };
}
