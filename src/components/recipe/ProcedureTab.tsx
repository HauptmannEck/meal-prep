import { Recipe } from "../../types"

interface ProcedureTabProps {
  recipe: Recipe
  cookingMode: "batch" | "single"
}

export default function ProcedureTab({ recipe, cookingMode }: ProcedureTabProps) {
  return (
    <div className="space-y-6">
      {(cookingMode === "single"
        ? recipe.singleProcedure || recipe.procedure
        : recipe.batchProcedure || recipe.procedure
      )?.map((step, idx) => {
        const parts = step.split(": ")
        return (
          <div key={idx} className="flex gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800">
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
  )
}
