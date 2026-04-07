/**
 * crimeModel.js — Bayesian skill estimation via Beta distribution.
 */

// ── Beta distribution math ─────────────────────────────────────────────────

function logGamma(x) {
  const g = 7
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ]
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x)
  x -= 1
  let a = c[0]
  const t = x + g + 0.5
  for (let i = 1; i < g + 2; i++) a += c[i] / (x + i)
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a)
}

function logBeta(a, b) {
  return logGamma(a) + logGamma(b) - logGamma(a + b)
}

function betaCDF(x, a, b) {
  if (x <= 0) return 0
  if (x >= 1) return 1
  if (x > (a + 1) / (a + b + 2)) return 1 - betaCDF(1 - x, b, a)
  const lbeta = logBeta(a, b)
  const front = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lbeta) / a
  let f = 1, C = 1
  let D = 1 - ((a + b) * x) / (a + 1)
  if (Math.abs(D) < 1e-30) D = 1e-30
  D = 1 / D; f = D
  for (let m = 1; m <= 200; m++) {
    let num = (m * (b - m) * x) / ((a + 2 * m - 1) * (a + 2 * m))
    D = 1 + num * D; C = 1 + num / C
    if (Math.abs(D) < 1e-30) D = 1e-30
    if (Math.abs(C) < 1e-30) C = 1e-30
    D = 1 / D; f *= C * D
    num = -((a + m) * (a + b + m) * x) / ((a + 2 * m) * (a + 2 * m + 1))
    D = 1 + num * D; C = 1 + num / C
    if (Math.abs(D) < 1e-30) D = 1e-30
    if (Math.abs(C) < 1e-30) C = 1e-30
    D = 1 / D
    const delta = C * D; f *= delta
    if (Math.abs(delta - 1) < 1e-10) break
  }
  return front * f
}

function betaInvCDF(p, a, b, tol = 1e-8) {
  if (p <= 0) return 0
  if (p >= 1) return 1
  let lo = 0, hi = 1
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2
    if (betaCDF(mid, a, b) < p) lo = mid; else hi = mid
    if (hi - lo < tol) break
  }
  return (lo + hi) / 2
}

// ── Public API ────────────────────────────────────────────────────────────────

function getSkillTier(rate) {
  if (rate < 0.20) return { label: 'Novice',    color: 'text-torn-text-dim' }
  if (rate < 0.40) return { label: 'Beginner',  color: 'text-blue-400' }
  if (rate < 0.55) return { label: 'Competent', color: 'text-cyan-400' }
  if (rate < 0.70) return { label: 'Skilled',   color: 'text-torn-success' }
  if (rate < 0.82) return { label: 'Expert',    color: 'text-torn-accent' }
  if (rate < 0.92) return { label: 'Master',    color: 'text-orange-400' }
  return               { label: 'Elite',       color: 'text-torn-danger' }
}

export function estimateSkill(attempts, successes) {
  const alpha = 1 + successes
  const beta  = 1 + (attempts - successes)
  const mean    = alpha / (alpha + beta)
  const lower90 = betaInvCDF(0.05, alpha, beta)
  const upper90 = betaInvCDF(0.95, alpha, beta)
  return {
    mean, lower90, upper90,
    tier:       getSkillTier(mean).label,
    tierColor:  getSkillTier(mean).color,
    sampleSize: attempts,
    confidence: attempts < 20 ? 'low' : attempts < 100 ? 'medium' : 'high',
  }
}

export function buildChartData(snapshots, projectAttempts = 300) {
  if (snapshots.length === 0) return { historical: [], projected: [] }

  const historical = snapshots.map((s) => {
    const est = estimateSkill(s.attempts, s.successes)
    return {
      label:    new Date(s.timestamp).toLocaleDateString(),
      attempts: s.attempts,
      mean:     +(est.mean * 100).toFixed(1),
      lower90:  +(est.lower90 * 100).toFixed(1),
      upper90:  +(est.upper90 * 100).toFixed(1),
    }
  })

  if (snapshots.length < 2) return { historical, projected: [] }

  const p1 = historical[0]
  const p2 = historical[historical.length - 1]
  const lnX1 = Math.log(Math.max(p1.attempts, 1))
  const lnX2 = Math.log(Math.max(p2.attempts, 1))
  if (lnX1 === lnX2) return { historical, projected: [] }

  const a = (p2.mean - p1.mean) / (lnX2 - lnX1)
  const b = p1.mean - a * lnX1
  const project = (x) => Math.min(99, Math.max(0, a * Math.log(x) + b))

  const step = Math.max(1, Math.floor(projectAttempts / 20))
  const projected = []
  for (let x = p2.attempts; x <= p2.attempts + projectAttempts; x += step) {
    projected.push({ attempts: x, projected: +project(x).toFixed(1) })
  }
  return { historical, projected }
}
