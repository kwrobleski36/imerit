import { useMemo } from 'react'

const HEADER = `+----------------------------------+
|     5 MOST RECENTLY EARNED       |
+----------------------------------+`

function timeAgo(ts) {
  if (!ts) return null
  const seconds = Math.floor(Date.now() / 1000) - ts
  if (seconds < 60) return 'just now'
  const m = Math.floor(seconds / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  const mo = Math.floor(d / 30)
  if (mo < 12) return `${mo}mo ago`
  return `${Math.floor(mo / 12)}y ago`
}

export function RecentlyEarned({ tornAwards, honorsTime, medalsTime }) {
  const recent = useMemo(() => {
    const items = []

    for (const [id, ts] of honorsTime?.entries() ?? []) {
      const data = tornAwards.honors[id]
      if (data) items.push({ id, type: 'Honor', ts, name: data.name, description: data.description })
    }
    for (const [id, ts] of medalsTime?.entries() ?? []) {
      const data = tornAwards.medals[id]
      if (data) items.push({ id, type: 'Medal', ts, name: data.name, description: data.description })
    }

    // Sort by timestamp descending. Items with no timestamp go last.
    items.sort((a, b) => (b.ts ?? 0) - (a.ts ?? 0))
    return items.slice(0, 5)
  }, [tornAwards, honorsTime, medalsTime])

  if (recent.length === 0) return null

  return (
    <div className="bg-white border border-ink-200 rounded-md mb-4 overflow-hidden">
      <div className="px-4 pt-3 pb-2 border-b border-ink-200 bg-ink-50">
        <pre className="ascii-logo text-ink-700 text-[10px] leading-tight">{HEADER}</pre>
      </div>

      <div className="divide-y divide-ink-100">
        {recent.map(item => (
          <div key={`${item.type}-${item.id}`} className="px-4 py-3">
            <div className="flex items-baseline justify-between mb-0.5 gap-2">
              <span className="font-semibold text-sm text-ink-900">{item.name}</span>
              <span className="font-mono text-[11px] text-ink-400 flex-shrink-0">
                {item.type} {timeAgo(item.ts) && `· ${timeAgo(item.ts)}`}
              </span>
            </div>
            <p className="text-xs text-ink-500 leading-tight">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
