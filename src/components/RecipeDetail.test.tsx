import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { MemoryRouter } from "react-router-dom"
import RecipeDetail from "./RecipeDetail"

// Mock react-router-dom to control the URL param
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom")
  return {
    ...actual,
    useParams: () => ({ id: "123" }),
    useNavigate: () => vi.fn(),
  }
})

// Mock firebase
vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  setDoc: vi.fn(),
  deleteDoc: vi.fn(),
  getFirestore: vi.fn(),
}))
vi.mock("../lib/firebase", () => ({
  db: {},
  appId: "testApp",
}))

describe("RecipeDetail", () => {
  const mockRecipes = [
    {
      id: "123",
      name: "Spicy Tofu Stir Fry",
      description: "A delicious vegan stir fry.",
      prepTime: 20,
      tags: ["vegan", "spicy"],
      shoppingList: [
        { item: "Tofu", amount: "1 block", checked: false },
        { item: "Broccoli", amount: "2 heads", checked: true },
      ],
      procedure: ["Step 1: Fry tofu", "Step 2: Add broccoli"],
      rating: 0,
      feedback: "",
      createdAt: 1000,
    },
  ]

  it("renders the recipe details correctly", () => {
    render(
      <MemoryRouter>
        <RecipeDetail recipes={mockRecipes} userId="user1" />
      </MemoryRouter>,
    )

    expect(screen.getByText("Spicy Tofu Stir Fry")).toBeInTheDocument()
    expect(screen.getByText("A delicious vegan stir fry.")).toBeInTheDocument()
    expect(screen.getByText("vegan")).toBeInTheDocument()
  })

  it("switches between tabs correctly", () => {
    render(
      <MemoryRouter>
        <RecipeDetail recipes={mockRecipes} userId="user1" />
      </MemoryRouter>,
    )

    // Shopping list is default
    expect(screen.getByText("Tofu")).toBeInTheDocument()

    // Click Procedure tab
    const procedureTab = screen.getByText("Procedure")
    fireEvent.click(procedureTab)

    expect(screen.getByText("Step 1:")).toBeInTheDocument()
    expect(screen.getByText("Fry tofu")).toBeInTheDocument()

    // Click Review tab
    const reviewTab = screen.getByText("Review")
    fireEvent.click(reviewTab)

    expect(screen.getByText("Overall Score (1-10)")).toBeInTheDocument()
  })
})
