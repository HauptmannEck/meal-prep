import { useState, useRef, useEffect } from "react"
import { ChefHat, ArrowLeft, LogOut, ChevronDown, User as UserIcon } from "lucide-react"
import { User, signOut } from "firebase/auth"
import { auth } from "../lib/firebase"
import { useLocation, useNavigate } from "react-router-dom"

interface HeaderProps {
  user: User
}

export default function Header({ user }: HeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    try {
      await signOut(auth)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-10 shadow-sm">
      <div className="max-w-3xl mx-auto p-4 flex justify-between items-center">
        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-teal-500/10 p-2 rounded-lg text-teal-400">
            <ChefHat size={24} />
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent tracking-tight hidden sm:block">
            Meal Prep
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {location.pathname !== "/" && (
            <button
              onClick={() => navigate("/")}
              className="text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 text-sm font-medium bg-slate-800/50 px-3 py-2 rounded-md shrink-0 border border-transparent hover:border-slate-700"
            >
              <ArrowLeft size={16} /> <span className="hidden sm:inline">Directory</span>
            </button>
          )}

          <div className="relative shrink-0" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 text-sm text-slate-300 hover:text-white bg-slate-800/50 hover:bg-slate-800 px-3 py-2 rounded-md transition-colors border border-slate-700/50"
            >
              {user.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="w-5 h-5 rounded-full" />
              ) : (
                <UserIcon size={16} className="text-teal-500" />
              )}
              <span className="max-w-[100px] sm:max-w-[150px] truncate font-medium">
                {user.displayName || user.email?.split("@")[0] || "Guest"}
              </span>
              <ChevronDown
                size={14}
                className={`transition-transform text-slate-500 ${dropdownOpen ? "rotate-180" : ""}`}
              />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-700 rounded-lg shadow-xl overflow-hidden z-20 animate-in fade-in slide-in-from-top-2">
                <div className="px-4 py-3 border-b border-slate-800">
                  <p className="text-sm font-medium text-slate-200 truncate">
                    {user.displayName || "User"}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{user.email}</p>
                </div>
                <button
                  onClick={() => {
                    setDropdownOpen(false)
                    navigate("/preferences")
                  }}
                  className="w-full text-left px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 flex items-center gap-2 transition-colors font-medium border-b border-slate-800"
                >
                  <ChefHat size={16} /> Preferences
                </button>
                <button
                  onClick={handleSignOut}
                  className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-slate-800 flex items-center gap-2 transition-colors font-medium"
                >
                  <LogOut size={16} /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
