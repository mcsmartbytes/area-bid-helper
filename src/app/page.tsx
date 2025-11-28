"use client"
import MapView from '@/components/MapView'
import Toolbar from '@/components/Toolbar'
import MetricsPanel from '@/components/MetricsPanel'
import StatusBar from '@/components/StatusBar'
import PrefHydrator from '@/components/PrefHydrator'
import { useMounted } from '@/lib/useMounted'

export default function Page() {
  const mounted = useMounted()
  if (!mounted) {
    return <div className="app-root" />
  }
  return (
    <div className="app-root">
      <PrefHydrator />
      <MapView />
      <div className="overlay top-left">
        <Toolbar />
      </div>
      <div className="overlay bottom-right">
        <MetricsPanel />
      </div>
      <div className="overlay bottom-left">
        <StatusBar />
      </div>
    </div>
  )
}
