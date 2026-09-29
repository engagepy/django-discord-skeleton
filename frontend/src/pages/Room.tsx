import { ArrowLeft, Pencil, SendHorizontal, Trash2 } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, ApiError, useApi } from '../api'
import { Avatar, Empty, ErrorState, Loading, TimeAgo, UserLink } from '../components/bits'
import { DeleteButton } from '../components/panels'
import { useMe } from '../me'
import { paths } from '../routes'
import type { RoomDetail } from '../types'

const REFRESH_MS = 10_000 // picks up other people's replies while the tab is visible

function Composer({ roomId, onPosted }: { roomId: number; onPosted: () => void }) {
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function send() {
    if (!body.trim() || busy) return
    setBusy(true)
    setError('')
    try {
      await api(`rooms/${roomId}/messages/`, { method: 'POST', json: { body } })
      setBody('')
      onPosted()
    } catch (err) {
      setError((err as ApiError).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      className="composer"
      onSubmit={(event) => {
        event.preventDefault()
        send()
      }}
    >
      <textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            send()
          }
        }}
        rows={1}
        placeholder="Write a reply…  (Enter to send, Shift+Enter for a new line)"
        aria-label="Write a reply"
      />
      <button className="btn btn--primary" disabled={busy || !body.trim()} aria-label="Send reply">
        <SendHorizontal size={18} />
      </button>
      {error && <p className="field-error">{error}</p>}
    </form>
  )
}

export function Room() {
  const { id = '' } = useParams()
  const { me } = useMe()
  const { data: room, error, reload } = useApi<RoomDetail>(`rooms/${id}/`)
  const bottom = useRef<HTMLDivElement>(null)
  const seen = useRef(0)

  useEffect(() => {
    const timer = setInterval(() => document.visibilityState === 'visible' && reload(), REFRESH_MS)
    return () => clearInterval(timer)
  }, [reload])

  // Scroll to the newest reply when the room opens and whenever a new one arrives.
  const count = room?.messages.length ?? 0
  useLayoutEffect(() => {
    if (count > seen.current) bottom.current?.scrollIntoView({ block: 'end', behavior: seen.current ? 'smooth' : 'auto' })
    seen.current = count
  }, [count])

  if (error) return <ErrorState message={error.status === 404 ? 'This room doesn’t exist any more.' : error.message} />
  if (!room) return <Loading label="Opening room" />
  const isHost = room.host?.id === me.id

  return (
    <div className="grid grid--2">
      <section className="main-col room">
        <div className="room__top">
          <Link to={paths.home} className="back">
            <ArrowLeft size={18} /> Rooms
          </Link>
          {isHost && (
            <div className="actions">
              <Link to={paths.updateRoom(room.id)} className="btn btn--ghost btn--sm">
                <Pencil size={15} /> Edit
              </Link>
              <Link to={paths.deleteRoom(room.id)} className="btn btn--ghost btn--sm">
                <Trash2 size={15} /> Delete
              </Link>
            </div>
          )}
        </div>

        <header className="card room__header">
          <div className="room__meta">
            {room.topic && (
              <Link to={paths.search(room.topic)} className="chip">
                {room.topic}
              </Link>
            )}
            <TimeAgo date={room.created} />
          </div>
          <h1>{room.name}</h1>
          {room.description && <p className="room__desc">{room.description}</p>}
          <div className="room__host muted small">
            Hosted by {room.host ? <UserLink user={room.host} /> : 'a former member'}
          </div>
        </header>

        <div className="thread" aria-live="polite">
          {room.messages.length === 0 ? (
            <Empty>No replies yet. Say something to join the room.</Empty>
          ) : (
            room.messages.map((message) => (
              <article key={message.id} className={`bubble ${message.user.id === me.id ? 'bubble--mine' : ''}`}>
                <Link to={paths.profile(message.user.id)} aria-label={`@${message.user.username}`}>
                  <Avatar user={message.user} size="md" />
                </Link>
                <div className="bubble__body">
                  <div className="bubble__head">
                    <Link to={paths.profile(message.user.id)} className="bubble__author">
                      @{message.user.username}
                    </Link>
                    <TimeAgo date={message.created} />
                    {message.user.id === me.id && (
                      <DeleteButton what="reply" label={message.body} path={`messages/${message.id}/`} onDone={reload} />
                    )}
                  </div>
                  <p>{message.body}</p>
                </div>
              </article>
            ))
          )}
          <div ref={bottom} />
        </div>

        <Composer roomId={room.id} onPosted={reload} />
      </section>

      <aside className="side side--right" aria-label="Participants">
        <h2 className="side__title">
          Participants <span className="count">{room.participants.length}</span>
        </h2>
        {room.participants.length === 0 ? (
          <p className="muted small">Nobody has replied yet.</p>
        ) : (
          <ul className="people">
            {room.participants.map((user) => (
              <li key={user.id}>
                <Link to={paths.profile(user.id)} className="user-link">
                  <Avatar user={user} size="md" />
                  <span>
                    {user.name && <strong>{user.name}</strong>}
                    <span className="muted small">@{user.username}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  )
}
