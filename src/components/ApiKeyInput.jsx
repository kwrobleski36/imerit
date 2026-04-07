import { useState } from 'react'
import { validateApiKey } from '../services/tornApi'

export function ApiKeyInput({ onSubmit }) {
  const [key, setKey]         = useState('')
  const [error, setError]     = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!key.trim()) return
    setError(null)
    setLoading(true)
    try {
      const result = await validateApiKey(key.trim())
      if (!result.valid) setError('Invalid API key. Check your Torn settings and try again.')
      else onSubmit(key.trim(), result.player_name)
    } catch {
      setError('Could not reach the Torn API. Check your connection.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-10">
          <p className="font-mono text-xs text-torn-accent tracking-widest uppercase mb-2">
            torn tools
          </p>
          <h1 className="font-display text-4xl font-bold text-white leading-tight">
            Enter your<br />API Key
          </h1>
          <p className="mt-3 text-torn-text-dim text-sm leading-relaxed">
            Access crime skill estimation and market arbitrage tools.
            Your key never leaves your browser — everything runs client-side.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-mono text-xs text-torn-text-dim uppercase tracking-widest mb-2">
              Torn API Key (Public Access level)
            </label>
            <input
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="your-api-key-here"
              spellCheck={false}
              autoComplete="off"
              className="w-full bg-torn-surface border border-torn-border rounded px-4 py-3 font-mono text-sm text-torn-text placeholder:text-torn-muted focus:outline-none focus:border-torn-accent transition-colors"
            />
          </div>
          {error && <p className="font-mono text-xs text-torn-danger">{error}</p>}
          <button
            type="submit"
            disabled={!key.trim() || loading}
            className="w-full bg-torn-accent text-torn-bg font-display font-bold py-3 rounded text-sm tracking-wide hover:bg-torn-accent-dim transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? 'Verifying…' : 'Enter →'}
          </button>
        </form>

        <p className="mt-6 text-xs text-torn-text-dim font-mono">
          Get your key at: Torn → Settings → API Key
        </p>
      </div>
    </div>
  )
}
