import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Fonts from our concept's styleboard, bundled so the demo works offline at the event:
// Poppins for titles, labels and buttons, Manrope for running text.
import '@fontsource/poppins/500.css'
import '@fontsource/poppins/600.css'
import '@fontsource/poppins/700.css'
import '@fontsource/manrope/400.css'
import '@fontsource/manrope/500.css'
import '@fontsource/manrope/700.css'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
