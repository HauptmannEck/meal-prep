import { Recipe, UserPreferences, ApiStatus } from "../types"
import { usePersistentState } from "../hooks/usePersistentState"
import GeneratorForm from "./generator/GeneratorForm"
import RecipeMatrix from "./generator/RecipeMatrix"

interface GeneratorProps {
  recipes: Recipe[]
  userId: string
  preferences?: UserPreferences
  apiStatus?: ApiStatus
}

interface GeneratorState {
  options: Partial<Recipe>[]
  targetServings: number
}

/**
 * Top-level Orchestrator. 
 * Simply checks if we have generated options in the cache and renders the correct view.
 */
export default function Generator({ recipes, userId, preferences, apiStatus }: GeneratorProps) {
  // Use a single persistent state object to track the generated options + the servings target they were generated for
  const [generatorState, setGeneratorState] = usePersistentState<GeneratorState | null>(
    "mealPrep_generatorState",
    null
  )

  const handleOptionsGenerated = (options: Partial<Recipe>[], targetServings: number) => {
    setGeneratorState({ options, targetServings })
  }

  const handleDiscard = () => {
    setGeneratorState(null)
  }

  // If we have options, show the Selection UI
  if (generatorState?.options && generatorState.options.length > 0) {
    return (
      <RecipeMatrix
        generatedOptions={generatorState.options}
        targetServings={generatorState.targetServings}
        userId={userId}
        onDiscard={handleDiscard}
      />
    )
  }

  // Input UI
  return (
    <GeneratorForm
      recipes={recipes}
      preferences={preferences}
      apiStatus={apiStatus}
      onOptionsGenerated={handleOptionsGenerated}
    />
  )
}
