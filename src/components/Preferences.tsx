import { useState } from "react"
import { Save, RefreshCw } from "lucide-react"
import { doc, setDoc } from "firebase/firestore"
import { db, appId } from "../lib/firebase"
import { UserPreferences } from "../types"
import ProteinSelector from "./ProteinSelector"

interface PreferencesProps {
  userId: string
  preferences: UserPreferences
}

export default function Preferences({ userId, preferences }: PreferencesProps) {
  const [targetServings, setTargetServings] = useState<number>(preferences.targetServings || 6)
  const [maxPrepTime, setMaxPrepTime] = useState<number>(preferences.maxPrepTime || 30)
  const [proteinMode, setProteinMode] = useState<"whitelist" | "blacklist">(preferences.proteinMode || "blacklist")
  const [proteinSelections, setProteinSelections] = useState<string[]>(preferences.proteinSelections || [])
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState("")

  const handleSave = async () => {
    setIsSaving(true)
    setSaveMessage("")
    try {
      const prefRef = doc(db, "artifacts", appId, "users", userId, "preferences", "default")
      await setDoc(
        prefRef,
        {
          targetServings: Number(targetServings),
          maxPrepTime: Number(maxPrepTime),
          proteinMode,
          proteinSelections,
        },
        { merge: true },
      )
      setSaveMessage("Preferences saved successfully!")
    } catch (err) {
      console.error(err)
      setSaveMessage("Error saving preferences.")
    } finally {
      setIsSaving(false)
      setTimeout(() => setSaveMessage(""), 3000)
    }
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-xl mx-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl p-6 md:p-8">
        <h2 className="text-2xl font-bold text-slate-100 mb-6">User Preferences</h2>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Default Target Servings
            </label>
            <p className="text-xs text-slate-500 mb-3">
              This is the default number of portions the AI will generate meals for. You can still
              override this per generation.
            </p>
            <input
              type="number"
              min="1"
              max="20"
              value={targetServings}
              onChange={(e) => setTargetServings(parseInt(e.target.value) || 1)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-teal-500/50 text-slate-200"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Max Prep Time (minutes)
            </label>
            <p className="text-xs text-slate-500 mb-3">
              This is the maximum amount of time a recipe should take to prep and cook.
            </p>
            <input
              type="number"
              min="5"
              max="180"
              step="5"
              value={maxPrepTime}
              onChange={(e) => setMaxPrepTime(parseInt(e.target.value) || 30)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-teal-500/50 text-slate-200"
            />
          </div>

          <div className="border-t border-slate-800 pt-6">
            <ProteinSelector 
              mode={proteinMode} 
              setMode={setProteinMode} 
              selections={proteinSelections} 
              setSelections={setProteinSelections} 
            />
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold px-4 py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-teal-500/20 disabled:opacity-50"
          >
            {isSaving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
            {isSaving ? "Saving..." : "Save Preferences"}
          </button>

          {saveMessage && (
            <p className="text-sm text-center text-teal-400 font-medium animate-in fade-in">
              {saveMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
