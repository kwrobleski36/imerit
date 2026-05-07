import { useState, useEffect, useMemo } from 'react'
import { fetchTornAwards, fetchPlayerAwards, debug } from '../../services/tornApi'
import { NextClosest } from './NextClosest'
import { estimateProgress, formatNumber, asciiBar } from '../../utils/progressEstimator'

const CATEGORY_RULES = [
  { label: 'Combat',    keys: ['attack','defeat','kill','mug','hospitalize','fight','war','chain','stab','shoot','punch','kick','bash','assassin','hitman','slaughter','massacre','blood','revenge','aggress','devastat','terror','retali','critical','headshot','carnage','victor','lethal'] },
  { label: 'Crimes',    keys: ['crime','steal','loot','hack','skimmer','card','bootleg','shoplift','pickpocket','hustle','scam','forgery','crack','graffiti','burgl','search for cash','counterfeit','disposal','hunting','vandal','thief','robbery','heist','bust','jail','federal'] },
  { label: 'Education', keys: ['course','education','study','graduate','degree','university','school','class','learn','certif','bachelor','master','doctor','phd','diploma','academic'] },
  { label: 'Travel',    keys: ['travel','overseas','abroad','souvenir','import','traffick','flight','airport','foreign','cayman','mexico','dubai','hawaii','canada','japan','china','argentina','switzerland','south africa','globetrotter','frequent flyer'] },
  { label: 'Stats',     keys: ['strength','defense','speed','dexterity','gym','train','muscle','toned','athletic','built','iron','power','strong','fast','swift','quick','lightspeed','reinforced','shredded','jacked','pumped'] },
  { label: 'Social',    keys: ['marry','faction','friend','enemy','recruit','leader','wedding','spouse','partner','squad','crew','gang','clique','refer','invite','family'] },
  { label: 'Medical',   keys: ['hospital','revive','medic','blood','drug','xanax','cannabis','opium','lsd','pcp','ketamine','ecstasy','shroom','heroin','addict','overdose','rehab','nurse','surgery','inject','detox','pill','booster','sodaholic','energy drink'] },
  { label: 'Economy',   keys: ['bank','invest','money','cash','trade','stock','market','sell','buy','auction','bazaar','point','rich','wealth','networth','property','house','trailer','rent','landlord','business','company','employee','profit','earn','billion','million'] },
  { label: 'Casino',    keys: ['poker','dice','slot','roulette','casino','gamble','bet','wager','jackpot','wheel','blackjack','token','russian'] },
  { label: 'Level',     keys: ['level','rank','age','veteran','newb','prestige','elder','senior','achieve','decorated','honored'] },
]

function detectCategory(name = '', description = '') {
  const text = `${name} ${description}`.toLowerCase()
  for (const rule of CATEGORY_RULES) if (rule.keys.some(k => text.includes(k))) return rule.label
  return 'Other'
}

const TIPS = {
  'Lovestruck':    'Defeat monkey_D and Left4Dead12 back-to-back.',
  'Flatline':      'Attack a new player at full health and one-shot them.',
  'Friendly Fire': 'Defeat a faction member.',
  'Going Postal':  'Defeat a co-worker.',
  'Vae Victis':    'Defeat someone with 5x your stats. Penguinbob is a known target.',
  'Boss Fight':    'Join an ongoing NPC loot fight and land at least one hit.',
  'Clotted':       'Use Ipecac Syrup to hospitalize yourself.',
  'Pious':         'Donate $100,000 to the Church.',
  'Sacrificial':   'Donate $1 billion total to the Church.',
  'Souvenir':      'Find your unique souvenir overseas. Check yata.yt.',
  'Landlord':      'Buy a Trailer, rent it out for free.',
  'Pocket Money':  'Make any investment in the Torn City Bank.',
  'Wholesaler':    'Sell 1,000 points total on the Points Market.',
  'Lavish':        'Dump any item worth over $1 million.',
  "Who's Frank?":  'Take 50 Cannabis (~75 hours, ~$300k).',
  'Energetic':     'Stack to 1,000 energy using 4 Xanax.',
  'Historian':     'Open any Chronicle in the Newspaper, stay for 15 minutes.',
}

