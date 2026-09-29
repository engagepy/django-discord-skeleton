// Every address in the app, defined once. They match the original Django URLs (base/urls.py),
// so old links and bookmarks keep working. main.tsx routes on `patterns`; links use `paths`.

export const patterns = {
  home: '/',
  room: '/room/:id/',
  profile: '/profile/:id',
  createRoom: '/createroom/',
  updateRoom: '/updateroom/:id/',
  deleteRoom: '/deleteroom/:id/',
  deleteMessage: '/deletemessage/:id/',
  updateUser: '/updateuser/',
  topics: '/topics/',
  activity: '/activity/',
} as const

// Not react-router's generatePath: it drops the trailing slash the original URLs have.
const withId = (pattern: string) => (id: number | string) => pattern.replace(':id', encodeURIComponent(id))

export const paths = {
  home: patterns.home,
  search: (q: string) => (q ? `/?q=${encodeURIComponent(q)}` : '/'),
  // One theme's rooms, as picked on the theme rail (exact match, unlike search).
  theme: (name: string) => `/?topic=${encodeURIComponent(name)}`,
  room: withId(patterns.room),
  profile: withId(patterns.profile),
  createRoom: patterns.createRoom,
  updateRoom: withId(patterns.updateRoom),
  deleteRoom: withId(patterns.deleteRoom),
  deleteMessage: withId(patterns.deleteMessage),
  updateUser: patterns.updateUser,
  topics: patterns.topics,
  activity: patterns.activity,
  // Server-rendered (django-allauth), so these are full page loads rather than app routes.
  signIn: '/accounts/login/',
  signOut: '/accounts/logout/',
  changePassword: '/accounts/password/change/',
}
