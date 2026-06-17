import { useState } from "react"
import { RefreshCw, ChefHat } from "lucide-react"
import { geminiApiKey } from "../../lib/firebase"

interface AutoGeneratorProps {
  systemPrompt: string
  isLockedOut: boolean
  broadcastApiError: (status: number, message: string) => Promise<void>
  onAutoResult: (resultText: string) => void
}

const FREE_TIER_MODELS = [
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
  "gemini-3-flash"
]

/**
 * Handles hitting the Gemini API automatically when the user clicks generate.
 * Takes the prepared systemPrompt from the parent and fires off the request.
 * Implements a fallback cascade for the free-tier models if 503/429 limits are hit.
 */
export default function AutoGenerator({
  systemPrompt,
  isLockedOut,
  broadcastApiError,
  onAutoResult,
}: AutoGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateOptions = async () => {
    setIsGenerating(true)
    setError(null)

    let lastError: Error | null = null

    for (const model of FREE_TIER_MODELS) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: "Generate 3 distinct meal configuration options as JSON." }] }],
              systemInstruction: { parts: [{ text: systemPrompt }] },
              generationConfig: { responseMimeType: "application/json" },
            }),
          },
        )

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          const errorMessage = errorData?.error?.message || ""
          
          if (response.status === 429 || response.status === 503) {
            console.warn(`[AutoGenerator] ${model} failed with ${response.status} (${errorMessage}). Trying fallback...`)
            lastError = new Error(errorMessage || `API overloaded (${response.status})`)
            continue // Attempt next model
          }
          throw new Error(`API Error: ${response.status}`)
        }

        const data = await response.json()
        const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text

        if (!resultText) throw new Error("Failed to extract JSON from AI response.")

        // Success! We can exit the function
        onAutoResult(resultText)
        setIsGenerating(false)
        return
      } catch (err: any) {
        if (err.message.includes("API Error")) {
          // Hard errors that shouldn't cascade
          console.error(err)
          setError(err.message || "Engine failed to generate recipes. Please try again.")
          setIsGenerating(false)
          return
        }
        // Generic catch-all, keep looping
        lastError = err
      }
    }

    // If we exhaust the loop, ALL models failed.
    console.error("All fallback models exhausted.", lastError)
    
    // Broadcast a timeout to lock the UI
    if (lastError?.message.includes("503")) {
        await broadcastApiError(503, "Service Unavailable")
    } else if (lastError?.message.includes("429")) {
        await broadcastApiError(429, "Too Many Requests")
    } else {
        await broadcastApiError(500, "Unknown Error")
    }
    
    setError("All AI models are currently overwhelmed. Please use the manual path below.")
    setIsGenerating(false)
  }

  return (
    <div className="flex flex-col w-full gap-2 pt-4 border-t border-slate-800 mt-4">
      {error && (
        <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20 mb-2">
          {error}
        </div>
      )}
      <button
        onClick={generateOptions}
        disabled={isGenerating || isLockedOut}
        className="w-full bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-teal-500/20"
      >
        {isGenerating ? (
          <>
            <RefreshCw size={18} className="animate-spin" /> Processing Matrix...
          </>
        ) : (
          <>
            <ChefHat size={18} /> Generate 3 Options
          </>
        )}
      </button>
    </div>
  )
}
