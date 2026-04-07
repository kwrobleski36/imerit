const BASE    = 'https://api.torn.com'
const BASE_V2 = 'https://api.torn.com/v2'

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
 * Fetch all Torn items including buy_price and market_value.
 * Cached in sessionStorage for the session.
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
 * Fetch live market listings for a single item via API v2.
 * Returns an array of { cost, quantity } sorted ascending by cost.
 * Falls back to empty array on error.
 */
export async function fetchMarketListings(apiKey, itemId) {
  const url = `${BASE_V2}/market/${itemId}?selections=itemmarket&key=${apiKey}`
  const res  = await fetch(url)
  if (!res.ok) throw new Error(`Network error: ${res.status}`)
  const data = await res.json()

  console.log(`Market v2 response for item ${itemId}:`, JSON.stringify(data).slice(0, 200))

  if (data.error) throw new Error(`Torn API [${data.error.code}]: ${data.error.error}`)

  // v2 may return itemmarket as array or under a nested key — handle both
  const listings = data.itemmarket ?? data.item_market ?? []
  return Array.isArray(listings)
    ? listings.map((l) => ({ cost: l.cost ?? l.price, quantity: l.quantity })).sort((a, b) => a.cost - b.cost)
    : []
}
