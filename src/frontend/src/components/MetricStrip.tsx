import type { DashboardSnapshot } from '../types'

type MetricStripProps = {
  snapshot: DashboardSnapshot
}

function pct(value: number) {
  return `${Math.round(value * 100)}%`
}

function price(value: number, symbol: string) {
  return `${value.toFixed(2)} ${symbol}/kWh`
}

export function MetricStrip({ snapshot }: MetricStripProps) {
  const symbol = snapshot.payment_symbol ?? snapshot.agent.payment_symbol ?? 'EURD'

  return (
    <section className="metric-strip" aria-label="Key live metrics">
      <article className="metric-card">
        <h3>Solar</h3>
        <p>{snapshot.producer.solar_kw.toFixed(1)} kW</p>
      </article>
      <article className="metric-card">
        <h3>Battery</h3>
        <p>{pct(snapshot.producer.battery_pct)}</p>
      </article>
      <article className="metric-card">
        <h3>Price</h3>
        <p>{price(snapshot.producer.price_per_kwh, symbol)}</p>
      </article>
      <article className="metric-card">
        <h3>EV Plug</h3>
        <p>{snapshot.producer.ev_plugged ? 'Plugged' : 'Unplugged'}</p>
      </article>
      <article className="metric-card">
        <h3>Agent</h3>
        <p className={`agent-state state-${snapshot.agent.state.toLowerCase()}`}>{snapshot.agent.state}</p>
      </article>
    </section>
  )
}
