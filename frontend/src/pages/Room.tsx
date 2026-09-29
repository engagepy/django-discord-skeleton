import { Hash, Pencil, SendHorizontal, Trash2, Users } from 'lucide-react'
import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, ApiError, useApi } from '../api'
import { Avatar, ErrorState, Loading, TimeAgo } from '../components/bits'
import { DeleteButton } from '../components/panels'
import { useShell } from '../components/Shell'
import { useMe } from '../me'
import { paths } from '../routes'
import type { Message, RoomDetail } from '../types'

const REFRESH_MS = 10_000 // picks up other people's replies while the tab is visible
const GROUP_MS = 7 * 60_000 // replies from one person within 7 minutes sit together, as on Discord

const dayLabel = new Intl.DateTimeFormat('en', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const clock = new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' })

function Composer({ room, onPosted }: { room: RoomDetail; onPosted: () => void }) {
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function send() {
    if (!body.trim() || busy) return
    setBusy(true)
    setError('')
    try {
      await api(`rooms/${room.id}/messages/`, { method: 'POST', json: { body } })
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
      <div className="composer__box">
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
          placeholder={`Message #${room.name}`}
          aria-label={`Message #${room.name}`}
        />
        <button className="pop pop--sm" disabled={busy || !body.trim()} aria-label="Send reply">
          <SendHorizontal size={17} />
        </button>
      </div>
      <p className="composer__hint mono">
        {error ? <span className="field-error">{error}</span> : 'Enter to send · Shift+Enter for a new line'}
      </p>
    </form>
  )
}

function Thread({ room, onChange }: { room: RoomDetail; onChange: () => void }) {
  const { me } = useMe()
  let prev: Message | undefined
  return (
    <ol className="thread">
      {room.messages.map((message) => {
        const at = new Date(message.created)
        const newDay = !prev || new Date(prev.created).toDateString() !== at.toDateString()
        const grouped =
          !newDay && prev?.user.id === message.user.id && at.getTime() - new Date(prev.created).getTime() < GROUP_MS
        prev = message
        const mine = message.user.id === me.id
        return (
          <Fragment key={message.id}>
            {newDay && (
              <li className="thread__day" role="separator">
                <span className="mono">{dayLabel.format(at)}</span>
              </li>
            )}
            <li className={`msg ${grouped ? 'msg--grouped' : ''} ${mine ? 'msg--mine' : ''}`}>
              {grouped ? (
                <time className="msg__clock mono" dateTime={message.created}>
                  {clock.format(at)}
                </time>
              ) : (
                <Link to={paths.profile(message.user.id)} className="msg__avatar" aria-label={`@${message.user.username}`}>
                  <Avatar user={message.user} size="md" />
                </Link>
              )}
              <div className="msg__main">
                {!grouped && (
                  <div className="msg__head">
                    <Link to={paths.profile(message.user.id)} className="msg__who">
                      {message.user.name || message.user.username}
                    </Link>
                    {message.user.id === room.host?.id && <span className="badge mono">host</span>}
                    <TimeAgo date={message.created} />
                  </div>
                )}
                <p className="msg__body">{message.body}</p>
              </div>
              {mine && (
                <div className="msg__tools">
                  <DeleteButton what="reply" label={message.body} path={`messages/${message.id}/`} onDone={onChange} />
                </div>
              )}
            </li>
          </Fragment>
        )
      })}
    </ol>
  )
}

export function Room() {
  const { id = '' } = useParams()
  const { me } = useMe()
  const { setRoomTheme } = useShell()
  const { data: room, error, reload } = useApi<RoomDetail>(`rooms/${id}/`)
  const [members, setMembers] = useState(() => window.matchMedia('(min-width: 1180px)').matches)
  const scroller = useRef<HTMLDivElement>(null)
  const seen = useRef(0)

  useEffect(() => {
    setRoomTheme(room?.topic ?? '')
  }, [room?.topic, setRoomTheme])
  useEffect(() => () => setRoomTheme(''), [setRoomTheme])

  useEffect(() => {
    const timer = setInterval(() => document.visibilityState === 'visible' && reload(), REFRESH_MS)
    return () => clearInterval(timer)
  }, [reload])

  // Open at the newest reply, and follow new ones as they arrive.
  const count = room?.messages.length ?? 0
  useLayoutEffect(() => {
    const el = scroller.current
    if (el && count > seen.current) el.scrollTo({ top: el.scrollHeight, behavior: seen.current ? 'smooth' : 'auto' })
    seen.current = count
  }, [count])
  useEffect(() => {
    seen.current = 0
  }, [id])

  if (error) {
    return (
      <div className="page">
        <ErrorState message={error.status === 404 ? 'This room doesn’t exist any more.' : error.message} />
      </div>
    )
  }
  if (!room) {
    return (
      <div className="page">
        <Loading label="Opening room" />
      </div>
    )
  }
  const isHost = room.host?.id === me.id

  return (
    <div className={`chat ${members ? 'chat--members' : ''}`}>
      <header className="chat__bar">
        <Hash size={22} className="chat__hash" aria-hidden="true" />
        <h1 className="chat__name">{room.name}</h1>
        {room.topic && (
          <Link to={paths.theme(room.topic)} className="chip">
            {room.topic}
          </Link>
        )}
        {room.description && <p className="chat__topic">{room.description}</p>}
        <div className="chat__tools">
          {isHost && (
            <>
              <Link to={paths.updateRoom(room.id)} className="icon-btn" aria-label="Edit room" title="Edit room">
                <Pencil size={17} />
              </Link>
              <Link to={paths.deleteRoom(room.id)} className="icon-btn" aria-label="Delete room" title="Delete room">
                <Trash2 size={17} />
              </Link>
            </>
          )}
          <button
            className={`icon-btn ${members ? 'is-on' : ''}`}
            onClick={() => setMembers((m) => !m)}
            aria-pressed={members}
            aria-label="Show participants"
            title="Participants"
          >
            <Users size={17} />
          </button>
        </div>
      </header>

      <div className="chat__body">
        <div className="chat__scroll" ref={scroller} aria-live="polite">
          <div className="chat__welcome">
            <span className="chat__welcome-icon" aria-hidden="true">
              <Hash size={38} strokeWidth={2.5} />
            </span>
            <h2>
              Welcome to <span className="serif">#{room.name}</span>
            </h2>
            <p>{room.description || 'This is the very beginning of the room.'}</p>
            <p className="mono small muted">
              Started by{' '}
              {room.host ? (
                <Link to={paths.profile(room.host.id)} className="link">
                  @{room.host.username}
                </Link>
              ) : (
                'a former member'
              )}{' '}
              · <TimeAgo date={room.created} />
            </p>
          </div>
          {room.messages.length === 0 ? (
            <p className="chat__first">No replies yet. Say something to join the room.</p>
          ) : (
            <Thread room={room} onChange={reload} />
          )}
        </div>
        <Composer room={room} onPosted={reload} />
      </div>

      <aside className="members" aria-label="Participants">
        <h2 className="members__title mono">Participants — {room.participants.length}</h2>
        {room.participants.length === 0 ? (
          <p className="muted small">Nobody has replied yet.</p>
        ) : (
          <ul>
            {room.participants.map((user) => (
              <li key={user.id}>
                <Link to={paths.profile(user.id)} className="member">
                  <Avatar user={user} size="sm" />
                  <span>
                    <strong>{user.name || user.username}</strong>
                    {user.id === room.host?.id && <em className="badge mono">host</em>}
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
