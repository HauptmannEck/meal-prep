import { useState } from "react"
import { ChefHat, ShoppingCart, List, Star, Clock, Trash2, Save, RefreshCw } from "lucide-react"
import { doc, setDoc, deleteDoc } from "firebase/firestore"
import { db, appId } from "../lib/firebase"
import { Recipe } from "../types"
import { useParams, useNavigate } from "react-router-dom"

interface RecipeDetailProps {
  recipes: Recipe[]
  userId: string
}

export default function RecipeDetail({ recipes, userId }: RecipeDetailProps) {
  const { id } = useParams()
  const navigate = useNavigate()

  const recipe = recipes.find((r) => r.id === id)

  const [activeTab, setActiveTab] = useState<"shop" | "cook" | "review">("shop")
  const [cookingMode, setCookingMode] = useState<"batch" | "single">("batch")
  const [rating, setRating] = useState<number | string>(recipe?.rating || 0)
  const [feedback, setFeedback] = useState(recipe?.feedback || "")
  const [isSavingReview, setIsSavingReview] = useState(false)

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

  const saveReview = async () => {
    setIsSavingReview(true)
    try {
      await setDoc(doc(db, "artifacts", appId, "users", userId, "recipes", recipe.id), {
        ...recipe,
        rating: Number(rating),
        feedback: feedback,
      })
      // Allow visual feedback to persist briefly
      setTimeout(() => setIsSavingReview(false), 500)
    } catch (err) {
      console.error(err)
      setIsSavingReview(false)
    }
  }

  const toggleShoppingItem = async (index: number) => {
    const updatedList = [...(recipe.shoppingList || [])]
    updatedList[index] = { ...updatedList[index], checked: !updatedList[index].checked }

    try {
      await setDoc(doc(db, "artifacts", appId, "users", userId, "recipes", recipe.id), {
        ...recipe,
        shoppingList: updatedList,
      })
    } catch (err) {
      console.error("Error updating shopping list", err)
    }
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

          {/* Shopping List Tab */}
          {activeTab === "shop" && (
            <div className="space-y-1">
              <h3 className="font-semibold text-slate-300 mb-4 pb-2 border-b border-slate-800">
                Ingredients List
              </h3>
              <ul className="space-y-3">
                {recipe.shoppingList?.map((item, idx) => (
                  <li
                    key={idx}
                    onClick={() => toggleShoppingItem(idx)}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-800/50 border border-transparent hover:border-slate-800 transition-colors group cursor-pointer"
                  >
                    <div
                      className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${item.checked ? "bg-teal-500 border-teal-500" : "border-slate-600 group-hover:border-teal-500"}`}
                    >
                      {item.checked && (
                        <svg
                          className="w-3.5 h-3.5 text-slate-950"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div
                      className={`transition-all ${item.checked ? "opacity-40 line-through" : ""}`}
                    >
                      <span className="font-semibold text-teal-400 block sm:inline sm:mr-2">
                        {cookingMode === "single"
                          ? item.singleAmount || item.amount
                          : item.batchAmount || item.amount}
                      </span>
                      <span className="text-slate-200">{item.item}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Procedure Tab */}
          {activeTab === "cook" && (
            <div className="space-y-6">
              {(cookingMode === "single"
                ? recipe.singleProcedure || recipe.procedure
                : recipe.batchProcedure || recipe.procedure
              )?.map((step, idx) => {
                const parts = step.split(": ")
                return (
                  <div
                    key={idx}
                    className="flex gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800"
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-500/10 text-teal-400 flex items-center justify-center font-bold border border-teal-500/20">
                      {idx + 1}
                    </div>
                    <p className="text-slate-300 leading-relaxed pt-1">
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
          )}

          {/* Review Tab */}
          {activeTab === "review" && (
            <div className="max-w-md space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-3">
                  Overall Score (1-10)
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <button
                      key={num}
                      onClick={() => setRating(num)}
                      className={`w-8 h-8 md:w-10 md:h-10 rounded flex items-center justify-center text-sm font-bold transition-all ${rating === num ? "bg-amber-500 text-slate-950 scale-110 shadow-lg shadow-amber-500/20" : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800"}`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Mechanics Feedback
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="What worked? What should the engine avoid next time?"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-4 h-32 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 text-slate-200 placeholder:text-slate-600 resize-none"
                />
              </div>

              <button
                onClick={saveReview}
                className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold px-6 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-teal-500/20"
              >
                {isSavingReview ? (
                  <RefreshCw size={18} className="animate-spin" />
                ) : (
                  <Save size={18} />
                )}
                {isSavingReview ? "Saving..." : "Save Feedback"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
