import { KeyRound, LogOut, Moon, Plus, Search, Sun, UserRound, UserRoundPen } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { csrfToken } from '../api'
import { useMe } from '../me'
import { paths } from '../routes'
import { Avatar, Logo } from './bits'

declare global {
  interface Window {
    baatcheetTheme: { current: () => 'light' | 'dark'; set: (theme: 'light' | 'dark') => void }
  }
}

function ThemeToggle() {
  const [theme, setTheme] = useState(() => window.baatcheetTheme.current())
  const next = theme === 'dark' ? 'light' : 'dark'
  return (
    <button
      className="icon-btn"
      onClick={() => {
        window.baatcheetTheme.set(next)
        setTheme(next)
      }}
      aria-label={`Switch to ${next === 'dark' ? 'dark' : 'day'} mode`}
      title={`Switch to ${next === 'dark' ? 'dark' : 'day'} mode`}
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}

function SearchBox() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const input = useRef<HTMLInputElement>(null)
  const current = params.get('q') ?? ''

  // "/" jumps to search from anywhere, as in most chat apps.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (event.key === '/' && !['INPUT', 'TEXTAREA'].includes(target.tagName)) {
        event.preventDefault()
        input.current?.select()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <form
      className="search"
      role="search"
      onSubmit={(event) => {
        event.preventDefault()
        navigate(paths.search(input.current?.value.trim() ?? ''))
      }}
    >
      <Search size={16} aria-hidden="true" />
      <input
        ref={input}
        key={current}
        name="q"
        defaultValue={current}
        placeholder="Search rooms and themes"
        aria-label="Search rooms and themes"
      />
      <kbd aria-hidden="true">/</kbd>
    </form>
  )
}

function UserMenu() {
  const { me } = useMe()
  const menu = useRef<HTMLDetailsElement>(null)
  const location = useLocation()

  useEffect(() => {
    menu.current?.removeAttribute('open')
  }, [location])

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (menu.current && !menu.current.contains(event.target as Node)) menu.current.removeAttribute('open')
    }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [])

  return (
    <details className="menu" ref={menu}>
      <summary aria-label="Your account">
        <Avatar user={me} size="sm" />
        <span className="menu__name">{me.username}</span>
      </summary>
      <div className="menu__panel">
        <div className="menu__who">
          <strong>{me.name || me.username}</strong>
          <span className="muted small">{me.email}</span>
        </div>
        <Link to={paths.profile(me.id)}>
          <UserRound size={16} /> Your profile
        </Link>
        <Link to={paths.updateUser}>
          <UserRoundPen size={16} /> Edit profile
        </Link>
        <a href={paths.changePassword}>
          <KeyRound size={16} /> Change password
        </a>
        <form method="post" action={paths.signOut}>
          <input type="hidden" name="csrfmiddlewaretoken" value={csrfToken()} />
          <button type="submit">
            <LogOut size={16} /> Sign out
          </button>
        </form>
      </div>
    </details>
  )
}

export function Layout() {
  const { pathname } = useLocation()
  // Braces matter: newer Chrome returns a Promise from scrollTo, and an effect that returns
  // anything but a function crashes React on the next navigation.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <>
      <div className="aurora" aria-hidden="true" />
      <header className="topbar">
        <div className="topbar__inner">
          <Link to={paths.home} className="brand">
            <Logo />
            <span>BaatCheet</span>
          </Link>
          <SearchBox />
          <nav className="topbar__nav" aria-label="Main">
            <NavLink to={paths.home} end>
              Rooms
            </NavLink>
            <NavLink to={paths.topics}>Themes</NavLink>
            <NavLink to={paths.activity}>Activity</NavLink>
          </nav>
          <div className="topbar__actions">
            <Link to={paths.createRoom} className="btn btn--primary btn--sm">
              <Plus size={16} /> New room
            </Link>
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </header>
      <main className="page">
        <Outlet />
      </main>
    </>
  )
}
