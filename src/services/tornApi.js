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

/**
 * Parse earned awards into Map<id, timestamp|null>.
 * Handles multiple possible API response shapes:
 *   - data.honors_awarded = [1, 5, 12]  +  data.honors_time = [t1, t2, t3]
 *   - data.honors = { "1": {awarded: t}, "5": {awarded: t} }
 *   - data.honors = [1, 5, 12]
 */
function parseEarnedWithTime(idsField, timesField) {
  const map = new Map()

  // Object format: { "1": {awarded: timestamp}, ... }
  if (idsField && !Array.isArray(idsField) && typeof idsField === 'object') {
    for (const [id, obj] of Object.entries(idsField)) {
      const t = obj?.awarded ?? obj?.time ?? obj?.timestamp ?? null
      map.set(Number(id), t)
    }
    return map
  }

  // Array format with parallel times array
  if (Array.isArray(idsField)) {
    const times = Array.isArray(timesField) ? timesField : []
    idsField.forEach((idOrObj, i) => {
      const id = typeof idOrObj === 'object' ? Number(idOrObj.id) : Number(idOrObj)
      if (isNaN(id)) return
      const t = times[i] ?? (typeof idOrObj === 'object' ? (idOrObj.awarded ?? idOrObj.time) : null)
      map.set(id, t ?? null)
    })
  }

  return map
}

export async function fetchPlayerAwards(apiKey) {
  const res = await fetch(`${BASE}/user/?selections=honors,medals,merits,profile,personalstats,battlestats&key=${apiKey}`)
  if (!res.ok) throw new Error(`Network ${res.status}`)
  const data = await res.json()
  debug.user = data
  if (data.error) throw new Error(`Torn API [${data.error.code}]: ${data.error.error}`)

  const honorsMap = parseEarnedWithTime(
    data.honors_awarded ?? data.honors,
    data.honors_time
  )
  const medalsMap = parseEarnedWithTime(
    data.medals_awarded ?? data.medals,
    data.medals_time
  )

  return {
    earnedHonors: new Set(honorsMap.keys()),
    earnedMedals: new Set(medalsMap.keys()),
    honorsTime: honorsMap,
    medalsTime: medalsMap,
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
