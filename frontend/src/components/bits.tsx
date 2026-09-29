import { Link } from 'react-router-dom'
import { paths } from '../routes'
import type { UserSummary } from '../types'

// BaatCheet's original logo and default avatar, served from frontend/public/brand/.
const BRAND = `${import.meta.env.BASE_URL}brand/`

export function Logo({ size = 34 }: { size?: number }) {
  return <img className="logo" src={`${BRAND}logo.svg`} alt="" width={size} height={size} />
}

export function Avatar({ user, size = 'sm' }: { user: UserSummary; size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' }) {
  return <img className={`avatar avatar--${size}`} src={user.avatar ?? `${BRAND}avatar.svg`} alt="" loading="lazy" />
}

/* ---------- Theme identity: every theme gets its own gradient, like a Discord server icon ---------- */

function hash(text: string) {
  let h = 0
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h
}

// Relative luminance of an HSL colour, to pick black or white text that passes contrast.
function luminance(h: number, s: number, l: number) {
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * f(0) + 0.7152 * f(8) + 0.0722 * f(4)
}

// White letters (as on Discord); each gradient stop is darkened until white on it passes WCAG AA (4.5:1).
function darkEnough(h: number, s: number, l: number) {
  while (luminance(h, s, l) > 0.183) l -= 0.01
  return Math.floor(l * 100) // floor: rounding up could undo the check
}

export function themeStyle(name: string): React.CSSProperties {
  const h = hash(name) % 360
  const h2 = (h + 40) % 360
  return {
    background: `linear-gradient(135deg, hsl(${h} 72% ${darkEnough(h, 0.72, 0.52)}%), hsl(${h2} 78% ${darkEnough(h2, 0.78, 0.44)}%))`,
    color: '#ffffff',
  }
}

export function initials(name: string) {
  const words = name
    .replace(/[^\p{L}\p{N} ]/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (words.length > 1) return (words[0][0] + words[1][0]).toUpperCase()
  return (words[0] ?? name).slice(0, 2).toUpperCase()
}

export function ThemeIcon({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span className={`theme-icon theme-icon--${size}`} style={themeStyle(name)} aria-hidden="true">
      {initials(name)}
    </span>
  )
}

export function UserLink({ user, size = 'sm' }: { user: UserSummary; size?: 'xs' | 'sm' | 'md' }) {
  return (
    <Link to={paths.profile(user.id)} className="user-link">
      <Avatar user={user} size={size} />
      <span>{user.name || user.username}</span>
    </Link>
  )
}

/* ---------- Time ---------- */

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31536000],
  ['month', 2592000],
  ['week', 604800],
  ['day', 86400],
  ['hour', 3600],
  ['minute', 60],
]
const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto', style: 'short' })

export function timeAgo(date: string) {
  const seconds = (new Date(date).getTime() - Date.now()) / 1000
  const [unit, size] = UNITS.find(([, s]) => Math.abs(seconds) >= s) ?? ['second', 1]
  return unit === 'second' ? 'just now' : relative.format(Math.round(seconds / size), unit)
}

export function TimeAgo({ date }: { date: string }) {
  return (
    <time className="stamp" dateTime={date} title={new Date(date).toLocaleString()}>
      {timeAgo(date)}
    </time>
  )
}

/* ---------- States ---------- */

export function Loading({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="state" role="status">
      <span className="spinner" aria-hidden="true" />
      {label}…
    </div>
  )
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="state state--error" role="alert">
      {message}
    </div>
  )
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="state">{children}</div>
}
