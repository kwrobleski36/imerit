import { useState, useCallback } from 'react'
import { fetchAllItems, fetchMarketListings } from '../../services/tornApi'
import { buildArbitrageList, formatMoney } from '../../utils/marketUtils'
import { ViewToggle } from '../ui/ViewToggle'

const SCAN_BATCH = 30

// Categories we'll show as filter buttons — mapped to Torn item type values
const CATEGORIES = [
  { label: 'All',        type: null },
  { label: 'Melee',      type: 'Melee' },
  { label: 'Primary',    type: 'Primary' },
  { label: 'Secondary',  type: 'Secondary' },
  { label: 'Temporary',  type: 'Temporary' },
  { label: 'Drug',       type: 'Drug' },
  { label: 'Medical',    type: 'Medical' },
  { label: 'Alcohol',    type: 'Alcohol' },
  { label: 'Candy',      type: 'Candy' },
  { label: 'Energy',     type: 'Energy Drink' },
  { label: 'Clothing',   type: 'Clothing' },
  { label: 'Flower',     type: 'Flower' },
  { label: 'Plushie',    type: 'Plushie' },
  { label: 'Supply',     type: 'Supply Pack' },
  { label: 'Other',      type: 'Other' },
]

function ProfitBadge({ netProfit }) {
  if (netProfit > 0) return (
    <span className="font-mono text-xs bg-torn-success/10 border border-torn-success/30 text-torn-success rounded px-2 py-0.5">
      +{formatMoney(netProfit)}
    </span>
  )
  return (
    <span className="font-mono text-xs bg-torn-danger/10 border border-torn-danger/30 text-torn-danger rounded px-2 py-0.5">
      {formatMoney(netProfit)}
    </span>
  )
}

function ROIBadge({ roi }) {
  const pct = (roi * 100).toFixed(1)
  const color = roi > 0.1 ? 'text-torn-success' : roi > 0 ? 'text-torn-accent' : 'text-torn-danger'
  return <span className={`font-mono text-xs ${color}`}>{pct}% ROI</span>
}

function VisualView({ results }) {
  if (results.length === 0) return (
    <p className="text-torn-text-dim text-sm font-mono py-8 text-center">
      No results. Try a different category or disable "Profitable only".
    </p>
  )
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {results.map((item) => (
        <div key={item.id} className={`bg-torn-surface border rounded p-4 space-y-3 ${item.worthIt ? 'border-torn-success/30' : 'border-torn-border'}`}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-display font-bold text-white text-sm leading-tight">{item.name}</p>
              <p className="font-mono text-xs text-torn-text-dim mt-0.5">{item.type}</p>
            </div>
            <ProfitBadge netProfit={item.netProfit} />
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div><p className="text-torn-text-dim">NPC Price</p><p className="text-white">{formatMoney(item.npcPrice)}</p></div>
            <div><p className="text-torn-text-dim">Market Low</p><p className="text-white">{formatMoney(item.lowestMarket)}</p></div>
            <div><p className="text-torn-text-dim">Spread</p><p className={item.spread > 0 ? 'text-torn-success' : 'text-torn-danger'}>{formatMoney(item.spread)}</p></div>
            <div><p className="text-torn-text-dim">After 5% Tax</p><ROIBadge roi={item.roi} /></div>
          </div>
          {item.worthIt && <p className="font-mono text-xs text-torn-success border-t border-torn-border/50 pt-2">Buy from NPC and flip on market</p>}
        </div>
      ))}
    </div>
  )
}

