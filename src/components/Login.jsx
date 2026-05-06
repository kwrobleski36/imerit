import { useState } from 'react'
import { validateApiKey } from '../services/tornApi'

export function Login({ onSubmit }) {
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
      if (!result.valid) setError('Invalid API key — check your Torn settings.')
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
        <p className="font-mono text-xs text-torn-accent tracking-widest uppercase mb-2">iMerit</p>
        <h1 className="font-display text-4xl font-bold text-white leading-tight mb-2">
          Merit<br />Tracker
        </h1>
        <p className="text-torn-text-dim text-sm leading-relaxed mb-10">
          See every honor and medal in Torn. Check off what you've earned, hunt down what you haven't.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-mono text-xs text-torn-text-dim uppercase tracking-widest mb-2">
              Torn API Key
            </label>
            <input
              type="text"
              value={key}
              onChange={e => setKey(e.target.value)}
              placeholder="your-api-key"
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
            {loading ? 'Checking…' : 'Load My Merits →'}
          </button>
        </form>
        <p className="mt-6 text-xs text-torn-text-dim font-mono">
          Needs <span className="text-torn-text">Full Access</span> key. Nothing leaves your browser.
        </p>
      </div>
    </div>
  )
}
