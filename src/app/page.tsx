"use client"
import MapView from '@/components/MapView'
import Toolbar from '@/components/Toolbar'
import MetricsPanel from '@/components/MetricsPanel'
import StatusBar from '@/components/StatusBar'
import PrefHydrator from '@/components/PrefHydrator'
import { useMounted } from '@/lib/useMounted'
import ErrorBoundary from '@/components/ErrorBoundary'
import { useEffect, useState } from 'react'

export default function Page() {
  const mounted = useMounted()
  const [flags, setFlags] = useState<{ nomap?: boolean; notoolbar?: boolean; nometrics?: boolean; nostatus?: boolean }>({})
  useEffect(() => {
    try {
      const url = new URL(window.location.href)
      setFlags({
        nomap: url.searchParams.get('nomap') != null,
        notoolbar: url.searchParams.get('notoolbar') != null,
        nometrics: url.searchParams.get('nometrics') != null,
        nostatus: url.searchParams.get('nostatus') != null,
      })
    } catch {}
  }, [])
  if (!mounted) {
    return <div className="app-root" />
  }
  return (
    <div className="app-root">
      <PrefHydrator />
      {!flags.nomap && (
        <ErrorBoundary label="MapView">
          <MapView />
        </ErrorBoundary>
      )}
      {!flags.notoolbar && (
        <div className="overlay top-left">
          <ErrorBoundary label="Toolbar">
            <Toolbar />
          </ErrorBoundary>
        </div>
      )}
      {!flags.nometrics && (
        <div className="overlay bottom-right">
          <ErrorBoundary label="MetricsPanel">
            <MetricsPanel />
          </ErrorBoundary>
        </div>
      )}
      {!flags.nostatus && (
        <div className="overlay bottom-left">
          <ErrorBoundary label="StatusBar">
            <StatusBar />
          </ErrorBoundary>
        </div>
      )}
    </div>
  )
}
