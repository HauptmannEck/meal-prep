import React, { useState } from 'react';
import { RefreshCw, ChefHat } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db, appId, geminiApiKey } from '../lib/firebase';

export default function Generator({ recipes, onSave, onCancel, userId }) {
  const [bulkIngredient, setBulkIngredient] = useState('');
  const [cravings, setCravings] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);

  const generateRecipe = async () => {
    setIsGenerating(true);
    setError(null);

    // Filter past recipes to provide context
    const highRated = recipes.filter(r => r.rating >= 8).map(r => r.name).slice(0, 3);
    const lowRated = recipes.filter(r => r.rating < 5).map(r => `${r.name} (Feedback: ${r.feedback})`).slice(0, 3);

    const systemPrompt = `You are a highly technical Culinary Optimization Engine. 
Generate exactly ONE high-flavor, low-prep (under 20 mins, handful of ingredients) workweek meal recipe scaled for exactly 6 portions (for a single adult male).

USER CONTEXT:
- Loves bold flavors (gochujang, za'atar, harissa).
- Prefers high-efficiency, one-pan/skillet/sheet-pan mechanics.
- Highly rated past mechanics: ${highRated.join(', ') || 'None yet.'}
- Avoid or fix issues from past low ratings: ${lowRated.join(' | ') || 'None yet.'}
- Specific User Request: ${cravings || 'Standard high-protein rotation.'}
- Bulk Ingredient to utilize: ${bulkIngredient || 'None.'}

CRITICAL: The user frequently visits MSP breweries (Wooden Ship, Inbound, etc.). Suggest a specific craft beer style pairing (preferably wheat beers or modern craft profiles) that matches this meal perfectly.

OUTPUT FORMAT:
Respond ONLY with a valid JSON object matching this schema perfectly:
{
  "name": "Creative but descriptive name",
  "prepTime": 15,
  "tags": ["high-protein", "one-pan", "spicy", "tag4"],
  "beerPairing": "Brief description of a beer style pairing and why",
  "shoppingList": [
    { "item": "Ground Turkey (93% lean)", "amount": "3 lbs" },
    { "item": "Slaw Mix", "amount": "3 bags" }
  ],
  "procedure": [
    "Step 1: clear and concise",
    "Step 2: clear and concise"
  ]
}`;

    try {
      let resultText = '';
      let retries = 5;
      let delay = 1000;

      while (retries > 0) {
        try {
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${geminiApiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: 'Generate meal configuration JSON.' }] }],
              systemInstruction: { parts: [{ text: systemPrompt }] },
              generationConfig: { responseMimeType: "application/json" }
            })
          });

          if (!response.ok) throw new Error(`API Error: ${response.status}`);
          const data = await response.json();
          resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          break; // Success
        } catch (err) {
          retries--;
          if (retries === 0) throw err;
          await new Promise(res => setTimeout(res, delay));
          delay *= 2;
        }
      }

      if (!resultText) throw new Error("Failed to extract JSON from AI response.");
      
      const newRecipeData = JSON.parse(resultText);
      
      // Save to Firestore
      const newRecipe = {
        ...newRecipeData,
        createdAt: Date.now(),
        rating: 0,
        feedback: ''
      };

      const docId = `recipe-${Date.now()}`;
      await setDoc(doc(db, 'artifacts', appId, 'users', userId, 'recipes', docId), newRecipe);
      
      onSave({ id: docId, ...newRecipe });

    } catch (err) {
      console.error(err);
      setError("Engine failed to generate recipe. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-xl animate-in fade-in slide-in-from-bottom-4">
      <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-100">
        <RefreshCw size={20} className="text-teal-400" /> Meal Generator Engine
      </h2>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1.5">Bulk Ingredient Override (Optional)</label>
          <input 
            type="text" 
            placeholder="e.g., 5 lbs of carrots, leftover quinoa" 
            value={bulkIngredient}
            onChange={(e) => setBulkIngredient(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-teal-500/50 text-slate-200 placeholder:text-slate-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1.5">Specific Cravings / Mechanics</label>
          <input 
            type="text" 
            placeholder="e.g., Sheet pan only, heavy spice, fish" 
            value={cravings}
            onChange={(e) => setCravings(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-teal-500/50 text-slate-200 placeholder:text-slate-600"
          />
        </div>

        {error && <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20">{error}</div>}

        <div className="flex gap-3 pt-4">
          <button 
            onClick={onCancel}
            disabled={isGenerating}
            className="px-4 py-2.5 rounded-lg text-slate-400 font-medium hover:bg-slate-800 hover:text-slate-200 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button 
            onClick={generateRecipe}
            disabled={isGenerating}
            className="flex-1 bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-teal-500/20"
          >
            {isGenerating ? (
              <><RefreshCw size={18} className="animate-spin" /> Processing Matrix...</>
            ) : (
              <><ChefHat size={18} /> Execute Generation</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
