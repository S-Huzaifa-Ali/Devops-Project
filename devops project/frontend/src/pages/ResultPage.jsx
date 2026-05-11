import React, { useState, useEffect } from 'react'
import SiteHeader from '../components/SiteHeader.jsx'
import CarSlideshow from '../components/CarSlideshow.jsx'
import RiskGauge from '../components/RiskGauge.jsx'

const BACKEND = 'http://localhost:8000'

export default function ResultPage({ params }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const resultId = params?.get('id')
  const urlError = params?.get('error')

  useEffect(() => {
    if (urlError) { setError(decodeURIComponent(urlError)); return }
    if (!resultId) { setError('No analysis ID provided.'); return }
    let retries = 0
    const maxRetries = 30
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${BACKEND}/get_analysis/${resultId}`)
        if (res.status === 404) {
          retries++
          if (retries >= maxRetries) { clearInterval(interval); setError('Analysis timed out. Please try again.') }
          return
        }
        const json = await res.json()
        if (json.error) { setError(json.error); clearInterval(interval); return }
        setData(json)
        clearInterval(interval)
      } catch (e) {
        retries++
        if (retries >= maxRetries) { setError('Network error. Backend might be down.'); clearInterval(interval) }
      }
    }, 2000)
    // Initial fetch
    fetch(`${BACKEND}/get_analysis/${resultId}`).then(r => r.json()).then(json => {
      if (!json.error) { setData(json); clearInterval(interval) }
    }).catch(() => {})
    return () => clearInterval(interval)
  }, [resultId])

  const handleDownloadPDF = () => {
    const jsPDF = window.jspdf?.jsPDF
    if (!jsPDF) { alert('PDF Engine loading. Please try again in 1 second.'); return }
    try {
      const { user, analysis, recent_posts } = data
      const score = analysis.risk_score / 100
      const rawDecision = analysis.decision.toUpperCase()
      let displayDecision = 'REVIEW'
      if (rawDecision.includes('APPROVE')) displayDecision = 'APPROVE'
      else if (rawDecision.includes('REJECT') || rawDecision.includes('DECLINE')) displayDecision = 'DECLINE'

      const pdf = new jsPDF('p', 'mm', 'a4')
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(24)
      pdf.setTextColor(40, 40, 40)
      pdf.text('VeriDrive Decision Report', 20, 25)
      pdf.setDrawColor(200, 200, 200)
      pdf.line(20, 32, 190, 32)
      pdf.setFontSize(16)
      pdf.setTextColor(20, 20, 20)
      pdf.text(`@${user.username}`, 20, 45)
      pdf.setFontSize(11)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(100, 100, 100)
      pdf.text(`Display Name: ${user.display_name}`, 20, 52)
      pdf.text(`Date Generated: ${new Date().toLocaleDateString()}`, 20, 58)
      pdf.setFillColor(245, 245, 245)
      pdf.roundedRect(20, 68, 170, 35, 3, 3, 'F')
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(12)
      pdf.setTextColor(100, 100, 100)
      pdf.text('FINAL DECISION', 25, 78)
      pdf.setFontSize(22)
      if (displayDecision === 'APPROVE') pdf.setTextColor(46, 160, 67)
      else if (displayDecision === 'DECLINE') pdf.setTextColor(218, 54, 51)
      else pdf.setTextColor(210, 153, 34)
      pdf.text(displayDecision, 25, 88)
      pdf.setFontSize(16)
      pdf.setTextColor(40, 40, 40)
      pdf.text(`Risk Score: ${(score * 100).toFixed(0)} / 100`, 120, 88)
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(16)
      pdf.text('AI Rationale', 20, 115)
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(11)
      let yPos = 125
      analysis.reasons.forEach((reason) => {
        if (yPos > 270) { pdf.addPage(); yPos = 20 }
        pdf.setTextColor(60, 60, 60)
        pdf.text('•', 20, yPos)
        const lines = pdf.splitTextToSize(reason, 160)
        pdf.text(lines, 26, yPos)
        yPos += (lines.length * 5) + 4
      })
      yPos += 10
      if (yPos > 260) { pdf.addPage(); yPos = 25 }
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(16)
      pdf.setTextColor(40, 40, 40)
      pdf.text('Posts Reviewed', 20, yPos)
      yPos += 12
      pdf.setFontSize(10)
      recent_posts.forEach((post, idx) => {
        if (yPos > 270) { pdf.addPage(); yPos = 20 }
        pdf.setFont('helvetica', 'bold')
        pdf.setTextColor(150, 150, 150)
        pdf.text(`Sample #${idx + 1}`, 20, yPos)
        yPos += 5
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(80, 80, 80)
        const lines = pdf.splitTextToSize(post.text, 170)
        pdf.text(lines, 20, yPos)
        yPos += (lines.length * 5) + 6
      })
      pdf.save(`VeriDrive_Report_${user.username || 'manual'}.pdf`)
    } catch (e) {
      alert('Failed to generate PDF. Please try again.')
    }
  }

  if (error) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--background)', padding: 24 }}>
        <div style={{ maxWidth: 400, textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'oklch(0.65 0.24 25 / 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--foreground)' }}>Analysis Failed</h1>
          <p style={{ marginTop: 8, fontSize: 14, color: 'var(--muted-foreground)' }}>{error}</p>
          <a href="#/" className="btn-primary" style={{ display: 'inline-flex', marginTop: 24 }}>Back to Safety</a>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--background)' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.3em', color: 'var(--muted-foreground)' }}>Loading Analysis Results...</p>
        </div>
      </div>
    )
  }

  const { user, analysis, recent_posts } = data
  const score = analysis.risk_score / 100
  const rawDecision = analysis.decision.toUpperCase()
  let displayDecision = 'REVIEW'
  let decisionColor = 'var(--warning)'
  if (rawDecision.includes('APPROVE')) { displayDecision = 'APPROVE'; decisionColor = 'var(--success)' }
  else if (rawDecision.includes('REJECT') || rawDecision.includes('DECLINE')) { displayDecision = 'DECLINE'; decisionColor = 'var(--danger)' }

  const isManual = data.platform === 'Manual' || data.platform === 'ManualEntry' || data.platform === 'UserSubmitted'
  const tweetsPerDay = user.total_posts != null && user.account_age != null
    ? (user.total_posts / Math.max(1, parseInt(user.account_age))).toFixed(2) : null

  return (
    <div className="page">
      <SiteHeader />
      <CarSlideshow intensity="soft" />

      {/* Floating PDF button */}
      <div className="fab-pdf">
        <button onClick={handleDownloadPDF} className="btn-primary">
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
          Export PDF Report
        </button>
      </div>

      <main className="page-content" style={{ maxWidth: 1280, margin: '0 auto', padding: '128px 24px 80px' }}>
        {/* Header */}
        <div className="animate-float-up" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, marginBottom: 40 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4em', color: 'var(--ember)' }}>
              Decision report · {new Date().toLocaleDateString()}
            </div>
            <h1 style={{ marginTop: 8, fontFamily: 'var(--font-display)', fontSize: 'clamp(3rem, 8vw, 6rem)', lineHeight: 1 }}>
              {isManual ? user.display_name : `@${user.username}`}
            </h1>
            <div style={{ marginTop: 8, color: 'var(--muted-foreground)' }}>{isManual ? 'Manual Entry' : user.display_name}</div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <a href={isManual ? '#/manual' : 'http://localhost:8000/login/mastodon'} className="btn-secondary" style={{ padding: '8px 20px', fontSize: 11 }}>↻ Re-run</a>
            <button onClick={handleDownloadPDF} className="btn-primary" style={{ padding: '8px 20px', fontSize: 11 }}>Export PDF</button>
          </div>
        </div>

        {/* Hero row */}
        <div style={{ display: 'grid', gap: 24, gridTemplateColumns: '5fr 7fr', marginBottom: 24 }}>
          {/* Gauge */}
          <div className="glass animate-float-up" style={{ borderRadius: 20, padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', animationDelay: '0.1s' }}>
            <RiskGauge score={score} size={320} />
            <div className="grid-3" style={{ width: '100%', marginTop: 32, gap: 8 }}>
              {[
                { label: 'Low', range: '0–33', color: 'var(--success)' },
                { label: 'Medium', range: '34–66', color: 'var(--warning)' },
                { label: 'High', range: '67–100', color: 'var(--danger)' },
              ].map(b => (
                <div key={b.label} style={{ borderRadius: 8, border: '1px solid var(--border)', padding: '8px 4px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.25em', color: b.color }}>
                  {b.label}<br />{b.range}
                </div>
              ))}
            </div>
          </div>

          {/* Decision */}
          <div className="animate-float-up" style={{ position: 'relative', overflow: 'hidden', borderRadius: 20, border: `1px solid ${decisionColor}`, background: 'oklch(0.18 0.008 30 / 0.6)', padding: 32, backdropFilter: 'blur(20px)', boxShadow: `0 0 80px -20px ${decisionColor}`, animationDelay: '0.2s' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.4em', color: 'var(--muted-foreground)' }}>Final decision</div>
            <div style={{ marginTop: 16, fontFamily: 'var(--font-display)', fontSize: 'clamp(4rem, 11vw, 9rem)', lineHeight: 0.85, color: decisionColor }}>{displayDecision}</div>
            <p style={{ marginTop: 16, maxWidth: 400, fontSize: 14, color: 'var(--muted-foreground)', lineHeight: 1.6 }}>
              {displayDecision === 'APPROVE' ? 'Profile looks consistent with a normal user. Proceed with rental.'
                : displayDecision === 'REVIEW' ? 'Profile shows mixed signals. Manual verification recommended.'
                : 'Multiple high-risk indicators detected. Decline or request additional documents.'}
            </p>
            <div className="grid-4" style={{ marginTop: 32, gap: 12 }}>
              {[
                { label: 'Confidence', value: analysis.confidence },
                { label: 'Model', value: 'Risk Engine v3' },
                { label: 'Latency', value: analysis.latency },
                { label: 'Signals', value: recent_posts.length },
              ].map(m => (
                <div key={m.label} className="mini-stat">
                  <div className="mini-stat-label">{m.label}</div>
                  <div className="mini-stat-value">{m.value}</div>
                </div>
              ))}
            </div>
            <div style={{ position: 'absolute', right: -80, top: -80, width: 288, height: 288, borderRadius: '50%', background: decisionColor, opacity: 0.18, filter: 'blur(48px)', pointerEvents: 'none' }} />
          </div>
        </div>

        {/* Stats */}
        <div className="grid-4 animate-float-up" style={{ marginBottom: 24, animationDelay: '0.3s' }}>
          <div className="stat-card">
            <div className="stat-card-label">Followers</div>
            <div className="stat-card-value">{user.followers ?? 'N/A'}</div>
            {user.ff_ratio != null && <div className="stat-card-hint">F/F ratio · {user.ff_ratio}</div>}
          </div>
          <div className="stat-card">
            <div className="stat-card-label">Following</div>
            <div className="stat-card-value">{user.following ?? 'N/A'}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">Posts</div>
            <div className="stat-card-value">{user.total_posts ?? 'N/A'}</div>
            {tweetsPerDay && <div className="stat-card-hint">{tweetsPerDay} / day</div>}
          </div>
          <div className="stat-card accent">
            <div className="stat-card-label">Account age</div>
            <div className="stat-card-value">{user.account_age ?? 'N/A'}</div>
          </div>
        </div>

        {/* Rationale + Posts */}
        <div style={{ display: 'grid', gap: 24, gridTemplateColumns: '7fr 5fr' }}>
          {/* Rationale */}
          <div className="glass animate-float-up" style={{ borderRadius: 20, padding: 32, animationDelay: '0.4s' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.4em', color: 'var(--ember)' }}>AI rationale</div>
                <h2 style={{ marginTop: 4, fontFamily: 'var(--font-display)', fontSize: 28 }}>Why this decision</h2>
              </div>
              <span style={{ borderRadius: 100, border: '1px solid var(--border)', padding: '4px 12px', fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.3em', color: 'var(--muted-foreground)' }}>Explainable</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {analysis.reasons.map((reason, idx) => {
                const isPositive = reason.toLowerCase().includes('low risk') || reason.toLowerCase().includes('human')
                const sevColor = isPositive ? 'var(--success)' : 'var(--danger)'
                return (
                  <div key={idx} className="reason-item">
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <span className="reason-icon" style={{ color: sevColor, background: `${sevColor.replace(')', ' / 0.12)')}`, borderColor: `${sevColor.replace(')', ' / 0.4)')}` }}>
                        {isPositive ? '+' : '!'}
                      </span>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{reason}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Posts */}
          <div className="glass animate-float-up" style={{ borderRadius: 20, padding: 32, animationDelay: '0.5s' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.4em', color: 'var(--ember)', marginBottom: 4 }}>Recent activity</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, marginBottom: 24 }}>Posts reviewed</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {recent_posts.map((p, i) => (
                <div key={i} className="post-card">
                  <div className="post-card-label">Sample · #{i + 1}</div>
                  <div style={{ fontSize: 14, lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.text}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
