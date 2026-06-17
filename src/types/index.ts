export interface ShoppingItem {
  item: string
  amount?: string // Legacy fallback
  batchAmount?: string
  singleAmount?: string
  checked?: boolean
}

export interface Recipe {
  id: string
  name: string
  description: string
  prepTime: number
  tags: string[]
  shoppingList: ShoppingItem[]
  procedure?: string[] // Legacy fallback
  batchProcedure?: string[]
  singleProcedure?: string[]
  servings?: number
  createdAt: number
  rating?: number
  feedback?: string
}

export interface UserPreferences {
  targetServings?: number
}

export interface ApiStatus {
  status: "active" | "rate_limited" | "timeout"
  limitType?: "minute" | "daily" | null
  expiresAt?: number
}

export type ViewState = "dashboard" | "generate" | "detail"
