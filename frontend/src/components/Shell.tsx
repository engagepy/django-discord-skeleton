import {
  Activity as ActivityIcon,
  Compass,
  Hash,
  KeyRound,
  LogOut,
  Menu,
  Moon,
  Plus,
  Search,
  Settings,
  Sparkles,
  Sun,
  UserRound,
  X,
} from 'lucide-react'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { api, csrfToken, useApi } from '../api'
import { useMe } from '../me'
import { paths } from '../routes'
import type { RoomCard, Topic } from '../types'
import { Avatar, Logo, ThemeIcon } from './bits'

declare global {
  interface Window {
    baatcheetTheme: { current: () => 'light' | 'dark'; set: (theme: 'light' | 'dark') => void }
  }
}

/* ---------- Shared state for the frame ----------
   The theme in focus (from ?topic= or the open room) drives the rail's active pill and the room list, and
   pages call refresh() after creating or deleting a room so the rail and list catch up. */

type ShellContext = { theme: string; setRoomTheme: (theme: string) => void; refresh: () => void; openSwitcher: () => void }
const Context = createContext<ShellContext | null>(null)

export function useShell() {
  const context = useContext(Context)
  if (!context) throw new Error('useShell must be used inside <Shell>')
  return context
}

function useThemes(version: number) {
  const { data, reload } = useApi<{ topics: Topic[]; total: number }>('topics/')
  useEffect(() => {
    if (version) reload()
  }, [version, reload])
  const themes = useMemo(
    () => [...(data?.topics ?? [])].sort((a, b) => b.room_count - a.room_count || a.name.localeCompare(b.name)),
    [data],
  )
  return { themes, total: data?.total }
}

/* ---------- Rail: themes as round "server" icons ---------- */

function Rail({ themes, active }: { themes: Topic[]; active: string }) {
  const { pathname } = useLocation()
  const home = pathname === paths.home && !active
  // Tooltips are fixed-position so the rail's scroll area can't clip them.
  const [tip, setTip] = useState<{ text: string; y: number } | null>(null)
  const show = (event: React.SyntheticEvent) => {
    const item = (event.target as HTMLElement).closest<HTMLElement>('[data-tip]')
    if (!item) return setTip(null)
    const box = item.getBoundingClientRect()
    setTip({ text: item.dataset.tip ?? '', y: box.top + box.height / 2 })
  }
  useEffect(() => setTip(null), [pathname, active])
  return (
    <nav
      className="rail"
      aria-label="Themes"
      onMouseOver={show}
      onFocus={show}
      onMouseLeave={() => setTip(null)}
      onBlur={() => setTip(null)}
    >
      {tip && (
        <span className="rail-tip" style={{ top: tip.y }} role="tooltip">
          {tip.text}
        </span>
      )}
      <Link to={paths.home} className={`rail__item ${home ? 'is-active' : ''}`} data-tip="Discover" aria-label="Discover">
        <span className="rail__home">
          <Logo size={30} />
        </span>
      </Link>
      <span className="rail__rule" aria-hidden="true" />
      <div className="rail__scroll">
        {themes.map((theme) => (
          <Link
            key={theme.id}
            to={paths.theme(theme.name)}
            className={`rail__item ${active === theme.name ? 'is-active' : ''}`}
            data-tip={`${theme.name} · ${theme.room_count} ${theme.room_count === 1 ? 'room' : 'rooms'}`}
            aria-label={theme.name}
          >
            <ThemeIcon name={theme.name} />
          </Link>
        ))}
      </div>
      <Link to={paths.createRoom} className="rail__item rail__item--action" data-tip="New room" aria-label="New room">
        <span className="rail__btn">
          <Plus size={22} />
        </span>
      </Link>
      <Link
        to={paths.topics}
        className={`rail__item rail__item--action ${pathname === paths.topics ? 'is-active' : ''}`}
        data-tip="Explore themes"
        aria-label="Explore themes"
      >
        <span className="rail__btn">
          <Compass size={22} />
        </span>
      </Link>
    </nav>
  )
}

/* ---------- Sidebar: rooms of the theme in focus, and you ---------- */

