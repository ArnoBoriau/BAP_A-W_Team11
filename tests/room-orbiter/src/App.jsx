import { RoomStateProvider } from './state/RoomState'
import { RoomScene } from './scene/RoomScene'
import { ControlPanel } from './ui/ControlPanel'
import { HandInput } from './hands/HandInput'

export default function App() {
  return (
    <RoomStateProvider>
      <main className="app">
        <div className="viewport">
          <RoomScene />
        </div>
        <ControlPanel />
        <p className="hint">Pinch to choose · Pinch and drag to orbit · Pinch with both hands to zoom</p>
        <HandInput />
      </main>
    </RoomStateProvider>
  )
}
