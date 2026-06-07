import { AgentPanel } from './components/AgentPanel'
import { BatteryChart } from './components/BatteryChart'
import { EnergyFlow } from './components/EnergyFlow'
import { MetricStrip } from './components/MetricStrip'
import { PaymentLedger } from './components/PaymentLedger'
import { SolarInflowChart } from './components/SolarInflowChart'
import { SolarPriceChart } from './components/SolarPriceChart'
import { SystemHealth } from './components/SystemHealth'
import { useDashboardData } from './hooks/useDashboardData'
import './App.css'

function App() {
  const { snapshot, history, events, payments, loading, usingMockData, errorMessage } = useDashboardData()

  return (
    <div className="dashboard-page">
      <header className="page-header">
        <div>
          <p className="kicker">Agentic Energy Sharing</p>
          <h1>P2P Energy Dashboard</h1>
          <p className="subtitle">Live producer telemetry, agent decisions, and x402 settlement traces.</p>
        </div>
        <div className="header-badges">
          <span>Algorand TestNet</span>
          <span>x402</span>
        </div>
      </header>

      {loading ? <p className="notice">Loading live dashboard data...</p> : null}
      {usingMockData ? <p className="notice warn">Mock mode enabled</p> : null}
      {errorMessage ? <p className="notice error">{errorMessage}</p> : null}

      <SystemHealth snapshot={snapshot} />
      <MetricStrip snapshot={snapshot} />

      <section className="two-col">
        <EnergyFlow snapshot={snapshot} />
        <AgentPanel snapshot={snapshot} />
      </section>

      <section className="two-col charts">
        <SolarPriceChart history={history} latestPrice={snapshot.producer.price_per_kwh} />
        <BatteryChart history={history} />
        <SolarInflowChart history={history} />
      </section>

      <PaymentLedger events={events} payments={payments} />
    </div>
  )
}

export default App