function ThemeToggle() {
  const [theme, setTheme] = useState(() => window.baatcheetTheme.current())
  const next = theme === 'dark' ? 'light' : 'dark'
  const label = `Switch to ${next === 'dark' ? 'dark' : 'day'} mode`
  return (
    <button
      className="icon-btn"
      onClick={() => {
        window.baatcheetTheme.set(next)
        setTheme(next)
      }}
      aria-label={label}
      title={label}
    >
      {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  )
}

function UserPanel() {
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
    <div className="me">
      <Link to={paths.profile(me.id)} className="me__who">
        <span className="me__avatar">
          <Avatar user={me} size="sm" />
          <i className="online" aria-hidden="true" />
        </span>
        <span className="me__names">
          <strong>{me.name || me.username}</strong>
          <span className="mono">@{me.username}</span>
        </span>
      </Link>
      <ThemeToggle />
      <details className="menu" ref={menu}>
        <summary className="icon-btn" aria-label="Account settings" title="Account settings">
          <Settings size={17} />
        </summary>
        <div className="menu__panel">
          <Link to={paths.profile(me.id)}>
            <UserRound size={16} /> Your profile
          </Link>
          <Link to={paths.updateUser}>
            <Sparkles size={16} /> Edit profile
          </Link>
          <a href={paths.changePassword}>
            <KeyRound size={16} /> Change password
          </a>
          <form method="post" action={paths.signOut}>
            <input type="hidden" name="csrfmiddlewaretoken" value={csrfToken()} />
            <button type="submit" className="menu__danger">
              <LogOut size={16} /> Sign out
            </button>
          </form>
        </div>
      </details>
    </div>
  )
}

function Sidebar({ theme, version }: { theme: string; version: number }) {
  const { openSwitcher } = useShell()
  const { data, reload } = useApi<{ rooms: RoomCard[]; room_count: number }>(
    theme ? `home/?topic=${encodeURIComponent(theme)}` : 'home/',
  )
  useEffect(() => {
    if (version) reload()
  }, [version, reload])
  const { pathname } = useLocation()

  return (
    <aside className="sidebar">
      <header className="sidebar__head">
        <span className="sidebar__title">{theme || 'Discover'}</span>
        {theme && <span className="mono sidebar__count">{data?.room_count ?? '·'}</span>}
      </header>
      <div className="sidebar__body">
        <button className="finder" onClick={openSwitcher}>
          <Search size={15} /> Find a room or theme <kbd>/</kbd>
        </button>
        <nav className="sidebar__nav" aria-label="Main">
          <NavLink to={paths.home} end className={() => (pathname === paths.home && !theme ? 'active' : '')}>
            <Sparkles size={18} /> Discover
          </NavLink>
          <NavLink to={paths.activity}>
            <ActivityIcon size={18} /> Activity
          </NavLink>
          <NavLink to={paths.topics}>
            <Compass size={18} /> Explore themes
          </NavLink>
        </nav>
        <div className="sidebar__section">
          <span>{theme ? 'Rooms' : 'All rooms'}</span>
          <Link to={paths.createRoom} className="sidebar__add" aria-label="New room" title="New room">
            <Plus size={16} />
          </Link>
        </div>
        <ul className="channels">
          {data?.rooms.map((room) => (
            <li key={room.id}>
              <NavLink to={paths.room(room.id)}>
                <Hash size={17} aria-hidden="true" />
                <span>{room.name}</span>
                {room.participant_count > 0 && <em className="mono">{room.participant_count}</em>}
              </NavLink>
            </li>
          ))}
          {data && data.rooms.length === 0 && <li className="channels__empty">No rooms yet.</li>}
        </ul>
      </div>
      <UserPanel />
    </aside>
  )
}

/* ---------- Quick switcher: "/" or ⌘K, like Discord's Ctrl+K ---------- */

type Hit = { key: string; label: string; hint: string; to: string; kind: 'room' | 'theme' | 'search' }

