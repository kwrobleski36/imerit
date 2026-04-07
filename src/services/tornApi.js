const BASE = 'https://api.torn.com'

// ── Auth ─────────────────────────────────────────────────────────────────────

export async function validateApiKey(apiKey) {
  try {
    const res  = await fetch(`${BASE}/user/?selections=basic&key=${apiKey}`)
    const data = await res.json()
    if (data.error) return { valid: false, player_name: null }
    return { valid: true, player_name: data.name ?? null }
  } catch {
    return { valid: false, player_name: null }
  }
}

// ── Crime stats ───────────────────────────────────────────────────────────────

export async function fetchCrimes(apiKey) {
  const res  = await fetch(`${BASE}/user/?selections=crimes&key=${apiKey}`)
  if (!res.ok) throw new Error(`Network error: ${res.status}`)
  const data = await res.json()
  if (data.error) throw new Error(`Torn API [${data.error.code}]: ${data.error.error}`)
  return data.criminalrecord ?? {}
}

// ── Market ───────────────────────────────────────────────────────────────────

/**
 * Fetch all Torn items (includes NPC buy price / sell price).
 * Returns an object keyed by item ID.
 * Cached in sessionStorage for the session to avoid hammering the API.
 */
export async function fetchAllItems(apiKey) {
  const CACHE_KEY = 'torn_items_cache'
  try {
    const cached = sessionStorage.getItem(CACHE_KEY)
    if (cached) return JSON.parse(cached)
  } catch {}

  const res  = await fetch(`${BASE}/torn/?selections=items&key=${apiKey}`)
  if (!res.ok) throw new Error(`Network error: ${res.status}`)
  const data = await res.json()
  if (data.error) throw new Error(`Torn API [${data.error.code}]: ${data.error.error}`)

  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(data.items)) } catch {}
  return data.items ?? {}
}

/**
 * Fetch the current lowest market listings for a single item.
 * Returns an array of { cost, quantity } sorted ascending by cost.
 */
export async function fetchMarketListings(apiKey, itemId) {
  const res  = await fetch(`${BASE}/market/${itemId}/?selections=itemmarket&key=${apiKey}`)
  if (!res.ok) throw new Error(`Network error: ${res.status}`)
  const data = await res.json()
  if (data.error) throw new Error(`Torn API [${data.error.code}]: ${data.error.error}`)

  const listings = data.itemmarket ?? []
  return listings
    .map((l) => ({ cost: l.cost, quantity: l.quantity }))
    .sort((a, b) => a.cost - b.cost)
}
