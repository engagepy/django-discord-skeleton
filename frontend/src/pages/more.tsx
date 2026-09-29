import { Hash, Search } from 'lucide-react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useApi } from '../api'
import { Empty, ErrorState, Loading } from '../components/bits'
import { ActivityList, ConfirmCard } from '../components/panels'
import { paths } from '../routes'
import type { Message, RoomDetail, Topic } from '../types'
import { NewRoomButton, PageHead } from './Home'

/** Every theme, searchable (/topics/). */
export function Topics() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const { data, error } = useApi<{ topics: Topic[]; total: number }>(`topics/?q=${encodeURIComponent(q)}`)

  return (
    <div className="narrow narrow--wide">
      <PageHead title="Themes" sub={data ? `${data.total} themes in all` : ' '} action={<NewRoomButton />} />
      <label className="search search--page">
        <Search size={16} aria-hidden="true" />
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
      ) : data.topics.length === 0 ? (
        <Empty>No theme matches “{q}”.</Empty>
      ) : (
        <ul className="theme-grid">
          {data.topics.map((topic) => (
            <li key={topic.id}>
              <Link to={paths.search(topic.name)} className="card theme-tile">
                <Hash size={18} aria-hidden="true" />
                <span>{topic.name}</span>
                <span className="count">
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
    <div className="narrow narrow--wide">
      <PageHead title="Activity" sub="The latest replies across every room" action={<NewRoomButton />} />
      {error ? (
        <ErrorState message={error.message} />
      ) : !data ? (
        <Loading />
      ) : (
        <div className="card">
          <ActivityList messages={data.activity} onChange={reload} />
        </div>
      )}
    </div>
  )
}

/** /deleteroom/<id>/ and /deletemessage/<id>/, the original confirmation pages. */
export function ConfirmDelete({ kind }: { kind: 'room' | 'reply' }) {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const room = useApi<RoomDetail>(kind === 'room' ? `rooms/${id}/` : null)
  if (room.error) return <ErrorState message={room.error.message} />
  if (kind === 'room' && !room.data) return <Loading />

  return (
    <div className="narrow">
      <div className="card form-card">
        <ConfirmCard
          what={kind}
          label={room.data?.name ?? ''}
          path={kind === 'room' ? `rooms/${id}/` : `messages/${id}/`}
          onDone={() => navigate(paths.home)}
          onCancel={() => navigate(-1)}
        />
      </div>
    </div>
  )
}

export function NotFound() {
  return (
    <div className="narrow">
      <Empty>
        That page doesn’t exist. <Link to={paths.home} className="link">Back to rooms</Link>
      </Empty>
    </div>
  )
}
