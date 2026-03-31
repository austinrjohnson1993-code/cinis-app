import React from 'react'
import { COLORS, FONTS } from '../../lib/constants'
import CinisMark from '../../lib/CinisMark'
import { TabErrorBoundary } from './shared'

const COL = COLORS
const sora = FONTS.sora
const fig = FONTS.fig

export default function TabTagTeam() {
  return (
    <TabErrorBoundary tabName="Tag Team">
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100%',
        background: COL.coal,
        padding: '40px 20px',
        textAlign: 'center',
      }}>
        <CinisMark size={48} />
        <h1 style={{
          fontFamily: sora,
          fontWeight: 600,
          fontSize: 24,
          color: COL.ash,
          margin: '20px 0 12px',
        }}>
          Tag Team
        </h1>
        <p style={{
          fontFamily: fig,
          fontSize: 14,
          color: COL.ash,
          opacity: 0.7,
          maxWidth: 320,
          lineHeight: 1.5,
          margin: 0,
        }}>
          Shared focus, accountability, and crew support are coming soon.
        </p>
      </div>
    </TabErrorBoundary>
  )
}
