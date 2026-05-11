import React, { useState, useEffect } from 'react'
import SiteHeader from '../components/SiteHeader.jsx'
import CarSlideshow from '../components/CarSlideshow.jsx'

const MASTODON_STAGES = [
  'Authenticating with Mastodon',
  'Fetching profile signals',
  'Computing engagement metrics',
  'Running Risk Engine v3',
  'Generating decision rationale',
]
const MANUAL_STAGES = [
  'Ingesting manual entries',
  'Preprocessing content',
  'Running Risk Engine v3',
  'Aggregating signals',
  'Generating decision rationale',
]

export default function AnalyzePage({ params }) {
  const [stage, setStage] = useState(0)
  const [progress, setProgress] = useState(0)
  const isManual = params?.get('mode') === 'manual'
  const resultId = params?.get('id')
  const STAGES = isManual ? MANUAL_STAGES : MASTODON_STAGES

  useEffect(() => {
    const total = 4200
    const start = performance.now()
    let raf = 0
    const tick = (t) => {
      const p = Math.min(1, (t - start) / total)
      setProgress(p)
      setStage(Math.min(STAGES.length - 1, Math.floor(p * STAGES.length)))
      if (p < 1) {
        raf = requestAnimationFrame(tick)
      } else {
        const sp = new URLSearchParams()
        if (resultId) sp.set('id', resultId)
        window.location.hash = '/result?' + sp.toString()
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className="page">
      <SiteHeader />
      <CarSlideshow intensity="soft" />
      <div className="page-content" style={{ maxWidth: 768, margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
        {/* Radar */}
        <div className="radar-wrap">
          <div className="radar-ring" />
          <div className="radar-ring radar-ring-2" />
          <div className="radar-ring radar-ring-3" />
          <div className="radar-dot" />
          <div className="radar-sweep" />
          <div className="radar-scan-line" />
        </div>

        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4em', color: 'var(--ember)' }}>
          Analysis in progress
        </div>
        <h1 style={{ marginTop: 12, fontFamily: 'var(--font-display)', fontSize: 'clamp(3rem, 8vw, 6rem)', lineHeight: 1 }}>
          Reading the signals
        </h1>
        <p style={{ marginTop: 16, maxWidth: 400, fontSize: 14, color: 'var(--muted-foreground)' }}>
          We are scanning public activity, engagement patterns, and tenure to score risk.
        </p>

        {/* Progress */}
        <div style={{ marginTop: 48, width: '100%', maxWidth: 480 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.3em', color: 'var(--muted-foreground)' }}>
            <span>{STAGES[stage]}</span>
            <span style={{ color: 'var(--ember)' }}>{Math.floor(progress * 100)}%</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress * 100}%` }} />
          </div>
          <ul className="stage-list" style={{ textAlign: 'left' }}>
            {STAGES.map((s, idx) => {
              const done = idx < stage
              const active = idx === stage
              return (
                <li key={s} className="stage-item" style={{ color: done ? 'var(--success)' : active ? 'var(--foreground)' : 'oklch(0.68 0.01 50 / 0.5)' }}>
                  <span className={`stage-icon ${done ? 'done' : active ? 'active' : ''}`}>
                    {done ? '✓' : ''}
                  </span>
                  {s}
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </div>
  )
}
