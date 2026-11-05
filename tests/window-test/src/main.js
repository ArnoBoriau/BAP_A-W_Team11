import './style.css'
import { mountLauncher } from './launcher.js'
import { mountView } from './view.js'

// One page, two roles:
//   /?side=inside   → the screen on the inside wall, shows the outside camera
//   /?side=outside  → the screen on the outside wall, shows the inside camera
//   /               → launcher to open both windows
const side = new URLSearchParams(location.search).get('side')
const app = document.querySelector('#app')

if (side === 'inside' || side === 'outside') mountView(app, side)
else mountLauncher(app)
