import { useState, useEffect, useMemo } from "react"
import { RefreshCw, ChefHat, Clock, ArrowLeft, X, Flame } from "lucide-react"
import { doc, setDoc } from "firebase/firestore"
import { db, appId, geminiApiKey } from "../lib/firebase"
import { Recipe, UserPreferences, ApiStatus } from "../types"
import { useNavigate } from "react-router-dom"

interface GeneratorProps {
  recipes: Recipe[]
  userId: string
  preferences?: UserPreferences
  apiStatus?: ApiStatus
}

export default function Generator({ recipes, userId, preferences, apiStatus }: GeneratorProps) {
  const [bulkIngredient, setBulkIngredient] = useState("")
  const [cravings, setCravings] = useState("")
  const [targetServings, setTargetServings] = useState<number | "">(
    preferences?.targetServings || 6,
  )
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showManual, setShowManual] = useState(false)
  const [manualResult, setManualResult] = useState("")
  const [isCopied, setIsCopied] = useState(false)
  const navigate = useNavigate()

  const [now, setNow] = useState(Date.now())
  const isLockedOut = apiStatus?.status !== "active" && (apiStatus?.expiresAt || 0) > now

  useEffect(() => {
    if (!isLockedOut) return
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [isLockedOut])

  // Try to load persisted options from localStorage
  const [generatedOptions, setGeneratedOptions] = useState<Partial<Recipe>[] | null>(() => {
    try {
      const saved = localStorage.getItem("mealPrep_generatedOptions")
      if (saved) return JSON.parse(saved)
    } catch (e) {
      console.warn("Failed to parse cached options", e)
    }
    return null
  })

  const [previewRecipe, setPreviewRecipe] = useState<Partial<Recipe> | null>(null)

  // Sync to localStorage whenever generatedOptions changes
  useEffect(() => {
    if (generatedOptions && generatedOptions.length > 0) {
      localStorage.setItem("mealPrep_generatedOptions", JSON.stringify(generatedOptions))
    } else {
      localStorage.removeItem("mealPrep_generatedOptions")
    }
  }, [generatedOptions])

  const handleDiscard = () => {
    setGeneratedOptions(null)
  }

  const systemPrompt = useMemo(() => {
    const highRated = recipes
      .filter((r) => (r.rating || 0) >= 8)
      .map((r) => r.name)
      .slice(0, 3)
    const lowRated = recipes
      .filter((r) => (r.rating || 10) < 5)
      .map((r) => `${r.name} (Feedback: ${r.feedback || "None"})`)
      .slice(0, 3)
    const recentMeals = recipes.slice(0, 5).map((r) => r.name)

    return `You are a highly creative Culinary Engine. 
Generate exactly 3 EXTREMELY DISTINCT, wildly different low-prep (under 20 mins) workweek meal recipes scaled for exactly ${targetServings || 1} portions.

CRITICAL RULES & VARIANCE:
1. All 3 options MUST use completely different primary proteins (e.g. if one is beef, the others cannot be beef). Strongly consider vegetarian dishes as a primary option.
2. All 3 options MUST draw from entirely different global cuisines.
3. All 3 options MUST use different preparation styles.
4. Do NOT rely on cliches like "gochujang", "harissa", or "za'atar". Branch out into diverse and unique flavor profiles.
5. All ingredients MUST be common enough that a standard full-size US grocery store will consistently stock them. No exotic specialty items.
6. The core focus is on easy-to-make meals that are healthy, filling, and exceptionally tasty.

USER CONTEXT & HISTORY:
- Highly rated past meals: ${highRated.join(", ") || "None yet. Be highly creative."}
- Low rated past meals (AVOID THESE): ${lowRated.join(" | ") || "None yet."}
- Specific User Request / Cravings: ${cravings || "Surprise me with completely unique, healthy, and tasty recipes."}
- Bulk Ingredient to utilize: ${bulkIngredient || "None."}

DO NOT GENERATE ANYTHING SIMILAR TO THESE RECENT MEALS:
${recentMeals.join("\n") || "None."}

OUTPUT FORMAT:
Respond ONLY with a valid JSON object. Do not wrap it in markdown block quotes. Do not add trailing text or trailing commas. Match this schema exactly:
{
  "options": [
    {
      "name": "Creative but descriptive name",
      "description": "A mouthwatering 1-2 sentence description explaining the dish, its texture, and flavor profile.",
      "prepTime": 15,
      "estimatedCalories": 450,
      "tags": ["high-protein", "one-pan", "spicy"],
      "shoppingList": [
        { "item": "Ground Turkey (93% lean)", "batchAmount": "3 lbs", "singleAmount": "0.5 lbs" },
        { "item": "Slaw Mix", "batchAmount": "3 bags", "singleAmount": "0.5 bags" }
      ],
      "batchProcedure": [
        "Step 1: clear and concise for cooking all ${targetServings || 1} servings at once",
        "Step 2: clear and concise for cooking all ${targetServings || 1} servings at once"
      ],
      "singleProcedure": [
        "Step 1: clear and concise for cooking just 1 serving",
        "Step 2: clear and concise for cooking just 1 serving"
      ]
    }
  ]
}`
  }, [recipes, targetServings, cravings, bulkIngredient])

  const processJsonResult = (resultText: string) => {
    let cleanText = resultText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim()
    let startIndex = cleanText.indexOf("{")
    if (startIndex === -1) throw new Error("Could not find JSON object bounds in response.")

    let jsonStr = cleanText.substring(startIndex)
    let parsedData
    let isValid = false

    while (jsonStr.length > 20) {
      try {
        parsedData = JSON.parse(jsonStr)
        isValid = true
        break
      } catch (err) {
        const lastBrace = jsonStr.lastIndexOf("}")
        if (lastBrace === -1) break
        jsonStr = jsonStr.substring(0, lastBrace).trim()
      }
    }

    if (!isValid || !parsedData) {
      throw new Error("AI returned malformed JSON that could not be repaired.")
    }

    if (
      !parsedData.options ||
      !Array.isArray(parsedData.options) ||
      parsedData.options.length === 0
    ) {
      throw new Error("AI returned invalid JSON schema.")
    }

    setGeneratedOptions(parsedData.options)
  }

  const handleManualProcess = () => {
    try {
      setError(null)
      processJsonResult(manualResult)
    } catch (err: any) {
      setError(err.message || "Failed to process manual result.")
    }
  }

  const broadcastApiError = async (status: number, message: string) => {
    try {
      let limitType: "minute" | "daily" | null = null
      let expiresAt = Date.now()
      let newStatus: "rate_limited" | "timeout" = "rate_limited"

      if (status === 503) {
        newStatus = "timeout"
        expiresAt += 10000 // 10 seconds
      } else if (status === 429) {
        if (message.toLowerCase().includes("quota") || message.toLowerCase().includes("daily")) {
          limitType = "daily"
          // Calculate ms until midnight PT
          const now = new Date()
          const ptString = now.toLocaleString("en-US", { timeZone: "America/Los_Angeles" })
          const ptDate = new Date(ptString)
          ptDate.setHours(24, 0, 0, 0)
          const msUntilMidnightPT = ptDate.getTime() - new Date(ptString).getTime()
          expiresAt += msUntilMidnightPT
        } else {
          limitType = "minute"
          expiresAt += 60000 // 1 minute
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

  const generateOptions = async () => {
    setIsGenerating(true)
    setError(null)
    setGeneratedOptions(null)

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              { parts: [{ text: "Generate 3 distinct meal configuration options as JSON." }] },
            ],
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: { responseMimeType: "application/json" },
          }),
        },
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData?.error?.message || ""
        if (response.status === 429 || response.status === 503) {
          await broadcastApiError(response.status, errorMessage)
          throw new Error(`API locked out (${response.status})`)
        }
        throw new Error(`API Error: ${response.status}`)
      }

      const data = await response.json()
      const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text

      if (!resultText) throw new Error("Failed to extract JSON from AI response.")

      processJsonResult(resultText)
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Engine failed to generate recipes. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  const selectRecipe = async (option: Partial<Recipe>) => {
    try {
      const docId = `recipe-${Date.now()}`
      const newRecipe: Recipe = {
        name: option.name || "Untitled Meal",
        description: option.description || "No description provided.",
        prepTime: option.prepTime || 15,
        estimatedCalories: option.estimatedCalories,
        tags: option.tags || [],
        shoppingList: option.shoppingList || [],
        batchProcedure: option.batchProcedure || [],
        singleProcedure: option.singleProcedure || [],
        servings: typeof targetServings === "number" ? targetServings : 1,
        id: docId,
        createdAt: Date.now(),
        rating: 0,
        feedback: "",
      }

      await setDoc(doc(db, "artifacts", appId, "users", userId, "recipes", docId), newRecipe)

      // Clear persistence and cache
      localStorage.removeItem("mealPrep_generatedOptions")
      setGeneratedOptions(null)
      setPreviewRecipe(null)

      navigate(`/recipe/${docId}`)
    } catch (err) {
      console.error("Error saving selected recipe:", err)
      setError("Failed to save selected recipe.")
    }
  }

  // If we have options, show the Selection UI
  if (generatedOptions && generatedOptions.length > 0) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
        {/* Modal Overlay */}
        {previewRecipe && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-800 flex justify-between items-start shrink-0">
                <div>
                  <h2 className="text-2xl font-bold text-slate-100 mb-2 leading-tight pr-8">
                    {previewRecipe.name}
                  </h2>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {previewRecipe.tags?.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs font-medium bg-slate-950 text-teal-400 px-2.5 py-1 rounded-full border border-teal-500/20"
                      >
                        {tag}
                      </span>
                    ))}
                    <span className="text-xs font-medium bg-slate-950 text-slate-300 px-2.5 py-1 rounded-full border border-slate-800 flex items-center gap-1">
                      <Clock size={12} className="text-teal-500" /> {previewRecipe.prepTime} mins
                    </span>
                    {previewRecipe.estimatedCalories && (
                      <span className="text-xs font-medium bg-slate-950 text-slate-300 px-2.5 py-1 rounded-full border border-slate-800 flex items-center gap-1">
                        <Flame size={12} className="text-orange-500" />{" "}
                        {previewRecipe.estimatedCalories} kcal
                      </span>
                    )}
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    {previewRecipe.description}
                  </p>
                </div>
                <button
                  onClick={() => setPreviewRecipe(null)}
                  className="p-2 text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 rounded-lg transition-colors border border-transparent hover:border-slate-700 absolute top-6 right-6"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto flex-1 bg-slate-950/30 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="font-semibold text-slate-300 mb-4 pb-2 border-b border-slate-800">
                    Shopping List
                  </h3>
                  <ul className="space-y-3">
                    {previewRecipe.shoppingList?.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-teal-500 flex-shrink-0" />
                        <div>
                          <span className="font-semibold text-teal-400 block sm:inline sm:mr-2">
                            {item.batchAmount || item.amount}
                          </span>
                          <span className="text-slate-300">{item.item}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-slate-300 mb-4 pb-2 border-b border-slate-800">
                    Batch Procedure
                  </h3>
                  <div className="space-y-4">
                    {(previewRecipe.batchProcedure || previewRecipe.procedure)?.map((step, idx) => {
                      const parts = step.split(": ")
                      return (
                        <div key={idx} className="flex gap-3 text-sm">
                          <div className="flex-shrink-0 font-bold text-teal-500 w-5">
                            {idx + 1}.
                          </div>
                          <p className="text-slate-300 leading-relaxed">
                            {parts.length > 1 ? (
                              <>
                                <span className="font-semibold text-teal-300">{parts[0]}: </span>
                                {parts.slice(1).join(": ")}
                              </>
                            ) : (
                              step
                            )}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-slate-800 bg-slate-900 shrink-0 flex gap-3 justify-end">
                <button
                  onClick={() => setPreviewRecipe(null)}
                  className="px-5 py-2.5 rounded-lg text-slate-400 font-medium hover:bg-slate-800 hover:text-slate-200 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => selectRecipe(previewRecipe)}
                  className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold px-6 py-2.5 rounded-lg transition-all shadow-lg shadow-teal-500/20"
                >
                  Select This Meal
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <ChefHat className="text-teal-400" /> Choose Your Matrix
          </h2>
          <button
            onClick={handleDiscard}
            className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium"
          >
            <ArrowLeft size={16} /> Discard & Start Over
          </button>
        </div>

        <p className="text-slate-400 text-sm">
          Select one of these distinct configurations for your current workweek. Click a card to see
          the full recipe.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {generatedOptions.map((opt, idx) => (
            <div
              key={idx}
              onClick={() => setPreviewRecipe(opt)}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between hover:border-teal-500/50 cursor-pointer transition-all group hover:bg-slate-800/50"
            >
              <div>
                <h3 className="font-bold text-slate-100 mb-2 text-lg leading-tight group-hover:text-teal-300 transition-colors">
                  {opt.name}
                </h3>
                <p className="text-sm text-slate-400 mb-3 line-clamp-3 leading-relaxed">
                  {opt.description}
                </p>
                <div className="flex items-center gap-3 text-sm text-slate-300 mb-4 font-medium">
                  <span className="flex items-center gap-1.5">
                    <Clock size={16} className="text-teal-500" /> {opt.prepTime} mins
                  </span>
                  {opt.estimatedCalories && (
                    <span className="flex items-center gap-1.5">
                      <Flame size={16} className="text-orange-500" /> {opt.estimatedCalories} kcal
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 mb-6">
                  {opt.tags?.slice(0, 4).map((tag) => (
                    <span
                      key={tag}
                      className="text-xs bg-slate-950 text-slate-400 px-2 py-1 rounded-md border border-slate-800"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  selectRecipe(opt)
                }}
                className="w-full bg-slate-800 group-hover:bg-teal-500 group-hover:text-slate-950 text-teal-400 font-semibold py-2.5 rounded-lg transition-all border border-slate-700 group-hover:border-teal-400 mt-auto"
              >
                Quick Select
              </button>
            </div>
          ))}
        </div>
      </div>
    )
  }

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

  // Input UI
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

          {error && (
            <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              onClick={() => navigate("/")}
              disabled={isGenerating}
              className="px-4 py-2.5 rounded-lg text-slate-400 font-medium hover:bg-slate-800 hover:text-slate-200 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={generateOptions}
              disabled={isGenerating || isLockedOut}
              className="flex-1 bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-teal-500/20"
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
        </div>
      </div>

      {/* Manual Mode UI */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-xl overflow-hidden">
        <button
          onClick={() => setShowManual(!showManual)}
          className="w-full p-4 flex items-center justify-between text-slate-300 font-semibold hover:bg-slate-800/50 transition-colors"
        >
          <span>Manual Generation Path</span>
          <span className="text-xl leading-none">{showManual ? "−" : "+"}</span>
        </button>

        {(showManual || isLockedOut) && (
          <div className="p-6 border-t border-slate-800 space-y-6">
            <div className="text-sm text-slate-400">
              Copy this prompt, run it in your personal Gemini account, and paste the result below
              to bypass any global rate limits.
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5 flex justify-between items-center">
                System Prompt
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      systemPrompt + "\n\nGenerate 3 distinct meal configuration options as JSON.",
                    )
                    setIsCopied(true)
                    setTimeout(() => setIsCopied(false), 2000)
                  }}
                  className={`font-medium px-2 py-1 rounded transition-colors ${
                    isCopied
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-teal-500/10 text-teal-400 hover:text-teal-300"
                  }`}
                >
                  {isCopied ? "Copied!" : "Copy Prompt"}
                </button>
              </label>
              <textarea
                readOnly
                value={systemPrompt}
                className="w-full h-32 bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-500 font-mono resize-none focus:outline-none"
              />
            </div>

            <div className="flex justify-center">
              <a
                href="https://gemini.google.com/app"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/10 text-blue-400 font-medium hover:bg-blue-500/20 transition-colors border border-blue-500/20"
              >
                Open Google Gemini ↗
              </a>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1.5">
                Paste JSON Result
              </label>
              <textarea
                value={manualResult}
                onChange={(e) => setManualResult(e.target.value)}
                placeholder="Paste the raw output here..."
                className="w-full h-32 bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-200 font-mono focus:outline-none focus:border-teal-500/50"
              />
            </div>

            <button
              onClick={handleManualProcess}
              disabled={!manualResult.trim()}
              className="w-full bg-slate-800 hover:bg-slate-700 text-teal-400 font-semibold px-4 py-2.5 rounded-lg transition-colors border border-slate-700 hover:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Process Manual Result
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
