import React, { useState, useEffect } from 'react'
import SiteHeader from '../components/SiteHeader.jsx'
import CarSlideshow from '../components/CarSlideshow.jsx'
import { auth } from '../firebase.js'
import { onAuthStateChanged } from 'firebase/auth'

export default function LandingPage() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u)
      if (u) localStorage.setItem('firebase_user', JSON.stringify({ uid: u.uid, email: u.email }))
      else localStorage.removeItem('firebase_user')
    })
    return () => unsub()
  }, [])

  return (
    <div className="page">
      <SiteHeader />
      <CarSlideshow />

      {!user ? (
        /* ── Logged-out hero ── */
        <main className="page-content" style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '128px 24px 80px' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4em', color: 'var(--ember)' }}>Welcome</div>
            <h1 style={{ marginTop: 12, fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 8vw, 4rem)', lineHeight: 1 }}>VeriDrive</h1>
            <p style={{ marginTop: 16, color: 'var(--muted-foreground)', lineHeight: 1.6 }}>
              Sign in to analyze rental risk with AI-powered social signal verification.
            </p>
          </div>
          <div className="glass" style={{ borderRadius: 20, padding: 32, textAlign: 'center' }}>
            <a href="#/login" className="btn-primary" style={{ display: 'block', width: '100%', marginBottom: 16 }}>Log In</a>
            <p style={{ fontSize: 14, color: 'var(--muted-foreground)' }}>
              No account? <a href="#/signup" style={{ color: 'var(--ember)', textDecoration: 'none' }}>Sign up</a>
            </p>
          </div>
        </main>
      ) : (
        /* ── Logged-in hero ── */
        <main className="page-content" style={{ maxWidth: 1280, margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '128px 24px 80px' }}>
          {/* Marquee strip */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40, fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.3em', color: 'var(--muted-foreground)', overflow: 'hidden' }}>
            <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ color: 'var(--ember)' }}>●</span>
            <span>Live · Decision Engine v2.1</span>
            <span style={{ color: 'var(--ember)' }}>●</span>
            <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          <div style={{ display: 'grid', gap: 48, gridTemplateColumns: 'minmax(0,8fr) minmax(0,4fr)', alignItems: 'end' }}>
            {/* Left: headline */}
            <div className="animate-float-up">
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 100, border: '1px solid var(--border)', background: 'oklch(0.18 0.008 30 / 0.6)', padding: '6px 16px', fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.3em', color: 'var(--muted-foreground)', backdropFilter: 'blur(10px)', marginBottom: 24 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--ember)', animation: 'pulse-ring 1.8s infinite' }} />
                AI · Social Signal · Real-time
              </div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(3.5rem, 9vw, 8.5rem)', lineHeight: 0.85, letterSpacing: '-0.01em' }}>
                Approve <br />the right{' '}
                <span className="text-gradient-ember">drivers.</span>
              </h1>
              <p style={{ marginTop: 32, maxWidth: 560, fontSize: 18, lineHeight: 1.6, color: 'var(--muted-foreground)' }}>
                VeriDrive analyzes a customer's public Mastodon footprint with a tuned XGBoost model — surfacing risk in under{' '}
                <span style={{ color: 'var(--foreground)' }}>3 seconds</span>. No paperwork. No guesswork.
              </p>
              <div style={{ marginTop: 40, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16 }}>
                <a href="http://localhost:8000/login/mastodon" className="btn-primary">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.268 5.313c-.35-2.578-2.617-4.61-5.304-5.004C17.51.242 15.792 0 11.813 0h-.03c-3.98 0-4.835.242-5.288.309-2.723.4-4.99 2.426-5.304 5.004-.314 2.578-.34 5.405-.34 5.405s.026 2.827.34 5.405c.314 2.578 2.581 4.61 5.304 5.004.453.067 1.308.309 5.288.309h.03c3.98 0 5.697-.242 6.15-.309 2.687-.394 4.954-2.426 5.304-5.004.314-2.578.34-5.405.34-5.405s-.026-2.827-.34-5.405zm-4.337 9.537c0 .542-.44.982-.982.982H6.464c-.542 0-.982-.44-.982-.982V6.464c0-.542.44-.982.982-.982h11.485c.542 0 .982.44.982.982v8.386z"/>
                  </svg>
                  Login with Mastodon
                </a>
                <a href="#/manual" className="btn-secondary">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  Enter Manually
                </a>
              </div>
            </div>

            {/* Right: stat cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { k: 'Total checks', v: '1,284', note: '+12.4% week over week' },
                { k: 'High risk', v: '412', note: '32% of all checks' },
                { k: 'Low risk', v: '743', note: '58% approved' },
                { k: 'Avg. latency', v: '2.3s', note: 'p95 under 3s' },
              ].map((s, idx) => (
                <div key={s.k} className="glass animate-float-up" style={{ borderRadius: 16, padding: 20, animationDelay: `${0.2 + idx * 0.12}s` }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.3em', color: 'var(--muted-foreground)' }}>{s.k}</div>
                  <div style={{ marginTop: 4, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 36 }}>{s.v}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted-foreground)' }}>{s.note}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* How it works */}
          <div id="how" style={{ marginTop: 128, paddingBottom: 128 }}>
            <div style={{ textAlign: 'center', marginBottom: 64 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.4em', color: 'var(--ember)' }}>The Architecture</div>
              <h2 style={{ marginTop: 12, fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 6vw, 5rem)' }}>How VeriDrive Works</h2>
              <p style={{ marginTop: 24, maxWidth: 640, margin: '24px auto 0', fontSize: 18, color: 'var(--muted-foreground)', lineHeight: 1.6 }}>
                Our system transforms raw social footprints into defensible rental decisions using a sophisticated multi-stage MLOps pipeline.
              </p>
            </div>

            <div className="grid-3" style={{ marginBottom: 64 }}>
              {[
                { n: '01', t: 'Signal Harvesting', d: 'We fetch the latest 10 posts, profile bio, and metadata from Mastodon using OAuth 2.0. We clean the data by removing HTML tags and normalizing text for model ingestion.' },
                { n: '02', t: 'Dual-Model Inference', d: 'Two specialized models analyze the text: a Toxicity model (XGBoost) for harmful patterns and a Sentiment model (DistilBERT-style) for behavioral context.' },
                { n: '03', t: 'Context-Aware Fusion', d: 'The Risk Engine combines signals. If a post is "Offensive" but has "Positive" sentiment (casual banter), the engine automatically discounts the risk to prevent false positives.' },
              ].map((step) => (
                <div key={step.n} className="glass" style={{ borderRadius: 20, padding: 40, position: 'relative', overflow: 'hidden', transition: 'transform 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-8px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <div style={{ width: 64, height: 64, borderRadius: 16, backgroundImage: 'var(--gradient-ember)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 32, boxShadow: 'var(--shadow-ember)' }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'oklch(0.12 0.005 30)' }}>{step.n}</span>
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.4em', color: 'var(--ember)', marginBottom: 16 }}>Phase {step.n}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, marginBottom: 16 }}>{step.t}</div>
                  <div style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--muted-foreground)' }}>{step.d}</div>
                </div>
              ))}
            </div>

            {/* Formula card */}
            <div className="glass" style={{ borderRadius: 32, overflow: 'hidden', border: '1px solid oklch(1 0 0 / 0.05)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                <div style={{ padding: 64 }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.4em', color: 'var(--ember)' }}>The Decision Brain</div>
                  <h3 style={{ marginTop: 8, fontFamily: 'var(--font-display)', fontSize: 40 }}>Risk Aggregation</h3>
                  <p style={{ marginTop: 32, fontSize: 15, lineHeight: 1.7, color: 'var(--muted-foreground)' }}>
                    VeriDrive doesn't just average scores. Our engine uses a weighted fusion formula designed to catch rare but dangerous signals while respecting overall user behavior.
                  </p>
                  <div style={{ marginTop: 48, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {[
                      { l: 'Toxicity Signal', p: '70%', d: 'Focuses on hate speech, threats, and harassment markers.', icon: '⚠️' },
                      { l: 'Sentiment Context', p: '30%', d: 'Analyzes general mood to differentiate between aggression and enthusiasm.', icon: '🧠' },
                    ].map((item) => (
                      <div key={item.l} style={{ borderRadius: 16, border: '1px solid var(--border)', background: 'oklch(0.14 0.005 30 / 0.4)', padding: 24, transition: 'border-color 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = 'oklch(0.68 0.19 38 / 0.4)'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{ fontSize: 20 }}>{item.icon}</span>
                            <span style={{ fontWeight: 600, fontSize: 16 }}>{item.l}</span>
                          </div>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 20, color: 'var(--ember)' }}>{item.p}</span>
                        </div>
                        <p style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>{item.d}</p>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 48, borderRadius: 24, background: 'oklch(0.68 0.19 38 / 0.05)', border: '1px solid oklch(0.68 0.19 38 / 0.2)', padding: 32 }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.3em', color: 'oklch(0.68 0.19 38 / 0.6)', marginBottom: 16 }}>The Formula</div>
                    <code style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 16, color: 'var(--ember)', background: 'oklch(0 0 0 / 0.4)', padding: 16, borderRadius: 12, border: '1px solid oklch(1 0 0 / 0.05)' }}>
                      Score = 0.7 * max(signals) + 0.3 * mean(signals)
                    </code>
                  </div>
                </div>
                <div style={{ padding: 64, background: 'linear-gradient(135deg, oklch(0.18 0.008 30), var(--background))', borderLeft: '1px solid oklch(1 0 0 / 0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
                  {[
                    { label: 'Safe Profile', color: 'var(--success)', text: '"I love this new rental service! Best experience ever."', tags: ['Positive Sentiment', 'Low Toxicity'], delay: '0.1s' },
                    { label: 'High Risk', color: 'var(--danger)', text: '"This is unacceptable. I will make sure everyone knows... [Flagged Content]"', tags: ['High Toxicity', 'Negative Sentiment'], delay: '0.3s' },
                  ].map((ex) => (
                    <div key={ex.label} className="glass animate-float-up" style={{ width: '100%', maxWidth: 400, borderRadius: 24, padding: 32, border: `1px solid ${ex.color}30`, animationDelay: ex.delay }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                        <div style={{ width: 12, height: 12, borderRadius: '50%', background: ex.color, animation: 'pulse-ring 1.8s infinite' }} />
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.3em', color: ex.color, fontWeight: 700 }}>{ex.label}</span>
                      </div>
                      <p style={{ fontSize: 14, color: 'var(--foreground)', opacity: 0.8, marginBottom: 16 }}>{ex.text}</p>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {ex.tags.map((tag) => (
                          <span key={tag} style={{ padding: '4px 12px', borderRadius: 100, background: `${ex.color}1a`, border: `1px solid ${ex.color}33`, fontSize: 10, color: ex.color, fontFamily: 'var(--font-mono)' }}>{tag}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      )}
    </div>
  )
}
