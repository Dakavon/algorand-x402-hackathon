import type { DashboardEvent, PaymentRow } from '../types'

type PaymentLedgerProps = {
  events: DashboardEvent[]
  payments: PaymentRow[]
}

function formatTime(ts: number) {
  return new Date(ts * 1000).toLocaleTimeString([], {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function PaymentLedger({ events, payments }: PaymentLedgerProps) {
  const paymentMap = new Map(payments.map((p) => [p.tx_id, p]))

  return (
    <section className="panel ledger-panel">
      <header>
        <h2>Payment & Event Ledger</h2>
        <p>Recent decisions and settled transactions with explorer links</p>
      </header>
      <div className="ledger-table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Type</th>
              <th>Message</th>
              <th>Amount</th>
              <th>Tx</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => {
              const payment = event.tx_id ? paymentMap.get(event.tx_id) : undefined
              const amount = payment
                ? `${payment.kwh.toFixed(2)} kWh @ ${payment.price_paid_usdc.toFixed(2)} USDC`
                : event.kwh && event.price_usdc
                  ? `${event.kwh.toFixed(2)} kWh @ ${event.price_usdc.toFixed(2)} USDC`
                  : '—'
              return (
                <tr key={`${event.type}-${event.ts}-${event.message}`}>
                  <td>{formatTime(event.ts)}</td>
                  <td>{event.type}</td>
                  <td>{event.message}</td>
                  <td>{amount}</td>
                  <td>
                    {event.tx_id && event.lora_url ? (
                      <a href={event.lora_url} target="_blank" rel="noreferrer">
                        {event.tx_id.slice(0, 10)}...
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
