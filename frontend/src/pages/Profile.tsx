import { Sparkles } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { useApi } from '../api'
import { Avatar, ErrorState, Loading, themeStyle } from '../components/bits'
import { ActivityList, RoomGrid } from '../components/panels'
import { useMe } from '../me'
import { paths } from '../routes'
import type { Message, Profile as ProfileUser, RoomCard } from '../types'

type ProfileData = { user: ProfileUser; rooms: RoomCard[]; activity: Message[] }

export function Profile() {
  const { id = '' } = useParams()
  const { me } = useMe()
  const { data, error, reload } = useApi<ProfileData>(`users/${id}/`)

  if (error) {
    return (
      <div className="page">
        <ErrorState message={error.status === 404 ? 'No one has that profile.' : error.message} />
      </div>
    )
  }
  if (!data) {
    return (
      <div className="page">
        <Loading label="Loading profile" />
      </div>
    )
  }
  const { user } = data

  return (
    <div className="page page--wide">
      <section className="pcard">
        <div className="pcard__banner" style={themeStyle(user.username)} aria-hidden="true" />
        <div className="pcard__row">
          <span className="pcard__avatar">
            <Avatar user={user} size="xl" />
          </span>
          {user.id === me.id && (
            <Link to={paths.updateUser} className="pop pop--light pop--sm pcard__edit">
              <Sparkles size={15} /> Edit profile
            </Link>
          )}
        </div>
        <div className="pcard__info">
          <h1>{user.name || user.username}</h1>
          <p className="mono muted">@{user.username}</p>
          <div className="pcard__stats">
            <span>
              <b>{data.rooms.length}</b> {data.rooms.length === 1 ? 'room' : 'rooms'} hosted
            </span>
            <span>
              <b>{data.activity.length}</b> recent {data.activity.length === 1 ? 'reply' : 'replies'}
            </span>
          </div>
          <div className="pcard__about">
            <h2 className="kicker mono">About me</h2>
            <p>{user.bio || <span className="muted">Nothing here yet.</span>}</p>
          </div>
        </div>
      </section>

      <div className="split">
        <section className="split__main">
          <h2 className="section-title">
            Rooms hosted <span className="mono">{data.rooms.length}</span>
          </h2>
          <RoomGrid rooms={data.rooms} empty="No rooms hosted yet." />
        </section>
        <aside className="split__side">
          <h2 className="section-title">Latest replies</h2>
          <ActivityList messages={data.activity} onChange={reload} />
        </aside>
      </div>
    </div>
  )
}
