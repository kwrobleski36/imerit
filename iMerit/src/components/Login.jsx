import { useState } from 'react'
import { validateApiKey } from '../services/tornApi'

const LOGO = `
 _ ___  ___           _ _   
(_)  \\/  | ___ _ __(_) |_ 
| | |\\/| |/ _ \\ '__| | __|
| | |  | |  __/ |  | | |_ 
|_|_|  |_|\\___|_|  |_|\\__|
`

export function Login({ onSubmit }) {
  const [key, setKey] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!key.trim()) return
    setError(null)
    setLoading(true)
    try {
      const result = await validateApiKey(key.trim())
      if (!result.valid) setError('Invalid API key.')
      else onSubmit(key.trim(), result.player_name)
    } catch {
      setError('Could not reach the Torn API.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <pre className="ascii-logo text-ink-900 text-[11px] sm:text-[13px] mb-1 select-none">{LOGO}</pre>
        <p className="text-ink-500 text-sm mb-8 ml-1">Honor &amp; medal tracker for Torn.</p>

        <form onSubmit={handleSubmit} className="bg-white border border-ink-200 rounded-md p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink-700 mb-1.5">Torn API Key</label>
            <input
              type="text"
              value={key}
              onChange={e => setKey(e.target.value)}
              placeholder="enter your API key"
              spellCheck={false}
              autoComplete="off"
              className="w-full bg-ink-50 border border-ink-200 rounded px-3 py-2 text-sm font-mono text-ink-900 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </div>

          {error && (
            <div className="bg-bad-light border border-bad/30 rounded px-3 py-2 text-xs text-bad">{error}</div>
          )}

          <button
            type="submit"
            disabled={!key.trim() || loading}
            className="w-full bg-accent text-white rounded py-2 text-sm font-medium hover:bg-accent-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Verifying...' : 'Continue'}
          </button>

          <p className="text-[11px] text-ink-400 leading-relaxed">
            Your key never leaves your browser. Get one at{' '}
            <span className="text-ink-700 font-mono">torn.com/preferences.php#tab=api</span>
          </p>
        </form>
      </div>
    </div>
  )
}
