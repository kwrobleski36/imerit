// Maps awards to player progress based on Torn personalstats / battlestats.
// Field names verified against TornAPI docs.

// Crime 2.0 categories → personalstats field names
const CRIME_FIELDS = [
  // [keyword in description, personalstats field]
  ['theft',                'theft'],
  ['bootlegging',          'illegalproduction'],
  ['illegal production',   'illegalproduction'],
  ['drug dealing',         'illicitservices'],
  ['illicit',              'illicitservices'],
  ['arson',                'fraud'],
  ['fraud',                'fraud'],
  ['counterfeit',          'counterfeiting'],
  ['forgery',              'counterfeiting'],
  ['cybercrime',           'cybercrime'],
  ['cyber',                'cybercrime'],
  ['hacking',              'cybercrime'],
  ['extortion',            'extortion'],
  ['hustling',             'extortion'],
  ['vandalism',            'vandalism'],
  ['graffiti',             'vandalism'],
  ['manual labor',         'manuallabor'],
  ['search for cash',      'manuallabor'],
  ['other crimes',         'manuallabor'],   // best guess for "other"
]

function detectCrimeField(text) {
  const lower = text.toLowerCase()
  for (const [kw, field] of CRIME_FIELDS) {
    if (lower.includes(kw)) return field
  }
  return null
}

function extractTarget(description = '') {
  const m = description.match(/([\d,]+)/)
  if (!m) return null
  const n = Number(m[1].replace(/,/g, ''))
  return n >= 2 ? n : null
}

const KNOWN = [
  // ─── Specific named honors ─────────────────────────────────────
  { pattern: /^sidekick$/i,             field: 'attacksassisted',      target: 250 },
  { pattern: /^happy slapper$/i,        field: 'attackswon',           target: 250 },
  { pattern: /^fall camo$/i,            field: 'defendswon',           target: 250 },
  { pattern: /^big shot$/i,             field: 'attackhits',           target: 1000 },
  { pattern: /^marksman$/i,             field: 'attackcriticalhits',   target: 100 },
  { pattern: /^one in a million$/i,     field: 'attackcriticalhits',   target: 1000 },
  { pattern: /^stalemate$/i,            field: 'attacksstealthed',     target: 100 },

  // Combat
  { pattern: /tooth and nail/i,         field: 'attackswon',           target: 2500 },
  { pattern: /coup de grace/i,          field: 'attackswon',           target: 5000 },
  { pattern: /killing spree/i,          field: 'attackswon',           target: 10000 },
  { pattern: /war hero/i,               field: 'attackswon',           target: 50000 },
  { pattern: /lead salad/i,             field: 'roundsfired',          target: 100000 },
  { pattern: /peppered/i,               field: 'roundsfired',          target: 1000000 },

  // Phrase-priority (before generic attack)
  { pattern: /assist/i,                 field: 'attacksassisted',      target: null },
  { pattern: /defend/i,                 field: 'defendswon',           target: null },
  { pattern: /critical/i,               field: 'attackcriticalhits',   target: null },

  // Drugs
  { pattern: /who'?s frank/i,           field: 'cantaken',             target: 50 },
  { pattern: /crackpot/i,               field: 'xantaken',             target: 250 },
  { pattern: /pill popper/i,            field: 'xantaken',             target: 1000 },
  { pattern: /sodaholic/i,              field: 'energydrinkused',      target: 500 },

  // Money
  { pattern: /pious/i,                  field: 'churchspent',          target: 100000 },
  { pattern: /sacrificial/i,            field: 'churchspent',          target: 1000000000 },

  // Travel
  { pattern: /globetrotter/i,           field: 'traveltime',           target: 31536000 },
  { pattern: /frequent flyer/i,         field: 'traveltime',           target: 2678400 },

  // Education
  { pattern: /smart alec/i,             field: 'eduinprogress',        target: 10 },
  { pattern: /wise guy/i,               field: 'eduinprogress',        target: 50 },

  // Battle stats
  { pattern: /toned/i,                  field: 'total',     source: 'battle', target: 100000 },
  { pattern: /athletic/i,               field: 'total',     source: 'battle', target: 1000000 },
  { pattern: /pumped/i,                 field: 'total',     source: 'battle', target: 100000000 },
  { pattern: /jacked/i,                 field: 'total',     source: 'battle', target: 1000000000 },
  { pattern: /shredded/i,               field: 'total',     source: 'battle', target: 100000000000 },
  { pattern: /lightspeed/i,             field: 'speed',     source: 'battle', target: 100000000 },
  { pattern: /reinforced/i,             field: 'defense',   source: 'battle', target: 10000000 },

  // Refills
  { pattern: /you'?ve got some nerve/i, field: 'refills',              target: 250 },
]

export function estimateProgress(award, personalstats = {}, battlestats = {}) {
  const text = `${award.name ?? ''} ${award.description ?? ''}`
  const desc = (award.description ?? '').toLowerCase()

  // Step 1: explicit pattern rules
  for (const rule of KNOWN) {
    if (rule.pattern.test(text)) {
      const source = rule.source === 'battle' ? battlestats : personalstats
      const current = Number(source[rule.field] ?? 0)
      if (isNaN(current)) continue
      const target = rule.target ?? extractTarget(award.description)
      if (!target) continue
      const percent = Math.min(100, Math.round((current / target) * 100))
      return { current, target, percent }
    }
  }

  // Step 2: crime-type detection (priority for "Achieve N <type> crimes" awards)
  if (desc.includes('crime')) {
    const field = detectCrimeField(text)
    const target = extractTarget(award.description)
    if (field && target && personalstats[field] != null) {
      const current = Number(personalstats[field])
      const percent = Math.min(100, Math.round((current / target) * 100))
      return { current, target, percent }
    }
  }

  // Step 3: heuristic fallback for non-crime awards
  const target = extractTarget(award.description)
  if (!target) return null

  const guesses = [
    { kw: 'assist',       field: 'attacksassisted' },
    { kw: 'defend',       field: 'defendswon' },
    { kw: 'critical',     field: 'attackcriticalhits' },
    { kw: 'mug',          field: 'attacksmugged' },
    { kw: 'hospitalize',  field: 'hospitalized' },
    { kw: 'energy drink', field: 'energydrinkused' },
    { kw: 'cannabis',     field: 'cantaken' },
    { kw: 'xanax',        field: 'xantaken' },
    { kw: 'church',       field: 'churchspent' },
    { kw: 'job point',    field: 'jobpointsused' },
    { kw: 'travel',       field: 'traveltime' },
    { kw: 'refill',       field: 'refills' },
    { kw: 'round',        field: 'roundsfired' },
    { kw: 'item',         field: 'itemsbought' },
    { kw: 'revive',       field: 'revives' },
    { kw: 'bust',         field: 'jailsbusted' },
    { kw: 'attack',       field: 'attackswon' },
    { kw: 'auction',      field: 'auctionswon' },
    { kw: 'overdose',     field: 'overdosed' },
    { kw: 'hospital',     field: 'hospital' },
    { kw: 'race',         field: 'raceswon' },
    { kw: 'mission',      field: 'missioncompleted' },
    { kw: 'point',        field: 'pointsbought' },
    { kw: 'book',         field: 'booksread' },
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
