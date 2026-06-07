import { useMemo, useState, type MouseEvent, type ReactNode } from 'react'

type Point = { x: number; y: number; value: number; label: string }

type LineChartProps = {
  title: string
  subtitle: string
  points: Point[]
  color: string
  xAxisLabel?: string
  yAxisLabel?: string
  formatYTick?: (value: number) => string
  formatTooltip?: (point: Point, index: number) => string
  footer?: ReactNode
}

function polyline(points: Point[]) {
  return points.map((point) => `${point.x},${point.y}`).join(' ')
}

export function LineChart({
  title,
  subtitle,
  points,
  color,
  xAxisLabel = 'Samples',
  yAxisLabel = 'Value',
  formatYTick = (value) => value.toFixed(2),
  formatTooltip = (point) => point.value.toFixed(3),
  footer,
}: LineChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const svgWidth = 620
  const svgHeight = 250
  const plotLeft = 56
  const plotRight = 16
  const plotTop = 20
  const plotBottom = 48
  const plotWidth = svgWidth - plotLeft - plotRight
  const plotHeight = svgHeight - plotTop - plotBottom
  const safePoints = points.length
    ? points
    : [
        { x: plotLeft, y: plotTop + plotHeight, value: 0, label: 'Start' },
        { x: plotLeft + plotWidth, y: plotTop + plotHeight, value: 0, label: 'End' },
      ]

  const maxValue = Math.max(...safePoints.map((point) => point.value), 1)
  const yTicks = useMemo(
    () =>
      Array.from({ length: 5 }, (_, index) => {
        const ratio = index / 4
        const y = plotTop + ratio * plotHeight
        const value = maxValue * (1 - ratio)
        return { y, value }
      }),
    [maxValue],
  )

  const xTicks = useMemo(() => {
    const tickCount = 4
    const lastIndex = Math.max(safePoints.length - 1, 0)

    return Array.from({ length: tickCount }, (_, index) => {
      const ratio = index / (tickCount - 1)
      const x = plotLeft + ratio * plotWidth
      const pointIndex = Math.round(ratio * lastIndex)
      return { x, label: safePoints[pointIndex]?.label ?? '' }
    })
  }, [safePoints, plotLeft, plotWidth])

  const hoveredPoint = hoveredIndex === null ? null : safePoints[hoveredIndex]
  const tooltipLabel = hoveredPoint?.label ?? ''
  const tooltipValue = hoveredPoint ? formatTooltip(hoveredPoint, hoveredIndex ?? 0) : ''
  const tooltipWidth = Math.max(96, Math.min(220, Math.ceil(Math.max(tooltipLabel.length, tooltipValue.length) * 6.2 + 14)))
  const tooltipHeight = 24

  const handleMouseMove = (event: MouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const cursorX = ((event.clientX - rect.left) / rect.width) * svgWidth
    const cursorY = ((event.clientY - rect.top) / rect.height) * svgHeight
    const nearest = safePoints.reduce(
      (best, point, index) => {
        const distance = Math.hypot(point.x - cursorX, point.y - cursorY)
        return distance < best.distance ? { index, distance } : best
      },
      { index: 0, distance: Number.POSITIVE_INFINITY },
    )

    // Only show details when the cursor is close to the plotted line/points.
    const hoverThreshold = 18
    setHoveredIndex(nearest.distance <= hoverThreshold ? nearest.index : null)
  }

  const handleMouseLeave = () => {
    setHoveredIndex(null)
  }

  return (
    <section className="panel chart-panel">
      <header>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </header>
      <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} role="img" aria-label={title} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
        <rect x="0" y="0" width={svgWidth} height={svgHeight} rx="12" className="chart-bg" />

        <line x1={plotLeft} y1={plotTop} x2={plotLeft} y2={plotTop + plotHeight} className="chart-axis" />
        <line x1={plotLeft} y1={plotTop + plotHeight} x2={plotLeft + plotWidth} y2={plotTop + plotHeight} className="chart-axis" />

        {yTicks.map((tick, index) => {
          const y =
            index === 0
              ? tick.y + 12
              : index === yTicks.length - 1
                ? tick.y - 6
                : tick.y + 4

          return (
            <text key={`label-${tick.y}`} x={plotLeft - 8} y={y} textAnchor="end" className="chart-label chart-label-y">
              {formatYTick(tick.value)}
            </text>
          )
        })}

        {xTicks.map((tick, index) => {
          return (
            <text key={`x-${index}`} x={tick.x} y={plotTop + plotHeight + 14} textAnchor="middle" className="chart-label chart-label-x">
              {tick.label}
            </text>
          )
        })}

        <text x={plotLeft + plotWidth / 2} y={svgHeight - 10} textAnchor="middle" className="chart-axis-title">
          {xAxisLabel}
        </text>
        <text x={12} y={16} textAnchor="start" className="chart-axis-title">
          {yAxisLabel}
        </text>

        <polyline points={polyline(safePoints)} stroke={color} fill="none" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />

        {hoveredPoint ? (
          <>
            <circle cx={hoveredPoint.x} cy={hoveredPoint.y} r="5" className="chart-hover-point" />
            <g
              transform={`translate(${Math.min(
                Math.max(plotLeft + 8, hoveredPoint.x + 10),
                plotLeft + plotWidth - tooltipWidth - 8,
              )}, ${Math.min(
                Math.max(plotTop + 8, hoveredPoint.y - tooltipHeight - 8),
                plotTop + plotHeight - tooltipHeight - 8,
              )})`}
            >
              <rect width={tooltipWidth} height={tooltipHeight} rx="6" className="chart-tooltip-bg" />
              <text x="6" y="10" className="chart-tooltip-label">
                {tooltipLabel}
              </text>
              <text x="6" y="20" className="chart-tooltip-value">
                {tooltipValue}
              </text>
            </g>
          </>
        ) : null}
      </svg>
      {footer ? <div className="chart-footer">{footer}</div> : null}
    </section>
  )
}

export function toChartPoints(values: number[], max = 1, labels?: string[]): Point[] {
  const safeMax = max <= 0 ? 1 : max
  const svgWidth = 620
  const svgHeight = 250
  const plotLeft = 56
  const plotRight = 16
  const plotTop = 20
  const plotBottom = 48
  const width = svgWidth - plotLeft - plotRight
  const height = svgHeight - plotTop - plotBottom
  const offsetX = plotLeft
  const offsetY = plotTop

  if (values.length === 0) {
    return [
      { x: offsetX, y: offsetY + height, value: 0, label: 'Start' },
      { x: offsetX + width, y: offsetY + height, value: 0, label: 'End' },
    ]
  }

  return values.map((value, index) => {
    const x = offsetX + (index / Math.max(values.length - 1, 1)) * width
    const y = offsetY + (1 - Math.min(Math.max(value / safeMax, 0), 1)) * height
    return { x, y, value, label: labels?.[index] ?? String(index + 1) }
  })
}
