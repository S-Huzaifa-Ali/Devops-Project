import React, { useState, useEffect } from 'react'

// Use Unsplash car images (no local assets needed)
const slides = [
  'https://images.unsplash.com/photo-1617788138017-80ad40651399?q=80&w=2070&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1603584173870-7f3ca936a23f?q=80&w=2069&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=2070&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?q=80&w=2070&auto=format&fit=crop',
]

export default function CarSlideshow({ intensity = 'full' }) {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setCurrent((p) => (p + 1) % slides.length), 6000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="slideshow">
      {slides.map((src, idx) => (
        <div key={idx} className="slide" style={{ opacity: idx === current ? 1 : 0 }}>
          <img src={src} alt="" loading={idx === 0 ? 'eager' : 'lazy'} />
        </div>
      ))}
      <div className={`slide-overlay ${intensity === 'soft' ? 'soft' : ''}`} />
      <div className="slide-grid" />
      <div className="slide-glow" />
    </div>
  )
}