function getTip(name) {
  for (const [key, tip] of Object.entries(TIPS)) {
    if (name?.toLowerCase().includes(key.toLowerCase())) return tip
  }
  return null
}

const CATEGORIES = ['All', 'Combat', 'Crimes', 'Education', 'Travel', 'Stats', 'Social', 'Medical', 'Economy', 'Casino', 'Level', 'Other']

const EMPTY_DONE = `   ___ ___  __  __ ___ _    ___ _____ ___ 
  / __/ _ \\|  \\/  | _ \\ |  | __|_   _| __|
 | (_| (_) | |\\/| |  _/ |__| _|  | | | _| 
  \\___\\___/|_|  |_|_| |____|___| |_| |___|`

const EMPTY_NONE = `   _  _  ___    __  __    _ _____ ___ _  _ 
  | \\| |/ _ \\  |  \\/  |  /_\\_   _/ __| || |
  | .\` | (_) | | |\\/| | / _ \\| || (__| __ |
  |_|\\_|\\___/  |_|  |_|/_/ \\_\\_| \\___|_||_|`

// ─── Primitives ──────────────────────────────────────────────────────────────

function Card({ children, className = '' }) {
  return <div className={`bg-white border border-ink-200 rounded-md ${className}`}>{children}</div>
}

function CardHeader({ children }) {
  return (
    <div className="px-4 py-2.5 border-b border-ink-200 font-mono text-xs font-bold text-ink-700 uppercase tracking-wide">
      [ {children} ]
    </div>
  )
}

function StatLine({ label, value, accent }) {
  return (
    <div className="flex justify-between items-baseline px-4 py-1 font-mono text-[13px] border-b border-ink-100 last:border-0">
      <span className="text-ink-500">{label}</span>
      <span className={`font-bold ${accent ?? 'text-ink-900'}`}>{value}</span>
    </div>
  )
}

const MERIT_LABELS = {
  strength: 'Strength', defense: 'Defense', speed: 'Speed', dexterity: 'Dexterity',
  life_points: 'Life Points', crime_experience: 'Crime Progression',
  education_speed: 'Education Length', nerve_bar: 'Nerve Bar',
  bank_interest: 'Bank Interest', critical_hit_rate: 'Critical Hit Rate',
  awareness: 'Awareness', hospitalization: 'Hospitalization',
  addiction_mitigation: 'Addiction Mitigation', employee_effectiveness: 'Employee Effectiveness',
}

