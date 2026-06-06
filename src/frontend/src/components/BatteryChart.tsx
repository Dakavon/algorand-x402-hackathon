import type { HistoryPoint, PaymentRow } from '../types'
import { LineChart, toChartPoints } from './charts'

type BatteryChartProps = {
  history: HistoryPoint[]
  payments: PaymentRow[]
}

function nearestHistoryIndex(history: HistoryPoint[], ts: number) {
  if (history.length === 0) return -1
  let bestIndex = 0
  let bestDistance = Math.abs((history[0]?.ts ?? 0) - ts)
  history.forEach((point, index) => {
    const distance = Math.abs(point.ts - ts)
    if (distance < bestDistance) {
      bestDistance = distance
      bestIndex = index
    }
  })
  return bestIndex
}

export function BatteryChart({ history, payments }: BatteryChartProps) {
  const batteryPct = history.map((point) => point.battery_pct)
  const points = toChartPoints(batteryPct, 1)
  const markers = payments.slice(0, 12).flatMap((payment) => {
    const index = nearestHistoryIndex(history, payment.ts)
    const point = points[index]
    return point ? [{ ...point, label: payment.tx_id }] : []
  })

  return (
    <LineChart
      title="Battery"
      subtitle="Payment markers show purchase drops; solar recovery creates the sawtooth"
      points={points}
      markers={markers}
      color="#06d6a0"
      footer={<span>Latest battery: {Math.round((batteryPct.at(-1) ?? 0) * 100)}%</span>}
    />
  )
}
