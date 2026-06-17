import { Recipe } from "../types"

interface PromptContext {
  recipes: Recipe[]
  targetServings: number | ""
  cravings: string
  bulkIngredient: string
}

/**
 * Constructs the system instruction prompt for the Gemini AI.
 * Separated from UI logic so it can be easily tested and tweaked over time.
 */
export function buildSystemPrompt({
  recipes,
  targetServings,
  cravings,
  bulkIngredient,
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

  return `You are a highly creative Culinary Engine. 
Generate exactly 3 EXTREMELY DISTINCT, wildly different low-prep (under 20 mins) workweek meal recipes scaled for exactly ${safeServings} portions.

CRITICAL RULES & VARIANCE:
1. All 3 options MUST use completely different primary proteins (e.g. if one is beef, the others cannot be beef). Strongly consider vegetarian dishes as a primary option.
2. All 3 options MUST draw from entirely different global cuisines.
3. All 3 options MUST use different preparation styles.
4. Do NOT rely on cliches like "gochujang", "harissa", or "za'atar". Branch out into diverse and unique flavor profiles.
5. All ingredients MUST be common enough that a standard full-size US grocery store will consistently stock them. No exotic specialty items.
6. The core focus is on easy-to-make meals that are healthy, filling, and exceptionally tasty.

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
      "tags": ["high-protein", "one-pan", "spicy"],
      "shoppingList": [
        { "item": "Ground Turkey (93% lean)", "batchAmount": "3 lbs", "singleAmount": "0.5 lbs" },
        { "item": "Slaw Mix", "batchAmount": "3 bags", "singleAmount": "0.5 bags" }
      ],
      "batchProcedure": [
        "Step 1: clear and concise for cooking all ${safeServings} servings at once",
        "Step 2: clear and concise for cooking all ${safeServings} servings at once"
      ],
      "singleProcedure": [
        "Step 1: clear and concise for cooking just 1 serving",
        "Step 2: clear and concise for cooking just 1 serving"
      ]
    }
  ]
}`
}