function prettyLabel(key) {
  return MERIT_LABELS[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function MeritAllocation({ merits, unspent }) {
  const entries = Object.entries(merits ?? {})
  const totalSpent = entries.reduce((sum, [, lvl]) => {
    const n = Number(lvl) || 0
    return sum + (n * (n + 1)) / 2
  }, 0)

  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader>Merit Allocations</CardHeader>
        <div className="p-6 text-sm font-mono text-ink-500 text-center">
          &gt; No merit data returned. Make sure your key has access to user / merits.
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        Merit Allocations &middot; {totalSpent} spent{unspent != null && ` · ${unspent} unspent`}
      </CardHeader>
      <table className="w-full font-mono text-sm">
        <thead className="bg-ink-50">
          <tr className="text-[11px] text-ink-500 uppercase tracking-wide">
            <th className="px-4 py-2 text-left font-bold">Upgrade</th>
            <th className="px-4 py-2 text-left font-bold w-44">Level</th>
            <th className="px-4 py-2 text-left font-bold w-20">Cost</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([key, raw]) => {
            const lvl = Number(raw) || 0
            const cost = (lvl * (lvl + 1)) / 2
            return (
              <tr key={key} className="border-t border-ink-100">
                <td className="px-4 py-2 text-ink-900">{prettyLabel(key)}</td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-accent-dark text-[12px]">
                      [{'\u2588'.repeat(lvl)}{'\u2591'.repeat(10 - lvl)}]
                    </span>
                    <span className="text-ink-500 text-xs">{lvl}/10</span>
                  </div>
                </td>
                <td className="px-4 py-2 text-ink-500 text-xs">{cost}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </Card>
  )
}

function AwardRow({ award, earned, expanded, onToggle, progress, showProgress }) {
  const cat = detectCategory(award.name, award.description)
  const tip = getTip(award.name)

  return (
    <>
      <tr onClick={tip ? onToggle : undefined}
        className={`border-t border-ink-100 ${earned ? 'bg-accent-light/30' : 'bg-white hover:bg-ink-50'} ${tip ? 'cursor-pointer' : ''}`}>
        <td className="px-4 py-2 w-10 font-mono text-sm text-center">
          <span className={earned ? 'text-accent-dark font-bold' : 'text-ink-300'}>
            {earned ? '[X]' : '[ ]'}
          </span>
        </td>
        <td className="px-4 py-2 w-1/4">
          <span className={`font-mono text-sm font-bold ${earned ? 'text-ink-500 line-through' : 'text-ink-900'}`}>
            {award.name ?? `#${award.id}`}
          </span>
        </td>
        <td className="px-4 py-2 font-mono text-[13px] text-ink-500">{award.description ?? '\u2014'}</td>
        <td className="px-4 py-2 w-24 font-mono text-xs text-ink-500">{cat}</td>
        {showProgress && (
          <td className="px-4 py-2 w-56">
            {!earned && progress ? (
              <div className="font-mono text-[10px]">
                <div className="flex items-center gap-2">
                  <span className="text-accent-dark">{asciiBar(progress.percent, 14)}</span>
                  <span className="text-ink-700 font-bold">{progress.percent}%</span>
                </div>
                <div className="text-ink-500 mt-0.5">
                  {formatNumber(progress.current)} / {formatNumber(progress.target)}
                </div>
              </div>
            ) : null}
          </td>
        )}
      </tr>
      {expanded && tip && (
        <tr className="bg-warn-light/40 border-t border-ink-100">
          <td></td>
          <td colSpan={showProgress ? 4 : 3} className="px-4 py-2 font-mono text-[13px] text-ink-700">
            <span className="font-bold text-warn">&gt; TIP: </span>{tip}
          </td>
        </tr>
      )}
    </>
  )
}

function DebugPanel({ open, onClose }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="bg-white rounded-lg max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-ink-200 flex items-center justify-between font-mono">
          <h3 className="font-bold text-sm">[ DEBUG: RAW API ]</h3>
          <button onClick={onClose} className="text-ink-500 hover:text-ink-900 text-xs">[ close ]</button>
        </div>
        <div className="overflow-auto p-4 space-y-4 font-mono">
          <div>
            <p className="text-xs font-bold text-ink-700 mb-1">user/?selections=...</p>
            <pre className="bg-ink-50 border border-ink-200 rounded p-3 text-[11px] overflow-auto max-h-64">{JSON.stringify(debug.user, null, 2)}</pre>
          </div>
          <div>
            <p className="text-xs font-bold text-ink-700 mb-1">torn/?selections=honors,medals (truncated)</p>
            <pre className="bg-ink-50 border border-ink-200 rounded p-3 text-[11px] overflow-auto max-h-64">{JSON.stringify(debug.torn, null, 2).slice(0, 3000)}...</pre>
          </div>
        </div>
      </div>
    </div>
  )
}

export function MeritGuide({ apiKey }) {
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [tornAwards, setTornAwards] = useState({ honors: {}, medals: {} })
  const [playerData, setPlayerData] = useState(null)
  const [tab, setTab] = useState('honors')
  const [filter, setFilter] = useState('needed')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [expanded, setExpanded] = useState(null)
  const [showDebug, setShowDebug] = useState(false)
  const [showProgress, setShowProgress] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true); setError(null)
      try {
        const [torn, player] = await Promise.all([fetchTornAwards(apiKey), fetchPlayerAwards(apiKey)])
        if (!cancelled) { setTornAwards(torn); setPlayerData(player) }
      } catch (e) {
        if (!cancelled) setError(e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [apiKey])

  const awards = useMemo(() => {
    const source = tab === 'medals' ? tornAwards.medals : tornAwards.honors
    const earnedSet = tab === 'medals' ? playerData?.earnedMedals : playerData?.earnedHonors
    return Object.entries(source).map(([id, data]) => ({
      id: Number(id),
      ...data,
      earned: earnedSet?.has(Number(id)) ?? false,
    }))
  }, [tab, tornAwards, playerData])

  const allAwards = useMemo(() => {
    const honors = Object.entries(tornAwards.honors).map(([id, d]) => ({ id: Number(id), ...d, earned: playerData?.earnedHonors?.has(Number(id)) ?? false }))
    const medals = Object.entries(tornAwards.medals).map(([id, d]) => ({ id: Number(id), ...d, earned: playerData?.earnedMedals?.has(Number(id)) ?? false }))
    return [...honors, ...medals]
  }, [tornAwards, playerData])

  const filtered = useMemo(() => {
    let list = awards
    if (filter === 'earned') list = list.filter(a => a.earned)
    if (filter === 'needed') list = list.filter(a => !a.earned)
    if (category !== 'All')  list = list.filter(a => detectCategory(a.name, a.description) === category)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(a => (a.name ?? '').toLowerCase().includes(q) || (a.description ?? '').toLowerCase().includes(q))
    }
    return list
  }, [awards, filter, category, search])

  const honorList = Object.keys(tornAwards.honors).map(Number)
  const medalList = Object.keys(tornAwards.medals).map(Number)
  const honorEarned = honorList.filter(id => playerData?.earnedHonors?.has(id)).length
  const medalEarned = medalList.filter(id => playerData?.earnedMedals?.has(id)).length

  const earned = awards.filter(a => a.earned).length
  const total  = awards.length
  const pct    = total ? Math.round((earned / total) * 100) : 0

  const categoryCounts = useMemo(() => {
    const counts = { All: awards.length }
    for (const a of awards) {
      const c = detectCategory(a.name, a.description)
      counts[c] = (counts[c] ?? 0) + 1
    }
    return counts
  }, [awards])

  if (loading) return <div className="max-w-[1400px] mx-auto px-6 py-16 text-center font-mono text-sm text-ink-500">&gt; Loading from Torn API...</div>
  if (error) return (
    <div className="max-w-md mx-auto mt-16">
      <Card>
        <div className="px-4 py-2 bg-bad text-white text-sm font-mono font-bold">[ API ERROR ]</div>
        <div className="p-4 font-mono text-sm">
          <p className="text-ink-900 mb-2">! {error}</p>
          <p className="text-ink-500 text-xs">&gt; Your key needs access to user and torn sections.</p>
        </div>
      </Card>
    </div>
  )

  const profile = playerData?.profile ?? {}

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-6">
      <div className="flex gap-6">
        <aside className="w-64 flex-shrink-0 space-y-4">
          <Card>
            <CardHeader>Player</CardHeader>
            <StatLine label="Name" value={profile.name ?? '\u2014'} />
            <StatLine label="Level" value={profile.level ?? '\u2014'} />
            <StatLine label="Age" value={profile.age ? `${profile.age}d` : '\u2014'} />
            {profile.money_onhand != null && (
              <StatLine label="Money" value={`$${profile.money_onhand.toLocaleString()}`} accent="text-accent-dark" />
            )}
          </Card>

          <Card>
            <CardHeader>Progress</CardHeader>
            <StatLine label="Honors" value={`${honorEarned}/${honorList.length}`} />
            <StatLine label="Medals" value={`${medalEarned}/${medalList.length}`} />
            <StatLine label="Earned" value={honorEarned + medalEarned} accent="text-accent-dark" />
          </Card>

          <Card>
            <CardHeader>View</CardHeader>
            {[['honors','Honors',honorList.length],['medals','Medals',medalList.length],['merits','Allocations',null]].map(([key,label,count]) => (
              <button key={key} onClick={() => setTab(key)}
                className={`w-full flex items-center justify-between px-4 py-1.5 font-mono text-sm border-b border-ink-100 last:border-0 transition-colors ${tab === key ? 'bg-accent-light text-accent-dark font-bold' : 'text-ink-700 hover:bg-ink-50'}`}>
                <span>{tab === key ? '> ' : '  '}{label}</span>
                {count != null && <span className="text-xs text-ink-400">{count}</span>}
              </button>
            ))}
          </Card>

          {tab !== 'merits' && (
            <Card>
              <CardHeader>Categories</CardHeader>
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setCategory(cat)}
                  className={`w-full flex items-center justify-between px-4 py-1 font-mono text-sm border-b border-ink-100 last:border-0 transition-colors ${category === cat ? 'bg-accent-light text-accent-dark font-bold' : 'text-ink-700 hover:bg-ink-50'}`}>
                  <span>{category === cat ? '> ' : '  '}{cat}</span>
                  <span className="text-xs text-ink-400">{categoryCounts[cat] ?? 0}</span>
                </button>
              ))}
            </Card>
          )}

          <button onClick={() => setShowDebug(true)} className="w-full font-mono text-xs text-ink-400 hover:text-ink-700 py-1">
            [ Debug: raw API ]
          </button>
        </aside>

        <main className="flex-1 min-w-0">
          {tab === 'merits' ? (
            <MeritAllocation merits={playerData?.merits} unspent={profile.merits} />
          ) : (
            <>
              <NextClosest
                awards={allAwards}
                personalstats={playerData?.personalstats ?? {}}
                battlestats={playerData?.battlestats ?? {}}
                topN={5}
              />
              <Card>
                <CardHeader>
                  {tab === 'medals' ? 'Medals' : 'Honors'}
                  {category !== 'All' && ` / ${category}`}
                  {' '}&middot; {earned}/{total} ({pct}%)
                </CardHeader>
                <div className="px-4 py-3 border-b border-ink-200 bg-ink-50 flex items-center gap-3 flex-wrap font-mono">
                  <div className="flex bg-white border border-ink-200 rounded overflow-hidden">
                    {[['needed','Needed'],['earned','Earned'],['all','All']].map(([k,label]) => (
                      <button key={k} onClick={() => setFilter(k)}
                        className={`px-3 py-1 text-xs border-r border-ink-200 last:border-0 ${filter === k ? 'bg-accent text-white font-bold' : 'text-ink-700 hover:bg-ink-50'}`}>
                        {filter === k ? '(*)' : '( )'} {label}
                      </button>
                    ))}
                  </div>
                  <input type="text" placeholder="search..." value={search} onChange={e => setSearch(e.target.value)}
                    className="bg-white border border-ink-200 rounded px-3 py-1 text-xs font-mono text-ink-900 focus:outline-none focus:border-accent flex-1 max-w-xs" />

                  <button
                    onClick={() => setShowProgress(p => !p)}
                    className={`px-3 py-1 text-xs border rounded font-mono transition-colors ${showProgress ? 'bg-accent text-white border-accent' : 'bg-white text-ink-700 border-ink-200 hover:bg-ink-50'}`}
                  >
                    [{showProgress ? 'X' : ' '}] Progress
                  </button>

                  <span className="text-xs text-ink-400 ml-auto">{filtered.length} showing</span>
                </div>
                {filtered.length === 0 ? (
                  <div className="p-12 text-center">
                    <pre className="ascii-logo text-accent-dark text-[10px] leading-tight inline-block">
{filter === 'needed' ? EMPTY_DONE : EMPTY_NONE}
                    </pre>
                    <p className="mt-4 font-mono text-sm text-ink-500">
                      &gt; {filter === 'needed' ? 'All complete in this category.' : 'No awards match your filters.'}
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-ink-50">
                      <tr className="font-mono text-[11px] text-ink-500 uppercase tracking-wide">
                        <th className="px-4 py-2 text-left font-bold w-10"></th>
                        <th className="px-4 py-2 text-left font-bold">Name</th>
                        <th className="px-4 py-2 text-left font-bold">Description</th>
                        <th className="px-4 py-2 text-left font-bold">Category</th>
                        {showProgress && <th className="px-4 py-2 text-left font-bold">Progress</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(a => {
                        const progress = !a.earned
                          ? estimateProgress(a, playerData?.personalstats ?? {}, playerData?.battlestats ?? {})
                          : null
                        return (
                          <AwardRow
                            key={`${tab}-${a.id}`}
                            award={a}
                            earned={a.earned}
                            expanded={expanded === `${tab}-${a.id}`}
                            onToggle={() => setExpanded(expanded === `${tab}-${a.id}` ? null : `${tab}-${a.id}`)}
                            progress={progress}
                            showProgress={showProgress}
                          />
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </Card>
            </>
          )}
        </main>
      </div>

      <DebugPanel open={showDebug} onClose={() => setShowDebug(false)} />
    </div>
  )
}
