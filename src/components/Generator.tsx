import { useState } from 'react';
import { RefreshCw, ChefHat, Clock, ArrowLeft } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db, appId, geminiApiKey } from '../lib/firebase';
import { Recipe } from '../types';
import { useNavigate } from 'react-router-dom';

interface GeneratorProps {
  recipes: Recipe[];
  userId: string;
}

export default function Generator({ recipes, userId }: GeneratorProps) {
  const [bulkIngredient, setBulkIngredient] = useState('');
  const [cravings, setCravings] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Array of 3 AI-generated options
  const [generatedOptions, setGeneratedOptions] = useState<Partial<Recipe>[] | null>(null);

  const generateOptions = async () => {
    setIsGenerating(true);
    setError(null);
    setGeneratedOptions(null);

    // Filter past recipes to provide context
    const highRated = recipes.filter(r => (r.rating || 0) >= 8).map(r => r.name).slice(0, 3);
    const lowRated = recipes.filter(r => (r.rating || 10) < 5).map(r => `${r.name} (Feedback: ${r.feedback || 'None'})`).slice(0, 3);
    const recentMeals = recipes.slice(0, 5).map(r => r.name);

    const systemPrompt = `You are a highly creative Culinary Engine. 
Generate exactly 3 EXTREMELY DISTINCT, wildly different low-prep (under 20 mins) workweek meal recipes scaled for exactly 6 portions.

CRITICAL RULES & VARIANCE:
1. All 3 options MUST use completely different primary proteins (e.g. if one is beef, the others cannot be beef). Strongly consider a vegetarian dish as one of the three primary options.
2. All 3 options MUST draw from entirely different global cuisines.
3. All 3 options MUST use different preparation styles.
4. Do NOT rely on cliches like "gochujang", "harissa", or "za'atar". Branch out into diverse and unique flavor profiles.
5. All ingredients MUST be common enough that a standard full-size US grocery store will consistently stock them. No exotic specialty items.
6. The core focus is on easy-to-make meals that are healthy, filling, and exceptionally tasty.

USER CONTEXT & HISTORY:
- Highly rated past meals: ${highRated.join(', ') || 'None yet. Be highly creative.'}
- Low rated past meals (AVOID THESE): ${lowRated.join(' | ') || 'None yet.'}
- Specific User Request / Cravings: ${cravings || 'Surprise me with completely unique, healthy, and tasty recipes.'}
- Bulk Ingredient to utilize: ${bulkIngredient || 'None.'}

DO NOT GENERATE ANYTHING SIMILAR TO THESE RECENT MEALS:
${recentMeals.join('\n') || 'None.'}

OUTPUT FORMAT:
Respond ONLY with a valid JSON object. Do not wrap it in markdown block quotes. Do not add trailing text or trailing commas. Match this schema exactly:
{
  "options": [
    {
      "name": "Creative but descriptive name",
      "description": "A mouthwatering 1-2 sentence description explaining the dish, its texture, and flavor profile.",
      "prepTime": 15,
      "tags": ["high-protein", "one-pan", "spicy"],
      "shoppingList": [
        { "item": "Ground Turkey (93% lean)", "amount": "3 lbs" },
        { "item": "Slaw Mix", "amount": "3 bags" }
      ],
      "procedure": [
        "Step 1: clear and concise",
        "Step 2: clear and concise"
      ]
    }
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
              contents: [{ parts: [{ text: 'Generate 3 distinct meal configuration options as JSON.' }] }],
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

      // Clean up markdown blockquotes and any trailing garbage characters
      let cleanText = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
      let startIndex = cleanText.indexOf('{');
      if (startIndex === -1) throw new Error("Could not find JSON object bounds in response.");
      
      let jsonStr = cleanText.substring(startIndex);
      
      let parsedData;
      let isValid = false;
      
      while (jsonStr.length > 20) {
        try {
          parsedData = JSON.parse(jsonStr);
          isValid = true;
          break;
        } catch (err) {
          const lastBrace = jsonStr.lastIndexOf('}');
          if (lastBrace === -1) break;
          jsonStr = jsonStr.substring(0, lastBrace).trim();
        }
      }
      
      if (!isValid || !parsedData) {
        throw new Error("AI returned malformed JSON that could not be repaired.");
      }
      
      if (!parsedData.options || !Array.isArray(parsedData.options) || parsedData.options.length === 0) {
        throw new Error("AI returned invalid JSON schema.");
      }

      setGeneratedOptions(parsedData.options);

    } catch (err) {
      console.error(err);
      setError("Engine failed to generate recipes. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const selectRecipe = async (option: Partial<Recipe>) => {
    try {
      const docId = `recipe-${Date.now()}`;
      const newRecipe: Recipe = {
        name: option.name || "Untitled Meal",
        description: option.description || "No description provided.",
        prepTime: option.prepTime || 15,
        tags: option.tags || [],
        shoppingList: option.shoppingList || [],
        procedure: option.procedure || [],
        id: docId,
        createdAt: Date.now(),
        rating: 0,
        feedback: ''
      };

      await setDoc(doc(db, 'artifacts', appId, 'users', userId, 'recipes', docId), newRecipe);
      navigate(`/recipe/${docId}`);
    } catch (err) {
      console.error("Error saving selected recipe:", err);
      setError("Failed to save selected recipe.");
    }
  };

  // If we have options, show the Selection UI
  if (generatedOptions && generatedOptions.length > 0) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <ChefHat className="text-teal-400" /> Choose Your Matrix
          </h2>
          <button
            onClick={() => setGeneratedOptions(null)}
            className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium"
          >
            <ArrowLeft size={16} /> Discard & Start Over
          </button>
        </div>

        <p className="text-slate-400 text-sm">Select one of these distinct configurations for your current workweek.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {generatedOptions.map((opt, idx) => (
            <div key={idx} className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between hover:border-teal-500/30 transition-colors">
              <div>
                <h3 className="font-bold text-slate-100 mb-2 text-lg leading-tight">{opt.name}</h3>
                <p className="text-sm text-slate-400 mb-3 line-clamp-3">{opt.description}</p>
                <div className="flex items-center gap-1.5 text-sm text-slate-300 mb-4 font-medium">
                  <Clock size={16} className="text-teal-500" /> {opt.prepTime} mins
                </div>
                <div className="flex flex-wrap gap-2 mb-6">
                  {opt.tags?.slice(0, 4).map(tag => (
                    <span key={tag} className="text-xs bg-slate-950 text-slate-400 px-2 py-1 rounded-md border border-slate-800">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => selectRecipe(opt)}
                className="w-full bg-slate-800 hover:bg-teal-500 hover:text-slate-950 text-teal-400 font-semibold py-2.5 rounded-lg transition-all border border-slate-700 hover:border-teal-400"
              >
                Select This Meal
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Input UI
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
            onClick={() => navigate('/')}
            disabled={isGenerating}
            className="px-4 py-2.5 rounded-lg text-slate-400 font-medium hover:bg-slate-800 hover:text-slate-200 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={generateOptions}
            disabled={isGenerating}
            className="flex-1 bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-teal-500/20"
          >
            {isGenerating ? (
              <><RefreshCw size={18} className="animate-spin" /> Processing Matrix...</>
            ) : (
              <><ChefHat size={18} /> Generate 3 Options</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
