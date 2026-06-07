import type { DashboardSnapshot } from '../types'

type EnergyFlowProps = {
  snapshot: DashboardSnapshot
}

function deriveFlowLabel(snapshot: DashboardSnapshot) {
  if (!snapshot.producer.has_offer) return 'No surplus available'
  if (!snapshot.producer.ev_plugged) return 'Waiting for EV connection'
  if (snapshot.agent.state === 'PAYING') return 'x402 settling payment'
  if (snapshot.agent.state === 'CHARGING') return 'Delivering 3 kW to EV'
  return 'Monitoring and evaluating offers'
}

export function EnergyFlow({ snapshot }: EnergyFlowProps) {
  const paying = snapshot.agent.state === 'PAYING'
  const charging = snapshot.agent.state === 'CHARGING'
  const noOffer = !snapshot.producer.has_offer

  return (
    <section className="panel flow-panel" aria-label="Energy flow">
      <header>
        <h2>Energy Flow</h2>
        <p>{deriveFlowLabel(snapshot)}</p>
      </header>
      <div className="flow-row">
        <div className={`flow-node ${noOffer ? 'dim' : ''}`}>
          <strong>Producer</strong>
          <span>{snapshot.producer.solar_kw.toFixed(1)} kW solar</span>
        </div>
        <div className={`flow-link ${paying ? 'active' : ''}`}>x402</div>
        <div className={`flow-node ${charging ? 'charging' : ''} ${!snapshot.producer.ev_plugged ? 'dim' : ''}`}>
          <strong>EV</strong>
          <span>{snapshot.producer.ev_plugged ? 'Ready to charge' : 'Not plugged'}</span>
        </div>
      </div>
    </section>
  )
}
