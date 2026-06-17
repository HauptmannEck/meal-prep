import { useState, useEffect } from "react"

/**
 * A generic hook that syncs a piece of React state to localStorage.
 * It attempts to load the initial value from localStorage on mount.
 */
export function usePersistentState<T>(key: string, initialValue: T): [T, (val: T) => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(key)
      if (saved) return JSON.parse(saved)
    } catch (e) {
      console.warn(`Failed to parse cached value for key "${key}"`, e)
    }
    return initialValue
  })

  useEffect(() => {
    if (state !== null && state !== undefined && (Array.isArray(state) ? state.length > 0 : true)) {
      localStorage.setItem(key, JSON.stringify(state))
    } else {
      localStorage.removeItem(key)
    }
  }, [key, state])

  return [state, setState]
}
