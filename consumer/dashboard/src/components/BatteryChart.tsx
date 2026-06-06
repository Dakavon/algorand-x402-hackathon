import type { HistoryPoint } from '../types'
import { LineChart, toChartPoints } from './charts'

type BatteryChartProps = {
  history: HistoryPoint[]
}

export function BatteryChart({ history }: BatteryChartProps) {
  const batteryPct = history.map((point) => point.battery_pct)

  return (
    <LineChart
      title="Battery"
      subtitle="Should show a sawtooth pattern: recharge then purchase drop"
      points={toChartPoints(batteryPct, 1)}
      color="#06d6a0"
      footer={<span>Latest battery: {Math.round((batteryPct.at(-1) ?? 0) * 100)}%</span>}
    />
  )
}
