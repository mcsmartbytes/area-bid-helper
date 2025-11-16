import MapView from '@/components/MapView'
import Toolbar from '@/components/Toolbar'
import MetricsPanel from '@/components/MetricsPanel'

export default function Page() {
  return (
    <div className="app-root">
      <MapView />
      <div className="overlay top-left">
        <Toolbar />
      </div>
      <div className="overlay bottom-right">
        <MetricsPanel />
      </div>
    </div>
  )
}

