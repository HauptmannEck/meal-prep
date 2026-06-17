import { useState } from "react"
import { ChefHat, ShoppingCart, List, Star, Clock, Trash2, Flame } from "lucide-react"
import { doc, deleteDoc } from "firebase/firestore"
import { db, appId } from "../lib/firebase"
import { Recipe } from "../types"
import ShoppingListTab from "./recipe/ShoppingListTab"
import ProcedureTab from "./recipe/ProcedureTab"
import ReviewTab from "./recipe/ReviewTab"
import { useParams, useNavigate } from "react-router-dom"

interface RecipeDetailProps {
  recipes: Recipe[]
  userId: string
}

/**
 * Top-level Orchestrator for Recipe details.
 * Manages the active tab and cooking mode, but delegates the actual
 * data mutation and local state to the specific tabs.
 */
export default function RecipeDetail({ recipes, userId }: RecipeDetailProps) {
  const { id } = useParams()
  const navigate = useNavigate()

  const recipe = recipes.find((r) => r.id === id)

  const [activeTab, setActiveTab] = useState<"shop" | "cook" | "review">("shop")
  const [cookingMode, setCookingMode] = useState<"batch" | "single">("batch")

  if (!recipe) {
    return (
      <div className="p-12 text-center text-slate-400 animate-in fade-in">
        <ChefHat size={48} className="mx-auto mb-4 opacity-50" />
        <h2 className="text-xl font-semibold mb-2 text-slate-300">Recipe not found</h2>
        <p className="mb-6">This recipe might have been deleted or the URL is incorrect.</p>
        <button
          onClick={() => navigate("/")}
          className="text-teal-400 font-medium hover:text-teal-300 transition-colors"
        >
          &larr; Return to Directory
        </button>
      </div>
    )
  }

  const deleteRecipe = async () => {
    try {
      await deleteDoc(doc(db, "artifacts", appId, "users", userId, "recipes", recipe.id))
      navigate("/")
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {/* Header Section */}
        <div className="p-6 md:p-8 border-b border-slate-800">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-100 leading-tight pr-4">
              {recipe.name}
            </h2>
            <button
              onClick={deleteRecipe}
              className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors border border-transparent hover:border-red-400/20"
              title="Delete Recipe"
            >
              <Trash2 size={20} />
            </button>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {recipe.tags?.map((tag) => (
              <span
                key={tag}
                className="text-xs font-medium bg-slate-950 text-teal-400 px-2.5 py-1 rounded-full border border-teal-500/20"
              >
                {tag}
              </span>
            ))}
          </div>

          <p className="text-slate-300 text-sm mb-5 leading-relaxed max-w-2xl">
            {recipe.description}
          </p>

          <div className="flex flex-wrap gap-4 text-sm text-slate-400 bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
            <span className="flex items-center gap-1.5 text-slate-300 font-medium">
              <Clock size={16} className="text-teal-500" /> {recipe.prepTime} mins
            </span>
            {recipe.estimatedCalories && (
              <span className="flex items-center gap-1.5 text-slate-300 font-medium border-l border-slate-800 pl-4">
                <Flame size={16} className="text-orange-500" /> {recipe.estimatedCalories} kcal /
                serving
              </span>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800">
          <button
            onClick={() => setActiveTab("shop")}
            className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors border-b-2 ${activeTab === "shop" ? "border-teal-500 text-teal-400 bg-teal-500/5" : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"}`}
          >
            <ShoppingCart size={18} /> <span className="hidden sm:inline">Shopping List</span>
          </button>
          <button
            onClick={() => setActiveTab("cook")}
            className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors border-b-2 ${activeTab === "cook" ? "border-teal-500 text-teal-400 bg-teal-500/5" : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"}`}
          >
            <List size={18} /> <span className="hidden sm:inline">Procedure</span>
          </button>
          <button
            onClick={() => setActiveTab("review")}
            className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors border-b-2 ${activeTab === "review" ? "border-teal-500 text-teal-400 bg-teal-500/5" : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"}`}
          >
            <Star size={18} /> <span className="hidden sm:inline">Review</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 md:p-8 bg-slate-950/30">
          {/* Mode Toggle (only show if not on review tab) */}
          {activeTab !== "review" && (
            <div className="mb-6 flex justify-center">
              <div className="bg-slate-900 p-1 rounded-lg border border-slate-800 inline-flex">
                <button
                  onClick={() => setCookingMode("batch")}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${cookingMode === "batch" ? "bg-teal-500 text-slate-950 shadow-md" : "text-slate-400 hover:text-slate-200"}`}
                >
                  Batch Prep ({recipe.servings || 6} Servings)
                </button>
                <button
                  onClick={() => setCookingMode("single")}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${cookingMode === "single" ? "bg-teal-500 text-slate-950 shadow-md" : "text-slate-400 hover:text-slate-200"}`}
                >
                  Single Serving
                </button>
              </div>
            </div>
          )}

          {activeTab === "shop" && (
            <ShoppingListTab
              recipe={recipe}
              userId={userId}
              cookingMode={cookingMode}
            />
          )}

          {activeTab === "cook" && (
            <ProcedureTab
              recipe={recipe}
              cookingMode={cookingMode}
            />
          )}

          {activeTab === "review" && (
            <ReviewTab
              recipe={recipe}
              userId={userId}
            />
          )}
        </div>
      </div>
    </div>
  )
}
