import * as THREE from 'three'

// A kinetic facade: a wall of square pillars. The body is turned into a soft
// "height field" (capsules around every bone, blended together with a smooth
// minimum, so limbs flow into the torso like clay). Pillars inside the body
// push out; movement sends ripples across the wall (a simple wave equation).

const ROWS = 72 // pillars from top to bottom; columns follow the screen ratio
const GAP = 0.86 // pillar width as a fraction of the cell — the rest is shadow line
const RELIEF = 0.32 // how far the body pushes out (scene units, screen height = 2)
const MIN_CONFIDENCE = 0.25

const WAVE_SPEED = 0.28 // ≤ 0.5 to stay stable
const WAVE_DAMPING = 0.975
const WAVE_DRIVE = 0.55 // how strongly movement creates ripples

export function createFacade(scene) {
  const material = new THREE.MeshStandardMaterial({
    color: '#e8e3da',
    roughness: 0.82,
    metalness: 0,
  })
  // unit box with its back at z = 0, so scaling z extrudes it towards us
  const geometry = new THREE.BoxGeometry(1, 1, 1).translate(0, 0, 0.5)

  let mesh = null
  let cols = 0
  let cell = 0
  let width = 0
  let cx, cy // cell centres
  let relief, wave, wavePrev, lastTarget, target

  function build(aspect) {
    if (mesh) {
      scene.remove(mesh)
      mesh.dispose()
    }
    width = 2 * aspect
    cell = 2 / ROWS
    cols = Math.ceil(width / cell)
    const n = cols * ROWS

    cx = new Float32Array(n)
    cy = new Float32Array(n)
    relief = new Float32Array(n)
    wave = new Float32Array(n)
    wavePrev = new Float32Array(n)
    lastTarget = new Float32Array(n)
    target = new Float32Array(n)

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c
        cx[i] = (c + 0.5) * cell - (cols * cell) / 2
        cy[i] = 1 - (r + 0.5) * cell
      }
    }

    mesh = new THREE.InstancedMesh(geometry, material, n)
    mesh.castShadow = true
    mesh.receiveShadow = true
    mesh.frustumCulled = false
    scene.add(mesh)
  }

  // ---- body → bones ---------------------------------------------------------

  let bones = null
  const people = []

  function buildBones(names, connections) {
    const idx = (n) => names.indexOf(n)
    const torso = new Set(['left_shoulder', 'right_shoulder', 'left_hip', 'right_hip'])
    const face = new Set(['left_eye', 'right_eye', 'left_ear', 'right_ear', 'nose',
      'left_eye_inner', 'left_eye_outer', 'right_eye_inner', 'right_eye_outer', 'mouth_left', 'mouth_right'])
    const list = []
    for (const [a, b] of connections) {
      if (face.has(names[a]) || face.has(names[b])) continue // the head gets one round volume instead
      list.push({ a, b, radius: torso.has(names[a]) && torso.has(names[b]) ? 0.3 : 0.17 })
    }
    const [ls, rs, lh, rh, nose] = ['left_shoulder', 'right_shoulder', 'left_hip', 'right_hip', 'nose'].map(idx)
    if (ls >= 0 && rh >= 0) list.push({ a: ls, b: rh, radius: 0.42 })
    if (rs >= 0 && lh >= 0) list.push({ a: rs, b: lh, radius: 0.42 })
    if (nose >= 0) list.push({ a: nose, b: nose, radius: 0.42, lift: 0.08 })
    return list
  }

  function trackPeople(poses, connections, toWorld, dt) {
    if (!bones && poses[0]) bones = buildBones(poses[0].keypoints.map((k) => k.name), connections)
    const follow = 1 - Math.pow(0.001, dt)
    for (let p = 0; p < poses.length; p++) {
      const kps = poses[p].keypoints
      const person = (people[p] ??= {
        pts: new Float32Array(kps.length * 2),
        conf: new Float32Array(kps.length),
        scale: 0.3,
        fresh: true,
      })
      for (let k = 0; k < kps.length; k++) {
        const [x, y] = toWorld(kps[k].x, kps[k].y)
        const ok = kps[k].confidence > MIN_CONFIDENCE
        if (ok && (person.fresh || person.conf[k] <= MIN_CONFIDENCE)) {
          person.pts[k * 2] = x
          person.pts[k * 2 + 1] = y
        } else if (ok) {
          person.pts[k * 2] += (x - person.pts[k * 2]) * follow
          person.pts[k * 2 + 1] += (y - person.pts[k * 2 + 1]) * follow
        }
        person.conf[k] = kps[k].confidence
      }
      person.fresh = false
      person.scale += (bodyScale(person, kps) - person.scale) * follow
    }
    people.length = poses.length
  }

  // Signed distance from (x, y) to the blended body of one person (< 0 = inside).
  function bodyDistance(person, x, y) {
    const k = 0.09 * person.scale // blend size: larger = more clay-like
    let d = 1e9
    for (const bone of bones) {
      if (person.conf[bone.a] <= MIN_CONFIDENCE || person.conf[bone.b] <= MIN_CONFIDENCE) continue
      const lift = (bone.lift ?? 0) * person.scale
      const ax = person.pts[bone.a * 2]
      const ay = person.pts[bone.a * 2 + 1] + lift
      const bx = person.pts[bone.b * 2]
      const by = person.pts[bone.b * 2 + 1] + lift
      const di = segmentDistance(x, y, ax, ay, bx, by) - bone.radius * person.scale
      d = smin(d, di, k)
    }
    return d
  }

  // ---- per frame ------------------------------------------------------------

  function update(poses, connections, toWorld, time, dt) {
    if (!mesh) return
    if (toWorld) trackPeople(poses, connections, toWorld, dt)
    else people.length = 0

    const n = cols * ROWS
    target.fill(0)

    // Relief of every person, only evaluated inside their bounding box.
    if (bones) {
      for (const person of people) {
        const box = bounds(person, 0.6 * person.scale)
        if (!box) continue
        const c0 = Math.max(0, Math.floor((box.x0 + (cols * cell) / 2) / cell))
        const c1 = Math.min(cols - 1, Math.ceil((box.x1 + (cols * cell) / 2) / cell))
        const r0 = Math.max(0, Math.floor((1 - box.y1) / cell))
        const r1 = Math.min(ROWS - 1, Math.ceil((1 - box.y0) / cell))
        const depth = 0.32 * person.scale // distance from the edge to full height
        for (let r = r0; r <= r1; r++) {
          for (let c = c0; c <= c1; c++) {
            const i = r * cols + c
            const d = bodyDistance(person, cx[i], cy[i])
            if (d >= 0) continue
            const x = Math.min(-d / depth, 1)
            const h = Math.sqrt(x * (2 - x)) // round profile, like a pillow
            if (h > target[i]) target[i] = h
          }
        }
      }
    }

    // Wave equation on the grid: changes in the relief start ripples.
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c
        const u = wave[i]
        const l = c > 0 ? wave[i - 1] : u
        const rt = c < cols - 1 ? wave[i + 1] : u
        const up = r > 0 ? wave[i - cols] : u
        const dn = r < ROWS - 1 ? wave[i + cols] : u
        const lap = l + rt + up + dn - 4 * u
        const drive = (target[i] - lastTarget[i]) * WAVE_DRIVE
        wavePrev[i] = (2 * u - wavePrev[i] + WAVE_SPEED * lap) * WAVE_DAMPING + drive
      }
    }
    ;[wave, wavePrev] = [wavePrev, wave]
    lastTarget.set(target)

    // Write the instance matrices directly (scale x/y/z + position).
    const m = mesh.instanceMatrix.array
    const w = cell * GAP
    const ease = 1 - Math.pow(0.002, dt)
    for (let i = 0; i < n; i++) {
      relief[i] += (target[i] - relief[i]) * ease
      // the empty wall breathes very slowly
      const idle = 0.012 * (1 + Math.sin(cx[i] * 2.3 + time * 0.35) * Math.cos(cy[i] * 1.9 - time * 0.27))
      const h = Math.max(0.004, idle + relief[i] * RELIEF + wave[i] * RELIEF * 0.5)
      const o = i * 16
      m[o] = w; m[o + 1] = 0; m[o + 2] = 0; m[o + 3] = 0
      m[o + 4] = 0; m[o + 5] = w; m[o + 6] = 0; m[o + 7] = 0
      m[o + 8] = 0; m[o + 9] = 0; m[o + 10] = h; m[o + 11] = 0
      m[o + 12] = cx[i]; m[o + 13] = cy[i]; m[o + 14] = 0; m[o + 15] = 1
    }
    mesh.instanceMatrix.needsUpdate = true
  }

  return {
    build,
    update,
    get width() {
      return width
    },
    hasPeople: () => people.length > 0,
  }
}

