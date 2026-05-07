// Maps awards to player progress based on personalstats and battlestats.
const KNOWN = [
  // Combat / Attacks
  { pattern: /tooth and nail/i,         field: 'attackswon',           target: 2500 },
  { pattern: /coup de grace/i,          field: 'attackswon',           target: 5000 },
  { pattern: /killing spree/i,          field: 'attackswon',           target: 10000 },
  { pattern: /war hero/i,               field: 'attackswon',           target: 50000 },
  { pattern: /assist.*100/i,            field: 'attacksassisted',      target: 100 },
  { pattern: /defends won.*1000/i,      field: 'defendswon',           target: 1000 },
  { pattern: /lead salad/i,             field: 'roundsfired',          target: 100000 },
  { pattern: /peppered/i,               field: 'roundsfired',          target: 1000000 },

  // Crimes
  { pattern: /perp.*1,?000/i,           field: 'criminaloffenses',     target: 1000 },
  { pattern: /perp.*5,?000/i,           field: 'criminaloffenses',     target: 5000 },
  { pattern: /career criminal/i,        field: 'criminaloffenses',     target: 10000 },

  // Drugs / Medical
  { pattern: /who'?s frank/i,           field: 'cantaken',             target: 50 },
  { pattern: /crackpot/i,               field: 'xantaken',             target: 250 },
  { pattern: /pill popper/i,            field: 'xantaken',             target: 1000 },
  { pattern: /sodaholic/i,              field: 'energydrinkused',      target: 500 },
  { pattern: /booster.*100/i,           field: 'boostersused',         target: 100 },

  // Money / Economy
  { pattern: /pious/i,                  field: 'churchspent',          target: 100000 },
  { pattern: /sacrificial/i,            field: 'churchspent',          target: 1000000000 },
  { pattern: /big spender/i,            field: 'totalbountyspent',     target: 10000000 },

  // Travel
  { pattern: /globetrotter/i,           field: 'traveltime',           target: 31536000 },
  { pattern: /frequent flyer/i,         field: 'traveltime',           target: 2678400 },

  // Education / Jobs
  { pattern: /smart alec/i,             field: 'eduinprogress',        target: 10 },
  { pattern: /wise guy/i,               field: 'eduinprogress',        target: 50 },
  { pattern: /intern/i,                 field: 'jobpointsused',        target: 100 },
  { pattern: /stuck in a rut/i,         field: 'jobpointsused',        target: 1000 },

  // Stats (battle stats)
  { pattern: /toned/i,                  field: 'total',     source: 'battle', target: 100000 },
  { pattern: /athletic/i,               field: 'total',     source: 'battle', target: 1000000 },
  { pattern: /pumped/i,                 field: 'total',     source: 'battle', target: 100000000 },
  { pattern: /jacked/i,                 field: 'total',     source: 'battle', target: 1000000000 },
  { pattern: /shredded/i,               field: 'total',     source: 'battle', target: 100000000000 },
  { pattern: /lightspeed/i,             field: 'speed',     source: 'battle', target: 100000000 },
  { pattern: /reinforced/i,             field: 'defense',   source: 'battle', target: 10000000 },
  { pattern: /freerunner/i,             field: 'dexterity', source: 'battle', target: 10000000 },
  { pattern: /mighty roar/i,            field: 'strength',  source: 'battle', target: 100000000 },

  // Refills / Nerve
  { pattern: /you'?ve got some nerve/i, field: 'refills',              target: 250 },
]

export function estimateProgress(award, personalstats = {}, battlestats = {}) {
  const text = `${award.name ?? ''} ${award.description ?? ''}`

  for (const rule of KNOWN) {
    if (rule.pattern.test(text)) {
      const source = rule.source === 'battle' ? battlestats : personalstats
      const current = Number(source[rule.field] ?? 0)
      if (current == null || isNaN(current)) continue
      const percent = Math.min(100, Math.round((current / rule.target) * 100))
      return { current, target: rule.target, percent }
    }
  }

  // Heuristic fallback
  const desc = (award.description ?? '').toLowerCase()
  const numMatch = desc.match(/([\d,]+)/)
  if (!numMatch) return null
  const target = Number(numMatch[1].replace(/,/g, ''))
  if (!target || target < 2) return null

  const guesses = [
    { kw: 'attack',       field: 'attackswon' },
    { kw: 'won',          field: 'attackswon' },
    { kw: 'defend',       field: 'defendswon' },
    { kw: 'kill',         field: 'attackswon' },
    { kw: 'mug',          field: 'attacksmugged' },
    { kw: 'crime',        field: 'criminaloffenses' },
    { kw: 'energy drink', field: 'energydrinkused' },
    { kw: 'cannabis',     field: 'cantaken' },
    { kw: 'xanax',        field: 'xantaken' },
    { kw: 'travel',       field: 'traveltime' },
    { kw: 'church',       field: 'churchspent' },
    { kw: 'job point',    field: 'jobpointsused' },
    { kw: 'refill',       field: 'refills' },
    { kw: 'round',        field: 'roundsfired' },
    { kw: 'item',         field: 'itemsbought' },
    { kw: 'revive',       field: 'revives' },
    { kw: 'bust',         field: 'jailsbusted' },
  ]

  for (const g of guesses) {
    if (desc.includes(g.kw) && personalstats[g.field] != null) {
      const current = Number(personalstats[g.field])
      const percent = Math.min(100, Math.round((current / target) * 100))
      return { current, target, percent }
    }
  }

  return null
}

export function formatNumber(n) {
  if (n == null) return '0'
  if (n >= 1000000000) return (n / 1000000000).toFixed(1) + 'B'
  if (n >= 1000000)    return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000)       return (n / 1000).toFixed(1) + 'k'
  return n.toLocaleString()
}

export function asciiBar(percent, width = 16) {
  const p = Math.max(0, Math.min(100, percent))
  const filled = Math.round((p / 100) * width)
  return '[' + '\u2588'.repeat(filled) + '\u2591'.repeat(width - filled) + ']'
}