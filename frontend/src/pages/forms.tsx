import { ArrowLeft, ImageUp } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, ApiError, useApi } from '../api'
import { Avatar, ErrorState, Loading } from '../components/bits'
import { useMe } from '../me'
import { paths } from '../routes'
import type { Me, RoomDetail, Topic } from '../types'

// nginx (django-aws-deploy) accepts request bodies up to 1 MB.
const MAX_UPLOAD_BYTES = 1024 * 1024

function Field({ label, name, errors, children }: { label: string; name: string; errors: Record<string, string[]>; children: React.ReactNode }) {
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      {children}
      {errors[name]?.map((message) => (
        <p key={message} className="field-error">
          {message}
        </p>
      ))}
    </div>
  )
}

function FormCard({ title, back, children }: { title: string; back: string; children: React.ReactNode }) {
  return (
    <div className="narrow">
      <Link to={back} className="back">
        <ArrowLeft size={18} /> Back
      </Link>
      <div className="card form-card">
        <h1>{title}</h1>
        {children}
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

/** Create a room, or edit one you host (/createroom/ and /updateroom/<id>/). */
export function RoomForm() {
  const { id } = useParams()
  const { me } = useMe()
  const navigate = useNavigate()
  const topics = useApi<{ topics: Topic[] }>('topics/')
  const existing = useApi<RoomDetail>(id ? `rooms/${id}/` : null)
  const { busy, errors, message, submit } = useSubmit()

  const room = existing.data
  if (id && existing.error) return <ErrorState message={existing.error.message} />
  if (id && !room) return <Loading />
  if (room && room.host?.id !== me.id) return <ErrorState message="Only the host can edit this room." />

  return (
    <FormCard title={room ? 'Edit room' : 'Start a new room'} back={room ? paths.room(room.id) : paths.home}>
      <form
        className="form"
        onSubmit={(event) => {
          event.preventDefault()
          const values = Object.fromEntries(new FormData(event.currentTarget))
          submit(async () => {
            const saved = await api<{ id: number }>(room ? `rooms/${room.id}/` : 'rooms/', {
              method: room ? 'PATCH' : 'POST',
              json: values,
            })
            navigate(paths.room(saved.id))
          })
        }}
      >
        <Field label="Theme" name="topic" errors={errors}>
          <input id="topic" name="topic" required maxLength={200} list="topic-list" defaultValue={room?.topic ?? ''} placeholder="Pick one or type a new theme" autoComplete="off" />
          <datalist id="topic-list">
            {topics.data?.topics.map((topic) => <option key={topic.id} value={topic.name} />)}
          </datalist>
        </Field>
        <Field label="Room name" name="name" errors={errors}>
          <input id="name" name="name" required maxLength={200} defaultValue={room?.name ?? ''} placeholder="e.g. Mastering Python + Django" />
        </Field>
        <Field label="Description" name="description" errors={errors}>
          <textarea id="description" name="description" rows={4} defaultValue={room?.description ?? ''} placeholder="What's this room about?" />
        </Field>
        {message && <p className="field-error">{message}</p>}
        <div className="actions">
          <Link to={room ? paths.room(room.id) : paths.home} className="btn btn--ghost">
            Cancel
          </Link>
          <button className="btn btn--primary" disabled={busy}>
            {room ? 'Save changes' : 'Create room'}
          </button>
        </div>
      </form>
    </FormCard>
  )
}

/** Edit your picture, name, email and bio (/updateuser/). */
export function EditProfile() {
  const { me, setMe } = useMe()
  const navigate = useNavigate()
  const [preview, setPreview] = useState<string | null>(null)
  const [fileError, setFileError] = useState('')
  const { busy, errors, message, submit } = useSubmit()

  return (
    <FormCard title="Edit profile" back={paths.profile(me.id)}>
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
          {preview ? <img className="avatar avatar--xl" src={preview} alt="" /> : <Avatar user={me} size="xl" />}
          <label className="btn btn--ghost btn--sm">
            <ImageUp size={16} /> Choose a picture
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
          {(fileError || errors.avatar) && <p className="field-error">{fileError || errors.avatar?.join(' ')}</p>}
        </div>
        <Field label="Name" name="name" errors={errors}>
          <input id="name" name="name" maxLength={200} defaultValue={me.name ?? ''} />
        </Field>
        <Field label="Email" name="email" errors={errors}>
          <input id="email" name="email" type="email" required maxLength={35} defaultValue={me.email} />
        </Field>
        <Field label="Bio" name="bio" errors={errors}>
          <textarea id="bio" name="bio" rows={4} defaultValue={me.bio ?? ''} />
        </Field>
        {message && <p className="field-error">{message}</p>}
        <div className="actions">
          <Link to={paths.profile(me.id)} className="btn btn--ghost">
            Cancel
          </Link>
          <button className="btn btn--primary" disabled={busy}>
            Save profile
          </button>
        </div>
      </form>
    </FormCard>
  )
}
