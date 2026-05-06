const BASE = 'https://api.torn.com'

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
  if (!res.ok) throw new Error(`Network error: ${res.status}`)
  const data = await res.json()
  if (data.error) throw new Error(`Torn API [${data.error.code}]: ${data.error.error}`)
  return { honors: data.honors ?? {}, medals: data.medals ?? {} }
}

export async function fetchPlayerAwards(apiKey) {
  const res = await fetch(`${BASE}/user/?selections=honors,medals,merits&key=${apiKey}`)
  if (!res.ok) throw new Error(`Network error: ${res.status}`)
  const data = await res.json()
  if (data.error) throw new Error(`Torn API [${data.error.code}]: ${data.error.error}`)
  return {
    earnedHonors: new Set(Object.keys(data.honors ?? {}).map(Number)),
    earnedMedals: new Set(Object.keys(data.medals ?? {}).map(Number)),
    merits: data.merits ?? {},
  }
}
