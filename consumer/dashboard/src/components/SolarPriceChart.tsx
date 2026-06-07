import type { HistoryPoint } from '../types'
import { LineChart, toChartPoints } from './charts'

type SolarPriceChartProps = {
  history: HistoryPoint[]
  latestPrice?: number
}

export function SolarPriceChart({ history, latestPrice }: SolarPriceChartProps) {
  const price = history.map((point) => point.price_per_kwh)
  const maxPrice = Math.max(...price, 0.01)
  const minPrice = Math.min(...price, maxPrice)
  const displayedLatestPrice = latestPrice ?? price.at(-1) ?? 0
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
      points={toChartPoints(price, maxPrice, timeLabels, minPrice)}
      color="#2a9d8f"
      xAxisLabel="Time"
      yAxisLabel="EURD/kWh"
      formatYTick={(value) => value.toFixed(3)}
      formatTooltip={(point) => `${point.value.toFixed(3)} EURD/kWh`}
      footer={
        <div className="legend-row">
          <span className="legend-dot price" /> Price trend
          <span className="legend-dot price" /> Latest price {displayedLatestPrice.toFixed(3)} EURD/kWh
        </div>
      }
    />
  )
}
