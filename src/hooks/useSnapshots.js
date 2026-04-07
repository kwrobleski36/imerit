import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'torn_sfl_snapshots'

export function useSnapshots() {
  const [snapshots, setSnapshots] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : []
    } catch { return [] }
  })

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshots)) }
    catch { console.error('Failed to persist snapshots') }
  }, [snapshots])

  const addSnapshot = useCallback(({ attempts, successes }) => {
    const snap = { timestamp: new Date().toISOString(), attempts, successes }
    setSnapshots((prev) => {
      if (prev.some((s) => s.attempts === attempts)) return prev
      return [...prev, snap].sort((a, b) => a.attempts - b.attempts)
    })
    return snap
  }, [])

  const removeSnapshot = useCallback((timestamp) => {
    setSnapshots((prev) => prev.filter((s) => s.timestamp !== timestamp))
  }, [])

  const clearAll = useCallback(() => setSnapshots([]), [])

  return { snapshots, addSnapshot, removeSnapshot, clearAll }
}
