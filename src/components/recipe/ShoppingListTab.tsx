import { doc, setDoc } from "firebase/firestore"
import { db, appId } from "../../lib/firebase"
import { Recipe } from "../../types"

interface ShoppingListTabProps {
  recipe: Recipe
  userId: string
  cookingMode: "batch" | "single"
}

/**
 * Renders the shopping list and handles checking off items,
 * persisting the check state directly to Firestore.
 */
export default function ShoppingListTab({ recipe, userId, cookingMode }: ShoppingListTabProps) {
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

  return (
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
  )
}
