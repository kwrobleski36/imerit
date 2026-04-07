import { useState, useCallback } from 'react'
import { fetchAllItems, fetchMarketListings } from '../../services/tornApi'
import { buildArbitrageList, formatMoney } from '../../utils/marketUtils'
import { ViewToggle } from '../ui/ViewToggle'

const SCAN_BATCH = 30

const CATEGORIES = [
  { label: 'All',       type: null },
  { label: 'Melee',     type: 'Melee' },
  { label: 'Primary',   type: 'Primary' },
  { label: 'Secondary', type: 'Secondary' },
  { label: 'Temporary', type: 'Temporary' },
  { label: 'Drug',      type: 'Drug' },
  { label: 'Medical',   type: 'Medical' },
  { label: 'Alcohol',   type: 'Alcohol' },
  { label: 'Candy',     type: 'Candy' },
  { label: 'Energy',    type: 'Energy Drink' },
  { label: 'Clothing',  type: 'Clothing' },
  { label: 'Flower',    type: 'Flower' },
  { label: 'Plushie',   type: 'Plushie' },
  { label: 'Other',     type: 'Other' },
]

function SignalBadge({ signal, netProfit }) {
  if (signal === 'buy') return (
    <span className="font-mono text-xs bg-torn-success/10 border border-torn-success/30 text-torn-success rounded px-2 py-0.5">
      BUY +{formatMoney(netProfit)}
    </span>
  )
  if (signal === 'sell') return (
    <span className="font-mono text-xs bg-torn-accent/10 border border-torn-accent/30 text-torn-accent rounded px-2 py-0.5">
      ELEVATED
    </span>
  )
  return (
    <span className="font-mono text-xs bg-torn-surface border border-torn-border text-torn-text-dim rounded px-2 py-0.5">
      NEUTRAL
    </span>
  )
}

function DiscountBar({ discount }) {
  const pct = Math.max(0, Math.min(100, discount * 100))
  const color = pct >= 10 ? 'bg-torn-success' : pct >= 5 ? 'bg-torn-accent' : 'bg-torn-muted'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-torn-bg rounded overflow-hidden">
        <div className={`h-full ${color} rounded`} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-xs text-torn-text-dim w-10 text-right">{pct.toFixed(1)}%</span>
    </div>
  )
}

