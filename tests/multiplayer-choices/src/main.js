import './style.css'
import { startTracking } from './tracking.js'
import { createSim } from './sim.js'
import { createPlayers, KEYPOINTS } from './players.js'
import { createRound, ASK_TIME, HOLD, READ_TIME, RESULT_TIME } from './round.js'
import { QUESTIONS } from './questions.js'

const $ = (s) => document.querySelector(s)
const canvas = $('#stage')
const ctx = canvas.getContext('2d')
const video = $('#camera')
const el = {
  step: $('#step'),
  question: $('#question'),
  sideA: $('#side-a'),
  sideB: $('#side-b'),
  answerA: $('#answer-a'),
  answerB: $('#answer-b'),
  countA: $('#count-a'),
  countB: $('#count-b'),
  status: $('#status'),
  bar: $('#timer-bar'),
}

const css = getComputedStyle(document.documentElement)
const COLOR = { A: css.getPropertyValue('--a').trim(), B: css.getPropertyValue('--b').trim(), none: '#8a8a86' }

const players = createPlayers()
const round = createRound(QUESTIONS)

// ---- input: camera, or fake people with ?sim=N ---------------------------

let tracker = null
let trackerStatus = 'Starting camera…'
const simCount = Number(new URLSearchParams(location.search).get('sim'))

if (simCount > 0) {
  tracker = createSim(Math.min(simCount, 6))
} else {
  startTracking(video, (s) => (trackerStatus = s))
    .then((t) => {
      tracker = t
      trackerStatus = ''
    })
    .catch((err) => (trackerStatus = `Camera or model failed: ${err.message}`))
}

// ---- drawing ---------------------------------------------------------------

let W = 0
let H = 0
function resize() {
  const dpr = Math.min(window.devicePixelRatio, 2)
  W = window.innerWidth
  H = window.innerHeight
  canvas.width = W * dpr
  canvas.height = H * dpr
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
}
window.addEventListener('resize', resize)
resize()

// The camera image "covers" the screen (like CSS object-fit: cover), so the
// middle of the frame is the middle of the screen, and the A/B line matches.
function mapper(vw, vh) {
  const s = Math.max(W / vw, H / vh)
  return (nx, ny) => [(nx - 0.5) * vw * s + W / 2, (ny - 0.5) * vh * s + H / 2]
}

