import { Clock, X, Flame } from "lucide-react"
import { Recipe } from "../../types"

interface RecipePreviewModalProps {
  previewRecipe: Partial<Recipe>
  setPreviewRecipe: (recipe: Partial<Recipe> | null) => void
  selectRecipe: (recipe: Partial<Recipe>) => void
}

export default function RecipePreviewModal({
  previewRecipe,
  setPreviewRecipe,
  selectRecipe,
}: RecipePreviewModalProps) {
  return (
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
                  <Flame size={12} className="text-orange-500" /> {previewRecipe.estimatedCalories}{" "}
                  kcal
                </span>
              )}
            </div>
            <p className="text-slate-300 text-sm leading-relaxed">{previewRecipe.description}</p>
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
                    <div className="flex-shrink-0 font-bold text-teal-500 w-5">{idx + 1}.</div>
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
  )
}
