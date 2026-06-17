import { useState, useEffect } from "react"
import {
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
  User,
} from "firebase/auth"
import { collection, onSnapshot, DocumentData, QuerySnapshot, doc } from "firebase/firestore"
import { Routes, Route } from "react-router-dom"
import { ChefHat } from "lucide-react"
import { auth, db, appId } from "./lib/firebase"

import Header from "./components/Header"
import Dashboard from "./components/Dashboard"
import Generator from "./components/Generator"
import RecipeDetail from "./components/RecipeDetail"
import Preferences from "./components/Preferences"
import { Recipe, UserPreferences, ApiStatus } from "./types"

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [preferences, setPreferences] = useState<UserPreferences>({})
  const [apiStatus, setApiStatus] = useState<ApiStatus>({ status: "active" })
  const [authLoading, setAuthLoading] = useState<boolean>(true)
  const [dataLoading, setDataLoading] = useState<boolean>(true)

  // --- Authentication ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser?.isAnonymous) {
        await signOut(auth)
        setUser(null)
      } else {
        setUser(currentUser)
      }
      setAuthLoading(false)
    })
    return () => unsubscribe()
  }, [])

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider()
      await signInWithPopup(auth, provider)
    } catch (err) {
      console.error("Google Sign-In Error:", err)
    }
  }

  // --- Data Fetching ---
  useEffect(() => {
    if (!user) {
      setDataLoading(false)
      return
    }

    setDataLoading(true)
    const recipesRef = collection(db, "artifacts", appId, "users", user.uid, "recipes")

    const unsubscribe = onSnapshot(
      recipesRef,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const fetchedRecipes = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Recipe[]

        // Sort in memory
        fetchedRecipes.sort((a, b) => b.createdAt - a.createdAt)
        setRecipes(fetchedRecipes)
        setDataLoading(false)
      },
      (error) => {
        console.error("Firestore error:", error)
        setDataLoading(false)
      },
    )

    const prefRef = doc(db, "artifacts", appId, "users", user.uid, "preferences", "default")
    const unsubscribePrefs = onSnapshot(prefRef, (docSnap) => {
      if (docSnap.exists()) {
        setPreferences(docSnap.data() as UserPreferences)
      } else {
        setPreferences({})
      }
    })

    const apiStatusRef = doc(db, "artifacts", appId, "global", "apiStatus")
    const unsubscribeApiStatus = onSnapshot(apiStatusRef, (docSnap) => {
      if (docSnap.exists()) {
        setApiStatus(docSnap.data() as ApiStatus)
      } else {
        setApiStatus({ status: "active" })
      }
    })

    return () => {
      unsubscribe()
      unsubscribePrefs()
      unsubscribeApiStatus()
    }
  }, [user])

  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <ChefHat
          size={48}
          className="text-teal-500/80 animate-pulse mb-6 drop-shadow-[0_0_15px_rgba(20,184,166,0.5)]"
        />
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm font-semibold tracking-widest text-teal-400/80 uppercase animate-pulse">
            Meal Ops Engine
          </p>
          <div className="flex gap-1">
            <span
              className="w-2 h-2 rounded-full bg-teal-500/50 animate-bounce"
              style={{ animationDelay: "0ms" }}
            />
            <span
              className="w-2 h-2 rounded-full bg-teal-500/50 animate-bounce"
              style={{ animationDelay: "150ms" }}
            />
            <span
              className="w-2 h-2 rounded-full bg-teal-500/50 animate-bounce"
              style={{ animationDelay: "300ms" }}
            />
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-200">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent mb-6">
            Meal Ops
          </h1>
          <p className="text-slate-400 text-sm mb-8">
            Sign in to sync your generated meals across all your devices.
          </p>
          <button
            onClick={handleGoogleLogin}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-3 transition-colors border border-slate-700 hover:border-slate-600"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign in with Google
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-teal-500/30">
      <Header user={user} />

      <main className="max-w-3xl mx-auto p-4 md:p-6">
        <Routes>
          <Route path="/" element={<Dashboard recipes={recipes} />} />
          <Route
            path="/generate"
            element={
              <Generator
                recipes={recipes}
                userId={user.uid}
                preferences={preferences}
                apiStatus={apiStatus}
              />
            }
          />
          <Route
            path="/preferences"
            element={<Preferences userId={user.uid} preferences={preferences} />}
          />
          <Route
            path="/recipe/:id"
            element={<RecipeDetail recipes={recipes} userId={user.uid} />}
          />
        </Routes>
      </main>
    </div>
  )
}
