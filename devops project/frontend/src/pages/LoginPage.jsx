import React, { useState, useEffect } from 'react'
import SiteHeader from '../components/SiteHeader.jsx'
import CarSlideshow from '../components/CarSlideshow.jsx'
import { auth } from '../firebase.js'
import { signInWithEmailAndPassword } from 'firebase/auth'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => { setIsAdmin(!!localStorage.getItem('admin_token')) }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      window.location.hash = '/'
    } catch (err) {
      setError(err.message || 'Login failed.')
      setLoading(false)
    }
  }

  if (isAdmin) {
    return (
      <div className="page">
        <SiteHeader />
        <CarSlideshow />
        <main className="page-content" style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '128px 24px 80px', textAlign: 'center' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, color: 'var(--danger)' }}>Access Denied</h1>
          <p style={{ marginTop: 16, color: 'var(--muted-foreground)' }}>You are currently logged in as an Admin. Please log out first.</p>
        </main>
      </div>
    )
  }

  return (
    <div className="page">
      <SiteHeader />
      <CarSlideshow />
      <main className="page-content" style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '128px 24px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4em', color: 'var(--ember)' }}>Welcome back</div>
          <h1 style={{ marginTop: 12, fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 8vw, 4rem)', lineHeight: 1 }}>Log In</h1>
          <p style={{ marginTop: 16, color: 'var(--muted-foreground)' }}>Sign in to view your analyses and notifications.</p>
        </div>

        <form onSubmit={handleLogin} className="glass" style={{ borderRadius: 20, padding: 32 }}>
          <div style={{ marginBottom: 16 }}>
            <label className="label">Email</label>
            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label className="label">Password</label>
            <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" required />
          </div>
          {error && <div className="alert-error" style={{ marginBottom: 16 }}>{error}</div>}
          <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
          <p style={{ marginTop: 24, textAlign: 'center', fontSize: 14, color: 'var(--muted-foreground)' }}>
            No account? <a href="#/signup" style={{ color: 'var(--ember)', textDecoration: 'none' }}>Sign up</a>
          </p>
        </form>
      </main>
    </div>
  )
}
