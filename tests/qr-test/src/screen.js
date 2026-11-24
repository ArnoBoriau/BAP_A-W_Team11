// The main screen: shows the question, a small QR code to join, and the live
// votes. It owns the round; phones only send a vote and show what it says.
//
//   waiting  no phone connected; the question waits
//   asking   phones vote (and can change their mind)
//            → locks when every connected phone voted and nothing changed
//              for HOLD seconds, or when ASK_TIME runs out
//   result   the votes are frozen and shown, then the next question

import './style.css'
import QRCode from 'qrcode'
import { connect } from './socket.js'
import { QUESTIONS } from './questions.js'

const ASK_TIME = 20
const HOLD = 2
const READ_TIME = 3 // no early lock before this
const RESULT_TIME = 5

const $ = (s) => document.querySelector(s)
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
  qr: $('#qr'),
  joinUrl: $('#join-url'),
}

// ---- state -----------------------------------------------------------------

const phones = new Set() // ids of connected phones
const r = {
  phase: 'waiting',
  index: 0,
  elapsed: 0,
  still: 0, // how long everyone has voted without a change
  phaseTime: 0,
  votes: new Map(), // phone id → 'A' | 'B', for the current question
  result: null, // { A, B } frozen at lock
}
let connected = false

function tally() {
  const t = { A: 0, B: 0 }
  for (const c of r.votes.values()) t[c]++
  return t
}

function everyoneVoted() {
  if (phones.size === 0) return false
  for (const id of phones) if (!r.votes.has(id)) return false
  return true
}

function next() {
  r.index = (r.index + 1) % QUESTIONS.length
  r.phase = 'waiting'
  r.elapsed = 0
  r.still = 0
  r.votes.clear()
  r.result = null
}

function lock() {
  r.phase = 'result'
  r.phaseTime = 0
  r.result = tally()
}

function update(dt) {
  r.phaseTime += dt

  if (r.phase === 'result') {
    if (r.phaseTime > RESULT_TIME) next()
    return
  }

  if (phones.size === 0) {
    // everyone left: the question starts over for the next group
    if (r.phase !== 'waiting') r.votes.clear()
    r.phase = 'waiting'
    r.elapsed = 0
    r.still = 0
    return
  }

  if (r.phase === 'waiting') {
    r.phase = 'asking'
    r.phaseTime = 0
  }

  r.elapsed += dt
  r.still = everyoneVoted() ? r.still + dt : 0
  if ((r.still >= HOLD && r.elapsed >= READ_TIME) || r.elapsed >= ASK_TIME) lock()
}

// ---- connection ------------------------------------------------------------

const socket = connect({ role: 'screen' }, {
  open() {
    connected = true
  },
  close() {
    connected = false
    phones.clear()
  },
  message(msg) {
    if (msg.type === 'hello') {
      msg.phones.forEach((id) => phones.add(id))
      showJoin(msg.url)
    } else if (msg.type === 'join') phones.add(msg.id)
    else if (msg.type === 'leave') phones.delete(msg.id)
    else if (msg.type === 'vote') {
      // a vote for an older question, or after the lock, doesn't count
      if (r.phase !== 'asking' || msg.index !== r.index) return
      if (r.votes.get(msg.id) !== msg.choice) {
        r.votes.set(msg.id, msg.choice)
        r.still = 0
      }
    }
  },
})

function showJoin(url) {
  el.joinUrl.textContent = url.replace(/^https?:\/\//, '')
  QRCode.toCanvas(el.qr, url, {
    width: 132,
    margin: 1,
    color: { dark: '#0b0c10', light: '#f1efe9' },
  })
}

// Tell the phones what to show, but only when something they show changed.
let lastSent = ''
function broadcast() {
  const q = QUESTIONS[r.index]
  const state = {
    type: 'state',
    phase: r.phase,
    index: r.index,
    total: QUESTIONS.length,
    question: q.text,
    a: q.a,
    b: q.b,
    winner: r.result ? leader(r.result) : null,
    picks: Object.fromEntries(r.votes),
  }
  const key = JSON.stringify(state)
  if (key === lastSent) return
  lastSent = key
  socket.send(state)
}

// ---- drawing ---------------------------------------------------------------

function render() {
  const q = QUESTIONS[r.index]
  const result = r.phase === 'result'
  const t = result ? r.result : tally()
  const winner = result ? leader(r.result) : null

  el.step.textContent = `Question ${r.index + 1} / ${QUESTIONS.length}`
  el.question.textContent = q.text
  el.answerA.textContent = q.a
  el.answerB.textContent = q.b
  el.countA.textContent = votes(t.A)
  el.countB.textContent = votes(t.B)

  document.body.classList.toggle('result', result)
  el.sideA.classList.toggle('won', winner === 'A')
  el.sideA.classList.toggle('lost', winner === 'B')
  el.sideB.classList.toggle('won', winner === 'B')
  el.sideB.classList.toggle('lost', winner === 'A')

  let status = ''
  let progress = 0
  if (!connected) status = 'Connecting…'
  else if (r.phase === 'waiting') status = 'Scan the code to join'
  else if (r.phase === 'asking') {
    progress = r.elapsed / ASK_TIME
    const missing = phones.size - [...phones].filter((id) => r.votes.has(id)).length
    if (missing > 0) status = `${votes(t.A + t.B)} · waiting for ${missing} more`
    else status = 'Everyone voted. Locking in…'
  } else if (result) {
    progress = 1 - r.phaseTime / RESULT_TIME
    if (!winner) status = t.A + t.B === 0 ? 'No votes' : "It's a tie"
    else status = `${winner === 'A' ? q.a : q.b} it is`
  }
  el.status.textContent = status
  el.bar.style.width = `${Math.max(0, Math.min(1, progress)) * 100}%`
}

// ---- loop ------------------------------------------------------------------

let last = performance.now()
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.1)
  last = now
  if (connected) update(dt)
  render()
  broadcast()
  requestAnimationFrame(frame)
}
requestAnimationFrame(frame)

// ---- keys ------------------------------------------------------------------
//   space  lock now / next question
//   R      restart from the first question
//   Q      hide / show the QR code
//   F      fullscreen

window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase()
  if (k === ' ') {
    e.preventDefault()
    if (r.phase === 'result') next()
    else lock()
  } else if (k === 'r') {
    r.index = -1
    next()
  } else if (k === 'q') document.body.classList.toggle('hide-join')
  else if (k === 'f') {
    if (document.fullscreenElement) document.exitFullscreen()
    else document.documentElement.requestFullscreen().catch(() => {})
  }
})

// ---- helpers ---------------------------------------------------------------

function leader(t) {
  if (!t || t.A === t.B) return null
  return t.A > t.B ? 'A' : 'B'
}

function votes(n) {
  return n === 1 ? '1 vote' : `${n} votes`
}
