import React, { useState } from 'react'
import styles from '../../styles/Dashboard.module.css'

export default function TabNutrition({ user, profile, showToast, loggedFetch }) {
  const [nutrSubTab, setNutrSubTab] = useState('log')
  const [nutrWaterCount, setNutrWaterCount] = useState(6)

  const COL = {
    coal: '#211A14', char: '#3E3228', ash: '#F5F0E3',
    ember: '#E8321A', hot: '#FF6644', green: '#4CAF50',
    blue: '#3B8BD4', dim: '#F5F0E390', faint: '#F5F0E360',
    ghost: '#F5F0E350', micro: '#F5F0E338', border: '#F5F0E318',
    charBorder: '#F5F0E31E', charLight: '#F5F0E30C',
  }
  const fig = "'Figtree', -apple-system, sans-serif"
  const sora = "'Sora', sans-serif"

  const MacroRing = ({ value, target, label, color, unit = '' }) => (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <div style={{ position: 'relative', width: 48, height: 48, margin: '0 auto 4px' }}>
        <svg width="100%" height="100%" viewBox="0 0 48 48">
          <circle cx="24" cy="24" r="20" fill="none" stroke={COL.charLight} strokeWidth="4"/>
          <circle cx="24" cy="24" r="20" fill="none" stroke={color} strokeWidth="4"
            strokeLinecap="round" strokeDasharray="126"
            strokeDashoffset={126 - (126 * Math.min(value / target, 1))}
            transform="rotate(-90 24 24)"/>
        </svg>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontFamily: sora, fontSize: 11, fontWeight: 600, color }}>{value}{unit}</div>
      </div>
      <div style={{ fontSize: 9, color: COL.ghost, fontFamily: fig }}>/ {target}{unit}</div>
      <div style={{ fontSize: 9, color: COL.faint, fontFamily: fig, marginTop: 1, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
    </div>
  )

  const NCard = ({ children, style, borderLeft }) => (
    <div style={{ background: COL.char, borderRadius: 10, padding: 12, marginBottom: 8, borderLeft: borderLeft || 'none', ...style }}>{children}</div>
  )

  const NRow = ({ children, style }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', ...style }}>{children}</div>
  )

  const SLabel = ({ children, color }) => (
    <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: color || COL.ghost, fontFamily: fig, marginBottom: 6, marginTop: 10 }}>{children}</div>
  )

  const NTag = ({ bg, color, children }) => (
    <span style={{ display: 'inline-block', fontFamily: fig, fontSize: 9, borderRadius: 4, padding: '2px 8px', background: bg, color }}>{children}</span>
  )

  const NChip = ({ active, children }) => (
    <span style={{ padding: '5px 12px', borderRadius: 14, fontFamily: fig, fontSize: 10, background: active ? COL.ember : COL.char, color: active ? COL.ash : COL.dim }}>{children}</span>
  )

  const nutrTabs = ['Log', 'Stack', 'Meals', 'Body', 'Knowledge', 'Learn', 'Insights']

  // ── LOG ──
  const logContent = (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <MacroRing value={1840} target={2400} label="Calories" color={COL.ember} />
        <MacroRing value={128} target={180} label="Protein" color={COL.hot} unit="g" />
        <MacroRing value={195} target={280} label="Carbs" color={COL.dim} unit="g" />
        <MacroRing value={52} target={80} label="Fat" color={COL.dim} unit="g" />
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <div style={{ flex: 1, background: COL.char, borderRadius: 10, padding: 10, marginBottom: 0 }}>
          <NRow>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: COL.blue, fontFamily: fig, marginBottom: 0 }}>Water</div>
            <span style={{ fontSize: 9, color: COL.ghost, fontFamily: fig }}>{nutrWaterCount} / 10 glasses</span>
          </NRow>
          <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i}
                onClick={() => setNutrWaterCount(i < nutrWaterCount ? i : i + 1)}
                style={{ width: 18, height: 18, borderRadius: '50%', background: i < nutrWaterCount ? `${COL.blue}30` : 'transparent', border: `1px solid ${i < nutrWaterCount ? `${COL.blue}60` : COL.charBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: i < nutrWaterCount ? COL.blue : COL.micro, cursor: 'pointer' }}>
                {i < nutrWaterCount ? '✓' : ''}
              </div>
            ))}
          </div>
        </div>
        <div style={{ flex: '0 0 85px', background: COL.char, borderRadius: 10, padding: 10, marginBottom: 0, textAlign: 'center' }}>
          <div style={{ fontFamily: sora, fontSize: 20, fontWeight: 600, color: COL.hot }}>52g</div>
          <div style={{ fontSize: 9, color: COL.ghost, fontFamily: fig }}>protein left</div>
          <div style={{ fontSize: 8, color: COL.micro, fontFamily: fig, marginTop: 2 }}>~2 scoops or 7oz chicken</div>
        </div>
      </div>
      <NRow style={{ margin: '8px 0 6px' }}>
        <SLabel>Today's meals</SLabel>
        <span style={{ fontSize: 10, color: COL.ember, fontFamily: fig }}>+ Log meal</span>
      </NRow>
      {[
        { name: 'Breakfast', time: '9:15 AM', food: '4 eggs scrambled, 2 toast, coffee w/ cream', cal: 540, p: 32, carb: 38, f: 28 },
        { name: 'Pre-workout', time: '12:30 PM', food: 'Protein shake (2 scoops whey, banana, 2 tbsp PB, 1/2 cup oats)', cal: 620, p: 48, carb: 72, f: 12 },
        { name: 'Post-workout', time: '2:45 PM', food: 'Chicken breast 8oz, 1.5 cup white rice, 1 cup broccoli', cal: 680, p: 48, carb: 85, f: 12 },
      ].map((ml, i) => (
        <NCard key={i} style={{ padding: 10, borderRadius: 8 }}>
          <NRow style={{ marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: COL.ash, fontFamily: fig }}>{ml.name}</span>
            <span style={{ fontSize: 9, color: COL.ghost, fontFamily: fig, background: COL.charLight, padding: '2px 6px', borderRadius: 4 }}>{ml.time}</span>
          </NRow>
          <div style={{ fontSize: 11, color: `${COL.ash}aa`, fontFamily: fig }}>{ml.food}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            {[['cal', ml.cal], ['P', ml.p + 'g'], ['C', ml.carb + 'g'], ['F', ml.f + 'g']].map(([l, v]) => (
              <span key={l} style={{ fontSize: 10, color: COL.faint, fontFamily: fig }}>
                <span style={{ color: COL.ash }}>{v}</span> {l}
              </span>
            ))}
          </div>
        </NCard>
      ))}
      <div style={{ border: `0.5px dashed ${COL.charBorder}`, borderRadius: 8, padding: 10, marginBottom: 8 }}>
        <NRow>
          <span style={{ fontSize: 13, color: COL.ghost, fontFamily: fig }}>Dinner</span>
          <span style={{ fontSize: 9, color: COL.ghost, fontFamily: fig }}>Not logged</span>
        </NRow>
        <div style={{ fontSize: 11, color: COL.dim, fontFamily: fig, fontStyle: 'italic', marginTop: 4 }}>52g protein remaining — hit it here</div>
      </div>
      <NCard>
        <SLabel>Quick add</SLabel>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {['Protein shake', 'Chicken + rice', 'Eggs', 'Protein bar', '+ Custom'].map(m => (
            <div key={m} style={{ background: COL.coal, border: `0.5px solid ${COL.charBorder}`, borderRadius: 6, padding: '5px 10px', fontSize: 10, color: COL.dim, fontFamily: fig }}>{m}</div>
          ))}
        </div>
        <div style={{ fontSize: 9, color: COL.ghost, fontFamily: fig, marginTop: 6 }}>Saved meals auto-fill macros. Tap or type anything — AI estimates the rest.</div>
      </NCard>
    </div>
  )

  // ── STACK ──
  const stackContent = (
    <div>
      <NRow style={{ marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: COL.dim, fontFamily: fig }}>Your supplement stack. Tap to edit.</span>
        <span style={{ fontSize: 10, color: COL.ember, fontFamily: fig }}>+ Add</span>
      </NRow>
      {[
        { label: 'Morning — with breakfast', color: COL.hot, items: [
          { name: 'Creatine Monohydrate', dose: '5g', note: 'Daily · No cycling', pct: 92 },
          { name: 'Vitamin D3', dose: '5000 IU', note: 'Daily · With fat', pct: 88 },
          { name: 'Magnesium Glycinate', dose: '400mg', note: 'Daily', pct: 85 },
        ]},
        { label: 'Pre-workout — 30 min before', color: COL.ember, items: [
          { name: 'L-Citrulline', dose: '6g', note: 'Training days only', pct: 71 },
          { name: 'Caffeine + L-Theanine', dose: '200/100mg', note: 'Training days', pct: 80 },
        ]},
        { label: 'Evening — with dinner', color: COL.ghost, items: [
          { name: 'Omega-3 Fish Oil', dose: '2000mg', note: 'Daily', pct: 64 },
          { name: 'ZMA', dose: 'Zinc 30mg + Mag', note: 'Empty stomach', pct: 58 },
        ]},
      ].map((g, gi) => (
        <div key={gi}>
          <SLabel color={g.color}>{g.label}</SLabel>
          {g.items.map((item, i) => (
            <NCard key={i} style={{ padding: 10 }}>
              <NRow>
                <div>
                  <span style={{ fontSize: 12, fontWeight: 500, color: COL.ash, fontFamily: fig }}>{item.name}</span>
                  <div style={{ fontSize: 9, color: COL.ghost, fontFamily: fig }}>{item.dose} · {item.note}</div>
                </div>
                <span style={{ fontSize: 9, color: item.pct >= 80 ? COL.green : item.pct >= 65 ? COL.hot : COL.ember, fontFamily: fig }}>{item.pct}%</span>
              </NRow>
            </NCard>
          ))}
        </div>
      ))}
      <div style={{ height: 0.5, background: COL.border, margin: '12px 0' }}/>
      <NCard borderLeft={`3px solid ${COL.hot}`}>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: COL.hot, fontFamily: fig, marginBottom: 4 }}>Stack tip</div>
        <div style={{ fontSize: 11, color: `${COL.ash}aa`, fontFamily: fig, lineHeight: 1.5 }}>Evening stack is 61% vs 88% morning. Move ZMA to 30 min before bed as a separate reminder.</div>
      </NCard>
    </div>
  )

  // ── MEALS ──
  const mealsContent = (
    <div>
      <NRow style={{ marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: COL.dim, fontFamily: fig }}>Your saved meals. Tap to quick-log.</span>
        <span style={{ fontSize: 10, color: COL.ember, fontFamily: fig }}>+ Create</span>
      </NRow>
      <SLabel>Go-to meals</SLabel>
      {[
        { name: 'Protein shake (bulk)', count: 14, desc: '2 scoops whey, 1 banana, 2 tbsp PB, oats', cal: 620, p: 48, carb: 72, f: 12 },
        { name: 'Chicken + rice + broccoli', count: 11, desc: '8oz chicken breast, 1.5 cup rice, 1 cup broccoli', cal: 680, p: 52, carb: 78, f: 8 },
        { name: '4-egg scramble', count: 9, desc: '4 whole eggs, 2 toast, butter', cal: 540, p: 32, carb: 38, f: 28 },
      ].map((m, i) => (
        <div key={i} style={{ background: COL.coal, border: `0.5px solid ${COL.border}`, borderRadius: 8, padding: '10px 12px', marginBottom: 6 }}>
          <NRow style={{ marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: COL.ash, fontFamily: fig }}>{m.name}</span>
            <span style={{ fontSize: 9, color: COL.ghost, fontFamily: fig }}>Logged {m.count}x</span>
          </NRow>
          <div style={{ fontSize: 11, color: COL.dim, fontFamily: fig }}>{m.desc}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            {[['cal', m.cal], ['P', m.p + 'g'], ['C', m.carb + 'g'], ['F', m.f + 'g']].map(([l, v]) => (
              <span key={l} style={{ fontSize: 10, color: COL.faint, fontFamily: fig }}>
                <span style={{ color: COL.ash }}>{v}</span> {l}
              </span>
            ))}
          </div>
        </div>
      ))}
      <div style={{ height: 0.5, background: COL.border, margin: '12px 0' }}/>
      <SLabel>Need ideas? Tap a goal</SLabel>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {['High protein \u2192', 'Under 500 cal \u2192', '5 min prep \u2192', 'Meal prep batch \u2192', 'Just pick for me \u2192'].map(g => (
          <div key={g} style={{ background: COL.char, borderRadius: 6, padding: '7px 12px', fontSize: 11, color: COL.dim, fontFamily: fig }}>{g}</div>
        ))}
      </div>
      <div style={{ fontSize: 9, color: COL.ghost, fontFamily: fig, marginTop: 6 }}>AI suggests meals based on remaining macros.</div>
    </div>
  )

  // ── BODY ──
  const bodyContent = (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {[{ v: '185', l: 'Weight (lbs)', col: COL.ash }, { v: '2,400', l: 'Daily target', col: COL.hot }, { v: 'Lean bulk', l: 'Current goal', col: COL.dim }].map((s, i) => (
          <div key={i} style={{ flex: 1, background: COL.char, borderRadius: 8, padding: 10, textAlign: 'center' }}>
            <div style={{ fontFamily: sora, fontSize: 18, fontWeight: 600, color: s.col }}>{s.v}</div>
            <div style={{ fontSize: 9, color: COL.faint, fontFamily: fig, marginTop: 2 }}>{s.l}</div>
          </div>
        ))}
      </div>
      <NCard>
        <SLabel>Goal</SLabel>
        <div style={{ display: 'flex', gap: 6 }}>
          {['Cut', 'Maintain', 'Lean bulk', 'Bulk'].map((g) => (
            <div key={g} style={{ flex: 1, padding: 8, borderRadius: 6, textAlign: 'center', background: g === 'Lean bulk' ? `${COL.ember}18` : COL.coal, border: `${g === 'Lean bulk' ? '1' : '0.5'}px solid ${g === 'Lean bulk' ? `${COL.ember}40` : COL.charBorder}`, fontSize: 11, color: g === 'Lean bulk' ? COL.ember : COL.faint, fontFamily: fig }}>{g}</div>
          ))}
        </div>
        <div style={{ fontSize: 9, color: COL.ghost, fontFamily: fig, marginTop: 6 }}>Goal sets calorie target and macro split automatically</div>
      </NCard>
      <NRow style={{ margin: '10px 0 6px' }}>
        <SLabel>Weight log</SLabel>
        <span style={{ fontSize: 10, color: COL.ember, fontFamily: fig }}>+ Log today</span>
      </NRow>
      {[['Mar 19', '185.2', '+0.4'], ['Mar 17', '184.8', '+0.2'], ['Mar 14', '184.6', '\u2014'], ['Mar 10', '184.0', '+0.6'], ['Mar 7', '183.4', '']].map(([d, w, delta], i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 4 ? `0.5px solid ${COL.charLight}` : 'none' }}>
          <span style={{ fontSize: 12, color: COL.ash, fontFamily: fig }}>{d}</span>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontFamily: sora, fontSize: 14, fontWeight: 500, color: COL.ash }}>{w}</span>
            {delta && <span style={{ fontSize: 10, color: delta === '\u2014' ? COL.faint : COL.green, fontFamily: fig, marginLeft: 6 }}>{delta}</span>}
          </div>
        </div>
      ))}
      <div style={{ height: 0.5, background: COL.border, margin: '12px 0' }}/>
      <NRow style={{ marginBottom: 6 }}>
        <SLabel>Measurements</SLabel>
        <span style={{ fontSize: 10, color: COL.ember, fontFamily: fig }}>+ Update</span>
      </NRow>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {[['15.5"', 'Arms'], ['42"', 'Chest'], ['33"', 'Waist'], ['25"', 'Quads']].map(([v, l]) => (
          <div key={l} style={{ flex: 1, minWidth: 70, background: COL.char, borderRadius: 8, padding: 8, textAlign: 'center' }}>
            <div style={{ fontFamily: sora, fontSize: 16, fontWeight: 600, color: COL.ash }}>{v}</div>
            <div style={{ fontSize: 9, color: COL.ghost, fontFamily: fig }}>{l}</div>
          </div>
        ))}
      </div>
      <NCard style={{ textAlign: 'center', marginTop: 8 }}>
        <SLabel>Progress photos</SLabel>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
          {['Mar 1', 'Mar 10'].map(d => (
            <div key={d} style={{ width: 60, height: 80, background: COL.coal, borderRadius: 6, border: `0.5px solid ${COL.charBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 9, color: COL.ghost, fontFamily: fig }}>{d}</span>
            </div>
          ))}
          <div style={{ width: 60, height: 80, background: COL.coal, borderRadius: 6, border: `0.5px dashed ${COL.ember}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 10, color: COL.ember, fontFamily: fig }}>+ Add</span>
          </div>
        </div>
        <div style={{ fontSize: 9, color: COL.ghost, fontFamily: fig, marginTop: 6 }}>Every 2 weeks. Cinis keeps them private.</div>
      </NCard>
    </div>
  )

  // ── KNOWLEDGE ──
  const knowledgeContent = (
    <div>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 14 }}>
        {['All', 'Protein', 'Cutting', 'Bulking', 'Supplements', 'Recovery', 'Hydration'].map((ch, i) => (
          <NChip key={ch} active={i === 0}>{ch}</NChip>
        ))}
      </div>
      {[
        { title: "Protein timing doesn't matter (much)", tag: 'Protein', tagBg: `${COL.hot}20`, tagCol: COL.hot, body: 'The anabolic window is mostly a myth. Hit your daily target — 0.7-1g per pound. Spread across 3-5 meals, 30-50g per sitting.' },
        { title: 'Creatine is the only proven supplement', tag: 'Supplements', tagBg: `${COL.green}20`, tagCol: COL.green, body: '5g/day, every day, no loading needed. Increases muscle energy reserves — more reps, more volume, more growth.' },
        { title: 'Your cut calories should be gradual', tag: 'Cutting', tagBg: `${COL.ember}20`, tagCol: COL.ember, body: '300-500 deficit, not 1,000. Protein stays high (1g/lb). Drop another 200 only when weight stalls 2+ weeks.' },
        { title: 'Water matters more than you think', tag: 'Hydration', tagBg: `${COL.blue}20`, tagCol: COL.blue, body: '2% dehydration drops strength 10-20%. Half bodyweight in ounces daily. Creatine users need extra 16-20oz.' },
        { title: 'Sleep is an anabolic steroid', tag: 'Recovery', tagBg: `${COL.hot}20`, tagCol: COL.hot, body: 'GH peaks during deep sleep. Under 7 hrs = more cortisol, less recovery. 7-9 hours is non-negotiable for results.' },
        { title: 'Meal prep saves your diet', tag: 'Meal prep', tagBg: `${COL.green}20`, tagCol: COL.green, body: 'Cook 3-4 proteins + 2-3 carbs on Sunday. 90 minutes. If the food is ready, you eat it. If not, you order DoorDash.' },
      ].map((card, i) => (
        <NCard key={i}>
          <NRow>
            <span style={{ fontSize: 13, fontWeight: 500, color: COL.ash, fontFamily: fig }}>{card.title}</span>
            <NTag bg={card.tagBg} color={card.tagCol}>{card.tag}</NTag>
          </NRow>
          <div style={{ fontSize: 11, color: `${COL.ash}70`, fontFamily: fig, lineHeight: 1.6, marginTop: 6 }}>{card.body}</div>
        </NCard>
      ))}
    </div>
  )

  // ── LEARN ──
  const learnContent = (
    <div>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 14 }}>
        {['All', 'Guides', 'Calculators', 'Research', 'Tools'].map((ch, i) => (
          <NChip key={ch} active={i === 0}>{ch}</NChip>
        ))}
      </div>
      <NCard borderLeft={`3px solid ${COL.hot}`} style={{ padding: 14 }}>
        <NTag bg={`${COL.hot}20`} color={COL.hot}>Featured guide</NTag>
        <div style={{ fontSize: 13, fontWeight: 500, color: COL.ash, fontFamily: fig, margin: '6px 0 4px' }}>Your first meal prep: a step-by-step system</div>
        <div style={{ fontSize: 11, color: `${COL.ash}70`, fontFamily: fig, lineHeight: 1.5 }}>Pick 2 proteins, 2 carbs, 1 sauce. 90 minutes on Sunday. Uses your actual macro targets.</div>
        <div style={{ fontSize: 11, color: COL.ember, fontFamily: fig, marginTop: 6 }}>Start guide &#8594;</div>
      </NCard>
      <SLabel>Guides</SLabel>
      {[
        ['Set up your macros in 5 minutes', 'Enter weight, pick goal, Cinis calculates everything.'],
        ['Build a supplement stack', "What's proven, what's marketing, how to time it."],
        ['The reverse diet playbook', 'Coming off a cut without gaining it all back.'],
      ].map(([t, d], i) => (
        <NCard key={i} style={{ padding: 14 }}>
          <NTag bg={`${COL.ember}20`} color={COL.ember}>Guide</NTag>
          <div style={{ fontSize: 13, fontWeight: 500, color: COL.ash, fontFamily: fig, margin: '6px 0 4px' }}>{t}</div>
          <div style={{ fontSize: 11, color: `${COL.ash}70`, fontFamily: fig, lineHeight: 1.5 }}>{d}</div>
          <div style={{ fontSize: 11, color: COL.ember, fontFamily: fig, marginTop: 6 }}>Start &#8594;</div>
        </NCard>
      ))}
      <SLabel>Calculators</SLabel>
      {[
        ['TDEE calculator', 'Total Daily Energy Expenditure — everything starts here.'],
        ['1RM estimator', 'Weight \u00d7 reps \u2192 estimated one-rep max.'],
        ['Cut / bulk timeline', 'Current weight \u2192 goal \u2192 how long each phase takes.'],
      ].map(([t, d], i) => (
        <NCard key={i} style={{ padding: 14 }}>
          <NTag bg={`${COL.green}20`} color={COL.green}>Calculator</NTag>
          <div style={{ fontSize: 13, fontWeight: 500, color: COL.ash, fontFamily: fig, margin: '6px 0 4px' }}>{t}</div>
          <div style={{ fontSize: 11, color: `${COL.ash}70`, fontFamily: fig, lineHeight: 1.5 }}>{d}</div>
          <div style={{ fontSize: 11, color: COL.ember, fontFamily: fig, marginTop: 6 }}>Calculate &#8594;</div>
        </NCard>
      ))}
      <SLabel>Trusted resources</SLabel>
      {[
        ['Examine.com', 'Independent supplement research. No sponsorships.'],
        ['Jeff Nippard', 'Evidence-based training + nutrition content.'],
        ['Renaissance Periodization', 'Gold standard structured meal plans.'],
      ].map(([t, d], i) => (
        <NCard key={i} style={{ padding: 14 }}>
          <NTag bg={`${COL.ash}10`} color={COL.dim}>External</NTag>
          <div style={{ fontSize: 13, fontWeight: 500, color: COL.ash, fontFamily: fig, margin: '6px 0 4px' }}>{t}</div>
          <div style={{ fontSize: 11, color: `${COL.ash}70`, fontFamily: fig, lineHeight: 1.5 }}>{d}</div>
          <div style={{ fontSize: 11, color: COL.ember, fontFamily: fig, marginTop: 6 }}>Open site &#8594;</div>
        </NCard>
      ))}
    </div>
  )

  // ── INSIGHTS ──
  const insightsContent = (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {[{ v: '2.4', l: 'Avg meals/day', col: COL.hot }, { v: '4.1', l: 'Avg glasses', col: COL.blue }, { v: '78%', l: 'Supp adherence', col: COL.green }].map((s, i) => (
          <div key={i} style={{ flex: 1, background: COL.char, borderRadius: 8, padding: 10, textAlign: 'center' }}>
            <div style={{ fontFamily: sora, fontSize: 18, fontWeight: 600, color: s.col }}>{s.v}</div>
            <div style={{ fontSize: 9, color: COL.faint, fontFamily: fig, marginTop: 2 }}>{s.l}</div>
          </div>
        ))}
      </div>
      <NCard borderLeft={`3px solid ${COL.ember}`}>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: COL.ember, fontFamily: fig, marginBottom: 4 }}>Pattern</div>
        <div style={{ fontSize: 12, color: `${COL.ash}aa`, fontFamily: fig, lineHeight: 1.6 }}>You have skipped lunch 3 of 4 days this week. On lunch days, focus sessions average 22 minutes. Skip days: 14 minutes. Lunch is buying you 8 more minutes of focus.</div>
      </NCard>
      <NCard borderLeft={`3px solid ${COL.blue}`}>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: COL.blue, fontFamily: fig, marginBottom: 4 }}>Hydration</div>
        <div style={{ fontSize: 12, color: `${COL.ash}aa`, fontFamily: fig, lineHeight: 1.6 }}>Water intake drops after 2 PM every day. Set alarms for 2:00 and 4:00 — two afternoon glasses makes the biggest difference.</div>
      </NCard>
      <NCard borderLeft={`3px solid ${COL.green}`}>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: COL.green, fontFamily: fig, marginBottom: 4 }}>Win</div>
        <div style={{ fontSize: 12, color: `${COL.ash}aa`, fontFamily: fig, lineHeight: 1.6 }}>Morning supplements at 89%. That routine is locked. Evening at 64% — consider moving Omega-3 to morning.</div>
      </NCard>
      <NCard borderLeft={`3px solid ${COL.hot}`}>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', color: COL.hot, fontFamily: fig, marginBottom: 4 }}>Food + spending</div>
        <div style={{ fontSize: 12, color: `${COL.ash}aa`, fontFamily: fig, lineHeight: 1.6 }}>2 meals out this week ($14.50 + $22). On track with your $35/day budget. Eating out is not the enemy — skipping meals then binge-ordering at 9 PM is.</div>
      </NCard>
      <div style={{ height: 0.5, background: COL.border, margin: '12px 0' }}/>
      <NCard style={{ textAlign: 'center', padding: 14 }}>
        <div style={{ fontSize: 12, color: COL.dim, fontFamily: fig, marginBottom: 6 }}>Your coach knows your nutrition data</div>
        <div style={{ fontSize: 12, color: COL.ember, fontFamily: fig }}>Ask about meal ideas or supplement timing &#8594;</div>
      </NCard>
    </div>
  )

  const tabContentMap = {
    log: logContent, stack: stackContent, meals: mealsContent,
    body: bodyContent, knowledge: knowledgeContent,
    learn: learnContent, insights: insightsContent,
  }

  return (
    <div style={{ paddingBottom: 80, background: COL.coal, minHeight: '100vh' }}>
      {/* Sub-tab nav */}
      <div style={{ display: 'flex', borderBottom: `0.5px solid ${COL.charBorder}`, marginBottom: 14, overflowX: 'auto' }}>
        {nutrTabs.map(tab => {
          const isActive = nutrSubTab === tab.toLowerCase()
          return (
            <div key={tab} onClick={() => setNutrSubTab(tab.toLowerCase())}
              style={{ fontFamily: fig, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', color: isActive ? COL.ember : COL.ghost, padding: '8px 10px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, borderBottom: isActive ? `2px solid ${COL.ember}` : '2px solid transparent' }}>
              {tab}
            </div>
          )
        })}
      </div>
      <div style={{ padding: 18 }}>
        {tabContentMap[nutrSubTab] || logContent}
      </div>
    </div>
  )
}
