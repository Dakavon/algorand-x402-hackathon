import type { ReactNode } from 'react'

type Point = { x: number; y: number }

type LineChartProps = {
  title: string
  subtitle: string
  points: Point[]
  color: string
  footer?: ReactNode
}

function polyline(points: Point[]) {
  return points.map((point) => `${point.x},${point.y}`).join(' ')
}

export function LineChart({ title, subtitle, points, color, footer }: LineChartProps) {
  return (
    <section className="panel chart-panel">
      <header>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </header>
      <svg viewBox="0 0 600 220" role="img" aria-label={title}>
        <rect x="0" y="0" width="600" height="220" rx="12" className="chart-bg" />
        <polyline points={polyline(points)} stroke={color} fill="none" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      {footer ? <div className="chart-footer">{footer}</div> : null}
    </section>
  )
}

export function toChartPoints(values: number[], max = 1): Point[] {
  const safeMax = max <= 0 ? 1 : max
  const width = 560
  const height = 180
  const offsetX = 20
  const offsetY = 20

  if (values.length === 0) {
    return [
      { x: offsetX, y: offsetY + height },
      { x: offsetX + width, y: offsetY + height },
    ]
  }

  return values.map((value, index) => {
    const x = offsetX + (index / Math.max(values.length - 1, 1)) * width
    const y = offsetY + (1 - Math.min(Math.max(value / safeMax, 0), 1)) * height
    return { x, y }
  })
}
