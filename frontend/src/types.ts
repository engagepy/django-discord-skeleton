// Shapes returned by the Django API under /api/app/ (base/api/serializers.py).

export type UserSummary = {
  id: number
  username: string
  name: string | null
  avatar: string | null
}

export type Me = UserSummary & { email: string; bio: string | null }

export type Profile = UserSummary & { bio: string | null }

export type RoomCard = {
  id: number
  name: string
  description: string | null
  host: UserSummary | null
  topic: string | null
  participant_count: number
  created: string
  updated: string
}

export type Message = {
  id: number
  body: string
  user: UserSummary
  room: { id: number; name: string }
  created: string
}

export type RoomDetail = RoomCard & { participants: UserSummary[]; messages: Message[] }

export type Topic = { id: number; name: string; room_count: number }
