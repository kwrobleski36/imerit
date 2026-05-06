import { useState } from 'react'
import { Login } from './components/Login'
import { MeritGuide } from './components/merits/MeritGuide'

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
      <header className="border-b border-torn-border px-6 py-3 flex items-center justify-between sticky top-0 bg-torn-bg z-10">
        <span className="font-mono text-xs text-torn-accent tracking-widest uppercase">iMerit</span>
        <div className="flex items-center gap-4">
          {playerName && <span className="font-mono text-xs text-torn-text-dim">{playerName}</span>}
          <button onClick={handleLogout} className="font-mono text-xs text-torn-text-dim hover:text-torn-danger transition-colors">
            Sign out
          </button>
        </div>
      </header>
      <main className="py-6">
        <MeritGuide apiKey={apiKey} />
      </main>
    </div>
  )
}
