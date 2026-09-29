import { Link } from 'react-router-dom'
import { paths } from '../routes'
import type { UserSummary } from '../types'

// BaatCheet's original logo and default avatar, served from frontend/public/brand/.
const BRAND = `${import.meta.env.BASE_URL}brand/`

export function Logo() {
  return <img className="logo" src={`${BRAND}logo.svg`} alt="" width={34} height={34} />
}

export function Avatar({ user, size = 'sm' }: { user: UserSummary; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  return <img className={`avatar avatar--${size}`} src={user.avatar ?? `${BRAND}avatar.svg`} alt="" loading="lazy" />
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