function VisualView({ results }) {
  if (results.length === 0) return (
    <p className="text-torn-text-dim text-sm font-mono py-8 text-center">
      No results. Try a different category or disable filters.
    </p>
  )
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {results.map((item) => (
        <div key={item.id} className={`bg-torn-surface border rounded p-4 space-y-3 ${
          item.signal === 'buy' ? 'border-torn-success/30' :
          item.signal === 'sell' ? 'border-torn-accent/30' :
          'border-torn-border'
        }`}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-display font-bold text-white text-sm leading-tight">{item.name}</p>
              <p className="font-mono text-xs text-torn-text-dim mt-0.5">{item.type}</p>
            </div>
            <SignalBadge signal={item.signal} netProfit={item.netProfit} />
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div>
              <p className="text-torn-text-dim">Market Low</p>
              <p className="text-white">{formatMoney(item.lowestListing)}</p>
            </div>
            <div>
              <p className="text-torn-text-dim">Daily Avg</p>
              <p className="text-torn-accent">{formatMoney(item.avgPrice)}</p>
            </div>
            <div>
              <p className="text-torn-text-dim">Listings</p>
              <p className="text-white">{item.listingCount}</p>
            </div>
            <div>
              <p className="text-torn-text-dim">Profit (after tax)</p>
              <p className={item.netProfit > 0 ? 'text-torn-success' : 'text-torn-danger'}>
                {formatMoney(item.netProfit)}
              </p>
            </div>
          </div>
          <div>
            <p className="font-mono text-xs text-torn-text-dim mb-1">Below avg by</p>
            <DiscountBar discount={item.discount} />
          </div>
          {item.signal === 'buy' && (
            <p className="font-mono text-xs text-torn-success border-t border-torn-border/50 pt-2">
              Buy cheapest listing, relist at average price
            </p>
          )}
          {item.signal === 'sell' && (
            <p className="font-mono text-xs text-torn-accent border-t border-torn-border/50 pt-2">
              Market above average — good time to sell if you have stock
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

function TextView({ results }) {
  if (results.length === 0) return (
    <p className="text-torn-text-dim text-sm font-mono py-4">No results.</p>
  )
  return (
    <div className="bg-torn-surface border border-torn-border rounded overflow-x-auto">
      <table className="w-full min-w-[700px]">
        <thead>
          <tr className="border-b border-torn-border">
            {['Item', 'Type', 'Market Low', 'Daily Avg', 'Discount', 'Net Profit', 'Signal'].map((h) => (
              <th key={h} className="px-4 py-2 text-left font-mono text-xs text-torn-text-dim">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {results.map((item) => (
            <tr key={item.id} className={`border-b border-torn-border/50 hover:bg-torn-bg/50 ${
              item.signal === 'buy' ? 'bg-torn-success/5' :
              item.signal === 'sell' ? 'bg-torn-accent/5' : ''
            }`}>
              <td className="px-4 py-2 font-semibold text-sm text-white">{item.name}</td>
              <td className="px-4 py-2 font-mono text-xs text-torn-text-dim">{item.type}</td>
              <td className="px-4 py-2 font-mono text-sm text-torn-text">{formatMoney(item.lowestListing)}</td>
              <td className="px-4 py-2 font-mono text-sm text-torn-accent">{formatMoney(item.avgPrice)}</td>
              <td className="px-4 py-2 font-mono text-sm text-torn-text">{(item.discount * 100).toFixed(1)}%</td>
              <td className="px-4 py-2 font-mono text-sm">
                <span className={item.netProfit > 0 ? 'text-torn-success' : 'text-torn-danger'}>
                  {formatMoney(item.netProfit)}
                </span>
              </td>
              <td className="px-4 py-2">
                <SignalBadge signal={item.signal} netProfit={item.netProfit} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function MarketScanner({ apiKey }) {
  const [view, setView]                     = useState('visual')
  const [loading, setLoading]               = useState(false)
  const [progress, setProgress]             = useState(null)
  const [error, setError]                   = useState(null)
  const [results, setResults]               = useState([])
  const [activeCategory, setActiveCategory] = useState(null)
  const [onlyBuys, setOnlyBuys]             = useState(true)
  const [searchTerm, setSearchTerm]         = useState('')

  const runScan = useCallback(async (categoryType) => {
    setLoading(true)
    setError(null)
    setResults([])
    setProgress(null)

    try {
      const items = await fetchAllItems(apiKey)

      const scannable = Object.entries(items)
        .filter(([, item]) => item.market_value > 0)
        .filter(([, item]) => categoryType === null || item.type === categoryType)
        .slice(0, SCAN_BATCH)

      if (scannable.length === 0) {
        setError('No items with market data found in this category.')
        return
      }

      setProgress(`0 / ${scannable.length}`)

      const marketData = {}
      for (let i = 0; i < scannable.length; i++) {
        const [id] = scannable[i]
        try {
          const listings = await fetchMarketListings(apiKey, id)
          marketData[id] = listings
        } catch {
          marketData[id] = []
        }
        setProgress(`${i + 1} / ${scannable.length}`)
        await new Promise((r) => setTimeout(r, 100))
      }

      const scannedItems = Object.fromEntries(scannable)
      const list = buildArbitrageList(scannedItems, marketData, false)
      setResults(list)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      setProgress(null)
    }
  }, [apiKey])

  function handleCategory(type) {
    setActiveCategory(type)
    runScan(type)
  }

  const filtered = results
    .filter((r) => !onlyBuys || r.signal === 'buy')
    .filter((r) => !searchTerm || r.name.toLowerCase().includes(searchTerm.toLowerCase()))

  const buyCount  = results.filter((r) => r.signal === 'buy').length
  const sellCount = results.filter((r) => r.signal === 'sell').length

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="font-mono text-xs text-torn-accent tracking-widest uppercase mb-1">Market Arbitrage</p>
          <h2 className="font-display text-2xl font-bold text-white">Market Scanner</h2>
          <p className="text-torn-text-dim text-sm mt-1">
            Find items listed below daily average — buy cheap, relist at average.
          </p>
        </div>
        <ViewToggle value={view} onChange={setView} />
      </div>

      <div className="bg-torn-surface border border-torn-border rounded p-4 font-mono text-xs text-torn-text-dim space-y-1">
        <p><span className="text-torn-text">BUY signal:</span> Lowest listing is 10%+ below daily average. Buy and relist at average for profit after 5% tax.</p>
        <p><span className="text-torn-text">ELEVATED signal:</span> Lowest listing is 10%+ above average. Good time to sell if you have stock.</p>
        <p><span className="text-torn-text">Note:</span> Daily average updates at midnight TCT. Scan limit: {SCAN_BATCH} items per run.</p>
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map(({ label, type }) => (
          <button
            key={label}
            onClick={() => handleCategory(type)}
            disabled={loading}
            className={`px-3 py-1.5 rounded font-mono text-xs transition-colors duration-150 border disabled:opacity-40
              ${activeCategory === type
                ? 'bg-torn-accent text-torn-bg border-torn-accent font-semibold'
                : 'bg-torn-surface border-torn-border text-torn-text-dim hover:border-torn-accent hover:text-torn-accent'
              }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Controls row */}
      <div className="flex flex-wrap gap-4 items-center">
        {loading && (
          <span className="font-mono text-xs text-torn-accent animate-pulse">
            Scanning... {progress ?? ''}
          </span>
        )}
        {results.length > 0 && !loading && (
          <div className="flex gap-4 font-mono text-xs">
            <span className="text-torn-text-dim">Scanned: <span className="text-white">{results.length}</span></span>
            <span className="text-torn-text-dim">Buy: <span className="text-torn-success">{buyCount}</span></span>
            <span className="text-torn-text-dim">Elevated: <span className="text-torn-accent">{sellCount}</span></span>
          </div>
        )}
        <div className="flex items-center gap-4 ml-auto">
          <label className="flex items-center gap-2 cursor-pointer">
            <div
              onClick={() => setOnlyBuys((v) => !v)}
              className={`w-8 h-4 rounded-full transition-colors duration-200 relative cursor-pointer ${onlyBuys ? 'bg-torn-accent' : 'bg-torn-muted'}`}
            >
              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-torn-bg transition-transform duration-200 ${onlyBuys ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
            <span className="font-mono text-xs text-torn-text-dim">Buy signals only</span>
          </label>
          {results.length > 0 && (
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by name..."
              className="bg-torn-surface border border-torn-border rounded px-3 py-1.5 font-mono text-sm text-torn-text placeholder:text-torn-muted focus:outline-none focus:border-torn-accent transition-colors w-40"
            />
          )}
        </div>
      </div>

      {error && (
        <div className="bg-torn-surface border border-torn-danger/40 rounded p-4">
          <p className="font-mono text-xs text-torn-danger">{error}</p>
        </div>
      )}

      {view === 'visual'
        ? <VisualView results={filtered} />
        : <TextView results={filtered} />
      }

      {results.length > 0 && (
        <div className="border-t border-torn-border pt-4">
          <p className="font-mono text-xs text-torn-text-dim leading-relaxed">
            <span className="text-torn-text">Caveat:</span> Daily average updates once per day. In fast-moving markets the average may lag behind real prices. Always verify before buying.
          </p>
        </div>
      )}
    </div>
  )
}
