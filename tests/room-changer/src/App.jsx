import { RoomStateProvider } from './state/RoomState'
import { RoomScene } from './scene/RoomScene'
import { ControlPanel } from './ui/ControlPanel'

export default function App() {
  return (
    <RoomStateProvider>
      <main className="app">
        <div className="viewport">
          <RoomScene />
        </div>
        <ControlPanel />
        <p className="hint">Drag to orbit · Scroll to zoom · Click a surface to select it</p>
      </main>
    </RoomStateProvider>
  )
}
