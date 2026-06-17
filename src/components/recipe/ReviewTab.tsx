import { useState } from "react"
import { RefreshCw, Save } from "lucide-react"
import { doc, setDoc } from "firebase/firestore"
import { db, appId } from "../../lib/firebase"
import { Recipe } from "../../types"

interface ReviewTabProps {
  recipe: Recipe
  userId: string
}

/**
 * Handles the state and Firestore updates for submitting a rating
 * and feedback review for a specific recipe.
 */
export default function ReviewTab({ recipe, userId }: ReviewTabProps) {
  const [rating, setRating] = useState<number | string>(recipe.rating || 0)
  const [feedback, setFeedback] = useState(recipe.feedback || "")
  const [isSavingReview, setIsSavingReview] = useState(false)

  const saveReview = async () => {
    setIsSavingReview(true)
    try {
      await setDoc(doc(db, "artifacts", appId, "users", userId, "recipes", recipe.id), {
        ...recipe,
        rating: Number(rating),
        feedback: feedback,
      })
      setTimeout(() => setIsSavingReview(false), 500)
    } catch (err) {
      console.error(err)
      setIsSavingReview(false)
    }
  }

  return (
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
              className={`w-8 h-8 md:w-10 md:h-10 rounded flex items-center justify-center text-sm font-bold transition-all ${
                rating === num
                  ? "bg-amber-500 text-slate-950 scale-110 shadow-lg shadow-amber-500/20"
                  : "bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800"
              }`}
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
        {isSavingReview ? "Saving..." : "Save Review"}
      </button>
    </div>
  )
}
