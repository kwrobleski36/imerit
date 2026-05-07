import { useMemo } from 'react'
import { estimateProgress, formatNumber, asciiBar } from '../../utils/progressEstimator'

const HEADER = `+----------------------------------------+
|       NEXT 5 CLOSEST MERITS            |
+----------------------------------------+`

export function NextClosest({ awards, personalstats, battlestats, topN = 5 }) {
  const ranked = useMemo(() => {
    return awards
      .filter(a => !a.earned)
      .map(a => ({ award: a, progress: estimateProgress(a, personalstats, battlestats) }))
      .filter(x => x.progress && x.progress.percent > 0 && x.progress.percent < 100)
      .sort((a, b) => b.progress.percent - a.progress.percent)
      .slice(0, topN)
  }, [awards, personalstats, battlestats, topN])

  if (ranked.length === 0) return null

  return (
    <div className="bg-white border border-ink-200 rounded-md mb-4 overflow-hidden">
      <div className="px-4 pt-3 pb-2 border-b border-ink-200 bg-ink-50">
        <pre className="ascii-logo text-ink-700 text-[10px] leading-tight">{HEADER}</pre>
      </div>

      <div className="divide-y divide-ink-100">
        {ranked.map(({ award, progress }, i) => (
          <div key={award.id} className="px-4 py-3 hover:bg-ink-50 transition-colors">
            <div className="flex items-baseline justify-between mb-1 gap-2">
              <span className="font-semibold text-sm text-ink-900">
                <span className="font-mono text-xs text-ink-400 mr-2">#{i + 1}</span>
                {award.name}
              </span>
              <span className="font-mono text-xs text-accent-dark font-bold">{progress.percent}%</span>
            </div>
            <p className="text-xs text-ink-500 mb-1.5 leading-tight">{award.description}</p>
            <div className="flex items-center gap-3 font-mono text-[11px]">
              <span className="text-accent-dark">{asciiBar(progress.percent, 24)}</span>
              <span className="text-ink-500">
                {formatNumber(progress.current)} / {formatNumber(progress.target)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
