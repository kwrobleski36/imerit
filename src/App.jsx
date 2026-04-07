import { useState } from 'react'
import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { ApiKeyInput } from './components/ApiKeyInput'
import { SearchingForLoot } from './components/crimes/SearchingForLoot'
import { MarketScanner } from './components/market/MarketScanner'

export default function App() {
  const [apiKey,     setApiKey]     = useState(() => sessionStorage.getItem('torn_api_key') ?? null)
  const [playerName, setPlayerName] = useState(() => sessionStorage.getItem('torn_player')  ?? null)

  function handleLogin(key, name) {
    sessionStorage.setItem('torn_api_key', key)
    sessionStorage.setItem('torn_player',  name ?? '')
    setApiKey(key)
    setPlayerName(name)
  }

  function handleLogout() {
    sessionStorage.removeItem('torn_api_key')
    sessionStorage.removeItem('torn_player')
    setApiKey(null)
    setPlayerName(null)
  }

  if (!apiKey) return <ApiKeyInput onSubmit={handleLogin} />

  const navClass = ({ isActive }) =>
    `font-mono text-sm px-4 py-2 rounded transition-colors duration-150 ${
      isActive
        ? 'bg-torn-accent text-torn-bg font-semibold'
        : 'text-torn-text-dim hover:text-torn-text'
    }`

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="border-b border-torn-border px-6 py-3 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-6">
          <span className="font-mono text-xs text-torn-accent tracking-widest uppercase">
            Torn Tools
          </span>
          <nav className="flex gap-1">
            <NavLink to="/crimes" className={navClass}>Crimes</NavLink>
            <NavLink to="/market" className={navClass}>Market</NavLink>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {playerName && (
            <span className="font-mono text-xs text-torn-text-dim">{playerName}</span>
          )}
          <button
            onClick={handleLogout}
            className="font-mono text-xs text-torn-text-dim hover:text-torn-danger transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Routes */}
      <main className="py-8">
        <Routes>
          <Route path="/" element={<Navigate to="/crimes" replace />} />
          <Route path="/crimes" element={<SearchingForLoot apiKey={apiKey} />} />
          <Route path="/market" element={<MarketScanner apiKey={apiKey} />} />
        </Routes>
      </main>
    </div>
  )
}
