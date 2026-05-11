import React, { useState, useEffect } from 'react'
import LandingPage from './pages/LandingPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import SignupPage from './pages/SignupPage.jsx'
import ManualPage from './pages/ManualPage.jsx'
import AnalyzePage from './pages/AnalyzePage.jsx'
import ResultPage from './pages/ResultPage.jsx'
import AdminPage from './pages/AdminPage.jsx'

// Simple hash-based router
function getRoute() {
  const hash = window.location.hash.replace('#', '') || '/'
  const [path, search] = hash.split('?')
  const params = new URLSearchParams(search || '')
  return { path, params }
}

export default function App() {
  const [route, setRoute] = useState(getRoute())

  useEffect(() => {
    const handler = () => setRoute(getRoute())
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [])

  // Also handle popstate for programmatic navigation
  useEffect(() => {
    const handler = () => setRoute(getRoute())
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [])

  const { path, params } = route

  if (path === '/login') return <LoginPage />
  if (path === '/signup') return <SignupPage />
  if (path === '/manual') return <ManualPage />
  if (path === '/analyze') return <AnalyzePage params={params} />
  if (path === '/result') return <ResultPage params={params} />
  if (path === '/admin') return <AdminPage />
  return <LandingPage />
}

// Navigation helper — use this everywhere instead of window.location
export function navigate(path, searchParams) {
  const search = searchParams ? '?' + searchParams.toString() : ''
  window.location.hash = path + search
}
