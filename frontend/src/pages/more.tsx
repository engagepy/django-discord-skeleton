import { ArrowUpRight, Search } from 'lucide-react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useApi } from '../api'
import { Empty, ErrorState, Loading, ThemeIcon, themeStyle } from '../components/bits'
import { ActivityList, ConfirmCard } from '../components/panels'
import { useShell } from '../components/Shell'
import { paths } from '../routes'
import type { Message, RoomDetail, Topic } from '../types'
import { NewRoomButton, PageHead } from './Home'

/** Every theme, searchable (/topics/): Discord's "discover servers", one card per theme. */
export function Topics() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const { data, error } = useApi<{ topics: Topic[]; total: number }>(`topics/?q=${encodeURIComponent(q)}`)
  const themes = [...(data?.topics ?? [])].sort((a, b) => b.room_count - a.room_count)

  return (
    <div className="page page--wide">
      <PageHead
        kicker={data ? `Explore · ${data.total} themes` : 'Explore'}
        title={
          <>
            Find your <span className="serif">people</span>.
          </>
        }
        sub="Every room lives under a theme. Pick one and see who's talking."
        action={<NewRoomButton />}
      />
      <label className="bigsearch">
        <Search size={20} aria-hidden="true" />
        <input
          value={q}
          onChange={(event) => setParams(event.target.value ? { q: event.target.value } : {}, { replace: true })}
          placeholder="Search themes"
          aria-label="Search themes"
          autoFocus
        />
      </label>
      {error ? (
        <ErrorState message={error.message} />
      ) : !data ? (
        <Loading />
      ) : themes.length === 0 ? (
        <Empty>No theme matches “{q}”.</Empty>
      ) : (
        <ul className="tgrid">
          {themes.map((topic) => (
            <li key={topic.id}>
              <Link to={paths.theme(topic.name)} className="tcard">
                <span className="tcard__banner" style={themeStyle(topic.name)} aria-hidden="true">
                  <ArrowUpRight size={20} />
                </span>
                <span className="tcard__icon">
                  <ThemeIcon name={topic.name} size="lg" />
                </span>
                <span className="tcard__name">{topic.name}</span>
                <span className="tcard__meta mono">
                  {topic.room_count} {topic.room_count === 1 ? 'room' : 'rooms'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** The latest replies across every room (/activity/). */
export function Activity() {
  const { data, error, reload } = useApi<{ activity: Message[] }>('activity/')
  return (
    <div className="page">
      <PageHead
        kicker="Activity"
        title={
          <>
            What people are <span className="serif">saying</span>.
          </>
        }
        sub="The latest replies across every room."
        action={<NewRoomButton />}
      />
      {error ? <ErrorState message={error.message} /> : !data ? <Loading /> : <ActivityList messages={data.activity} onChange={reload} />}
    </div>
  )
}

/** /deleteroom/<id>/ and /deletemessage/<id>/, the original confirmation pages. */
export function ConfirmDelete({ kind }: { kind: 'room' | 'reply' }) {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { refresh } = useShell()
  const room = useApi<RoomDetail>(kind === 'room' ? `rooms/${id}/` : null)
  if (room.error) {
    return (
      <div className="page">
        <ErrorState message={room.error.message} />
      </div>
    )
  }
  if (kind === 'room' && !room.data) {
    return (
      <div className="page">
        <Loading />
      </div>
    )
  }

  return (
    <div className="page page--center">
      <div className="panel-card">
        <ConfirmCard
          what={kind}
          label={room.data?.name ?? ''}
          path={kind === 'room' ? `rooms/${id}/` : `messages/${id}/`}
          onDone={() => {
            refresh()
            navigate(paths.home)
          }}
          onCancel={() => navigate(-1)}
        />
      </div>
    </div>
  )
}

export function NotFound() {
  return (
    <div className="page page--center">
      <div className="notfound">
        <p className="notfound__code">404</p>
        <h1>
          This room is <span className="serif">empty</span>.
        </h1>
        <p className="muted">The page you’re looking for doesn’t exist.</p>
        <Link to={paths.home} className="pop">
          Back to Discover
        </Link>
      </div>
    </div>
  )
}
