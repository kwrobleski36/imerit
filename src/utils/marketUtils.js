/**
 * marketUtils.js
 *
 * Arbitrage logic for Torn NPC vs. Player Market.
 *
 * Key mechanic:
 *   - NPC shops sell items at fixed "buy_price"
 *   - Player market sells at variable prices
 *   - Torn charges a 5% listing fee on market sales
 *
 * Profit formula (per unit):
 *   net_profit = lowest_market_price * 0.95 - npc_buy_price
 *
 * Positive net_profit = arbitrage opportunity.
 */

export const MARKET_TAX = 0.05  // 5% Torn market fee

/**
 * Calculate arbitrage stats for a single item.
 *
 * @param {number} npcPrice         - Item's NPC buy price
 * @param {number} lowestMarketPrice - Lowest current market listing
 * @returns {{
 *   spread: number,        // raw difference (market - npc)
 *   netProfit: number,     // after 5% tax
 *   roi: number,           // return on investment as decimal
 *   worthIt: boolean,      // true if net profit > 0
 * }}
 */
export function calcArbitrage(npcPrice, lowestMarketPrice) {
  const afterTax  = lowestMarketPrice * (1 - MARKET_TAX)
  const spread    = lowestMarketPrice - npcPrice
  const netProfit = afterTax - npcPrice
  const roi       = npcPrice > 0 ? netProfit / npcPrice : 0

  return {
    spread:    Math.round(spread),
    netProfit: Math.round(netProfit),
    roi,
    worthIt:   netProfit > 0,
  }
}

/**
 * Format a Torn money value (e.g. 1234567 → "$1,234,567")
 */
export function formatMoney(n) {
  if (n === null || n === undefined) return '—'
  const abs = Math.abs(Math.round(n))
  const formatted = abs.toLocaleString()
  return n < 0 ? `-$${formatted}` : `$${formatted}`
}

/**
 * Filter and sort items eligible for NPC→Market arbitrage.
 * Only returns items that:
 *   1. Have a valid NPC buy price > 0
 *   2. Have at least one market listing
 *   3. (optionally) only profitable ones
 */
export function buildArbitrageList(items, marketData, onlyProfitable = false) {
  const results = []

  for (const [id, item] of Object.entries(items)) {
    const npcPrice = item.buy_price
    if (!npcPrice || npcPrice <= 0) continue

    const listings = marketData[id]
    if (!listings || listings.length === 0) continue

    const lowest = listings[0].cost
    const arb    = calcArbitrage(npcPrice, lowest)

    if (onlyProfitable && !arb.worthIt) continue

    results.push({
      id,
      name:       item.name,
      type:       item.type,
      npcPrice,
      lowestMarket: lowest,
      ...arb,
    })
  }

  // Sort by net profit descending
  return results.sort((a, b) => b.netProfit - a.netProfit)
}
