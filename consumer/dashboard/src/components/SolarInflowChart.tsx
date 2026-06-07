import type { HistoryPoint } from '../types'
import { LineChart, toChartPoints } from './charts'

type SolarInflowChartProps = {
  history: HistoryPoint[]
}

export function SolarInflowChart({ history }: SolarInflowChartProps) {
  const solarKw = history.map((point) => point.solar_kw)
  const maxSolar = Math.max(...solarKw, 0.1)
  const timeLabels = history.map((point) =>
    new Date(point.ts * 1000).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }),
  )

  return (
    <LineChart
      title="Solar Inflow"
      subtitle="Live producer generation trend over time"
      points={toChartPoints(solarKw, maxSolar, timeLabels)}
      color="#ffb703"
      xAxisLabel="Time"
      yAxisLabel="kW"
      formatYTick={(value) => value.toFixed(2)}
      formatTooltip={(point) => `${point.value.toFixed(2)} kW`}
      footer={<span>Latest solar: {(solarKw.at(-1) ?? 0).toFixed(2)} kW</span>}
    />
  )
}