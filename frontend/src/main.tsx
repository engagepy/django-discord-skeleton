import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import '@fontsource-variable/unbounded'
import '@fontsource/instrument-serif/400-italic.css'
import './styles/app.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Shell } from './components/Shell'
import { MeProvider } from './me'
import { Home } from './pages/Home'
import { EditProfile, RoomForm } from './pages/forms'
import { Activity, ConfirmDelete, NotFound, Topics } from './pages/more'
import { Profile } from './pages/Profile'
import { Room } from './pages/Room'
import { patterns } from './routes'

const router = createBrowserRouter([
  {
    element: <Shell />,
    children: [
      { path: patterns.home, element: <Home /> },
      { path: patterns.room, element: <Room /> },
      { path: patterns.profile, element: <Profile /> },
      { path: patterns.createRoom, element: <RoomForm /> },
      { path: patterns.updateRoom, element: <RoomForm /> },
      { path: patterns.deleteRoom, element: <ConfirmDelete kind="room" /> },
      { path: patterns.deleteMessage, element: <ConfirmDelete kind="reply" /> },
      { path: patterns.updateUser, element: <EditProfile /> },
      { path: patterns.topics, element: <Topics /> },
      { path: patterns.activity, element: <Activity /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MeProvider>
      <RouterProvider router={router} />
    </MeProvider>
  </StrictMode>,
)
