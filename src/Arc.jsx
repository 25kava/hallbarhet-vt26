export default function Arc({ value, max }) {

  // Arc is 200 degrees, rotated 90deg left so it opens upward
  const cx = 100
  const cy = 110
  const r = 80
  const startAngle = 170
  const totalAngle = 200

  function polarToCartesian(angle) {
    const rad = (angle * Math.PI) / 180
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    }
  }

  const start = polarToCartesian(startAngle)
  const end = polarToCartesian(startAngle + totalAngle)

  // Background track path
  const trackPath = `M ${start.x} ${start.y} A ${r} ${r} 0 1 1 ${end.x} ${end.y}`

  // Filled arc based on value
  const filledAngle = (Math.min(value, max) / max) * totalAngle
  const filledEnd = polarToCartesian(startAngle + filledAngle)
  const largeArc = filledAngle > 180 ? 1 : 0
  const fillPath = `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${filledEnd.x} ${filledEnd.y}`

  const diff = max - value
  const isOver = diff < 0
  const displayValue = Math.abs(diff).toFixed(1)
  const subText = isOver ? 'kg CO₂ over goal!' : 'kg CO₂ to spare'
  const arcColor = isOver ? '#ef5350' : 'green'

  return (
    <svg viewBox="0 0 200 180" width="260" height="230">

      {/* Background track */}
      <path
        d={trackPath}
        fill="none"
        stroke="#ddd"
        strokeWidth="14"
        strokeLinecap="round"
      />

      {/* Filled arc */}
      <path
        d={fillPath}
        fill="none"
        stroke={arcColor}
        strokeWidth="14"
        strokeLinecap="round"
      />

      {/* Center text */}
      <text
        x={cx}
        y={cy - 10}
        textAnchor="middle"
        fontSize="28"
        fontWeight="bold"
        fill="#333"
      >
        {displayValue}
      </text>
      <text
        x={cx}
        y={cy + 18}
        textAnchor="middle"
        fontSize="13"
        fill="#888"
      >
        {subText}
      </text>

    </svg>
  )
}
