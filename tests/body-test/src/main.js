import './style.css'
import * as THREE from 'three'
import { startTracking } from './pose.js'
import { createFacade } from './facade.js'

const video = document.querySelector('#camera')
const statusEl = document.querySelector('#status')
const setStatus = (text) => {
  statusEl.textContent = text
  statusEl.hidden = !text
}

// ---- three.js ------------------------------------------------------------

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.05
document.body.prepend(renderer.domElement)

const scene = new THREE.Scene()
scene.background = new THREE.Color('#2a2826')

const FOV = 28
const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 50)
// fit the wall height (2 units) with a little overscan so no edge shows
const distance = 0.94 / Math.tan(THREE.MathUtils.degToRad(FOV / 2))

// Low, raking light from the upper left: that is what makes a relief readable.
const sun = new THREE.DirectionalLight('#fff1e0', 3.2)
sun.position.set(-2.6, 2.2, 1.4)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
sun.shadow.bias = -0.0004
sun.shadow.normalBias = 0.01
scene.add(sun, sun.target)
scene.add(new THREE.HemisphereLight('#dde6f0', '#3a332c', 0.9))

const facade = createFacade(scene)

function resize() {
  const w = window.innerWidth
  const h = window.innerHeight
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(w, h)
  camera.aspect = w / h
  camera.updateProjectionMatrix()
  facade.build(w / h)

  const sc = sun.shadow.camera
  sc.left = -facade.width / 2 - 0.5
  sc.right = facade.width / 2 + 0.5
  sc.top = 1.5
  sc.bottom = -1.5
  sc.near = 0.1
  sc.far = 10
  sc.updateProjectionMatrix()
}
window.addEventListener('resize', resize)
resize()

// Video pixels → wall units, the camera image "covering" the wall, mirrored by ml5.
function makeToWorld(vw, vh) {
  const s = Math.max(facade.width / vw, 2 / vh)
  return (x, y) => [(x - vw / 2) * s, -(y - vh / 2) * s]
}

// ---- loop ----------------------------------------------------------------

let tracker = null
const clock = new THREE.Clock()

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.1)
  const time = clock.elapsedTime

  if (tracker && tracker.width) {
    facade.update(tracker.poses, tracker.connections, makeToWorld(tracker.width, tracker.height), time, dt)
    setStatus(facade.hasPeople() ? '' : 'Step in front of the camera')
  } else {
    facade.update([], [], null, time, dt)
  }

  // a very slow drift of the viewpoint, so the depth stays visible
  camera.position.set(Math.sin(time * 0.11) * 0.25, Math.cos(time * 0.08) * 0.12 - 0.05, distance)
  camera.lookAt(0, 0, 0)

  renderer.render(scene, camera)
})

startTracking(video, setStatus)
  .then((t) => {
    tracker = t
  })
  .catch((err) => setStatus(`Camera or model failed: ${err.message}`))

// ---- keys ----------------------------------------------------------------
//   V  small camera preview in the corner (to check the tracking)
//   F  fullscreen

window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase()
  if (k === 'v') document.body.classList.toggle('show-camera')
  else if (k === 'f') {
    if (document.fullscreenElement) document.exitFullscreen()
    else document.documentElement.requestFullscreen().catch(() => {})
  }
})
