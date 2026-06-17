import { useState } from "react"

interface ManualFallbackFormProps {
  systemPrompt: string
  isLockedOut: boolean
  onManualResult: (resultText: string) => void
}

/**
 * Handles the manual copy-paste path for when the global API quota is exhausted.
 * Manages its own internal state for the textarea and copy button feedback.
 */
export default function ManualFallbackForm({
  systemPrompt,
  isLockedOut,
  onManualResult,
}: ManualFallbackFormProps) {
  const [showManual, setShowManual] = useState(false)
  const [manualResult, setManualResult] = useState("")
  const [isCopied, setIsCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(
      systemPrompt + "\n\nGenerate 3 distinct meal configuration options as JSON.",
    )
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  const handleSubmit = () => {
    if (manualResult && manualResult.trim().length > 20) {
      onManualResult(manualResult)
    }
  }

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-xl overflow-hidden mt-6">
      <button
        onClick={() => setShowManual(!showManual)}
        className="w-full p-4 flex items-center justify-between text-slate-300 font-semibold hover:bg-slate-800/50 transition-colors"
      >
        <span>Manual Generation Path</span>
        <span className="text-xl leading-none">{showManual ? "−" : "+"}</span>
      </button>

      {/* Force open if the API is globally locked out */}
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
                onClick={handleCopy}
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
              className="w-full h-48 bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 font-mono resize-none focus:outline-none focus:border-teal-500/50"
              placeholder='{\n  "options": [\n    ...\n  ]\n}'
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!manualResult || manualResult.trim().length < 20}
            className="w-full bg-slate-800 text-teal-400 font-semibold px-4 py-3 rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Process Manual Result
          </button>
        </div>
      )}
    </div>
  )
}
