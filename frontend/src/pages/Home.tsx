import { Plus, Search } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { useApi } from '../api'
import { ErrorState, Loading, Logo, ThemeIcon, themeStyle } from '../components/bits'
import { ActivityList, RoomGrid } from '../components/panels'
import { useShell } from '../components/Shell'
import { useMe } from '../me'
import { paths } from '../routes'
import type { Message, RoomCard } from '../types'

type HomeData = { rooms: RoomCard[]; room_count: number; activity: Message[] }

/** Every page's heading: a mono kicker, a display title, and the page's main action top right. */
export function PageHead({ kicker, title, sub, action }: { kicker?: string; title: React.ReactNode; sub?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="page-head">
      <div>
        {kicker && <p className="kicker mono">{kicker}</p>}
        <h1>{title}</h1>
        {sub && <p className="page-head__sub">{sub}</p>}
      </div>
      {action}
    </div>
  )
}

export function NewRoomButton({ theme }: { theme?: string }) {
  return (
    <Link to={theme ? `${paths.createRoom}?topic=${encodeURIComponent(theme)}` : paths.createRoom} className="pop">
      <Plus size={18} strokeWidth={2.5} /> New room
    </Link>
  )
}

function DiscoverHero({ rooms }: { rooms?: number }) {
  const { me } = useMe()
  const { openSwitcher } = useShell()
  return (
    <section className="hero">
      <div className="hero__copy">
        <p className="kicker mono">Discover · {rooms ?? '—'} rooms live</p>
        <h1>
          What’s the <span className="serif hero__accent">baat</span>
          <br />
          today, {me.name?.split(' ')[0] || me.username}?
        </h1>
        <p className="hero__sub">Jump into a room, or start the one nobody has started yet.</p>
        <div className="hero__cta">
          <NewRoomButton />
          <button className="pop pop--dark" onClick={openSwitcher}>
            <Search size={17} /> Find a room <kbd>/</kbd>
          </button>
        </div>
      </div>
      <div className="hero__art" aria-hidden="true">
        <Logo size={170} />
      </div>
    </section>
  )
}

function ThemeHero({ theme, rooms }: { theme: string; rooms?: number }) {
  return (
    <section className="theme-hero" style={themeStyle(theme)}>
      <ThemeIcon name={theme} size="lg" />
      <div className="theme-hero__copy">
        <p className="kicker mono">Theme</p>
        <h1>{theme}</h1>
        <p>{rooms === undefined ? ' ' : `${rooms} ${rooms === 1 ? 'room' : 'rooms'}`}</p>
      </div>
      <NewRoomButton theme={theme} />
    </section>
  )
}

export function Home() {
  const [params] = useSearchParams()
  const q = params.get('q') ?? ''
  const topic = params.get('topic') ?? ''
  const query = new URLSearchParams({ ...(q && { q }), ...(topic && { topic }) }).toString()
  const { data, error, reload } = useApi<HomeData>(`home/${query ? `?${query}` : ''}`)

  return (
    <div className="page page--wide">
      {topic ? <ThemeHero theme={topic} rooms={data?.room_count} /> : q ? null : <DiscoverHero rooms={data?.room_count} />}
      {q && (
        <PageHead
          kicker="Search"
          title={
            <>
              Results for <span className="serif">“{q}”</span>
            </>
          }
          sub={data ? `${data.room_count} ${data.room_count === 1 ? 'room' : 'rooms'} found` : ' '}
          action={<NewRoomButton />}
        />
      )}
      <div className="split">
        <section className="split__main">
          {!q && (
            <h2 className="section-title">
              {topic ? 'Rooms' : 'Buzzing rooms'} <span className="mono">{data?.room_count ?? ''}</span>
            </h2>
          )}
          {error ? (
            <ErrorState message={error.message} />
          ) : !data ? (
            <Loading label="Loading rooms" />
          ) : (
            <RoomGrid
              rooms={data.rooms}
              empty={
                q ? (
                  <>
                    Nothing matches “{q}”. <Link to={paths.home} className="link">Show all rooms</Link>
                  </>
                ) : (
                  'No rooms yet. Start the first conversation.'
                )
              }
            />
          )}
        </section>
        <aside className="split__side" aria-label="Recent activity">
          <h2 className="section-title">
            <span className="live-dot" aria-hidden="true" /> Live <Link to={paths.activity} className="link small">See all</Link>
          </h2>
          {data && <ActivityList messages={data.activity} onChange={reload} />}
        </aside>
      </div>
    </div>
  )
}
