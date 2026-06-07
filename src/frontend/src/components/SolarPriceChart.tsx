import type { HistoryPoint } from '../types'
import { LineChart, toChartPoints } from './charts'

type SolarPriceChartProps = {
  history: HistoryPoint[]
}

export function SolarPriceChart({ history }: SolarPriceChartProps) {
  const solar = history.map((point) => point.solar_kw)
  const price = history.map((point) => point.price_per_kwh)

  return (
    <LineChart
      title="Solar + Price"
      subtitle="Higher solar should correlate with lower price per kWh"
      points={toChartPoints(solar, 5)}
      color="#ffb703"
      footer={
        <div className="legend-row">
          <span className="legend-dot solar" /> Solar trend
          <span className="legend-dot price" /> Latest price {price.at(-1)?.toFixed(3) ?? '0.000'} EURD/kWh
        </div>
      }
    />
  )
}
