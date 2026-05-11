import React, { useState, useEffect } from 'react'
import SiteHeader from '../components/SiteHeader.jsx'
import CarSlideshow from '../components/CarSlideshow.jsx'
import { auth } from '../firebase.js'
import { onAuthStateChanged } from 'firebase/auth'

const BACKEND = 'http://localhost:8000'
const MAX_POSTS = 10

export default function ManualPage() {
  const [bio, setBio] = useState('')
  const [posts, setPosts] = useState([''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [user, setUser] = useState(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u))
    return () => unsub()
  }, [])

  const updatePost = (idx, val) => {
    const next = [...posts]
    next[idx] = val
    setPosts(next)
  }
  const addPost = () => { if (posts.length < MAX_POSTS) setPosts([...posts, '']) }
  const removePost = (idx) => { if (posts.length > 1) setPosts(posts.filter((_, i) => i !== idx)) }

  const handleSubmit = async () => {
    const validPosts = posts.map(p => p.trim()).filter(p => p.length > 0)
    if (validPosts.length === 0) { setError('Enter at least one post.'); return }
    setLoading(true)
    setError('')
    try {
      let res
      if (user) {
        const token = await user.getIdToken()
        res = await fetch(`${BACKEND}/user/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ posts: validPosts, bio: bio.trim() }),
        })
      } else {
        res = await fetch(`${BACKEND}/analyze/manual/text`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ posts: validPosts, bio: bio.trim() }),
        })
      }
      const data = await res.json()
      if (data.error) { setError(data.error); setLoading(false); return }
      const p = new URLSearchParams()
      p.set('id', data.result_id)
      p.set('mode', 'manual')
      window.location.hash = '/analyze?' + p.toString()
    } catch (err) {
      setError('Network error. Ensure the backend is running.')
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <SiteHeader />
      <CarSlideshow intensity="soft" />
      <main className="page-content" style={{ maxWidth: 768, margin: '0 auto', padding: '128px 24px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4em', color: 'var(--ember)' }}>Manual Entry</div>
          <h1 style={{ marginTop: 12, fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 7vw, 5rem)', lineHeight: 1 }}>Enter posts directly</h1>
          <p style={{ marginTop: 16, color: 'var(--muted-foreground)', maxWidth: 480, margin: '16px auto 0' }}>
            Provide up to 10 text posts. Our engine will analyze them without requiring a social login.
          </p>
        </div>

        <div className="glass" style={{ borderRadius: 20, padding: 32 }}>
          {/* Bio */}
          <div style={{ marginBottom: 24 }}>
            <label className="label">Profile Bio (optional)</label>
            <textarea className="input" value={bio} onChange={e => setBio(e.target.value)} rows={2} placeholder="Paste a short bio if you have one..." />
          </div>

          {/* Posts */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {posts.map((post, idx) => (
              <div key={idx}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label className="label" style={{ margin: 0 }}>Post #{idx + 1}</label>
                  {posts.length > 1 && (
                    <button onClick={() => removePost(idx)} style={{ fontSize: 11, color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>
                      Remove
                    </button>
                  )}
                </div>
                <textarea className="input" value={post} onChange={e => updatePost(idx, e.target.value)} rows={3} placeholder="Paste post content here..." />
              </div>
            ))}
            {posts.length < MAX_POSTS && (
              <button onClick={addPost} style={{ width: '100%', padding: 12, borderRadius: 12, border: '1px dashed var(--border)', background: 'none', color: 'var(--muted-foreground)', cursor: 'pointer', fontSize: 14, transition: 'border-color 0.2s, color 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--ember)'; e.currentTarget.style.color = 'var(--foreground)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted-foreground)' }}
              >
                + Add another post ({posts.length}/{MAX_POSTS})
              </button>
            )}
          </div>

          {error && <div className="alert-error" style={{ marginTop: 16 }}>{error}</div>}

          <button onClick={handleSubmit} className="btn-primary" style={{ width: '100%', marginTop: 24 }} disabled={loading}>
            {loading ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                Analyzing...
              </span>
            ) : 'Run Analysis'}
          </button>

          <p style={{ marginTop: 16, textAlign: 'center', fontSize: 11, color: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' }}>
            Social metrics (followers, following, account age) will be unavailable for manual entries.
          </p>
        </div>
      </main>
    </div>
  )
}
