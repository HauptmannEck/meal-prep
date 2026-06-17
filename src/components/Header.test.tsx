import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { MemoryRouter } from "react-router-dom"
import Header from "./Header"

describe("Header", () => {
  it("renders the header correctly for an anonymous user", () => {
    // The user prop is mocked as anonymous
    const mockUser = {
      isAnonymous: true,
      uid: "123",
    } as any

    render(
      <MemoryRouter>
        <Header user={mockUser} />
      </MemoryRouter>,
    )

    expect(screen.getByText("Meal Prep")).toBeInTheDocument()
    expect(screen.getByText("Guest")).toBeInTheDocument()
  })

  it("renders the user profile correctly for a logged in user", () => {
    // The user prop is mocked as logged in
    const mockUser = {
      isAnonymous: false,
      uid: "123",
      displayName: "Gordon Ramsay",
    } as any

    render(
      <MemoryRouter>
        <Header user={mockUser} />
      </MemoryRouter>,
    )

    expect(screen.getByText("Meal Prep")).toBeInTheDocument()
    expect(screen.getByText("Gordon Ramsay")).toBeInTheDocument()
  })
})
