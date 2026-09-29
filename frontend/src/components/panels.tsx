import { MessageSquareText, Trash2, Users } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api, ApiError, useApi } from '../api'
import { useMe } from '../me'
import { paths } from '../routes'
import type { Message, RoomCard as Room, Topic } from '../types'
import { Avatar, Empty, TimeAgo, UserLink } from './bits'

const SIDEBAR_THEMES = 6

/** The left column: the first few themes with their room counts, as on the original home page. */
export function ThemesSidebar() {
  const { data } = useApi<{ topics: Topic[]; total: number }>('topics/')
  const [params] = useSearchParams()
  const active = params.get('q') ?? ''

  return (
    <aside className="side side--left" aria-label="Themes">
      <h2 className="side__title">Browse themes</h2>
      <ul className="theme-list">
        <li>
          <Link to={paths.home} className={active ? '' : 'active'}>
            All <span className="count">{data?.total ?? '·'}</span>
          </Link>
        </li>
        {data?.topics.slice(0, SIDEBAR_THEMES).map((topic) => (
          <li key={topic.id}>
            <Link to={paths.search(topic.name)} className={active === topic.name ? 'active' : ''}>
              {topic.name} <span className="count">{topic.room_count}</span>
            </Link>
          </li>
        ))}
      </ul>
      <Link to={paths.topics} className="link small">
        More themes →
      </Link>
    </aside>
  )
}

export function RoomCard({ room }: { room: Room }) {
  return (
    <article className="card room-card">
      <header className="room-card__head">
        {room.host ? <UserLink user={room.host} /> : <span className="muted">Former member</span>}
        <TimeAgo date={room.created} />
      </header>
      <Link to={paths.room(room.id)} className="room-card__title stretched">
        {room.name}
      </Link>
      {room.description && <p className="room-card__desc">{room.description}</p>}
      <footer className="room-card__foot">
        <span className="muted small">
          <Users size={14} aria-hidden="true" /> {room.participant_count} joined
        </span>
        {room.topic && <span className="chip">{room.topic}</span>}
      </footer>
    </article>
  )
}

export function RoomList({ rooms, empty }: { rooms: Room[]; empty: React.ReactNode }) {
  if (!rooms.length) return <Empty>{empty}</Empty>
  return (
    <div className="room-list">
      {rooms.map((room) => (
        <RoomCard key={room.id} room={room} />
      ))}
    </div>
  )
}

/** Replies across rooms: "@someone replied in “Room”". Your own can be deleted in place. */
export function ActivityList({ messages, onChange }: { messages: Message[]; onChange: () => void }) {
  const { me } = useMe()
  if (!messages.length) return <Empty>No replies yet.</Empty>
  return (
    <ul className="activity">
      {messages.map((message) => (
        <li key={message.id} className="activity__item">
          <div className="activity__head">
            <Link to={paths.profile(message.user.id)} className="user-link">
              <Avatar user={message.user} />
              <span>@{message.user.username}</span>
            </Link>
            <TimeAgo date={message.created} />
            {message.user.id === me.id && (
              <DeleteButton what="reply" label={message.body} path={`messages/${message.id}/`} onDone={onChange} />
            )}
          </div>
          <p className="muted small">
            <MessageSquareText size={13} aria-hidden="true" /> replied in{' '}
            <Link to={paths.room(message.room.id)} className="link">
              {message.room.name}
            </Link>
          </p>
          <p className="activity__body">{message.body}</p>
        </li>
      ))}
    </ul>
  )
}

export function ActivitySidebar({ messages, onChange }: { messages?: Message[]; onChange: () => void }) {
  return (
    <aside className="side side--right" aria-label="Recent activity">
      <div className="side__row">
        <h2 className="side__title">Recent activity</h2>
        <Link to={paths.activity} className="link small">
          See all →
        </Link>
      </div>
      {messages && <ActivityList messages={messages} onChange={onChange} />}
    </aside>
  )
}

/** Asks before deleting. Shared by the inline delete buttons and the /delete… pages. */
export function ConfirmCard({
  what,
  label,
  path,
  onDone,
  onCancel,
}: {
  what: string
  label: string
  path: string
  onDone: () => void
  onCancel: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  return (
    <div className="confirm">
      <h2>Delete this {what}?</h2>
      {label && <p className="confirm__quote">“{label.length > 140 ? `${label.slice(0, 140)}…` : label}”</p>}
      <p className="muted small">This can’t be undone.</p>
      {error && <p className="field-error">{error}</p>}
      <div className="actions">
        <button className="btn btn--ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button
          className="btn btn--danger"
          disabled={busy}
          autoFocus
          onClick={async () => {
            setBusy(true)
            try {
              await api(path, { method: 'DELETE' })
              onDone()
            } catch (err) {
              setError((err as ApiError).message)
              setBusy(false)
            }
          }}
        >
          <Trash2 size={16} /> Delete
        </button>
      </div>
    </div>
  )
}

export function DeleteButton(props: { what: string; label: string; path: string; onDone: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState(false)
  const close = () => {
    dialog.current?.close()
    setOpen(false)
  }
  return (
    <>
      <button
        className="icon-btn icon-btn--quiet"
        aria-label={`Delete ${props.what}`}
        title={`Delete ${props.what}`}
        onClick={() => {
          setOpen(true)
          dialog.current?.showModal()
        }}
      >
        <Trash2 size={15} />
      </button>
      <dialog ref={dialog} className="dialog" onClose={() => setOpen(false)}>
        {open && (
          <ConfirmCard
            {...props}
            onCancel={close}
            onDone={() => {
              close()
              props.onDone()
            }}
          />
        )}
      </dialog>
    </>
  )
}
