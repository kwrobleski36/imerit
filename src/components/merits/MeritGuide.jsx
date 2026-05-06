import { useState, useEffect, useMemo } from 'react'
import { fetchTornAwards, fetchPlayerAwards } from '../../services/tornApi'

// ─── Category detector ────────────────────────────────────────────────────────
const CATEGORY_RULES = [
  { label: 'Combat',    color: '#f87171', keys: ['attack','defeat','kill','mug','hospitalize','fight','war','chain','stab','shoot','punch','kick','bash','assassin','hitman','slaughter','massacre','blood','revenge','mugging','mugged','defender','aggress','devastat','terror','retali','critical','headshot','carnage','victor','lethal'] },
  { label: 'Crimes',    color: '#fb923c', keys: ['crime','steal','loot','hack','skimmer','card','bootleg','shoplift','pickpocket','hustle','scam','forgery','crack','graffiti','burgl','search for cash','counterfeit','disposal','hunting','vandal','thief','robbery','heist','bust','jail','federal'] },
  { label: 'Education', color: '#60a5fa', keys: ['course','education','study','graduate','degree','university','school','class','learn','certif','bachelor','master','doctor','phd','diploma','academic'] },
  { label: 'Travel',    color: '#a78bfa', keys: ['travel','overseas','abroad','souvenir','import','traffick','flight','land','airport','city','island','country','foreign','cayman','mexico','dubai','hawaii','canada','uk','japan','china','argentina','switzerland','south africa','cayman'] },
  { label: 'Stats',     color: '#34d399', keys: ['strength','defense','speed','dexterity','gym','stat','train','muscle','toned','athletic','physi','built','iron','power','strong','fast','swift','quick'] },
  { label: 'Social',    color: '#f472b6', keys: ['marry','faction','friend','enemy','recruit','faction','leader','co-leader','member','wedding','spouse','partner','couple','squad','crew','gang','clique','refer','invite','family'] },
  { label: 'Medical',   color: '#4ade80', keys: ['hospital','revive','medic','blood','drug','xanax','cannabis','opium','speed','lsd','pcp','ketamine','ecstasy','shroom','coke','heroin','addict','overdose','rehab','nurse','doctor','surgery','inject','detox','pill','booster','cannabis','who\'s frank','stoned','high','drunk','sober','alcohol','energy drink','sodaholic'] },
  { label: 'Economy',   color: '#e8c547', keys: ['bank','invest','money','cash','trade','stock','market','sell','buy','auction','bazaar','point','rich','wealth','networth','property','house','trailer','real estate','rent','landlord','business','company','employee','profit','earn','billion','million'] },
  { label: 'Casino',    color: '#c084fc', keys: ['poker','dice','slot','roulette','casino','gamble','bet','wager','jackpot','wheel','card game','russian','blackjack','token'] },
  { label: 'Level',     color: '#94a3b8', keys: ['level','rank','age','veteran','newb','honor','prestige','elder','senior','junior','achieve'] },
]

function detectCategory(name = '', description = '') {
  const text = `${name} ${description}`.toLowerCase()
  for (const rule of CATEGORY_RULES) {
    if (rule.keys.some(k => text.includes(k))) return rule
  }
  return { label: 'Other', color: '#5a6070' }
}

// ─── Difficulty heuristic (honors only) ──────────────────────────────────────
function detectDifficulty(name = '', description = '') {
  const text = `${name} ${description}`.toLowerCase()
  if (['100,000,000','1,000,000,000','shredded','devastation','50,000','grandmaster','legendary'].some(k => text.includes(k))) return 'Hard'
  if (['10,000','50,000','1,000,000','specialist','expert','accomplished'].some(k => text.includes(k))) return 'Medium'
  return 'Easy'
}

const DIFF_COLORS = { Easy: '#4ade80', Medium: '#e8c547', Hard: '#f87171' }

