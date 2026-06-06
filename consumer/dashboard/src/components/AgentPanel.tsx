import type { DashboardSnapshot } from '../types'

type AgentPanelProps = {
  snapshot: DashboardSnapshot
}

export function AgentPanel({ snapshot }: AgentPanelProps) {
  const { agent } = snapshot
  return (
    <section className="panel agent-panel" aria-label="Agent reasoning and controls">
      <header>
        <h2>Agent Panel</h2>
        <p>{agent.decision_reason ?? 'Waiting for next evaluation cycle'}</p>
      </header>
      <dl>
        <div>
          <dt>State</dt>
          <dd>{agent.state}</dd>
        </div>
        <div>
          <dt>Budget Left</dt>
          <dd>{agent.budget_remaining_usdc.toFixed(2)} USDC</dd>
        </div>
        <div>
          <dt>Max Price</dt>
          <dd>{agent.max_price_per_kwh.toFixed(2)} USDC/kWh</dd>
        </div>
        <div>
          <dt>Delivery Remaining</dt>
          <dd>{agent.delivery_remaining_kwh.toFixed(2)} kWh</dd>
        </div>
        <div>
          <dt>Last Tx</dt>
          <dd>{agent.last_tx_id ?? 'None yet'}</dd>
        </div>
      </dl>
    </section>
  )
}
