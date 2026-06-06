import type { DashboardSnapshot } from '../types'

type SystemHealthProps = {
  snapshot: DashboardSnapshot
}

const label = {
  ok: 'OK',
  stale: 'STALE',
  down: 'DOWN',
  error: 'ERROR',
}

export function SystemHealth({ snapshot }: SystemHealthProps) {
  const entries = [
    { name: 'Producer', status: snapshot.health.producer },
    { name: 'x402', status: snapshot.health.x402 },
    { name: 'Agent', status: snapshot.health.agent },
  ]

  return (
    <section className="panel health-panel">
      <header>
        <h2>System Health</h2>
        <p>Live backend readiness for producer, x402 server, and agent</p>
      </header>
      <div className="health-row">
        {entries.map((entry) => (
          <span key={entry.name} className={`health-pill status-${entry.status}`}>
            {entry.name}: {label[entry.status]}
          </span>
        ))}
      </div>
    </section>
  )
}
