import { Plus } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { useApi } from '../api'
import { ErrorState, Loading } from '../components/bits'
import { ActivitySidebar, RoomList, ThemesSidebar } from '../components/panels'
import { paths } from '../routes'
import type { Message, RoomCard } from '../types'

type HomeData = { rooms: RoomCard[]; room_count: number; activity: Message[] }

export function PageHead({ title, sub, action }: { title: React.ReactNode; sub?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {sub && <p className="muted">{sub}</p>}
      </div>
      {action}
    </div>
  )
}

export function NewRoomButton() {
  return (
    <Link to={paths.createRoom} className="btn btn--primary">
      <Plus size={18} /> New room
    </Link>
  )
}

export function Home() {
  const [params] = useSearchParams()
  const q = params.get('q') ?? ''
  const { data, error, reload } = useApi<HomeData>(`home/?q=${encodeURIComponent(q)}`)
  const count = data?.room_count ?? 0

  return (
    <div className="grid grid--3">
      <ThemesSidebar />
      <section className="main-col">
        <PageHead
          title={q ? <>Results for “{q}”</> : 'Rooms'}
          sub={data ? `${count} ${count === 1 ? 'room' : 'rooms'} ${q ? 'found' : 'to join'}` : ' '}
          action={<NewRoomButton />}
        />
        {error ? (
          <ErrorState message={error.message} />
        ) : !data ? (
          <Loading label="Loading rooms" />
        ) : (
          <RoomList
            rooms={data.rooms}
            empty={
              q ? (
                <>
                  Nothing matches “{q}”. <Link to={paths.home} className="link">Show all rooms</Link>
                </>
              ) : (
                'No rooms yet. Start the first conversation.'
              )
            }
          />
        )}
      </section>
      <ActivitySidebar messages={data?.activity} onChange={reload} />
    </div>
  )
}
