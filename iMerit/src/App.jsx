import { useState } from 'react'
import { Login } from './components/Login'
import { MeritGuide } from './components/merits/MeritGuide'

const LOGO = `iMerit`
const LOGO_BIG = `
 _ __  __           _ _   
(_)  \\/  | ___ _ __(_) |_ 
| | |\\/| |/ _ \\ '__| | __|
| | |  | |  __/ |  | | |_ 
|_|_|  |_|\\___|_|  |_|\\__|`

export default function App() {
  const [apiKey, setApiKey]         = useState(() => sessionStorage.getItem('imerit_key') ?? null)
  const [playerName, setPlayerName] = useState(() => sessionStorage.getItem('imerit_player') ?? null)

  function handleLogin(key, name) {
    sessionStorage.setItem('imerit_key', key)
    sessionStorage.setItem('imerit_player', name ?? '')
    setApiKey(key)
    setPlayerName(name)
  }

  function handleLogout() {
    sessionStorage.removeItem('imerit_key')
    sessionStorage.removeItem('imerit_player')
    setApiKey(null)
    setPlayerName(null)
  }

  if (!apiKey) return <Login onSubmit={handleLogin} />

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-ink-200">
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between">
          <pre className="ascii-logo text-ink-900 text-[10px] hidden md:block">{LOGO_BIG}</pre>
          <span className="ascii-logo text-ink-900 text-xl md:hidden">{LOGO}</span>
          <div className="flex items-center gap-4 text-xs">
            {playerName && (
              <span className="text-ink-500">
                Signed in as <span className="text-ink-900 font-medium">{playerName}</span>
              </span>
            )}
            <button
              onClick={handleLogout}
              className="text-ink-500 hover:text-bad transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <MeritGuide apiKey={apiKey} />
    </div>
  )
}