// ─── Hardcoded tips for notable awards ───────────────────────────────────────
const TIPS = {
  // Combat
  'Lovestruck':       'Defeat monkey_D and Left4Dead12 back-to-back — a classic duo.',
  'Flatline':         'Attack a new player at full health and one-shot them.',
  'Double Dragon':    'Assist a friend\'s attack — don\'t deal the killing blow yourself.',
  'Guardian Angel':   'Jump in and defeat someone who is currently attacking another player.',
  'Friendly Fire':    'Defeat a faction member. Ask a weak factionmate to strip armor.',
  'Going Postal':     'Defeat a co-worker. Coordinate with an alt or weak colleague.',
  'Phoenix':          'Lose to a friend, then beat them within 10 minutes.',
  'Domino Effect':    'Kill someone who is displaying the Domino Effect honor.',
  'Leonidas':         'Take Kickboxing education course, finish a kill with a kick.',
  'Semper Fortis':    'Defeat someone with 2x your total battle stats.',
  'Manu Forti':       'Defeat someone with 2x your total battle stats (same as Semper).',
  'Vae Victis':       'Defeat someone with 5x your stats — Penguinbob is a known easy target.',
  'Invictus':         'Successfully defend against someone with 2x your stats. Hold a HEG.',
  'Boss Fight':       'Join an ongoing NPC loot fight and land at least one hit.',
  // Crimes
  'Clotted':          'Buy Ipecac Syrup (~$80k) and use it to hospitalize yourself.',
  'Pious':            'Donate $100k to the Church (cumulative or all at once).',
  'Sacrificial':      'Donate a total of $1 billion to the Church.',
  'Chain Saver':      'Save a 100+ chain within 10 seconds of breaking.',
  // Travel/Economy
  'Souvenir':         'Find your unique souvenir item overseas — check YATA.yt Awards tab.',
  'Landlord':         'Buy a Trailer, rent it out for free, ask someone to rent it.',
  'Pocket Money':     'Make any investment in the Torn City Bank — even $1.',
  'Wholesaler':       'Sell 1,000 points total on the Points Market (buy & re-sell slowly).',
  'Lavish':           'Dump/destroy any item worth over $1 million from your items page.',
  // Social/Medical
  'Who\'s Frank?':    'Take 50 Cannabis (1.5h each, ~$6k each — ~75h total, ~$300k).',
  'Energetic':        'Stack to 1,000 energy using Xanax (4 doses, ~6-8h cooldown each).',
  'Historian':        'Open any Chronicle in the Newspaper and stay on the page 15 minutes.',
  'Daddy\'s New Shoes': 'Win $100M in Russian Roulette — coordinate with a friend.',
  // Generic
  'Landlord':         'Buy a Trailer property and rent it out (can be free).',
}

function getTip(name) {
  for (const [key, tip] of Object.entries(TIPS)) {
    if (name?.toLowerCase().includes(key.toLowerCase())) return tip
  }
  return null
}

