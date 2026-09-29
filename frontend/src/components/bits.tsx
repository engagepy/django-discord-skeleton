import { Link } from 'react-router-dom'
import { paths } from '../routes'
import type { UserSummary } from '../types'

export function Logo() {
  return (
    <svg className="logo" viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8b5cf6" />
          <stop offset=".55" stopColor="#ec4899" />
          <stop offset="1" stopColor="#f97316" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#logo-g)" />
      <path d="M17 20a6 6 0 0 1 6-6h18a6 6 0 0 1 6 6v12a6 6 0 0 1-6 6H29l-8 7v-7h2a6 6 0 0 1-6-6z" fill="#fff" />
      <circle cx="26" cy="26" r="2.5" fill="#8b5cf6" />
      <circle cx="32" cy="26" r="2.5" fill="#d946ef" />
      <circle cx="38" cy="26" r="2.5" fill="#ec4899" />
    </svg>
  )
}

// A stable colour per username, for avatars without a picture.
function hue(text: string) {
  let h = 0
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) % 360
  return h
}

export function Avatar({ user, size = 'sm' }: { user: UserSummary; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const label = user.name || user.username
  if (user.avatar) {
    return <img className={`avatar avatar--${size}`} src={user.avatar} alt="" loading="lazy" />
  }
  const h = hue(user.username)
  return (
    <span
      className={`avatar avatar--${size} avatar--initials`}
      style={{ background: `linear-gradient(135deg, hsl(${h} 70% 42%), hsl(${(h + 50) % 360} 70% 36%))` }}
      aria-hidden="true"
    >
      {label.slice(0, 1).toUpperCase()}
    </span>
  )
}

export function UserLink({ user, size = 'sm' }: { user: UserSummary; size?: 'sm' | 'md' }) {
  return (
    <Link to={paths.profile(user.id)} className="user-link">
      <Avatar user={user} size={size} />
      <span>@{user.username}</span>
    </Link>
  )
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 31536000],
  ['month', 2592000],
  ['week', 604800],
  ['day', 86400],
  ['hour', 3600],
  ['minute', 60],
]
const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

export function TimeAgo({ date }: { date: string }) {
  const seconds = (new Date(date).getTime() - Date.now()) / 1000
  const [unit, size] = UNITS.find(([, s]) => Math.abs(seconds) >= s) ?? ['second', 1]
  const text = unit === 'second' ? 'just now' : relative.format(Math.round(seconds / size), unit)
  return (
    <time className="muted small" dateTime={date} title={new Date(date).toLocaleString()}>
      {text}
    </time>
  )
}

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