function drawHalves(state, tally) {
  const result = state.phase === 'result'
  const winner = result ? leader(state.votes) : null
  for (const side of ['A', 'B']) {
    const x = side === 'A' ? 0 : W / 2
    const share = players.count ? tally[side] / players.count : 0
    let alpha = 0.04 + share * 0.1
    if (result) alpha = winner === side ? 0.2 : winner ? 0.02 : 0.1
    ctx.fillStyle = withAlpha(COLOR[side], alpha)
    ctx.fillRect(x, 0, W / 2, H)
  }

  // the line people cross, and the dead zone around it
  if (tracker?.width) {
    const toScreen = mapper(tracker.width, tracker.height)
    const [l] = toScreen(0.5 - players.DEAD_ZONE, 0)
    const [r] = toScreen(0.5 + players.DEAD_ZONE, 0)
    ctx.fillStyle = 'rgba(255,255,255,0.025)'
    ctx.fillRect(l, 0, r - l, H)
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'
  ctx.setLineDash([6, 10])
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(W / 2, 0)
  ctx.lineTo(W / 2, H)
  ctx.stroke()
  ctx.setLineDash([])
}

function drawPlayers() {
  if (!tracker?.width) return
  const toScreen = mapper(tracker.width, tracker.height)
  const bones = tracker.connections ?? []
  const min = players.MIN_CONFIDENCE

  for (const p of players.list) {
    const color = COLOR[p.side ?? 'none']
    const j = p.joints
    const pt = (i) => toScreen(j[i * 3], j[i * 3 + 1])

    ctx.strokeStyle = color
    ctx.lineWidth = 4
    ctx.lineCap = 'round'
    ctx.beginPath()
    for (const [a, b] of bones) {
      if (j[a * 3 + 2] < min || j[b * 3 + 2] < min) continue
      const [ax, ay] = pt(a)
      const [bx, by] = pt(b)
      ctx.moveTo(ax, ay)
      ctx.lineTo(bx, by)
    }
    ctx.stroke()

    ctx.fillStyle = color
    for (let i = 0; i < KEYPOINTS; i++) {
      if (j[i * 3 + 2] < min) continue
      const [x, y] = pt(i)
      ctx.beginPath()
      ctx.arc(x, y, i === 0 ? 9 : 4, 0, Math.PI * 2)
      ctx.fill()
    }

    // a marker on the floor where we read their place from
    const [fx] = toScreen(p.x, 0)
    ctx.beginPath()
    ctx.ellipse(fx, H - 40, 28, 7, 0, 0, Math.PI * 2)
    ctx.fill()
  }
}

// ---- UI text ---------------------------------------------------------------

function updateText(state, tally) {
  const q = state.question
  el.step.textContent = `Question ${state.index + 1} / ${QUESTIONS.length}`
  el.question.textContent = q.text
  el.answerA.textContent = q.a
  el.answerB.textContent = q.b

  const result = state.phase === 'result'
  const a = result ? state.votes.A : tally.A
  const b = result ? state.votes.B : tally.B
  el.countA.textContent = people(a)
  el.countB.textContent = people(b)

  document.body.classList.toggle('result', result)
  const winner = result ? leader(state.votes) : null
  el.sideA.classList.toggle('won', winner === 'A')
  el.sideA.classList.toggle('lost', winner === 'B')
  el.sideB.classList.toggle('won', winner === 'B')
  el.sideB.classList.toggle('lost', winner === 'A')

  let status = ''
  let progress = 0
  if (trackerStatus) status = trackerStatus
  else if (state.phase === 'waiting') status = 'Step in front of the screen'
  else if (state.phase === 'asking') {
    progress = state.elapsed / ASK_TIME
    if (tally.none > 0) status = 'Walk to a side: left is A, right is B'
    else if (state.still > 0.3 && state.elapsed >= READ_TIME - HOLD)
      status = `Everyone chose. Locking in ${Math.ceil(Math.max(HOLD - state.still, READ_TIME - state.elapsed))}…`
    else status = 'Change your mind? Walk to the other side'
  } else if (result) {
    progress = 1 - state.phaseTime / RESULT_TIME
    if (!winner) status = a + b === 0 ? 'No votes' : "It's a tie"
    else status = `${winner === 'A' ? q.a : q.b} it is`
  }
  el.status.textContent = status
  el.bar.style.width = `${Math.max(0, Math.min(1, progress)) * 100}%`
}

// ---- loop ------------------------------------------------------------------

let last = performance.now()
function frame(nowMs) {
  const dt = Math.min((nowMs - last) / 1000, 0.1)
  last = nowMs
  const now = nowMs / 1000

  if (tracker?.width) players.update(tracker.poses, tracker.width, tracker.height, now, dt)
  if (!trackerStatus) round.update(players, dt)

  const tally = players.tally()
  ctx.fillStyle = '#0b0c10'
  ctx.fillRect(0, 0, W, H)
  drawHalves(round.state, tally)
  drawPlayers()
  updateText(round.state, tally)

  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)

// ---- keys ------------------------------------------------------------------
//   space  lock the answer now / next question
//   R      restart from the first question
//   V      small camera preview (to check the tracking)
//   F      fullscreen

window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase()
  if (k === ' ') {
    e.preventDefault()
    round.skip(players)
  } else if (k === 'r') round.restart()
  else if (k === 'v') document.body.classList.toggle('show-camera')
  else if (k === 'f') {
    if (document.fullscreenElement) document.exitFullscreen()
    else document.documentElement.requestFullscreen().catch(() => {})
  }
})

// ---- helpers ---------------------------------------------------------------

function leader(votes) {
  if (!votes || votes.A === votes.B) return null
  return votes.A > votes.B ? 'A' : 'B'
}

function people(n) {
  return n === 1 ? '1 person' : `${n} people`
}

function withAlpha(hex, a) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}
