import { useState } from "react"
import { Clock, Flame, ArrowLeft } from "lucide-react"
import { Recipe } from "../../types"
import RecipePreviewModal from "./RecipePreviewModal"
import { doc, setDoc } from "firebase/firestore"
import { db, appId } from "../../lib/firebase"
import { useNavigate } from "react-router-dom"

interface RecipeMatrixProps {
  generatedOptions: Partial<Recipe>[]
  targetServings: number
  userId: string
  onDiscard: () => void
}

/**
 * Owns the preview modal and handles saving the selected recipe to Firestore.
 */
export default function RecipeMatrix({
  generatedOptions,
  targetServings,
  userId,
  onDiscard,
}: RecipeMatrixProps) {
  const [previewRecipe, setPreviewRecipe] = useState<Partial<Recipe> | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const navigate = useNavigate()

  const handleSelectRecipe = async (option: Partial<Recipe>) => {
    setIsSaving(true)
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
        servings: targetServings,
        id: docId,
        createdAt: Date.now(),
        rating: 0,
        feedback: "",
      }

      await setDoc(doc(db, "artifacts", appId, "users", userId, "recipes", docId), newRecipe)
      
      // Wipe the cached options to fully reset the generator
      localStorage.removeItem("mealPrep_generatorState")
      
      navigate(`/recipe/${docId}`)
    } catch (err) {
      console.error("Error saving selected recipe:", err)
      // Note: in a larger app, we might want a localized error state here
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      {/* Modal Overlay */}
      {previewRecipe && (
        <RecipePreviewModal
          previewRecipe={previewRecipe}
          setPreviewRecipe={setPreviewRecipe}
          selectRecipe={handleSelectRecipe}
        />
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          Choose Your Matrix
        </h2>
        <button
          onClick={onDiscard}
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
                handleSelectRecipe(opt)
              }}
              disabled={isSaving}
              className="w-full bg-slate-800 group-hover:bg-teal-500 group-hover:text-slate-950 text-teal-400 font-semibold py-2.5 rounded-lg transition-all border border-slate-700 group-hover:border-teal-400 mt-auto disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Quick Select"}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