// ---- helpers ----------------------------------------------------------------

function segmentDistance(px, py, ax, ay, bx, by) {
  const dx = bx - ax
  const dy = by - ay
  const len2 = dx * dx + dy * dy
  const t = len2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0
  return Math.hypot(px - ax - dx * t, py - ay - dy * t)
}

// polynomial smooth minimum: blends two shapes into one
function smin(a, b, k) {
  const h = Math.max(k - Math.abs(a - b), 0) / k
  return Math.min(a, b) - h * h * k * 0.25
}

function bounds(person, margin) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (let k = 0; k < person.conf.length; k++) {
    if (person.conf[k] <= MIN_CONFIDENCE) continue
    const x = person.pts[k * 2]
    const y = person.pts[k * 2 + 1]
    if (x < x0) x0 = x
    if (x > x1) x1 = x
    if (y < y0) y0 = y
    if (y > y1) y1 = y
  }
  if (x0 === Infinity) return null
  return { x0: x0 - margin, y0: y0 - margin, x1: x1 + margin, y1: y1 + margin }
}

// Rough body size in scene units, so near and far people get the same proportions.
function bodyScale(person, kps) {
  const find = (name) => kps.findIndex((k) => k.name === name)
  const dist = (a, b) =>
    a >= 0 && b >= 0 && person.conf[a] > MIN_CONFIDENCE && person.conf[b] > MIN_CONFIDENCE
      ? Math.hypot(person.pts[a * 2] - person.pts[b * 2], person.pts[a * 2 + 1] - person.pts[b * 2 + 1])
      : 0
  const shoulders = dist(find('left_shoulder'), find('right_shoulder'))
  const torso = Math.max(dist(find('left_shoulder'), find('left_hip')), dist(find('right_shoulder'), find('right_hip')))
  const s = Math.max(shoulders, torso * 0.65)
  return s > 0.02 ? s : person.scale
}
