import { ArrowLeft, Camera } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { api, ApiError, useApi } from '../api'
import { Avatar, ErrorState, Loading, ThemeIcon, themeStyle } from '../components/bits'
import { RoomCard } from '../components/panels'
import { useShell } from '../components/Shell'
import { useMe } from '../me'
import { paths } from '../routes'
import type { Me, RoomDetail, Topic } from '../types'

// nginx (django-aws-deploy) accepts request bodies up to 1 MB.
const MAX_UPLOAD_BYTES = 1024 * 1024
const THEME_CHIPS = 8

function Field({
  label,
  name,
  errors,
  hint,
  children,
}: {
  label: string
  name: string
  errors: Record<string, string[]>
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="field">
      <label htmlFor={name} className="field__label mono">
        {label}
        {hint && <span>{hint}</span>}
      </label>
      {children}
      {errors[name]?.map((message) => (
        <p key={message} className="field-error">
          {message}
        </p>
      ))}
    </div>
  )
}

function FormPage({ kicker, title, back, preview, children }: { kicker: string; title: React.ReactNode; back: string; preview: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="page">
      <Link to={back} className="back">
        <ArrowLeft size={17} /> Back
      </Link>
      <div className="formpage">
        <div className="formpage__form">
          <p className="kicker mono">{kicker}</p>
          <h1 className="formpage__title">{title}</h1>
          {children}
        </div>
        <aside className="formpage__preview" aria-label="Preview">
          <p className="kicker mono">Live preview</p>
          {preview}
        </aside>
      </div>
    </div>
  )
}

function useSubmit() {
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [message, setMessage] = useState('')
  async function submit(action: () => Promise<void>) {
    setBusy(true)
    setErrors({})
    setMessage('')
    try {
      await action()
    } catch (err) {
      const apiError = err as ApiError
      setErrors(apiError.fields ?? {})
      if (!Object.keys(apiError.fields ?? {}).length) setMessage(apiError.message)
    } finally {
      setBusy(false)
    }
  }
  return { busy, errors, message, submit }
}

function RoomFormFields({ room }: { room?: RoomDetail }) {
  const { me } = useMe()
  const { refresh } = useShell()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const topics = useApi<{ topics: Topic[] }>('topics/')
  const [topic, setTopic] = useState(room?.topic ?? params.get('topic') ?? '')
  const [name, setName] = useState(room?.name ?? '')
  const [description, setDescription] = useState(room?.description ?? '')
  const { busy, errors, message, submit } = useSubmit()
  const chips = [...(topics.data?.topics ?? [])].sort((a, b) => b.room_count - a.room_count).slice(0, THEME_CHIPS)
  const back = room ? paths.room(room.id) : paths.home

  const preview = (
    <RoomCard
      room={{
        id: room?.id ?? 0,
        name: name || 'Your room name',
        description: description || 'What people will talk about in here.',
        host: me,
        topic: topic || 'Theme',
        participant_count: room?.participant_count ?? 0,
        created: room?.created ?? new Date().toISOString(),
        updated: new Date().toISOString(),
      }}
    />
  )

  return (
    <FormPage
      kicker={room ? 'Edit room' : 'New room'}
      title={
        room ? (
          <>
            Tune your <span className="serif">room</span>.
          </>
        ) : (
          <>
            Start a <span className="serif">room</span>.
          </>
        )
      }
      back={back}
      preview={preview}
    >
      <form
        className="form"
        onSubmit={(event) => {
          event.preventDefault()
          submit(async () => {
            const saved = await api<{ id: number }>(room ? `rooms/${room.id}/` : 'rooms/', {
              method: room ? 'PATCH' : 'POST',
              json: { topic, name, description },
            })
            refresh()
            navigate(paths.room(saved.id))
          })
        }}
      >
        <Field label="Theme" name="topic" errors={errors} hint="pick one or type a new one">
          <input
            id="topic"
            className="input"
            required
            maxLength={200}
            list="topic-list"
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            placeholder="e.g. Python, JWST, Shows & Movies"
            autoComplete="off"
          />
          <datalist id="topic-list">
            {topics.data?.topics.map((t) => <option key={t.id} value={t.name} />)}
          </datalist>
          {chips.length > 0 && (
            <div className="chips">
              {chips.map((t) => (
                <button
                  type="button"
                  key={t.id}
                  className={`chip chip--pick ${topic === t.name ? 'is-on' : ''}`}
                  onClick={() => setTopic(t.name)}
                >
                  <ThemeIcon name={t.name} size="sm" /> {t.name}
                </button>
              ))}
            </div>
          )}
        </Field>
        <Field label="Room name" name="name" errors={errors}>
          <input
            id="name"
            className="input input--big"
            required
            maxLength={200}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Mastering Python + Django"
          />
        </Field>
        <Field label="Description" name="description" errors={errors} hint="optional">
          <textarea
            id="description"
            className="input"
            rows={4}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What's this room about?"
          />
        </Field>
        {message && <p className="field-error">{message}</p>}
        <div className="actions">
          <Link to={back} className="pop pop--dark">
            Cancel
          </Link>
          <button className="pop pop--lg" disabled={busy}>
            {room ? 'Save changes' : 'Create room'}
          </button>
        </div>
      </form>
    </FormPage>
  )
}

