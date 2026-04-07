import { useState, useCallback } from 'react'
import { fetchAllItems, fetchMarketListings } from '../../services/tornApi'
import { buildArbitrageList, formatMoney, MARKET_TAX } from '../../utils/marketUtils'
import { ViewToggle } from '../ui/ViewToggle'

// How many items to scan at once (API rate limit caution)
const SCAN_BATCH = 20

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

// ── Visual view: card grid ────────────────────────────────────────────────────
function VisualView({ results }) {
  if (results.length === 0) return (
    <p className="text-torn-text-dim text-sm font-mono py-8 text-center">
      No results yet. Run a scan to find arbitrage opportunities.
    </p>
  )

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {results.map((item) => (
        <div
          key={item.id}
          className={`bg-torn-surface border rounded p-4 space-y-3 ${
            item.worthIt ? 'border-torn-success/30' : 'border-torn-border'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-display font-bold text-white text-sm leading-tight">{item.name}</p>
              <p className="font-mono text-xs text-torn-text-dim mt-0.5">{item.type}</p>
            </div>
            <ProfitBadge netProfit={item.netProfit} />
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div>
              <p className="text-torn-text-dim">NPC Price</p>
              <p className="text-white">{formatMoney(item.npcPrice)}</p>
            </div>
            <div>
              <p className="text-torn-text-dim">Market Low</p>
              <p className="text-white">{formatMoney(item.lowestMarket)}</p>
            </div>
            <div>
              <p className="text-torn-text-dim">Spread</p>
              <p className={item.spread > 0 ? 'text-torn-success' : 'text-torn-danger'}>{formatMoney(item.spread)}</p>
            </div>
            <div>
              <p className="text-torn-text-dim">After 5% Tax</p>
              <ROIBadge roi={item.roi} />
            </div>
          </div>

          {item.worthIt && (
            <p className="font-mono text-xs text-torn-success border-t border-torn-border/50 pt-2">
              ✓ Buy from NPC → flip on market
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Text view: sortable table ─────────────────────────────────────────────────
function TextView({ results }) {
  if (results.length === 0) return (
    <p className="text-torn-text-dim text-sm font-mono py-4">No results yet. Run a scan.</p>
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
              <td className="px-4 py-2">
                <ProfitBadge netProfit={item.netProfit} />
              </td>
              <td className="px-4 py-2">
                <ROIBadge roi={item.roi} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function MarketScanner({ apiKey }) {
  const [view, setView]               = useState('visual')
  const [loading, setLoading]         = useState(false)
  const [progress, setProgress]       = useState(null)   // e.g. "12 / 20"
  const [error, setError]             = useState(null)
  const [results, setResults]         = useState([])
  const [onlyProfitable, setOnlyProfitable] = useState(true)
  const [searchTerm, setSearchTerm]   = useState('')

  const runScan = useCallback(async () => {
    setLoading(true)
    setError(null)
    setResults([])
    setProgress(null)

    try {
      // 1. Get all items (cached in sessionStorage after first call)
      const items = await fetchAllItems(apiKey)

      // 2. Filter to only items that have an NPC buy price
      const scannable = Object.entries(items)
        .filter(([, item]) => item.buy_price > 0)
        .slice(0, SCAN_BATCH)  // cap per run to respect rate limits

      setProgress(`0 / ${scannable.length}`)

      // 3. Fetch market data for each item
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
        // Small delay to avoid hammering the API
        await new Promise((r) => setTimeout(r, 100))
      }

      // 4. Build arbitrage list from just the items we scanned
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

  // Filter results based on toggle + search
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
          <p className="text-torn-text-dim text-sm mt-1">
            Compare NPC shop prices vs. player market to find flip opportunities.
          </p>
        </div>
        <ViewToggle value={view} onChange={setView} />
      </div>

      {/* How it works callout */}
      <div className="bg-torn-surface border border-torn-border rounded p-4 font-mono text-xs text-torn-text-dim space-y-1">
        <p><span className="text-torn-text">Strategy:</span> Buy item from NPC → list on player market at market price.</p>
        <p><span className="text-torn-text">Profit formula:</span> (Market Low × 0.95) − NPC Price &gt; 0</p>
        <p><span className="text-torn-text">Tax:</span> Torn charges 5% on all market sales. Profit shown is <em>after</em> tax.</p>
        <p><span className="text-torn-text">Scan limit:</span> {SCAN_BATCH} items per run (API rate limit caution). Sorted by profit desc.</p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <button
          onClick={runScan}
          disabled={loading}
          className="bg-torn-accent text-torn-bg px-5 py-2 rounded font-mono text-sm font-semibold hover:bg-torn-accent-dim transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? `Scanning… ${progress ?? ''}` : '⟳  Run Scan'}
        </button>

        <label className="flex items-center gap-2 cursor-pointer">
          <div
            onClick={() => setOnlyProfitable((v) => !v)}
            className={`w-8 h-4 rounded-full transition-colors duration-200 relative ${onlyProfitable ? 'bg-torn-accent' : 'bg-torn-muted'}`}
          >
            <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-torn-bg transition-transform duration-200 ${onlyProfitable ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </div>
          <span className="font-mono text-xs text-torn-text-dim">Profitable only</span>
        </label>

        {results.length > 0 && (
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter by name…"
            className="bg-torn-surface border border-torn-border rounded px-3 py-1.5 font-mono text-sm text-torn-text placeholder:text-torn-muted focus:outline-none focus:border-torn-accent transition-colors w-40"
          />
        )}
      </div>

      {/* Summary bar */}
      {results.length > 0 && (
        <div className="flex gap-6 font-mono text-xs">
          <span className="text-torn-text-dim">Scanned: <span className="text-white">{results.length}</span></span>
          <span className="text-torn-text-dim">Profitable: <span className="text-torn-success">{profitCount}</span></span>
          <span className="text-torn-text-dim">Showing: <span className="text-torn-accent">{filtered.length}</span></span>
        </div>
      )}

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
            <span className="text-torn-text">Note:</span> Market prices change constantly. Always verify
            the listing before buying. High-volume items may fill faster than you can list.
          </p>
        </div>
      )}
    </div>
  )
}
