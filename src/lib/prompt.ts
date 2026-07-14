import { Recipe } from "../types"

interface PromptContext {
  recipes: Recipe[]
  targetServings: number | ""
  maxPrepTime: number | ""
  cravings: string
  bulkIngredient: string
  proteinMode?: "whitelist" | "blacklist"
  proteinSelections?: string[]
}

/**
 * Constructs the system instruction prompt for the Gemini AI.
 * Separated from UI logic so it can be easily tested and tweaked over time.
 */
export function buildSystemPrompt({
  recipes,
  targetServings,
  maxPrepTime,
  cravings,
  bulkIngredient,
  proteinMode = "blacklist",
  proteinSelections = [],
}: PromptContext): string {
  const highRated = recipes
    .filter((r) => (r.rating || 0) >= 8)
    .map((r) => r.name)
    .slice(0, 3)

  const lowRated = recipes
    .filter((r) => (r.rating || 10) < 5)
    .map((r) => `${r.name} (Feedback: ${r.feedback || "None"})`)
    .slice(0, 3)

  const recentMeals = recipes.slice(0, 5).map((r) => r.name)

  const safeServings = targetServings || 1
  const safeTime = maxPrepTime || 30

  let proteinRule = ""
  if (proteinSelections.length > 0) {
    if (proteinMode === "whitelist") {
      proteinRule = `\nPROTEIN RESTRICTION: The user ONLY eats the following proteins: ${proteinSelections.join(", ")}. You MUST exclusively use proteins from this list.`
    } else {
      proteinRule = `\nPROTEIN RESTRICTION: The user CANNOT eat the following proteins: ${proteinSelections.join(", ")}. You MUST NOT generate any meals that feature these proteins.`
    }
  }

  const varianceRules = cravings
    ? `1. VARIANCE OVERRIDE: The user requested a specific craving ("${cravings}"). All 3 options MUST aggressively target this craving. It is entirely acceptable and expected to share proteins, cuisines, or styles across all 3 options to satisfy this request. Give 3 distinct variations of their craving.
2. Ensure the 3 options still offer variety in flavor profile or cooking method while adhering to the craving.`
    : `1. Try to use completely different primary proteins across the 3 options (unless restricted by the user's protein selections).
2. Ensure the 3 options span different structural formats (e.g., one bowl/skillet, one pasta/noodle, one handheld like pizza/sandwiches).
3. All 3 options MUST use different preparation styles and draw from different global cuisines.`

  return `You are a highly creative Culinary Engine. 
Generate exactly 3 EXTREMELY DISTINCT, wildly different low-prep (under ${safeTime} mins) workweek meal recipes scaled for exactly ${safeServings} portions.

CRITICAL RULES & VARIANCE:${proteinRule}
${varianceRules}
4. MEAL PREP FOCUS: Meals MUST be meal-prep friendly: easy to bulk-cook in under ${safeTime} mins, store beautifully in the fridge, and take less than 5 minutes to reheat or assemble later.
5. DEEP BALANCE: Meals MUST be deeply balanced. Integrate high volumes of diverse vegetables and hearty complex carbs (pasta, flatbreads, rice) into the dishes. Do not just serve a plain protein and a single side.
6. SHORTCUTS ALLOWED: To achieve the ${safeTime} minute limit, heavily utilize quick-cooking comfort bases like fresh tortellini, gnocchi, naan/pita breads for quick pizzas, instant rice noodles, or canned legumes.
7. Do NOT rely on cliches like "gochujang", "harissa", or "za'atar". Branch out into diverse and unique flavor profiles.
8. All ingredients MUST be common enough that a standard full-size US grocery store will consistently stock them. No exotic specialty items.

USER CONTEXT & HISTORY:
- Highly rated past meals: ${highRated.join(", ") || "None yet. Be highly creative."}
- Low rated past meals (AVOID THESE): ${lowRated.join(" | ") || "None yet."}
- Specific User Request / Cravings: ${cravings || "Surprise me with completely unique, healthy, and tasty recipes."}
- Bulk Ingredient to utilize: ${bulkIngredient || "None."}

DO NOT GENERATE ANYTHING SIMILAR TO THESE RECENT MEALS:
${recentMeals.join("\n") || "None."}

OUTPUT FORMAT:
Respond ONLY with a valid JSON object. Do not wrap it in markdown block quotes. Do not add trailing text or trailing commas. Match this schema exactly:
{
  "options": [
    {
      "name": "Creative but descriptive name",
      "description": "A mouthwatering 1-2 sentence description explaining the dish, its texture, and flavor profile.",
      "prepTime": 15,
      "estimatedCalories": 450,
      "tags": ["mediterranean", "vegetarian", "pizza"],
      "shoppingList": [
        { "item": "Naan or Flatbreads", "batchAmount": "6 pieces", "singleAmount": "1 piece" },
        { "item": "Hummus", "batchAmount": "16 oz", "singleAmount": "3 oz" },
        { "item": "Feta Cheese (crumbled)", "batchAmount": "8 oz", "singleAmount": "1.5 oz" },
        { "item": "Bell Peppers (sliced)", "batchAmount": "3 large", "singleAmount": "0.5 large" },
        { "item": "Kalamata Olives", "batchAmount": "1 cup", "singleAmount": "2 tbsp" },
        { "item": "Fresh Baby Spinach", "batchAmount": "1 bag", "singleAmount": "1 handful" }
      ],
      "batchProcedure": [
        "Step 1: clear and concise for cooking/prepping all ${safeServings} servings at once (under ${safeTime} mins)",
        "Step 2: clear and concise for cooking/prepping all ${safeServings} servings at once"
      ],
      "singleProcedure": [
        "Step 1: clear and concise for cooking exactly 1 serving from scratch OR assembling a pre-cooked portion in minutes",
        "Step 2: clear and concise for cooking exactly 1 serving from scratch OR assembling a pre-cooked portion in minutes"
      ]
    }
  ]
}`
}
