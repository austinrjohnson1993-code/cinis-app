const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const FULL_MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export function formatDate(date) {
  const d = new Date(date)
  return `${DAY_NAMES[d.getDay()]}, ${FULL_MONTH_NAMES[d.getMonth()]} ${d.getDate()}`
}

export function formatTime(date) {
  const d = new Date(date)
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export function formatDueLabel(date) {
  const d = new Date(date)
  if (isToday(d)) return 'Today'
  if (isTomorrow(d)) return 'Tomorrow'
  return `${DAY_NAMES[d.getDay()].slice(0, 3)} ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`
}

export function isToday(date) {
  const d = new Date(date)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
}

export function isTomorrow(date) {
  const d = new Date(date)
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return d.getFullYear() === tomorrow.getFullYear() &&
    d.getMonth() === tomorrow.getMonth() &&
    d.getDate() === tomorrow.getDate()
}

export function getStartOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function getDayName(date) {
  return DAY_NAMES[new Date(date).getDay()]
}

// ─────────────────────────────────────────────────────────────────────────────
// Timezone-aware helpers (Sprint 1 — April 9 2026)
//
// Server-side Node on Vercel always runs in UTC. The old pattern
//   new Date().toISOString().split('T')[0]
// silently returns the UTC calendar date, which misattributes a user's
// evening work to the next day for anyone west of UTC. These helpers produce
// the *local* calendar date using an explicit IANA timezone string.
//
// Timezone source (Sprint 1 fallback ladder):
//   1. Explicit `timezone` argument passed by the caller
//   2. Caller reads `req.query.timezone` or `req.body.timezone` from the client
//   3. If neither is present → DEFAULT_TZ ('America/Chicago' — primary launch TZ)
//
// Known Sprint 1 limitation:
//   profiles.timezone column does not exist in the DB yet. Background jobs that
//   have no req (e.g. the progress-snapshot cron) cannot read a per-user tz.
//   Sprint 2 TODO: add `profiles.timezone`, populate on onboarding, and fan out
//   snapshot/rollover work per-user. Tracked in S41_HANDOFF.md.
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_TZ = 'America/Chicago'

/**
 * Return the user's local calendar date in `YYYY-MM-DD` format.
 *
 * Uses the `en-CA` locale because it natively formats as `YYYY-MM-DD`,
 * avoiding zero-pad gymnastics.
 *
 * @param {Date} [date=new Date()] JS Date instance to convert
 * @param {string} [timezone=DEFAULT_TZ] IANA timezone string
 * @returns {string} Local calendar date as `YYYY-MM-DD`
 */
export function getLocalDateString(date = new Date(), timezone = DEFAULT_TZ) {
  let d = date
  if (!(d instanceof Date) || isNaN(d.getTime())) d = new Date()
  const tz = resolveTimezone(timezone)
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

/**
 * Return the UTC ISO timestamps for the start and end of the user's local day
 * together with the local date string itself.
 *
 * Used by every API route that needs "rows from today" — gte(startISO) /
 * lt(endISO) is the correct way to window on a UTC timestamp column.
 *
 * @param {Date} [date=new Date()] Any moment during the local day you want bounds for
 * @param {string} [timezone=DEFAULT_TZ] IANA timezone string
 * @returns {{ startISO: string, endISO: string, localDate: string }}
 */
export function getLocalDayBounds(date = new Date(), timezone = DEFAULT_TZ) {
  const tz = resolveTimezone(timezone)
  const localDate = getLocalDateString(date, tz)
  const localMidnightUTC = localMidnightToUTC(localDate, tz)
  const startISO = localMidnightUTC.toISOString()
  const endISO = new Date(localMidnightUTC.getTime() + 24 * 60 * 60 * 1000).toISOString()
  return { startISO, endISO, localDate }
}

/**
 * Convert a local wall-clock midnight (`YYYY-MM-DD 00:00:00` in `timezone`)
 * to the corresponding UTC instant.
 *
 * Strategy: naive-parse the date as UTC, ask Intl what local wall clock that
 * UTC instant maps to in the target tz, reverse the offset.
 *
 * @param {string} localDate `YYYY-MM-DD`
 * @param {string} timezone IANA timezone string
 * @returns {Date} UTC instant of local midnight for that date in that tz
 */
export function localMidnightToUTC(localDate, timezone) {
  const tz = resolveTimezone(timezone)
  const naiveUTC = new Date(`${localDate}T00:00:00Z`)
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(naiveUTC)
  const get = (type) => parts.find((p) => p.type === type)?.value
  const hourRaw = get('hour')
  const hour = hourRaw === '24' ? '00' : hourRaw
  const asLocal = new Date(
    `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}:${get('second')}Z`
  )
  const offsetMs = asLocal.getTime() - naiveUTC.getTime()
  return new Date(naiveUTC.getTime() - offsetMs)
}

/**
 * Resolve a caller-supplied timezone to a safe IANA string.
 * Accepts undefined, empty string, or obviously invalid values and falls back
 * to DEFAULT_TZ.
 *
 * @param {string | undefined | null} tz
 * @returns {string}
 */
export function resolveTimezone(tz) {
  if (!tz || typeof tz !== 'string') return DEFAULT_TZ
  if (tz === 'UTC' || tz.includes('/')) return tz
  return DEFAULT_TZ
}
