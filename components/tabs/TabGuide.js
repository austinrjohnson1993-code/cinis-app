import React, { useState } from 'react'
import styles from '../../styles/Dashboard.module.css'
import { GUIDE_TAG_COLORS, GUIDE_STRATEGIES, EmptyState } from './shared'

export default function TabGuide({ user, profile, showToast, switchTab, setCheckinInput }) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [guideExpandedCard, setGuideExpandedCard] = useState(null)
  const [guideSelectedFilter, setGuideSelectedFilter] = useState('All')
  const [guideBookmarks, setGuideBookmarks] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('cinis_guide_bookmarks')
        return saved ? JSON.parse(saved) : []
      } catch {
        return []
      }
    }
    return []
  })
  const [guideTried, setGuideTried] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('cinis_guide_tried')
        return saved ? JSON.parse(saved) : []
      } catch {
        return []
      }
    }
    return []
  })

  // ── Derived data ───────────────────────────────────────────────────────────
  const triedCount = guideTried.length
  const savedCount = guideBookmarks.length

  const forYouCards = [
    { id: 'fy1', icon: '🎙️', title: 'Try voice input', preview: 'Tap the mic. Say what you need done.', cta: 'Open Check-in', action: 'checkin' },
    { id: 'fy2', icon: '⭐', title: 'Star your #1 task', preview: 'One task. The whole system.', cta: 'Open Tasks', action: 'tasks' },
    { id: 'fy3', icon: '⏱️', title: 'Start a focus session', preview: 'Lock in for 25 minutes.', cta: 'Open Focus', action: 'focus' },
  ]

  const filteredStrategies = GUIDE_STRATEGIES.filter(s => {
    if (guideSelectedFilter === 'All') return true
    if (guideSelectedFilter === 'Saved') return guideBookmarks.includes(s.id)
    return s.tag === guideSelectedFilter
  })

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleBookmarkToggle = (e, strategyId) => {
    e.stopPropagation()
    const isBookmarked = guideBookmarks.includes(strategyId)
    const next = isBookmarked ? guideBookmarks.filter(id => id !== strategyId) : [...guideBookmarks, strategyId]
    setGuideBookmarks(next)
    localStorage.setItem('cinis_guide_bookmarks', JSON.stringify(next))
  }

  const handleTriedToggle = (strategyId) => {
    const isTried = guideTried.includes(strategyId)
    const next = isTried ? guideTried.filter(id => id !== strategyId) : [...guideTried, strategyId]
    setGuideTried(next)
    localStorage.setItem('cinis_guide_tried', JSON.stringify(next))
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ paddingBottom: '80px', background: '#211A14', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 14px 4px' }}>
        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#F5F0E3', fontFamily: "'Figtree', sans-serif" }}>Guide</h2>
        <span style={{ fontSize: '9px', color: '#F5F0E338', fontFamily: "'Figtree', sans-serif" }}>{triedCount} tried · {savedCount} saved</span>
      </div>
      <p style={{ margin: '0 14px 16px', fontSize: '9px', color: '#F5F0E350', fontFamily: "'Figtree', sans-serif", lineHeight: 1.5 }}>How to get the most out of Cinis — plus strategies that work.</p>

      {/* FOR YOU carousel */}
      <div style={{ marginBottom: '20px' }}>
        <p style={{ fontFamily: "'Figtree', sans-serif", fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', color: '#FF6644', marginBottom: '10px', marginLeft: '14px', letterSpacing: '0.08em' }}>⚡ For you right now</p>
        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingLeft: '14px', paddingRight: '14px', scrollBehavior: 'smooth' }}>
          {forYouCards.map(card => (
            <div key={card.id} style={{ minWidth: '190px', width: '190px', background: '#3E3228', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', borderTop: '2px solid #FF6644', flexShrink: 0 }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>{card.icon}</div>
              <p style={{ fontFamily: "'Figtree', sans-serif", fontWeight: '600', fontSize: '12px', color: '#F5F0E3', margin: '0 0 4px', lineHeight: 1.3 }}>{card.title}</p>
              <p style={{ fontFamily: "'Figtree', sans-serif", fontWeight: '400', fontSize: '10px', color: '#F5F0E350', margin: '0 0 10px', lineHeight: 1.4, flex: 1 }}>{card.preview}</p>
              <button onClick={() => switchTab(card.action)} style={{ background: '#FF6644', border: 'none', color: '#F5F0E3', fontFamily: "'Figtree', sans-serif", fontSize: '9px', fontWeight: '700', cursor: 'pointer', textAlign: 'center', padding: '5px 0', borderRadius: '6px', width: '100%' }}>{card.cta}</button>
            </div>
          ))}
        </div>
      </div>

      {/* FILTER CHIPS */}
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingLeft: '14px', paddingRight: '14px', marginBottom: '16px', scrollBehavior: 'smooth' }}>
        {['All', 'CINIS', 'QUICK WINS', 'SYSTEMS', 'FOCUS', 'FINANCE', 'NUTRITION', 'Saved'].map(filter => {
          const isActive = guideSelectedFilter === filter
          const label = filter === 'Saved' ? (savedCount > 0 ? `Saved ${savedCount}` : 'Saved') : filter
          return (
            <button key={filter} onClick={() => setGuideSelectedFilter(filter)}
              style={{
                flex: '0 0 auto', padding: '6px 12px', borderRadius: '20px',
                border: isActive ? '1px solid #FF6644' : 'none',
                background: isActive ? 'rgba(255,102,68,0.15)' : 'rgba(245,240,227,0.06)',
                color: isActive ? '#FF6644' : '#F5F0E350',
                fontFamily: "'Figtree', sans-serif", fontSize: '9px', fontWeight: '700',
                textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer', whiteSpace: 'nowrap'
              }}>
              {label}
            </button>
          )
        })}
      </div>

      {/* STRATEGY CARDS */}
      <div style={{ padding: '0 14px' }}>
        {filteredStrategies.map(strategy => {
          const tagColor = GUIDE_TAG_COLORS[strategy.tag] || '#FF6644'
          const isExpanded = guideExpandedCard === strategy.id
          const isBookmarked = guideBookmarks.includes(strategy.id)
          const isTried = guideTried.includes(strategy.id)
          return (
            <div key={strategy.id} style={{ marginBottom: '8px', background: '#3E3228', borderRadius: '10px', padding: '12px 14px', border: '1px solid #F5F0E318' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', cursor: 'pointer' }}
                onClick={() => setGuideExpandedCard(isExpanded ? null : strategy.id)}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: '20px', flexShrink: 0, marginTop: '1px' }}>{strategy.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: "'Figtree', sans-serif", fontWeight: '500', fontSize: '12px', color: '#F5F0E3', margin: '0 0 4px' }}>{strategy.title}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <span style={{ background: `${tagColor}26`, color: tagColor, padding: '2px 6px', borderRadius: '10px', fontSize: '6px', fontWeight: '700', fontFamily: "'Figtree', sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase' }}>{strategy.tag}</span>
                    </div>
                    {!isExpanded && <p style={{ fontFamily: "'Figtree', sans-serif", fontWeight: '400', fontSize: '10px', color: '#F5F0E350', margin: 0, lineHeight: 1.4 }}>{strategy.preview}</p>}
                  </div>
                </div>
                <button onClick={(e) => handleBookmarkToggle(e, strategy.id)} style={{ background: 'none', border: 'none', fontSize: '14px', cursor: 'pointer', padding: '0 0 0 8px', flexShrink: 0, opacity: isBookmarked ? 1 : 0.35, lineHeight: 1 }}>
                  🔖
                </button>
              </div>
              {isExpanded && (
                <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #F5F0E318' }}>
                  <p style={{ fontFamily: "'Figtree', sans-serif", fontWeight: '400', fontSize: '11px', color: '#F5F0E390', lineHeight: 1.65, margin: '0 0 12px' }}>{strategy.body}</p>
                  <button onClick={() => handleTriedToggle(strategy.id)} style={{ background: isTried ? '#4CAF50' : '#FF6644', color: '#F5F0E3', border: 'none', padding: '7px 16px', borderRadius: '6px', fontFamily: "'Figtree', sans-serif", fontSize: '10px', fontWeight: '600', cursor: 'pointer' }}>
                    {isTried ? 'Tried ✓' : 'This worked'}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* COACH CTA */}
      <div style={{ padding: '16px 14px 0' }}>
        <div style={{ background: '#3E3228', borderRadius: '10px', padding: '16px 14px', border: '1px solid #F5F0E318', textAlign: 'center' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#FF6644', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', fontSize: '14px', fontWeight: '700', fontFamily: "'Sora', sans-serif", color: '#211A14' }}>C</div>
          <p style={{ fontFamily: "'Figtree', sans-serif", fontWeight: '600', fontSize: '12px', color: '#F5F0E3', margin: '0 0 4px' }}>Need help with something specific?</p>
          <p style={{ fontFamily: "'Figtree', sans-serif", fontWeight: '400', fontSize: '10px', color: '#F5F0E350', margin: '0 0 12px' }}>Ask your coach in Check-in</p>
          <button onClick={() => { setCheckinInput('I want to talk through a strategy'); switchTab('checkin') }}
            style={{ background: '#FF6644', color: '#F5F0E3', border: 'none', padding: '9px 20px', borderRadius: '6px', fontFamily: "'Figtree', sans-serif", fontSize: '11px', fontWeight: '600', cursor: 'pointer', width: '100%' }}>
            Open Check-in
          </button>
        </div>
      </div>
    </div>
  )
}
