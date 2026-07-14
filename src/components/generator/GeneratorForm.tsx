import { useState, useMemo } from "react"
import { RefreshCw } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { ApiStatus, Recipe, UserPreferences } from "../../types"
import { useRateLimit } from "../../hooks/useRateLimit"
import { buildSystemPrompt } from "../../lib/prompt"
import ManualFallbackForm from "./ManualFallbackForm"
import AutoGenerator from "./AutoGenerator"
import ProteinSelector from "../ProteinSelector"

interface GeneratorFormProps {
  recipes: Recipe[]
  preferences?: UserPreferences
  apiStatus?: ApiStatus
  onOptionsGenerated: (options: Partial<Recipe>[], targetServings: number) => void
}

/**
 * Owns the user input preferences and constructs the system prompt.
 * Delegates the actual generation to AutoGenerator or ManualFallbackForm.
 */
export default function GeneratorForm({
  recipes,
  preferences,
  apiStatus,
  onOptionsGenerated,
}: GeneratorFormProps) {
  const navigate = useNavigate()
  
  // Rate limit hook
  const { isLockedOut, formatTimeRemaining, broadcastApiError } = useRateLimit(apiStatus)

  // Form State
  const [bulkIngredient, setBulkIngredient] = useState("")
  const [cravings, setCravings] = useState("")
  const [targetServings, setTargetServings] = useState<number | "">(preferences?.targetServings || 6)
  const [maxPrepTime, setMaxPrepTime] = useState<number | "">(preferences?.maxPrepTime || 30)
  const [proteinMode, setProteinMode] = useState<"whitelist" | "blacklist">(preferences?.proteinMode || "blacklist")
  const [proteinSelections, setProteinSelections] = useState<string[]>(preferences?.proteinSelections || [])
  const [error, setError] = useState<string | null>(null)

  // Construct the prompt deterministically based on form state
  const systemPrompt = useMemo(() => {
    return buildSystemPrompt({
      recipes,
      targetServings,
      maxPrepTime,
      cravings,
      bulkIngredient,
      proteinMode,
      proteinSelections,
    })
  }, [recipes, targetServings, maxPrepTime, cravings, bulkIngredient, proteinMode, proteinSelections])

  // Core parsing logic (used by both API and manual paths)
  const handleRawResult = (resultText: string) => {
    try {
      setError(null)
      
      let cleanText = resultText.replace(/```json/g, "").replace(/```/g, "").trim()
      let startIndex = cleanText.indexOf("{")
      if (startIndex === -1) throw new Error("Could not find JSON object bounds in response.")

      let parsedData
      let isValid = false
      let endIdx = cleanText.lastIndexOf("}")

      // Iteratively look for the correct closing brace, ignoring trailing garbage
      while (endIdx > startIndex) {
        try {
          const attempt = cleanText.substring(startIndex, endIdx + 1)
          parsedData = JSON.parse(attempt)
          isValid = true
          break
        } catch (err) {
          endIdx = cleanText.lastIndexOf("}", endIdx - 1)
        }
      }

      if (!isValid || !parsedData) {
        console.error("Malformed JSON payload from Gemini API:", resultText)
        throw new Error("AI returned malformed JSON that could not be repaired.")
      }

      if (!parsedData.options || !Array.isArray(parsedData.options) || parsedData.options.length === 0) {
        throw new Error("AI returned invalid JSON schema.")
      }

      // Success! Pass to parent
      onOptionsGenerated(parsedData.options, typeof targetServings === "number" ? targetServings : 1)
    } catch (err: any) {
      setError(err.message || "Failed to process result.")
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-xl">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-100">
          <RefreshCw size={20} className="text-teal-400" /> Meal Generator Engine
        </h2>

        {isLockedOut && (
          <div className="mb-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200">
            <h3 className="font-bold flex items-center justify-between mb-1">
              <span className="flex items-center gap-2">Global API Limit Reached</span>
              <span className="text-amber-500 font-mono text-xs bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                Unlocks in: {formatTimeRemaining(apiStatus!.expiresAt!)}
              </span>
            </h3>
            <p className="text-sm text-amber-300/80 mb-2">
              {apiStatus?.limitType === "daily"
                ? "The global daily quota for the free-tier Gemini API has been exhausted. It will reset at midnight PT."
                : "The system is momentarily overwhelmed with requests. Please wait a minute or use the manual path."}
            </p>
            <p className="text-sm text-amber-300/80">
              The primary engine is locked. Please expand the{" "}
              <strong>Manual Generation Path</strong> below to generate your meals using your
              personal Gemini account.
            </p>
          </div>
        )}

        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">
                Target Servings
              </label>
              <input
                type="number"
                min="1"
                value={targetServings}
                onChange={(e) => {
                  const val = e.target.value
                  if (val === "") {
                    setTargetServings("")
                  } else {
                    setTargetServings(parseInt(val) || 1)
                  }
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-teal-500/50 text-slate-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">
                Max Prep Time (mins)
              </label>
              <input
                type="number"
                min="5"
                max="180"
                step="5"
                value={maxPrepTime}
                onChange={(e) => {
                  const val = e.target.value
                  if (val === "") {
                    setMaxPrepTime("")
                  } else {
                    setMaxPrepTime(parseInt(val) || 30)
                  }
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-teal-500/50 text-slate-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">
                Bulk Ingredient Override (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g., 5 lbs of carrots"
                value={bulkIngredient}
                onChange={(e) => setBulkIngredient(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-teal-500/50 text-slate-200 placeholder:text-slate-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1.5">
              Specific Cravings / Mechanics
            </label>
            <input
              type="text"
              placeholder="e.g., Sheet pan only, heavy spice, fish"
              value={cravings}
              onChange={(e) => setCravings(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-teal-500/50 text-slate-200 placeholder:text-slate-600"
            />
          </div>

          <div className="border-t border-slate-800 pt-5">
            <ProteinSelector 
              mode={proteinMode} 
              setMode={setProteinMode} 
              selections={proteinSelections} 
              setSelections={setProteinSelections} 
            />
          </div>

          {error && (
            <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20">
              {error}
            </div>
          )}
          
          <div className="flex gap-3">
             <button
              onClick={() => navigate("/")}
              className="px-4 py-2.5 rounded-lg text-slate-400 font-medium hover:bg-slate-800 hover:text-slate-200 transition-colors mt-4"
            >
              Cancel
            </button>
            <AutoGenerator 
              systemPrompt={systemPrompt} 
              isLockedOut={isLockedOut} 
              broadcastApiError={broadcastApiError}
              onAutoResult={handleRawResult} 
            />
          </div>
        </div>
      </div>

      <ManualFallbackForm
        systemPrompt={systemPrompt}
        isLockedOut={isLockedOut}
        onManualResult={handleRawResult}
      />
    </div>
  )
}