function TextView({ results }) {
  if (results.length === 0) return (
    <p className="text-torn-text-dim text-sm font-mono py-4">No results. Try a different category or disable "Profitable only".</p>
  )
  return (
    <div className="bg-torn-surface border border-torn-border rounded overflow-x-auto">
      <table className="w-full min-w-[600px]">
        <thead>
          <tr className="border-b border-torn-border">
            {['Item', 'Type', 'NPC Price', 'Market Low', 'Net Profit', 'ROI'].map((h) => (
              <th key={h} className="px-4 py-2 text-left font-mono text-xs text-torn-text-dim">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {results.map((item) => (
            <tr key={item.id} className={`border-b border-torn-border/50 hover:bg-torn-bg/50 ${item.worthIt ? 'bg-torn-success/5' : ''}`}>
              <td className="px-4 py-2 font-semibold text-sm text-white">{item.name}</td>
              <td className="px-4 py-2 font-mono text-xs text-torn-text-dim">{item.type}</td>
              <td className="px-4 py-2 font-mono text-sm text-torn-text">{formatMoney(item.npcPrice)}</td>
              <td className="px-4 py-2 font-mono text-sm text-torn-text">{formatMoney(item.lowestMarket)}</td>
              <td className="px-4 py-2"><ProfitBadge netProfit={item.netProfit} /></td>
              <td className="px-4 py-2"><ROIBadge roi={item.roi} /></td>
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
  const [onlyProfitable, setOnlyProfitable] = useState(true)
  const [searchTerm, setSearchTerm]         = useState('')
  const [activeCategory, setActiveCategory] = useState(null)

  const runScan = useCallback(async (categoryType) => {
    setLoading(true)
    setError(null)
    setResults([])
    setProgress(null)

    try {
      const items = await fetchAllItems(apiKey)

      // Filter: must have NPC buy price, and match selected category if any
      const scannable = Object.entries(items)
        .filter(([, item]) => item.buy_price > 0)
        .filter(([, item]) => categoryType === null || item.type === categoryType)
        .slice(0, SCAN_BATCH)

      if (scannable.length === 0) {
        setError('No NPC-purchasable items found in this category.')
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

  function handleCategoryClick(type) {
    setActiveCategory(type)
    runScan(type)
  }

  const filtered = results
    .filter((r) => !onlyProfitable || r.worthIt)
    .filter((r) => !searchTerm || r.name.toLowerCase().includes(searchTerm.toLowerCase()))

  const profitCount = results.filter((r) => r.worthIt).length

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="font-mono text-xs text-torn-accent tracking-widest uppercase mb-1">Market Arbitrage</p>
          <h2 className="font-display text-2xl font-bold text-white">Market Scanner</h2>
          <p className="text-torn-text-dim text-sm mt-1">Compare NPC prices vs. player market. Buy low, flip high.</p>
        </div>
        <ViewToggle value={view} onChange={setView} />
      </div>

      {/* Info bar */}
      <div className="bg-torn-surface border border-torn-border rounded p-4 font-mono text-xs text-torn-text-dim space-y-1">
        <p><span className="text-torn-text">Profit formula:</span> (Market Low x 0.95) - NPC Price &gt; 0</p>
        <p><span className="text-torn-text">Tax:</span> 5% Torn market fee already deducted from profit shown.</p>
        <p><span className="text-torn-text">Limit:</span> {SCAN_BATCH} items per scan to respect API rate limits.</p>
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map(({ label, type }) => (
          <button
            key={label}
            onClick={() => handleCategoryClick(type)}
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

      {/* Status + search */}
      <div className="flex flex-wrap gap-3 items-center">
        {loading && (
          <span className="font-mono text-xs text-torn-accent animate-pulse">
            Scanning... {progress ?? ''}
          </span>
        )}
        {results.length > 0 && !loading && (
          <>
            <span className="font-mono text-xs text-torn-text-dim">Scanned: <span className="text-white">{results.length}</span></span>
            <span className="font-mono text-xs text-torn-text-dim">Profitable: <span className="text-torn-success">{profitCount}</span></span>
          </>
        )}
        <label className="flex items-center gap-2 cursor-pointer ml-auto">
          <div onClick={() => setOnlyProfitable((v) => !v)} className={`w-8 h-4 rounded-full transition-colors duration-200 relative cursor-pointer ${onlyProfitable ? 'bg-torn-accent' : 'bg-torn-muted'}`}>
            <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-torn-bg transition-transform duration-200 ${onlyProfitable ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </div>
          <span className="font-mono text-xs text-torn-text-dim">Profitable only</span>
        </label>
        {results.length > 0 && (
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Filter by name..." className="bg-torn-surface border border-torn-border rounded px-3 py-1.5 font-mono text-sm text-torn-text placeholder:text-torn-muted focus:outline-none focus:border-torn-accent transition-colors w-40" />
        )}
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
          <p className="font-mono text-xs text-torn-text-dim">
            <span className="text-torn-text">Note:</span> Market prices change constantly. Verify before buying. High-volume items fill fast.
          </p>
        </div>
      )}
    </div>
  )
}
