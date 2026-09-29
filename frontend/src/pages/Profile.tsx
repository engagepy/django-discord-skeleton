import { UserRoundPen } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { useApi } from '../api'
import { Avatar, ErrorState, Loading } from '../components/bits'
import { ActivitySidebar, RoomList, ThemesSidebar } from '../components/panels'
import { useMe } from '../me'
import { paths } from '../routes'
import type { Message, Profile as ProfileUser, RoomCard } from '../types'

type ProfileData = { user: ProfileUser; rooms: RoomCard[]; activity: Message[] }

export function Profile() {
  const { id = '' } = useParams()
  const { me } = useMe()
  const { data, error, reload } = useApi<ProfileData>(`users/${id}/`)

  if (error) return <ErrorState message={error.status === 404 ? 'No one has that profile.' : error.message} />

  return (
    <div className="grid grid--3">
      <ThemesSidebar />
      <section className="main-col">
        {!data ? (
          <Loading label="Loading profile" />
        ) : (
          <>
            <div className="card profile">
              <div className="profile__banner" aria-hidden="true" />
              <div className="profile__body">
                <Avatar user={data.user} size="xl" />
                <div className="profile__who">
                  <h1>{data.user.name || data.user.username}</h1>
                  <p className="muted">@{data.user.username}</p>
                </div>
                {data.user.id === me.id && (
                  <Link to={paths.updateUser} className="btn btn--ghost btn--sm profile__edit">
                    <UserRoundPen size={15} /> Edit profile
                  </Link>
                )}
              </div>
              <div className="profile__about">
                <h2 className="side__title">About</h2>
                <p>{data.user.bio || <span className="muted">Nothing here yet.</span>}</p>
              </div>
            </div>
            <h2 className="section-title">
              Rooms hosted <span className="count">{data.rooms.length}</span>
            </h2>
            <RoomList rooms={data.rooms} empty="No rooms hosted yet." />
          </>
        )}
      </section>
      <ActivitySidebar messages={data?.activity} onChange={reload} />
    </div>
  )
}