function Switcher({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<Hit[]>([])
  const [index, setIndex] = useState(0)
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    dialog.current?.showModal()
  }, [])

  useEffect(() => {
    let live = true
    const timer = setTimeout(async () => {
      const query = encodeURIComponent(q.trim())
      const [home, topics] = await Promise.all([
        api<{ rooms: RoomCard[] }>(`home/?q=${query}`),
        api<{ topics: Topic[] }>(`topics/?q=${query}`),
      ])
      if (!live) return
      const found: Hit[] = [
        ...home.rooms.slice(0, 6).map((r) => ({
          key: `r${r.id}`,
          label: r.name,
          hint: r.topic ?? '',
          to: paths.room(r.id),
          kind: 'room' as const,
        })),
        ...topics.topics.slice(0, 4).map((t) => ({
          key: `t${t.id}`,
          label: t.name,
          hint: `${t.room_count} rooms`,
          to: paths.theme(t.name),
          kind: 'theme' as const,
        })),
      ]
      if (q.trim()) found.push({ key: 'q', label: `Search everything for “${q.trim()}”`, hint: '', to: paths.search(q.trim()), kind: 'search' })
      setHits(found)
      setIndex(0)
    }, 120)
    return () => {
      live = false
      clearTimeout(timer)
    }
  }, [q])

  const go = (hit?: Hit) => {
    if (!hit) return
    onClose()
    navigate(hit.to)
  }

  return (
    <dialog ref={dialog} className="switcher" onClose={onClose} onClick={(e) => e.target === dialog.current && onClose()}>
      <div className="switcher__box">
        <label className="switcher__input">
          <Search size={18} aria-hidden="true" />
          <input
            autoFocus
            value={q}
            onChange={(event) => setQ(event.target.value)}
            onKeyDown={(event) => {
              const moves: Record<string, () => void> = {
                ArrowDown: () => setIndex((i) => Math.min(i + 1, hits.length - 1)),
                ArrowUp: () => setIndex((i) => Math.max(i - 1, 0)),
                Enter: () => go(hits[index]),
              }
              if (moves[event.key]) {
                event.preventDefault()
                moves[event.key]()
              }
            }}
            placeholder="Where would you like to go?"
            aria-label="Find a room or theme"
          />
          <kbd>esc</kbd>
        </label>
        <ul className="switcher__list" role="listbox">
          {hits.map((hit, i) => (
            <li key={hit.key} role="option" aria-selected={i === index}>
              <button className={i === index ? 'is-on' : ''} onMouseEnter={() => setIndex(i)} onClick={() => go(hit)}>
                {hit.kind === 'room' && <Hash size={17} />}
                {hit.kind === 'theme' && <ThemeIcon name={hit.label} size="sm" />}
                {hit.kind === 'search' && <Search size={17} />}
                <span>{hit.label}</span>
                <em className="mono">{hit.hint}</em>
              </button>
            </li>
          ))}
          {hits.length === 0 && <li className="switcher__empty">Nothing matches yet. Try another word.</li>}
        </ul>
        <p className="switcher__foot mono">↑↓ to move · ↵ to open · esc to close</p>
      </div>
    </dialog>
  )
}

/* ---------- The frame ---------- */

export function Shell() {
  const { pathname } = useLocation()
  const [params] = useSearchParams()
  const [roomTheme, setRoomTheme] = useState('')
  const [version, setVersion] = useState(0)
  const [switcher, setSwitcher] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const refresh = useCallback(() => setVersion((v) => v + 1), [])
  const openSwitcher = useCallback(() => setSwitcher(true), [])
  const { themes } = useThemes(version)

  const onRoom = pathname.startsWith('/room/')
  const theme = params.get('topic') ?? (onRoom ? roomTheme : '')

  // Braces matter: newer Chrome returns a Promise from scrollTo, and an effect that returns
  // anything but a function crashes React on the next navigation.
  useEffect(() => {
    window.scrollTo(0, 0)
    setDrawer(false)
  }, [pathname])

  // "/" or ⌘K / Ctrl+K opens the switcher from anywhere.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const typing = ['INPUT', 'TEXTAREA'].includes((event.target as HTMLElement).tagName)
      if ((event.key === '/' && !typing) || (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey))) {
        event.preventDefault()
        setSwitcher(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const value = useMemo(() => ({ theme, setRoomTheme, refresh, openSwitcher }), [theme, refresh, openSwitcher])

  return (
    <Context.Provider value={value}>
      <div className={`shell ${drawer ? 'drawer-open' : ''}`}>
        <div className="shell__nav">
          <Rail themes={themes} active={theme} />
          <Sidebar theme={theme} version={version} />
        </div>
        <button className="shell__scrim" aria-label="Close menu" onClick={() => setDrawer(false)} tabIndex={-1} />
        <div className="stage">
          <header className="mobilebar">
            <button className="icon-btn" onClick={() => setDrawer((d) => !d)} aria-label="Open menu">
              {drawer ? <X size={20} /> : <Menu size={20} />}
            </button>
            <Link to={paths.home} className="brand">
              <Logo size={28} />
              <span>BaatCheet</span>
            </Link>
            <button className="icon-btn" onClick={openSwitcher} aria-label="Find a room or theme">
              <Search size={18} />
            </button>
          </header>
          <main className="stage__main">
            <Outlet />
          </main>
        </div>
      </div>
      {switcher && <Switcher onClose={() => setSwitcher(false)} />}
    </Context.Provider>
  )
}
