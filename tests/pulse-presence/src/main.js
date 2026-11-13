import './style.css'
import { mountLauncher } from './launcher.js'
import { mountView } from './view.js'

// One page, two roles:
//   /?side=inside   → inside screen, pulses when someone stands outside
//   /?side=outside  → outside screen, pulses when someone stands inside
//   /               → launcher to open both windows
const side = new URLSearchParams(location.search).get('side')
const app = document.querySelector('#app')

if (side === 'inside' || side === 'outside') mountView(app, side)
else mountLauncher(app)
