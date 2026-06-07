import type { HistoryPoint } from '../types'
import { LineChart, toChartPoints } from './charts'

type SolarPriceChartProps = {
  history: HistoryPoint[]
}

export function SolarPriceChart({ history }: SolarPriceChartProps) {
  const price = history.map((point) => point.price_per_kwh)
  const maxPrice = Math.max(...price, 0.01)
  const timeLabels = history.map((point) =>
    new Date(point.ts * 1000).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }),
  )

  return (
    <LineChart
      title="Price per kWh"
      subtitle="Live market price trend used by the agent"
      points={toChartPoints(price, maxPrice, timeLabels)}
      color="#2a9d8f"
      xAxisLabel="Time"
      yAxisLabel="EURD/kWh"
      formatYTick={(value) => value.toFixed(3)}
      formatTooltip={(point) => `${point.value.toFixed(3)} EURD/kWh`}
      footer={
        <div className="legend-row">
          <span className="legend-dot price" /> Price trend
          <span className="legend-dot price" /> Latest price {price.at(-1)?.toFixed(3) ?? '0.000'} EURD/kWh
        </div>
      }
    />
  )
}
