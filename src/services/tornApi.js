const BASE = 'https://api.torn.com'

export const debug = { user: null, torn: null }

export async function validateApiKey(apiKey) {
  try {
    const res = await fetch(`${BASE}/user/?selections=basic&key=${apiKey}`)
    const data = await res.json()
    if (data.error) return { valid: false, player_name: null }
    return { valid: true, player_name: data.name ?? null }
  } catch {
    return { valid: false, player_name: null }
  }
}

export async function fetchTornAwards(apiKey) {
  const res = await fetch(`${BASE}/torn/?selections=honors,medals&key=${apiKey}`)
  if (!res.ok) throw new Error(`Network ${res.status}`)
  const data = await res.json()
  debug.torn = data
  if (data.error) throw new Error(`Torn API [${data.error.code}]: ${data.error.error}`)
  return { honors: data.honors ?? {}, medals: data.medals ?? {} }
}

function toIdSet(field) {
  if (!field) return new Set()
  if (Array.isArray(field)) return new Set(field.map(x => typeof x === 'object' ? Number(x.id) : Number(x)).filter(n => !isNaN(n)))
  if (typeof field === 'object') return new Set(Object.keys(field).map(Number).filter(n => !isNaN(n)))
  return new Set()
}

export async function fetchPlayerAwards(apiKey) {
  const res = await fetch(`${BASE}/user/?selections=honors,medals,merits,profile,personalstats,battlestats&key=${apiKey}`)
  if (!res.ok) throw new Error(`Network ${res.status}`)
  const data = await res.json()
  debug.user = data
  if (data.error) throw new Error(`Torn API [${data.error.code}]: ${data.error.error}`)

  return {
    earnedHonors: toIdSet(data.honors_awarded ?? data.honors),
    earnedMedals: toIdSet(data.medals_awarded ?? data.medals),
    merits: data.merits ?? {},
    personalstats: data.personalstats ?? {},
    battlestats: {
      strength: data.strength,
      defense: data.defense,
      speed: data.speed,
      dexterity: data.dexterity,
      total: data.total,
    },
    profile: {
      name: data.name,
      level: data.level,
      age: data.age,
      money_onhand: data.money_onhand,
      merits: data.merits_unspent,
    },
  }
}