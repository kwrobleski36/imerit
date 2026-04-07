import { useState, useEffect, useCallback } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { fetchCrimes } from '../../services/tornApi'
import { estimateSkill, buildChartData } from '../../utils/crimeModel'
import { useSnapshots } from '../../hooks/useSnapshots'
import { ViewToggle } from '../ui/ViewToggle'

const CRIME_KEY = 'theft'

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="bg-torn-surface border border-torn-border rounded p-4">
      <p className="font-mono text-xs text-torn-text-dim uppercase tracking-widest mb-1">{label}</p>
      <p className={`font-display text-3xl font-bold ${accent ? 'text-torn-accent' : 'text-white'}`}>{value}</p>
      {sub && <p className="font-mono text-xs text-torn-text-dim mt-1">{sub}</p>}
    </div>
  )
}

function ConfidenceBadge({ confidence }) {
  const s = { low: 'border-torn-danger text-torn-danger', medium: 'border-torn-accent text-torn-accent', high: 'border-torn-success text-torn-success' }
  return (
    <span className={`font-mono text-xs border rounded px-2 py-0.5 ${s[confidence]}`}>
      {confidence.toUpperCase()} CONFIDENCE
    </span>
  )
}

function VisualView({ historical, projected, currentEstimate }) {
  const combined = [
    ...historical.map((h) => ({ attempts: h.attempts, mean: h.mean })),
    ...projected.map((p) => ({ attempts: p.attempts, projected: p.projected })),
  ]
  return (
    <div className="space-y-6">
      <div className="bg-torn-surface border border-torn-border rounded p-4">
        <p className="font-mono text-xs text-torn-text-dim uppercase tracking-widest mb-4">
          Estimated Success Rate — Historical + Projection
        </p>
        {historical.length === 0 ? (
          <p className="text-torn-text-dim text-sm font-mono py-8 text-center">
            Fetch stats and save a snapshot to begin building history.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={combined} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="#1e2330" strokeDasharray="3 3" />
              <XAxis dataKey="attempts" stroke="#3a3f4d" tick={{ fill: '#5a6070', fontSize: 11, fontFamily: 'JetBrains Mono' }} />
              <YAxis domain={[0, 100]} stroke="#3a3f4d" tick={{ fill: '#5a6070', fontSize: 11, fontFamily: 'JetBrains Mono' }} tickFormatter={(v) => `${v}%`} />
              <Tooltip
                contentStyle={{ background: '#111318', border: '1px solid #1e2330', borderRadius: 4 }}
                labelStyle={{ color: '#5a6070', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                itemStyle={{ fontFamily: 'JetBrains Mono', fontSize: 12 }}
                formatter={(val, name) => [`${val}%`, name === 'mean' ? 'Observed' : 'Projected']}
                labelFormatter={(v) => `Attempts: ${v}`}
              />
              {[20, 40, 55, 70, 82, 92].map((y) => (
                <ReferenceLine key={y} y={y} stroke="#1e2330" strokeDasharray="6 3" />
              ))}
              <Line type="monotone" dataKey="mean" stroke="#e8c547" strokeWidth={2} dot={{ fill: '#e8c547', r: 4 }} connectNulls={false} />
              {projected.length > 0 && (
                <Line type="monotone" dataKey="projected" stroke="#4ade80" strokeWidth={2} strokeDasharray="6 3" dot={false} connectNulls={false} />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
        <div className="mt-3 flex gap-4 text-xs font-mono text-torn-text-dim">
          <span><span style={{ color: '#e8c547' }}>——</span> Observed</span>
          <span><span style={{ color: '#4ade80' }}>- - -</span> Projected</span>
        </div>
      </div>

      {currentEstimate && (
        <div className="bg-torn-surface border border-torn-border rounded p-4">
          <p className="font-mono text-xs text-torn-text-dim uppercase tracking-widest mb-3">
            90% Credible Interval
          </p>
          <div className="relative h-8 bg-torn-bg rounded overflow-hidden border border-torn-border">
            <div className="absolute top-0 h-full bg-torn-accent/20" style={{ left: `${currentEstimate.lower90 * 100}%`, width: `${(currentEstimate.upper90 - currentEstimate.lower90) * 100}%` }} />
            <div className="absolute top-0 h-full w-0.5 bg-torn-accent" style={{ left: `${currentEstimate.mean * 100}%` }} />
          </div>
          <div className="flex justify-between mt-1 font-mono text-xs text-torn-text-dim">
            <span>0%</span><span>50%</span><span>100%</span>
          </div>
          <p className="mt-2 font-mono text-xs text-torn-text">
            Best estimate: <span className="text-torn-accent font-semibold">{(currentEstimate.mean * 100).toFixed(1)}%</span>
            {' '}— range {(currentEstimate.lower90 * 100).toFixed(1)}% – {(currentEstimate.upper90 * 100).toFixed(1)}%
          </p>
        </div>
      )}
    </div>
  )
}

function TextView({ snapshots, currentEstimate, removeSnapshot }) {
  if (!currentEstimate) return (
    <p className="text-torn-text-dim text-sm font-mono py-4">No data yet. Fetch stats and save a snapshot.</p>
  )
  const { mean, lower90, upper90, tier, tierColor, sampleSize, confidence } = currentEstimate
  return (
    <div className="space-y-6">
      <div className="bg-torn-surface border border-torn-border rounded p-5 space-y-3">
        <p className="font-mono text-xs text-torn-text-dim uppercase tracking-widest">Skill Interpretation</p>
        <p className="text-torn-text leading-relaxed">
          Based on <span className="text-white font-semibold">{sampleSize} total attempts</span>, estimated success rate is{' '}
          <span className="text-torn-accent font-semibold font-mono">{(mean * 100).toFixed(1)}%</span>{' '}
          (90% CI: <span className="font-mono">{(lower90 * 100).toFixed(1)}%</span> – <span className="font-mono">{(upper90 * 100).toFixed(1)}%</span>).
        </p>
        <p className="text-torn-text">Skill tier: <span className={`font-display font-bold text-lg ${tierColor}`}>{tier}</span></p>
        <ConfidenceBadge confidence={confidence} />
        {confidence === 'low' && <p className="font-mono text-xs text-torn-text-dim">⚠ Low sample size — complete more crimes to tighten the estimate.</p>}
      </div>

      {snapshots.length > 0 && (
        <div className="bg-torn-surface border border-torn-border rounded overflow-hidden">
          <p className="font-mono text-xs text-torn-text-dim uppercase tracking-widest p-4 border-b border-torn-border">Snapshot History</p>
          <table className="w-full">
            <thead>
              <tr className="border-b border-torn-border">
                {['Date', 'Attempts', 'Successes', 'Rate', ''].map((h) => (
                  <th key={h} className="px-4 py-2 text-left font-mono text-xs text-torn-text-dim">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {snapshots.map((s) => {
                const est = estimateSkill(s.attempts, s.successes)
                return (
                  <tr key={s.timestamp} className="border-b border-torn-border/50 hover:bg-torn-bg/50">
                    <td className="px-4 py-2 font-mono text-xs text-torn-text-dim">{new Date(s.timestamp).toLocaleDateString()}</td>
                    <td className="px-4 py-2 font-mono text-sm text-white">{s.attempts}</td>
                    <td className="px-4 py-2 font-mono text-sm text-torn-success">{s.successes}</td>
                    <td className="px-4 py-2 font-mono text-sm text-torn-accent">{(est.mean * 100).toFixed(1)}%</td>
                    <td className="px-4 py-2">
                      <button onClick={() => removeSnapshot(s.timestamp)} className="font-mono text-xs text-torn-text-dim hover:text-torn-danger transition-colors">✕</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export function SearchingForLoot({ apiKey }) {
  const [view, setView]           = useState('visual')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)
  const [liveData, setLiveData]   = useState(null)
  const [estimate, setEstimate]   = useState(null)
  const [chartData, setChartData] = useState({ historical: [], projected: [] })
  const [msg, setMsg]             = useState(null)
  const { snapshots, addSnapshot, removeSnapshot, clearAll } = useSnapshots()

  useEffect(() => {
    if (snapshots.length > 0) setChartData(buildChartData(snapshots))
  }, [snapshots])

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const crimes = await fetchCrimes(apiKey)
      const raw = crimes[CRIME_KEY]
      if (!raw) {
        setError(`Crime key "${CRIME_KEY}" not found. Available keys logged to console.`)
        console.warn('Available crime keys:', Object.keys(crimes))
        return
      }
      setLiveData({ attempts: raw.attempts, successes: raw.successes })
      setEstimate(estimateSkill(raw.attempts, raw.successes))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [apiKey])

  function handleSnapshot() {
    if (!liveData) return
    const snap = addSnapshot(liveData)
    const msg = snap ? 'Snapshot saved.' : 'Already have a snapshot for this attempt count.'
    setMsg(msg)
    setTimeout(() => setMsg(null), 2500)
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="font-mono text-xs text-torn-accent tracking-widest uppercase mb-1">Crime Skill Estimator</p>
          <h2 className="font-display text-2xl font-bold text-white">Theft</h2>
          <p className="text-torn-text-dim text-sm mt-1">Bayesian inference on your hidden theft skill.</p>
        </div>
        <ViewToggle value={view} onChange={setView} />
      </div>

      {liveData && estimate && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Attempts" value={liveData.attempts.toLocaleString()} />
          <StatCard label="Successes" value={liveData.successes.toLocaleString()} sub={`${liveData.attempts - liveData.successes} failures`} />
          <StatCard label="Est. Rate" value={`${(estimate.mean * 100).toFixed(1)}%`} accent />
          <StatCard label="Skill Tier" value={estimate.tier} />
        </div>
      )}

      <div className="flex flex-wrap gap-3 items-center">
        <button onClick={fetchData} disabled={loading} className="bg-torn-surface border border-torn-border px-5 py-2 rounded font-mono text-sm text-torn-text hover:border-torn-accent hover:text-torn-accent transition-colors disabled:opacity-40">
          {loading ? 'Fetching…' : '↻  Fetch Live Stats'}
        </button>
        <button onClick={handleSnapshot} disabled={!liveData} className="bg-torn-accent text-torn-bg px-5 py-2 rounded font-mono text-sm font-semibold hover:bg-torn-accent-dim transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
          ◉  Save Snapshot
        </button>
        {snapshots.length > 0 && (
          <button onClick={clearAll} className="font-mono text-xs text-torn-text-dim hover:text-torn-danger transition-colors ml-auto">
            Clear All Snapshots
          </button>
        )}
      </div>

      {msg   && <p className="font-mono text-xs text-torn-success">{msg}</p>}
      {error && <div className="bg-torn-surface border border-torn-danger/40 rounded p-4"><p className="font-mono text-xs text-torn-danger">{error}</p></div>}

      {view === 'visual'
        ? <VisualView historical={chartData.historical} projected={chartData.projected} currentEstimate={estimate} />
        : <TextView snapshots={snapshots} currentEstimate={estimate} removeSnapshot={removeSnapshot} />
      }

      <div className="border-t border-torn-border pt-4">
        <p className="font-mono text-xs text-torn-text-dim leading-relaxed">
          <span className="text-torn-text">Model:</span> Beta(1 + successes, 1 + failures) posterior. Projection fits y = a·ln(x) + b across snapshots.
        </p>
      </div>
    </div>
  )
}
