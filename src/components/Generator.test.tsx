import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { MemoryRouter } from "react-router-dom"
import Generator from "./Generator"

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  setDoc: vi.fn(),
  getFirestore: vi.fn(),
}))
vi.mock("../lib/firebase", () => ({
  db: {},
  appId: "testApp",
  geminiApiKey: "testKey",
}))

describe("Generator", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    // Reset global fetch mock
    globalThis.fetch = vi.fn() as any
  })

  it("renders the input form by default", () => {
    render(
      <MemoryRouter>
        <Generator recipes={[]} userId="user1" />
      </MemoryRouter>,
    )

    expect(screen.getByText("Meal Generator Engine")).toBeInTheDocument()
    expect(screen.getByText(/Bulk Ingredient Override/i)).toBeInTheDocument()
    expect(screen.getByText(/Target Servings/i)).toBeInTheDocument()
  })

  it("can trigger generation and handle success", async () => {
    // Mock the fetch call to return a valid gemini response
    const mockGeminiResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  options: [
                    {
                      name: "Mocked Generated Recipe",
                      description: "Test description",
                      prepTime: 15,
                      tags: ["test"],
                      shoppingList: [],
                      batchProcedure: [],
                      singleProcedure: [],
                    },
                  ],
                }),
              },
            ],
          },
        },
      ],
    }

    ;(globalThis.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockGeminiResponse,
    })

    render(
      <MemoryRouter>
        <Generator recipes={[]} userId="user1" />
      </MemoryRouter>,
    )

    // Click generate button
    const generateBtn = screen.getByRole("button", { name: /Generate 3 Options/i })
    fireEvent.click(generateBtn)

    expect(screen.getByText("Processing Matrix...")).toBeInTheDocument()

    // Wait for the generated options to render
    await waitFor(() => {
      expect(screen.getByText("Mocked Generated Recipe")).toBeInTheDocument()
    })

    // Ensure the engine form is replaced by the matrix UI
    expect(screen.queryByText("Meal Generator Engine")).not.toBeInTheDocument()
  })

  it("locks the UI and shows manual path when global rate limit is active", () => {
    const rateLimitedStatus = {
      status: "rate_limited" as const,
      limitType: "daily" as const,
      expiresAt: Date.now() + 100000,
    }

    render(
      <MemoryRouter>
        <Generator recipes={[]} userId="user1" apiStatus={rateLimitedStatus} />
      </MemoryRouter>,
    )

    expect(screen.getByText("Global API Limit Reached")).toBeInTheDocument()

    const generateBtn = screen.getByRole("button", { name: /Generate 3 Options/i })
    expect(generateBtn).toBeDisabled()

    // Manual path should be visible when locked out
    expect(screen.getByText(/Copy this prompt/i)).toBeInTheDocument()
  })
})
