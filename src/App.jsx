import React, { useState, useEffect } from 'react';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot } from 'firebase/firestore';
import { auth, db, appId } from './lib/firebase';

import Header from './components/Header';
import Dashboard from './components/Dashboard';
import Generator from './components/Generator';
import RecipeDetail from './components/RecipeDetail';

export default function App() {
  const [user, setUser] = useState(null);
  const [recipes, setRecipes] = useState([]);
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard', 'generate', 'detail'
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- Authentication ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.error("Auth error:", err);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- Data Fetching ---
  useEffect(() => {
    if (!user) return;

    const recipesRef = collection(db, 'artifacts', appId, 'users', user.uid, 'recipes');
    
    const unsubscribe = onSnapshot(
      recipesRef, 
      (snapshot) => {
        const fetchedRecipes = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        // Sort in memory (Rule 2: No complex queries)
        fetchedRecipes.sort((a, b) => b.createdAt - a.createdAt);
        setRecipes(fetchedRecipes);
      },
      (error) => console.error("Firestore error:", error)
    );

    return () => unsubscribe();
  }, [user]);

  if (loading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Initializing Database...</div>;
  }

  if (!user) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Authentication Failed.</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-teal-500/30">
      <Header currentView={currentView} setCurrentView={setCurrentView} />
      
      <main className="max-w-3xl mx-auto p-4 md:p-6">
        {currentView === 'dashboard' && (
          <Dashboard 
            recipes={recipes} 
            onSelect={(r) => { setSelectedRecipe(r); setCurrentView('detail'); }} 
            onNew={() => setCurrentView('generate')} 
          />
        )}
        {currentView === 'generate' && (
          <Generator 
            recipes={recipes} 
            onSave={(r) => { setSelectedRecipe(r); setCurrentView('detail'); }}
            onCancel={() => setCurrentView('dashboard')}
            userId={user.uid}
          />
        )}
        {currentView === 'detail' && selectedRecipe && (
          <RecipeDetail 
            recipe={selectedRecipe} 
            userId={user.uid}
            onBack={() => { setSelectedRecipe(null); setCurrentView('dashboard'); }}
          />
        )}
      </main>
    </div>
  );
}
