import { useState } from "react"
import { Check, X, Plus } from "lucide-react"

export const COMMON_PROTEINS = [
  "Chicken",
  "Beef",
  "Pork",
  "Fish",
  "Shellfish",
  "Turkey",
  "Lamb",
  "Tofu/Tempeh",
  "Beans/Lentils",
]

interface ProteinSelectorProps {
  mode: "whitelist" | "blacklist"
  setMode: (mode: "whitelist" | "blacklist") => void
  selections: string[]
  setSelections: (selections: string[]) => void
}

export default function ProteinSelector({
  mode,
  setMode,
  selections,
  setSelections,
}: ProteinSelectorProps) {
  const [customProteins, setCustomProteins] = useState<string[]>(
    selections.filter((p) => !COMMON_PROTEINS.includes(p))
  )
  const [newProtein, setNewProtein] = useState("")
  const toggleSelection = (protein: string) => {
    if (selections.includes(protein)) {
      setSelections(selections.filter((p) => p !== protein))
    } else {
      setSelections([...selections, protein])
    }
  }

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newProtein.trim()
    if (!trimmed) return
    
    // Add to custom list if not there
    if (!COMMON_PROTEINS.includes(trimmed) && !customProteins.includes(trimmed)) {
      setCustomProteins([...customProteins, trimmed])
    }
    
    // Add to selections if not there
    if (!selections.includes(trimmed)) {
      setSelections([...selections, trimmed])
    }
    
    setNewProtein("")
  }

  const displayProteins = [...COMMON_PROTEINS, ...customProteins]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-slate-400">Protein Choices (Optional)</label>
        <div className="flex bg-slate-950 rounded-lg p-1 border border-slate-800">
          <button
            onClick={() => {
              if (mode !== "blacklist") {
                setMode("blacklist")
                setSelections([])
              }
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              mode === "blacklist"
                ? "bg-slate-800 text-slate-200 shadow-sm"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            Exclude
          </button>
          <button
            onClick={() => {
              if (mode !== "whitelist") {
                setMode("whitelist")
                setSelections([])
              }
            }}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              mode === "whitelist"
                ? "bg-slate-800 text-slate-200 shadow-sm"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            Include Only
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-500">
        {mode === "blacklist"
          ? "Select proteins you do NOT want to eat. Unselected proteins are allowed."
          : "Select ONLY the proteins you want to eat. Unselected proteins will be avoided."}
      </p>

      <div className="flex flex-wrap gap-2">
        {displayProteins.map((protein) => {
          const isSelected = selections.includes(protein)
          
          let btnClass = "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700 hover:bg-slate-900"
          
          if (isSelected) {
            if (mode === "blacklist") {
              btnClass = "border-red-500/50 bg-red-500/10 text-red-400 hover:bg-red-500/20"
            } else {
              btnClass = "border-teal-500/50 bg-teal-500/10 text-teal-400 hover:bg-teal-500/20"
            }
          }

          return (
            <button
              key={protein}
              onClick={() => toggleSelection(protein)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${btnClass}`}
            >
              {isSelected ? (
                mode === "blacklist" ? <X size={14} /> : <Check size={14} />
              ) : null}
              {protein}
            </button>
          )
        })}
      </div>
      
      <form onSubmit={handleAddCustom} className="flex items-center gap-2 pt-2">
        <input 
          type="text" 
          placeholder="Add custom protein..." 
          value={newProtein}
          onChange={(e) => setNewProtein(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-teal-500/50 text-slate-200 placeholder:text-slate-600 flex-1 max-w-[200px]"
        />
        <button 
          type="submit"
          disabled={!newProtein.trim()}
          className="p-1.5 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 hover:text-slate-100 transition-colors disabled:opacity-50 disabled:hover:bg-slate-800"
        >
          <Plus size={16} />
        </button>
      </form>
    </div>
  )
}
