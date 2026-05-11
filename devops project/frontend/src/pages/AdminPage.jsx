import React, { useState, useEffect } from 'react'
import SiteHeader from '../components/SiteHeader.jsx'
import CarSlideshow from '../components/CarSlideshow.jsx'
import { auth } from '../firebase.js'
import { onAuthStateChanged } from 'firebase/auth'

const BACKEND = 'http://localhost:8000'

export default function AdminPage() {
  const [token, setToken] = useState(null)
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [loginError, setLoginError] = useState('')
  const [reviewing, setReviewing] = useState(null)
  const [reviewNote, setReviewNote] = useState('')
  const [viewingPosts, setViewingPosts] = useState(null)
  const [isFirebaseUser, setIsFirebaseUser] = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setIsFirebaseUser(!!u))
    return () => unsub()
  }, [])

  useEffect(() => { setToken(localStorage.getItem('admin_token')) }, [])

  const fetchRecords = async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch(`${BACKEND}/admin/records`, { headers: { 'X-Admin-Token': token } })
      if (res.status === 401) { localStorage.removeItem('admin_token'); setToken(null); setError('Session expired.'); return }
      const data = await res.json()
      setRecords(data.records || [])
    } catch (e) { setError('Failed to fetch records.') }
    finally { setLoading(false) }
  }

  useEffect(() => {
    if (token) {
      fetchRecords()
      const interval = setInterval(fetchRecords, 10000)
      return () => clearInterval(interval)
    }
  }, [token])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoginError('')
    try {
      const res = await fetch(`${BACKEND}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      })
      if (!res.ok) { setLoginError('Invalid credentials.'); return }
      const data = await res.json()
      localStorage.setItem('admin_token', data.token)
      setToken(data.token)
    } catch { setLoginError('Network error.') }
  }

  const handleDecide = async (recordId, decision) => {
    if (!token) return
    try {
      const res = await fetch(`${BACKEND}/admin/records/${recordId}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token },
        body: JSON.stringify({ decision, notes: reviewNote }),
      })
      if (res.ok) { setReviewing(null); setReviewNote(''); fetchRecords() }
    } catch { setError('Failed to submit decision.') }
  }

  const handleLogout = () => { localStorage.removeItem('admin_token'); setToken(null); setRecords([]) }

  const total = records.length
  const approved = records.filter(r => r.status === 'AUTO_APPROVED' || r.status === 'ADMIN_APPROVED').length
  const declined = records.filter(r => r.status === 'AUTO_DECLINED' || r.status === 'ADMIN_DECLINED').length
  const needsReview = records.filter(r => r.status === 'NEEDS_REVIEW').length

  // Access denied for Firebase users
  if (!token && isFirebaseUser) {
    return (
      <div className="page">
        <SiteHeader />
        <CarSlideshow />
        <main className="page-content" style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '128px 24px 80px', textAlign: 'center' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, color: 'var(--danger)' }}>Access Denied</h1>
          <p style={{ marginTop: 16, color: 'var(--muted-foreground)' }}>You are currently logged in as a user. Please log out first to access the Admin Dashboard.</p>
        </main>
      </div>
    )
  }

  // Login form
  if (!token) {
    return (
      <div className="page">
        <SiteHeader />
        <CarSlideshow intensity="soft" />
        <main className="page-content" style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '128px 24px 80px' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4em', color: 'var(--ember)' }}>Restricted</div>
            <h1 style={{ marginTop: 12, fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 8vw, 4rem)', lineHeight: 1 }}>Admin Access</h1>
          </div>
          <form onSubmit={handleLogin} className="glass" style={{ borderRadius: 20, padding: 32 }}>
            <div style={{ marginBottom: 16 }}>
              <label className="label">Username</label>
              <input className="input" type="text" value={loginForm.username} onChange={e => setLoginForm({ ...loginForm, username: e.target.value })} required />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label className="label">Password</label>
              <input className="input" type="password" value={loginForm.password} onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} required />
            </div>
            {loginError && <div className="alert-error" style={{ marginBottom: 16 }}>{loginError}</div>}
            <button type="submit" className="btn-primary" style={{ width: '100%' }}>Sign In</button>
          </form>
        </main>
      </div>
    )
  }

  // Dashboard
  return (
    <div className="page">
      <SiteHeader />
      <CarSlideshow intensity="soft" />
      <main className="page-content" style={{ maxWidth: 1280, margin: '0 auto', padding: '128px 24px 80px' }}>
        {/* Header */}
        <div className="animate-float-up" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24, marginBottom: 40 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4em', color: 'var(--ember)' }}>Operations · live</div>
            <h1 style={{ marginTop: 8, fontFamily: 'var(--font-display)', fontSize: 'clamp(3rem, 8vw, 6rem)', lineHeight: 1 }}>Command Center</h1>
          </div>
          <button onClick={handleLogout} className="btn-header danger">Log Out</button>
        </div>

        {/* Stats */}
        <div className="grid-4 animate-float-up" style={{ marginBottom: 24, animationDelay: '0.1s' }}>
          <div className="stat-card"><div className="stat-card-label">Total checks</div><div className="stat-card-value">{total}</div><div className="stat-card-hint">All submissions</div></div>
          <div className="stat-card accent"><div className="stat-card-label">Needs review</div><div className="stat-card-value">{needsReview}</div><div className="stat-card-hint">Pending admin action</div></div>
          <div className="stat-card"><div className="stat-card-label">Approved</div><div className="stat-card-value">{approved}</div><div className="stat-card-hint">Auto + admin</div></div>
          <div className="stat-card"><div className="stat-card-label">Declined</div><div className="stat-card-value">{declined}</div><div className="stat-card-hint">Auto + admin</div></div>
        </div>

        {/* Records table */}
        <div className="glass animate-float-up" style={{ borderRadius: 20, overflow: 'hidden', animationDelay: '0.2s' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', padding: 24 }}>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.4em', color: 'var(--ember)' }}>Stream</div>
              <h2 style={{ marginTop: 4, fontFamily: 'var(--font-display)', fontSize: 28 }}>Analysis Records</h2>
            </div>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.3em', color: 'var(--muted-foreground)' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--ember)', animation: 'pulse-ring 1.8s infinite' }} /> live
            </span>
          </div>

          {loading && records.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted-foreground)' }}>Loading records...</div>
          ) : records.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted-foreground)' }}>No records yet.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Score</th>
                    <th>AI Decision</th>
                    <th>Status</th>
                    <th>Posts</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => {
                    const aiScore = r.ai_result?.risk_score ?? 0
                    const aiDecision = r.ai_result?.decision ?? 'UNKNOWN'
                    const needsAction = r.status === 'NEEDS_REVIEW'
                    const color = (r.status === 'AUTO_APPROVED' || r.status === 'ADMIN_APPROVED') ? 'var(--success)'
                      : (r.status === 'AUTO_DECLINED' || r.status === 'ADMIN_DECLINED') ? 'var(--danger)'
                      : 'var(--warning)'
                    return (
                      <tr key={r.id}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{r.user_email || r.user_id || 'Unknown'}</div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted-foreground)' }}>{r.user_display_name}</div>
                        </td>
                        <td>
                          <div className="score-bar-wrap">
                            <span style={{ fontFamily: 'var(--font-display)', fontSize: 24, color }}>{aiScore}</span>
                            <div className="score-bar-track">
                              <div className="score-bar-fill" style={{ width: `${Math.min(aiScore, 100)}%`, background: color }} />
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="decision-badge" style={{ color, borderColor: color }}>
                            {aiDecision.replace(' CAR RENTAL', '').replace(' CUSTOMER', '')}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color }}>{r.status?.replace(/_/g, ' ')}</td>
                        <td style={{ cursor: 'pointer' }} onClick={() => setViewingPosts(r.posts || [])}>
                          <div style={{ maxWidth: 200 }}>
                            {r.posts?.slice(0, 2).map((p, i) => {
                              const text = typeof p === 'string' ? p : p.text
                              return <p key={i} style={{ fontSize: 12, color: 'var(--muted-foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }} title={text}>{text}</p>
                            })}
                            {(r.posts?.length || 0) > 2 && <p style={{ fontSize: 10, color: 'var(--ember)', marginTop: 4 }}>View all {r.posts.length} posts</p>}
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {needsAction ? (
                            reviewing === r.id ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                                <input className="input" type="text" value={reviewNote} onChange={e => setReviewNote(e.target.value)} placeholder="Note (optional)" style={{ width: 120, padding: '4px 8px', fontSize: 12 }} />
                                <button onClick={() => handleDecide(r.id, 'APPROVE')} style={{ padding: '4px 12px', borderRadius: 8, background: 'oklch(0.72 0.17 145 / 0.2)', border: 'none', color: 'var(--success)', cursor: 'pointer', fontSize: 12 }}>Approve</button>
                                <button onClick={() => handleDecide(r.id, 'DECLINE')} style={{ padding: '4px 12px', borderRadius: 8, background: 'oklch(0.65 0.24 25 / 0.2)', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 12 }}>Decline</button>
                                <button onClick={() => { setReviewing(null); setReviewNote('') }} style={{ fontSize: 10, color: 'var(--muted-foreground)', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
                              </div>
                            ) : (
                              <button onClick={() => { setReviewing(r.id); setReviewNote('') }} style={{ padding: '8px 16px', borderRadius: 100, background: 'oklch(0.82 0.17 85 / 0.2)', border: 'none', color: 'var(--warning)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Review</button>
                            )
                          ) : r.admin_review ? (
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted-foreground)' }}>
                              {r.admin_review.decision} by {r.admin_review.reviewed_by}
                            </span>
                          ) : (
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted-foreground)' }}>—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {error && <div className="alert-error" style={{ marginTop: 16 }}>{error}</div>}
      </main>

      {/* Posts modal */}
      {viewingPosts && (
        <div className="modal-backdrop" onClick={() => setViewingPosts(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.4em', color: 'var(--ember)' }}>Details</div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 24, marginTop: 4 }}>User Posts</h3>
              </div>
              <button className="modal-close" onClick={() => setViewingPosts(null)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {viewingPosts.map((p, i) => {
                const text = typeof p === 'string' ? p : p.text
                return (
                  <div key={i} className="post-card">
                    <div className="post-card-label">Post #{i + 1}</div>
                    <div style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{text}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
