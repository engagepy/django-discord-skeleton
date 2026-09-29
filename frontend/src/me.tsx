import { createContext, useContext, useEffect, useState } from 'react'
import { api } from './api'
import { Loading } from './components/bits'
import type { Me } from './types'

type MeContext = { me: Me; setMe: (me: Me) => void }
const Context = createContext<MeContext | null>(null)

/** Loads the signed-in user once; the api() helper redirects to sign-in if there isn't one. */
export function MeProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me>()
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    api<Me>('me/').then(setMe, () => setFailed(true))
  }, [])

  if (failed) return <div className="boot">Couldn’t reach BaatCheet. Refresh to try again.</div>
  if (!me)
    return (
      <div className="boot">
        <Loading />
      </div>
    )
  return <Context.Provider value={{ me, setMe }}>{children}</Context.Provider>
}

export function useMe() {
  const context = useContext(Context)
  if (!context) throw new Error('useMe must be used inside <MeProvider>')
  return context
}
