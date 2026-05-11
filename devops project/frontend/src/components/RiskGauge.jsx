import React, { useEffect, useRef } from 'react'

export default function RiskGauge({ score = 0, size = 320 }) {
  const ref = useRef(null)
  const clamped = Math.max(0, Math.min(1, score))
  const stroke = 14
  const radius = (size - stroke) / 2
  const circ = Math.PI * radius
  const offset = circ * (1 - clamped)

  useEffect(() => {
    if (!ref.current) return
    ref.current.style.strokeDashoffset = `${circ}`
    requestAnimationFrame(() => {
      if (ref.current) {
        ref.current.style.transition = 'stroke-dashoffset 1.6s cubic-bezier(0.16, 1, 0.3, 1)'
        ref.current.style.strokeDashoffset = `${offset}`
      }
    })
  }, [offset, circ])

  const label = clamped < 0.34 ? 'LOW' : clamped < 0.67 ? 'MEDIUM' : 'HIGH'
  const color = clamped < 0.34 ? 'var(--success)' : clamped < 0.67 ? 'var(--warning)' : 'var(--danger)'

  return (
    <div className="gauge-wrap" style={{ width: size, height: size / 2 + 40 }}>
      <svg width={size} height={size / 2 + 20} viewBox={`0 0 ${size} ${size / 2 + 20}`} style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="risk-grad" x1="0%" x2="100%">
            <stop offset="0%" stopColor="oklch(0.72 0.17 145)" />
            <stop offset="50%" stopColor="oklch(0.82 0.17 85)" />
            <stop offset="100%" stopColor="oklch(0.65 0.24 25)" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {/* Track */}
        <path
          d={`M ${stroke / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - stroke / 2} ${size / 2}`}
          fill="none" stroke="oklch(1 0 0 / 0.06)" strokeWidth={stroke} strokeLinecap="round"
        />
        {/* Gradient base */}
        <path
          d={`M ${stroke / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - stroke / 2} ${size / 2}`}
          fill="none" stroke="url(#risk-grad)" strokeWidth={stroke} strokeLinecap="round" opacity="0.25"
        />
        {/* Progress */}
        <circle
          ref={ref}
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="url(#risk-grad)" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${circ} ${circ * 2}`} strokeDashoffset={circ}
          transform={`rotate(180 ${size / 2} ${size / 2})`}
          filter="url(#glow)"
        />
        {/* Tick marks */}
        {Array.from({ length: 21 }).map((_, t) => {
          const a = Math.PI + (t / 20) * Math.PI
          const r1 = radius + 12
          const r2 = radius + (t % 5 === 0 ? 22 : 16)
          return (
            <line key={t}
              x1={size / 2 + Math.cos(a) * r1} y1={size / 2 + Math.sin(a) * r1}
              x2={size / 2 + Math.cos(a) * r2} y2={size / 2 + Math.sin(a) * r2}
              stroke="oklch(1 0 0 / 0.18)" strokeWidth={t % 5 === 0 ? 1.5 : 1}
            />
          )
        })}
      </svg>
      <div className="gauge-label-wrap" style={{ top: size / 2 - 60 }}>
        <div className="gauge-score-label">Risk Score</div>
        <div className="gauge-score-number" style={{ color }}>{(clamped * 100).toFixed(0)}</div>
        <div className="gauge-risk-badge" style={{ borderColor: color, color }}>{label} risk</div>
      </div>
    </div>
  )
}