// ─── Award Card ───────────────────────────────────────────────────────────────
function AwardCard({ award, earned }) {
  const [open, setOpen] = useState(false)
  const cat = detectCategory(award.name, award.description)
  const diff = detectDifficulty(award.name, award.description)
  const tip = getTip(award.name)

  return (
    <div
      onClick={() => tip && setOpen(o => !o)}
      className={`
        border rounded px-3 py-2.5 transition-all duration-150 select-none
        ${earned
          ? 'bg-[#0d1a0e] border-[#1a3320] opacity-60'
          : 'bg-torn-surface border-torn-border hover:border-torn-muted cursor-pointer'
        }
        ${tip && !earned ? 'cursor-pointer' : ''}
      `}
    >
      <div className="flex items-start gap-2">
        {/* Checkmark */}
        <div className={`mt-0.5 w-4 h-4 rounded-sm border flex-shrink-0 flex items-center justify-center
          ${earned ? 'bg-[#1a3320] border-[#2d5c38]' : 'border-torn-muted bg-torn-bg'}`}>
          {earned && (
            <svg className="w-2.5 h-2.5 text-torn-success" fill="none" viewBox="0 0 12 12">
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`font-mono text-xs font-bold leading-tight ${earned ? 'text-torn-text-dim' : 'text-white'}`}>
              {award.name ?? `Award #${award.id}`}
            </span>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded border"
              style={{ color: cat.color, borderColor: cat.color + '44', background: cat.color + '18' }}>
              {cat.label}
            </span>
            {!earned && (
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded border"
                style={{ color: DIFF_COLORS[diff], borderColor: DIFF_COLORS[diff] + '44', background: DIFF_COLORS[diff] + '18' }}>
                {diff}
              </span>
            )}
            {tip && !earned && (
              <span className="font-mono text-[10px] text-torn-accent">
                {open ? '▲ tip' : '▼ tip'}
              </span>
            )}
          </div>

          {award.description && (
            <p className="font-mono text-[11px] text-torn-text-dim mt-0.5 leading-snug">
              {award.description}
            </p>
          )}

          {open && tip && (
            <div className="mt-2 bg-[#1a1a0d] border border-[#3a3510] rounded px-2.5 py-2">
              <p className="font-mono text-[11px] text-torn-accent leading-relaxed">
                💡 {tip}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Merit Allocation Panel ───────────────────────────────────────────────────
const MERIT_UPGRADES = [
  { key: 'strength',           label: 'Strength',           desc: '+3% battle stat per level' },
  { key: 'defense',            label: 'Defense',            desc: '+3% battle stat per level' },
  { key: 'speed',              label: 'Speed',              desc: '+3% battle stat per level' },
  { key: 'dexterity',         label: 'Dexterity',          desc: '+3% battle stat per level' },
  { key: 'life_points',        label: 'Life Points',        desc: '+5% max life per level' },
  { key: 'crime_experience',   label: 'Crime Progression',  desc: '+1% crime XP & skill gain per level' },
  { key: 'education_speed',    label: 'Education Length',   desc: '-2% course time per level' },
  { key: 'nerve_bar',          label: 'Nerve Bar',          desc: '+1 max nerve per level' },
  { key: 'bank_interest',      label: 'Bank Interest',      desc: '+% bank return per level' },
  { key: 'critical_hit_rate',  label: 'Critical Hit Rate',  desc: '+5% crit damage per level' },
  { key: 'awareness',          label: 'Awareness',          desc: '+20% city find frequency per level' },
  { key: 'hospitalization',    label: 'Hospitalization',    desc: '+5% hosp time per level' },
  { key: 'addiction_mitigation', label: 'Addiction Mitigation', desc: 'Reduces addiction effects' },
  { key: 'employee_effectiveness', label: 'Employee Effectiveness', desc: 'Improves company output' },
]

function MeritAllocation({ merits }) {
  if (!merits || Object.keys(merits).length === 0) return null

  const totalSpent = MERIT_UPGRADES.reduce((sum, u) => {
    const lvl = merits[u.key] ?? 0
    // Cost is 1+2+3+...+lvl = lvl*(lvl+1)/2
    return sum + (lvl * (lvl + 1)) / 2
  }, 0)

  return (
    <div className="bg-torn-surface border border-torn-border rounded p-4">
      <p className="font-mono text-xs text-torn-text-dim uppercase tracking-widest mb-3">
        Merit Allocations — <span className="text-torn-accent">{totalSpent} spent</span>
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {MERIT_UPGRADES.map(u => {
          const lvl = merits[u.key] ?? 0
          return (
            <div key={u.key} className="bg-torn-bg border border-torn-border rounded px-2.5 py-2">
              <p className="font-mono text-[11px] text-white truncate">{u.label}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <div className="flex gap-0.5">
                  {Array.from({ length: 10 }, (_, i) => (
                    <div key={i} className={`w-1.5 h-3 rounded-sm ${i < lvl ? 'bg-torn-accent' : 'bg-torn-border'}`} />
                  ))}
                </div>
                <span className="font-mono text-[10px] text-torn-text-dim">{lvl}/10</span>
              </div>
              <p className="font-mono text-[10px] text-torn-text-dim mt-0.5 leading-tight">{u.desc}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main MeritGuide Component ────────────────────────────────────────────────
const CATEGORIES = ['All', 'Combat', 'Crimes', 'Education', 'Travel', 'Stats', 'Social', 'Medical', 'Economy', 'Casino', 'Level', 'Other']

export function MeritGuide({ apiKey }) {
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [tornAwards, setTornAwards]       = useState({ honors: {}, medals: {} })
  const [playerData, setPlayerData]       = useState(null)
  const [tab, setTab]         = useState('honors') // 'honors' | 'medals' | 'merits'
  const [filter, setFilter]   = useState('needed')   // 'all' | 'earned' | 'needed'
  const [search, setSearch]   = useState('')
  const [category, setCategory] = useState('All')

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [torn, player] = await Promise.all([
          fetchTornAwards(apiKey),
          fetchPlayerAwards(apiKey),
        ])
        if (!cancelled) {
          setTornAwards(torn)
          setPlayerData(player)
        }
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

  const filtered = useMemo(() => {
    let list = awards
    if (filter === 'earned')  list = list.filter(a => a.earned)
    if (filter === 'needed')  list = list.filter(a => !a.earned)
    if (category !== 'All') {
      list = list.filter(a => detectCategory(a.name, a.description).label === category)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(a =>
        (a.name ?? '').toLowerCase().includes(q) ||
        (a.description ?? '').toLowerCase().includes(q)
      )
    }
    return list
  }, [awards, filter, category, search])

  const earned  = awards.filter(a => a.earned).length
  const total   = awards.length
  const pct     = total ? Math.round((earned / total) * 100) : 0

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <div className="w-8 h-8 border-2 border-torn-accent border-t-transparent rounded-full animate-spin" />
        <p className="font-mono text-xs text-torn-text-dim uppercase tracking-widest">
          Loading awards from Torn API…
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto mt-16 bg-torn-surface border border-torn-danger rounded p-6">
        <p className="font-mono text-xs text-torn-danger uppercase tracking-widest mb-2">API Error</p>
        <p className="font-mono text-sm text-torn-text">{error}</p>
        <p className="font-mono text-xs text-torn-text-dim mt-3">
          Make sure your key has <span className="text-torn-text">Full Access</span> to the user and torn sections.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 pb-16">
      {/* Header stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-torn-surface border border-torn-border rounded p-4">
          <p className="font-mono text-xs text-torn-text-dim uppercase tracking-widest mb-1">
            {tab === 'medals' ? 'Medals' : 'Honors'} Earned
          </p>
          <p className="font-display text-3xl font-bold text-torn-accent">{earned}</p>
          <p className="font-mono text-xs text-torn-text-dim mt-1">of {total} total</p>
        </div>
        <div className="bg-torn-surface border border-torn-border rounded p-4">
          <p className="font-mono text-xs text-torn-text-dim uppercase tracking-widest mb-1">Still Needed</p>
          <p className="font-display text-3xl font-bold text-torn-danger">{total - earned}</p>
          <p className="font-mono text-xs text-torn-text-dim mt-1">potential merits</p>
        </div>
        <div className="bg-torn-surface border border-torn-border rounded p-4">
          <p className="font-mono text-xs text-torn-text-dim uppercase tracking-widest mb-1">Completion</p>
          <p className="font-display text-3xl font-bold text-white">{pct}%</p>
          <div className="mt-2 h-1.5 bg-torn-border rounded-full overflow-hidden">
            <div
              className="h-full bg-torn-accent rounded-full transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* View tabs */}
      <div className="flex gap-1 mb-4 bg-torn-surface border border-torn-border rounded p-1 w-fit">
        {[['honors','Honors'], ['medals','Medals'], ['merits','Merit Allocations']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`font-mono text-xs px-4 py-2 rounded transition-colors
              ${tab === key
                ? 'bg-torn-accent text-torn-bg font-bold'
                : 'text-torn-text-dim hover:text-torn-text'
              }`}
          >
            {label.toUpperCase()}
          </button>
        ))}
      </div>

      {tab === 'merits' ? (
        <MeritAllocation merits={playerData?.merits} />
      ) : (
        <>
          {/* Filter row */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {/* Status filter */}
            <div className="flex gap-1 bg-torn-surface border border-torn-border rounded p-1">
              {[['needed','Needed'], ['earned','Earned'], ['all','All']].map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setFilter(k)}
                  className={`font-mono text-xs px-3 py-1.5 rounded transition-colors
                    ${filter === k ? 'bg-torn-border text-white' : 'text-torn-text-dim hover:text-torn-text'}`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Search */}
            <input
              type="text"
              placeholder="Search awards…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-torn-surface border border-torn-border rounded px-3 py-1.5 font-mono text-xs text-torn-text placeholder:text-torn-text-dim focus:outline-none focus:border-torn-accent transition-colors flex-1 min-w-[160px] max-w-xs"
            />

            <span className="font-mono text-xs text-torn-text-dim ml-auto">
              {filtered.length} showing
            </span>
          </div>

          {/* Category filter pills */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {CATEGORIES.map(cat => {
              const rule = CATEGORY_RULES.find(r => r.label === cat)
              const isActive = category === cat
              return (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className="font-mono text-[11px] px-2.5 py-1 rounded border transition-all"
                  style={isActive
                    ? { background: (rule?.color ?? '#e8c547') + '33', borderColor: rule?.color ?? '#e8c547', color: rule?.color ?? '#e8c547' }
                    : { background: 'transparent', borderColor: '#1e2330', color: '#5a6070' }
                  }
                >
                  {cat}
                </button>
              )
            })}
          </div>

          {/* Awards grid */}
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <p className="font-mono text-sm text-torn-text-dim">
                {filter === 'needed' ? '🏆 You\'ve earned all awards in this category!' : 'No awards match your filters.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
              {filtered.map(award => (
                <AwardCard key={`${tab}-${award.id}`} award={award} earned={award.earned} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
