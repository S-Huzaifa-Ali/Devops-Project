import React, { useState, useEffect, useRef } from 'react'
import { auth } from '../firebase.js'
import { onAuthStateChanged, signOut } from 'firebase/auth'

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

export default function SiteHeader() {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifs, setShowNotifs] = useState(false)
  const panelRef = useRef(null)

  useEffect(() => {
    setIsAdmin(!!localStorage.getItem('admin_token'))
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u)
      if (u) localStorage.setItem('firebase_user', JSON.stringify({ uid: u.uid, email: u.email }))
      else localStorage.removeItem('firebase_user')
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    if (!user) return
    const fetchNotifs = async () => {
      try {
        const token = await user.getIdToken()
        const res = await fetch(`${BACKEND}/user/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data = await res.json()
          setNotifications(data.notifications || [])
          setUnreadCount(data.unread_count || 0)
        }
      } catch (e) { /* silent */ }
    }
    fetchNotifs()
    const interval = setInterval(fetchNotifs, 15000)
    return () => clearInterval(interval)
  }, [user])

  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setShowNotifs(false)
    }
    if (showNotifs) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showNotifs])

  const markRead = async (notifId) => {
    if (!user) return
    try {
      const token = await user.getIdToken()
      await fetch(`${BACKEND}/user/notifications/${notifId}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      setNotifications((prev) => prev.map((n) => n.id === notifId ? { ...n, read: true } : n))
      setUnreadCount((c) => Math.max(0, c - 1))
    } catch (e) { /* silent */ }
  }

  const handleLogout = async () => {
    await signOut(auth)
    localStorage.removeItem('firebase_user')
    localStorage.removeItem('admin_token')
    window.location.hash = '/login'
  }

  const isLoggedIn = !!user || isAdmin
  const currentPath = window.location.hash.replace('#', '') || '/'

  return (
    <header className="site-header">
      <div className="site-header-inner">
        {/* Logo */}
        <a href="#/" className="logo">
          <div className="logo-mark"><div className="logo-dot" /></div>
          <span className="logo-text">VeriDrive</span>
        </a>

        {/* Nav */}
        <nav className="nav">
          <a href="#/" className={currentPath === '/' ? 'active' : ''}>Overview</a>
          <a href="#/admin" className={currentPath === '/admin' ? 'active' : ''}>Admin</a>
          <a href="#/#how">How it works</a>
        </nav>

        {/* Actions */}
        <div className="header-actions">
          {/* Notification bell */}
          {user && !isAdmin && (
            <div style={{ position: 'relative' }} ref={panelRef}>
              <button className="notif-btn" onClick={() => setShowNotifs(!showNotifs)} title="Notifications">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                  <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                </svg>
                {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
              </button>
              {showNotifs && (
                <div className="notif-panel">
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.3em', color: 'var(--muted-foreground)', marginBottom: 12 }}>
                    Notifications
                  </div>
                  {notifications.length === 0 ? (
                    <p style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>No notifications.</p>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id} className={`notif-item ${!n.read ? 'unread' : ''}`}>
                        <p style={{ fontSize: 12 }}>{n.message}</p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                          <span style={{ fontSize: 10, color: 'var(--muted-foreground)' }}>
                            {n.created_at?.toDate ? n.created_at.toDate().toLocaleString() : 'Just now'}
                          </span>
                          {!n.read && (
                            <button onClick={() => markRead(n.id)} style={{ fontSize: 10, color: 'var(--ember)', background: 'none', border: 'none', cursor: 'pointer' }}>
                              Mark read
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {isLoggedIn ? (
            <button className="btn-header danger" onClick={handleLogout}>Log Out</button>
          ) : (
            <>
              <a href="#/login" className="btn-header">Log In</a>
              <a href="#/signup" className="btn-header">Sign Up</a>
            </>
          )}
          <a href="http://localhost:8000/login/mastodon" className="btn-header ember">
            Run Check <span style={{ color: 'inherit' }}>→</span>
          </a>
        </div>
      </div>
    </header>
  )
}
