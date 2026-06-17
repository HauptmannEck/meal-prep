import { useState, useEffect } from "react"
import { doc, setDoc } from "firebase/firestore"
import { db, appId } from "../lib/firebase"
import { ApiStatus } from "../types"

/**
 * Manages the API rate limit countdown and handles broadcasting
 * global lockout errors to Firestore.
 */
export function useRateLimit(apiStatus?: ApiStatus) {
  const [now, setNow] = useState(Date.now())
  
  // If we are locked out, we poll the current time to drive the countdown UI.
  // The global state guarantees all clients see the same lock state.
  const isLockedOut = apiStatus?.status !== "active" && (apiStatus?.expiresAt || 0) > now

  useEffect(() => {
    if (!isLockedOut) return
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [isLockedOut])

  /**
   * Helper to format remaining ms into a readable string (e.g. 1h 5m 30s)
   */
  const formatTimeRemaining = (expiresAt: number) => {
    const diff = expiresAt - now
    if (diff <= 0) return "0s"
    
    const h = Math.floor(diff / (1000 * 60 * 60))
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const s = Math.floor((diff % (1000 * 60)) / 1000)
    
    if (h > 0) return `${h}h ${m}m ${s}s`
    if (m > 0) return `${m}m ${s}s`
    return `${s}s`
  }

  /**
   * Translates an HTTP 429 or 503 from the Gemini API into a standardized
   * lock state and syncs it globally via Firestore so other users also stop.
   */
  const broadcastApiError = async (status: number, message: string) => {
    try {
      let limitType: "minute" | "daily" | null = null
      let expiresAt = Date.now()
      let newStatus: "rate_limited" | "timeout" = "rate_limited"

      if (status === 503) {
        newStatus = "timeout"
        // 503 Service Unavailable -> short 10 second timeout
        expiresAt += 10000 
      } else if (status === 429) {
        // Gemini API daily limits reset at midnight Pacific Time
        if (message.toLowerCase().includes("quota") || message.toLowerCase().includes("daily")) {
          limitType = "daily"
          const nowTime = new Date()
          const ptString = nowTime.toLocaleString("en-US", { timeZone: "America/Los_Angeles" })
          const ptDate = new Date(ptString)
          ptDate.setHours(24, 0, 0, 0)
          const msUntilMidnightPT = ptDate.getTime() - new Date(ptString).getTime()
          expiresAt += msUntilMidnightPT
        } else {
          // Standard 429 usually resets in a minute
          limitType = "minute"
          expiresAt += 60000
        }
      }

      await setDoc(doc(db, "artifacts", appId, "global", "apiStatus"), {
        status: newStatus,
        limitType,
        expiresAt,
      })
    } catch (err) {
      console.error("Failed to broadcast API error", err)
    }
  }

  return { isLockedOut, formatTimeRemaining, broadcastApiError, now }
}
