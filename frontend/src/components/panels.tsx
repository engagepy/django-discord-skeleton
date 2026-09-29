import { ArrowUpRight, Hash, MessageCircle, Trash2, Users } from 'lucide-react'
import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { api, ApiError } from '../api'
import { useMe } from '../me'
import { paths } from '../routes'
import type { Message, RoomCard as Room } from '../types'
import { Avatar, Empty, themeStyle, TimeAgo } from './bits'

/** A room on the Discover grid: its theme's colours on top, a hard NeoPOP edge on hover. */
export function RoomCard({ room }: { room: Room }) {
  return (
    <article className="rcard">
      <div className="rcard__band" style={room.topic ? themeStyle(room.topic) : undefined}>
        {room.topic && (
          <Link to={paths.theme(room.topic)} className="rcard__theme">
            <Hash size={13} aria-hidden="true" />
            {room.topic}
          </Link>
        )}
        <ArrowUpRight className="rcard__arrow" size={20} aria-hidden="true" />
      </div>
      <div className="rcard__body">
        <Link to={paths.room(room.id)} className="rcard__title stretched">
          {room.name}
        </Link>
        {room.description && <p className="rcard__desc">{room.description}</p>}
        <footer className="rcard__foot">
          {room.host ? (
            <Link to={paths.profile(room.host.id)} className="user-link">
              <Avatar user={room.host} size="xs" />
              <span>{room.host.username}</span>
            </Link>
          ) : (
            <span className="muted small">Former member</span>
          )}
          <span className="rcard__meta mono">
            <Users size={13} aria-hidden="true" /> {room.participant_count}
            <span aria-hidden="true">·</span>
            <TimeAgo date={room.created} />
          </span>
        </footer>
      </div>
    </article>
  )
}

export function RoomGrid({ rooms, empty }: { rooms: Room[]; empty: React.ReactNode }) {
  if (!rooms.length) return <Empty>{empty}</Empty>
  return (
    <div className="rgrid">
      {rooms.map((room) => (
        <RoomCard key={room.id} room={room} />
      ))}
    </div>
  )
}

/** Replies across rooms, newest first. Your own can be deleted in place. */
export function ActivityList({ messages, onChange }: { messages: Message[]; onChange: () => void }) {
  const { me } = useMe()
  if (!messages.length) return <Empty>No replies yet.</Empty>
  return (
    <ol className="feed">
      {messages.map((message) => (
        <li key={message.id} className="feed__item">
          <Link to={paths.profile(message.user.id)} className="feed__avatar" aria-label={`@${message.user.username}`}>
            <Avatar user={message.user} size="md" />
          </Link>
          <div className="feed__main">
            <div className="feed__head">
              <Link to={paths.profile(message.user.id)} className="feed__who">
                {message.user.name || message.user.username}
              </Link>
              <span className="feed__in">
                <MessageCircle size={12} aria-hidden="true" /> in{' '}
                <Link to={paths.room(message.room.id)} className="link">
                  #{message.room.name}
                </Link>
              </span>
              <TimeAgo date={message.created} />
              {message.user.id === me.id && (
                <DeleteButton what="reply" label={message.body} path={`messages/${message.id}/`} onDone={onChange} />
              )}
            </div>
            <p className="feed__body">{message.body}</p>
          </div>
        </li>
      ))}
    </ol>
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
      <span className="confirm__icon" aria-hidden="true">
        <Trash2 size={22} />
      </span>
      <h2>Delete this {what}?</h2>
      {label && <p className="confirm__quote">“{label.length > 140 ? `${label.slice(0, 140)}…` : label}”</p>}
      <p className="muted small">This can’t be undone.</p>
      {error && <p className="field-error">{error}</p>}
      <div className="actions">
        <button className="pop pop--dark" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button
          className="pop pop--danger"
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
      {/* Portalled to <body>: the button often sits in a hover-only toolbar, and hiding that toolbar
          (the moment the pointer moves onto the dialog) must not hide the dialog with it. */}
      {createPortal(
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
        </dialog>,
        document.body,
      )}
    </>
  )
}
