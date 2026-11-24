// Material particles: the side-screen animation for a move in the game.
//
//   move (ids) → resolve (behaviour + characteristics + numbers)
//              → build (pattern × structure) → motion → canvas
//
// See README.md for how this maps onto the board's steps 1–8.

import './style.css'
import { MATERIALS, MATERIALS_BY_ID } from './data/materials.js'
import { ROOMS, ROOMS_BY_ID } from './data/rooms.js'
import { explain, resolve } from './engine/resolve.js'
import { moveFromUrl, onMove, sendMove } from './input.js'
import { createRenderer } from './render/canvas.js'

const IDLE_MS = 3000
const $ = (s) => document.querySelector(s)

const renderer = createRenderer($('#stage'))
let clock = 0
// ?at=8: show the first move as it is 8 s in (skips the morph: screenshots, tuning)
let skipAhead = Number(new URLSearchParams(location.search).get('at')) || 0

function show(move) {
  let recipe
  try {
    recipe = resolve(move)
  } catch (err) {
    console.warn(err.message)
    return
  }
  renderer.show(recipe, clock - skipAhead)
  skipAhead = 0
  const e = explain(recipe)
  $('#trace-input').textContent = e.input
  $('#trace-behaviour').textContent = e.behaviour
  $('#trace-expression').textContent = e.expression
  syncPicker(move)
}

// ---- the test picker: make a move by hand -----------------------------------

const ui = {
  room: $('#room'),
  element: $('#element'),
  material: $('#material'),
  version: $('#version'),
}

const options = (list, label = (x) => x.label) => list.map((x) => `<option value="${x.id}">${label(x)}</option>`).join('')

ui.room.innerHTML = options(ROOMS)
ui.material.innerHTML = options(MATERIALS)

function fillElements() {
  ui.element.innerHTML = options(ROOMS_BY_ID[ui.room.value].elements, (e) => `${e.label} → ${e.behaviour}`)
}
function fillVersions() {
  ui.version.innerHTML = options(MATERIALS_BY_ID[ui.material.value].versions)
}
fillElements()
fillVersions()

function syncPicker(move) {
  ui.room.value = move.room
  fillElements()
  ui.element.value = move.element
  ui.material.value = move.material
  fillVersions()
  if (move.version) ui.version.value = move.version
}

const pickedMove = () => ({
  room: ui.room.value,
  element: ui.element.value,
  material: ui.material.value,
  version: ui.version.value,
  seed: Math.floor(Math.random() * 2 ** 31),
})

function randomMove() {
  const pick = (list) => list[Math.floor(Math.random() * list.length)]
  const room = pick(ROOMS)
  const material = pick(MATERIALS)
  return {
    room: room.id,
    element: pick(room.elements).id,
    material: material.id,
    version: pick(material.versions).id,
    seed: Math.floor(Math.random() * 2 ** 31),
  }
}

ui.room.addEventListener('change', fillElements)
ui.material.addEventListener('change', fillVersions)
$('#picker').addEventListener('submit', (e) => {
  e.preventDefault()
  sendMove(pickedMove(), show)
})
$('#random').addEventListener('click', () => sendMove(randomMove(), show))

// ---- keys -------------------------------------------------------------------
//   n  a random move    h  hide the controls    f  fullscreen    space  pause

let paused = false
addEventListener('keydown', (e) => {
  if (e.target.closest?.('select, button') && e.key !== 'Escape') {
    if (e.key === ' ' || e.key === 'Enter') return
  }
  const k = e.key.toLowerCase()
  if (k === 'n') sendMove(randomMove(), show)
  else if (k === 'h') document.body.classList.toggle('bare')
  else if (k === ' ') {
    e.preventDefault()
    paused = !paused
  } else if (k === 'f') {
    if (document.fullscreenElement) document.exitFullscreen()
    else document.documentElement.requestFullscreen?.()
  }
})

// Idle: hide the cursor and fade the controls, so it can hang on a wall.
let idleTimer
function wake() {
  document.body.classList.remove('idle')
  clearTimeout(idleTimer)
  idleTimer = setTimeout(() => document.body.classList.add('idle'), IDLE_MS)
}
addEventListener('pointermove', wake)
addEventListener('keydown', wake)
wake()

// ---- start ------------------------------------------------------------------

onMove(show) // moves from other windows (the game, or this test in another tab)
show(moveFromUrl() ?? { room: 'hallway', element: 'opening', material: 'cork', version: 'natural', seed: 1 })

let last = performance.now()
function frame(now) {
  requestAnimationFrame(frame)
  const dt = Math.min(0.05, (now - last) / 1000)
  last = now
  if (paused) return
  clock += dt
  renderer.frame(clock)
}
requestAnimationFrame(frame)