/** Create a room, or edit one you host (/createroom/ and /updateroom/<id>/). */
export function RoomForm() {
  const { id } = useParams()
  const { me } = useMe()
  const existing = useApi<RoomDetail>(id ? `rooms/${id}/` : null)

  if (!id) return <RoomFormFields />
  if (existing.error) {
    return (
      <div className="page">
        <ErrorState message={existing.error.message} />
      </div>
    )
  }
  if (!existing.data) {
    return (
      <div className="page">
        <Loading />
      </div>
    )
  }
  if (existing.data.host?.id !== me.id) {
    return (
      <div className="page">
        <ErrorState message="Only the host can edit this room." />
      </div>
    )
  }
  return <RoomFormFields key={existing.data.id} room={existing.data} />
}

/** Edit your picture, name, email and bio (/updateuser/). */
export function EditProfile() {
  const { me, setMe } = useMe()
  const navigate = useNavigate()
  const [preview, setPreview] = useState<string | null>(null)
  const [fileError, setFileError] = useState('')
  const [name, setName] = useState(me.name ?? '')
  const [bio, setBio] = useState(me.bio ?? '')
  const { busy, errors, message, submit } = useSubmit()
  const shown = { ...me, name, avatar: preview ?? me.avatar }

  return (
    <FormPage
      kicker="Your profile"
      title={
        <>
          Make it <span className="serif">yours</span>.
        </>
      }
      back={paths.profile(me.id)}
      preview={
        <div className="pcard pcard--mini">
          <div className="pcard__banner" style={themeStyle(me.username)} aria-hidden="true" />
          <div className="pcard__row">
            <span className="pcard__avatar">
              <Avatar user={shown} size="lg" />
            </span>
          </div>
          <div className="pcard__info">
            <h2>{name || me.username}</h2>
            <p className="mono muted">@{me.username}</p>
            <div className="pcard__about">
              <h3 className="kicker mono">About me</h3>
              <p>{bio || <span className="muted">Nothing here yet.</span>}</p>
            </div>
          </div>
        </div>
      }
    >
      <form
        className="form"
        onSubmit={(event) => {
          event.preventDefault()
          const form = new FormData(event.currentTarget)
          const avatar = form.get('avatar')
          if (avatar instanceof File && !avatar.size) form.delete('avatar')
          submit(async () => {
            const updated = await api<Me>('me/', { method: 'PATCH', form })
            setMe(updated)
            navigate(paths.profile(me.id))
          })
        }}
      >
        <div className="avatar-picker">
          <label className="avatar-picker__drop" title="Change picture">
            <Avatar user={shown} size="xl" />
            <span className="avatar-picker__overlay">
              <Camera size={22} />
              Change
            </span>
            <input
              type="file"
              name="avatar"
              accept="image/*"
              className="visually-hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file && file.size > MAX_UPLOAD_BYTES) {
                  setFileError('That picture is over 1 MB. Please pick a smaller one.')
                  event.target.value = ''
                  return
                }
                setFileError('')
                setPreview(file ? URL.createObjectURL(file) : null)
              }}
            />
          </label>
          <p className="muted small">A square picture works best. Up to 1 MB.</p>
          {(fileError || errors.avatar) && <p className="field-error">{fileError || errors.avatar?.join(' ')}</p>}
        </div>
        <Field label="Display name" name="name" errors={errors}>
          <input id="name" name="name" className="input" maxLength={200} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Email" name="email" errors={errors}>
          <input id="email" name="email" className="input" type="email" required maxLength={35} defaultValue={me.email} />
        </Field>
        <Field label="About me" name="bio" errors={errors}>
          <textarea id="bio" name="bio" className="input" rows={4} value={bio} onChange={(e) => setBio(e.target.value)} />
        </Field>
        {message && <p className="field-error">{message}</p>}
        <div className="actions">
          <Link to={paths.profile(me.id)} className="pop pop--dark">
            Cancel
          </Link>
          <button className="pop pop--lg" disabled={busy}>
            Save profile
          </button>
        </div>
      </form>
    </FormPage>
  )
}
