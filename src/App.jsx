import { useState } from 'react'
import { Login } from './components/Login'
import { MeritGuide } from './components/merits/MeritGuide'
import { nameToAscii } from './utils/asciiFont'

const LOGO_BIG = ` _ __  __           _ _   
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

  const playerAscii = playerName ? nameToAscii(playerName) : ''

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-ink-200">
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-start justify-between gap-6">
          <pre className="ascii-logo text-ink-900 text-[10px] sm:text-[11px] leading-none">{LOGO_BIG}</pre>

          <div className="flex items-start gap-4 flex-shrink-0">
            {playerAscii && (
              <pre className="ascii-logo text-accent-dark text-[7px] sm:text-[8px] leading-none hidden sm:block">{playerAscii}</pre>
            )}
            <button
              onClick={handleLogout}
              className="text-xs text-ink-500 hover:text-bad transition-colors mt-1"
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
