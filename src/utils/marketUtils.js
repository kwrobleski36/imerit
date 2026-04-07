/**
 * marketUtils.js
 *
 * Market vs Average Price arbitrage.
 *
 * Strategy:
 *   - Torn's average_price is a daily snapshot of the market average
 *   - If lowest listing > average_price: market is elevated, could be a sell opportunity
 *   - If lowest listing < average_price * BUY_THRESHOLD: market is depressed, buy and relist
 *
 * Profit formula (buy low, relist at average):
 *   net_profit = (average_price * 0.95) - lowest_listing
 *
 * Positive = you can buy the cheapest listing and relist at average price
 * after the 5% tax and still profit.
 */

export const MARKET_TAX   = 0.05
export const BUY_THRESHOLD = 0.90  // listing must be 10%+ below average to flag as opportunity

export function formatMoney(n) {
  if (n === null || n === undefined) return '—'
  const abs = Math.abs(Math.round(n))
  const formatted = abs.toLocaleString()
  return n < 0 ? `-$${formatted}` : `$${formatted}`
}

/**
 * Calculate arbitrage between lowest market listing and average price.
 *
 * @param {number} avgPrice     - item's daily average_price from API
 * @param {number} lowestListing - current cheapest market listing
 * @returns {{
 *   netProfit: number,   // buy at lowest, relist at avg after 5% tax
 *   discount: number,    // how far below average the listing is (0–1)
 *   worthIt: boolean,
 *   signal: string,      // 'buy' | 'sell' | 'neutral'
 * }}
 */
export function calcArbitrage(avgPrice, lowestListing) {
  const afterTax  = avgPrice * (1 - MARKET_TAX)
  const netProfit = afterTax - lowestListing
  const discount  = avgPrice > 0 ? 1 - (lowestListing / avgPrice) : 0
  const worthIt   = netProfit > 0 && discount >= (1 - BUY_THRESHOLD)

  let signal = 'neutral'
  if (worthIt) signal = 'buy'
  else if (lowestListing > avgPrice * 1.10) signal = 'sell'

  return { netProfit: Math.round(netProfit), discount, worthIt, signal }
}

/**
 * Build arbitrage list from scanned items + market data.
 */
export function buildArbitrageList(items, marketData, onlyProfitable = false) {
  const results = []

  for (const [id, item] of Object.entries(items)) {
    const avgPrice = item.market_value
    if (!avgPrice || avgPrice <= 0) continue

    const listings = marketData[id]
    if (!listings || listings.length === 0) continue

    const lowest = listings[0].cost
    const arb    = calcArbitrage(avgPrice, lowest)

    if (onlyProfitable && !arb.worthIt) continue

    results.push({
      id,
      name:          item.name,
      type:          item.type,
      avgPrice,
      lowestListing: lowest,
      listingCount:  listings.length,
      ...arb,
    })
  }

  return results.sort((a, b) => b.netProfit - a.netProfit)
}
