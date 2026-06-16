import { useState } from 'react';
import { ChefHat, ShoppingCart, List, Star, Clock, Trash2, Save, RefreshCw } from 'lucide-react';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, appId } from '../lib/firebase';
import { Recipe } from '../types';

interface RecipeDetailProps {
  recipe: Recipe;
  userId: string;
  onBack: () => void;
}

export default function RecipeDetail({ recipe, userId, onBack }: RecipeDetailProps) {
  const [activeTab, setActiveTab] = useState<'shop' | 'cook' | 'review'>('shop');
  const [rating, setRating] = useState<number>(recipe.rating || 0);
  const [feedback, setFeedback] = useState<string>(recipe.feedback || '');
  const [isSavingReview, setIsSavingReview] = useState(false);

  const saveReview = async () => {
    setIsSavingReview(true);
    try {
      await setDoc(doc(db, 'artifacts', appId, 'users', userId, 'recipes', recipe.id), {
        ...recipe,
        rating: Number(rating),
        feedback: feedback
      });
      // Allow visual feedback to persist briefly
      setTimeout(() => setIsSavingReview(false), 500);
    } catch (err) {
      console.error(err);
      setIsSavingReview(false);
    }
  };

  const deleteRecipe = async () => {
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'users', userId, 'recipes', recipe.id));
      onBack();
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
      {/* Header Info */}
      <div className="bg-slate-900 p-5 md:p-6 rounded-2xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <ChefHat size={120} />
        </div>
        <div className="relative z-10">
          <h2 className="text-2xl font-bold text-slate-100 mb-3 leading-tight">{recipe.name}</h2>
          
          <div className="flex flex-wrap gap-2 mb-4">
            {recipe.tags?.map(tag => (
              <span key={tag} className="text-xs font-medium bg-slate-950 text-teal-400 px-2.5 py-1 rounded-full border border-teal-500/20">
                {tag}
              </span>
            ))}
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-slate-400 bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Clock size={16} className="text-teal-500"/> {recipe.prepTime} mins
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-slate-900 border border-slate-800 rounded-xl">
        <button 
          onClick={() => setActiveTab('shop')}
          className={`flex-1 py-2.5 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-all ${activeTab === 'shop' ? 'bg-slate-800 text-teal-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <ShoppingCart size={16} /> Shopping List
        </button>
        <button 
          onClick={() => setActiveTab('cook')}
          className={`flex-1 py-2.5 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-all ${activeTab === 'cook' ? 'bg-slate-800 text-teal-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <List size={16} /> Procedure
        </button>
        <button 
          onClick={() => setActiveTab('review')}
          className={`flex-1 py-2.5 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-all ${activeTab === 'review' ? 'bg-slate-800 text-amber-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <Star size={16} className={activeTab === 'review' ? 'fill-amber-400/20' : ''} /> Review Log
        </button>
      </div>

      {/* Tab Content */}
      <div className="bg-slate-900 p-5 md:p-6 rounded-2xl border border-slate-800 min-h-[300px]">
        {activeTab === 'shop' && (
          <div className="space-y-1">
            <h3 className="font-semibold text-slate-300 mb-4 pb-2 border-b border-slate-800">Scaled for 6 Meals</h3>
            <ul className="space-y-3">
              {recipe.shoppingList?.map((item, idx) => (
                <li key={idx} className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-800/50 border border-transparent hover:border-slate-800 transition-colors group cursor-pointer">
                  <div className="mt-0.5 w-5 h-5 rounded border-2 border-slate-600 group-hover:border-teal-500 flex-shrink-0" />
                  <div>
                    <span className="font-semibold text-teal-400 block sm:inline sm:mr-2">{item.amount}</span>
                    <span className="text-slate-200">{item.item}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {activeTab === 'cook' && (
          <div className="space-y-1">
            <h3 className="font-semibold text-slate-300 mb-4 pb-2 border-b border-slate-800">Batch Prep Sequence</h3>
            <ol className="space-y-4">
              {recipe.procedure?.map((step, idx) => (
                <li key={idx} className="flex gap-4 items-start">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-800 text-teal-500 border border-slate-700 flex items-center justify-center text-sm font-bold mt-0.5">
                    {idx + 1}
                  </div>
                  <p className="text-slate-300 leading-relaxed">{step}</p>
                </li>
              ))}
            </ol>
          </div>
        )}

        {activeTab === 'review' && (
          <div className="space-y-5 animate-in fade-in">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-sm text-amber-200/80 mb-6">
              Data logged here is fed back into the AI engine for future generation sequences. Be explicit about textures and flavors.
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Score (0-10)</label>
              <div className="flex items-center gap-4">
                <input 
                  type="range" 
                  min="0" max="10" step="0.5"
                  value={rating}
                  onChange={(e) => setRating(Number(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
                <span className="font-bold text-amber-400 w-8 text-right text-lg">{rating}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Technical Feedback</label>
              <textarea 
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="e.g., Too dry, needed more acid. Asparagus burned at 12 mins."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-amber-500/50 text-slate-200 placeholder:text-slate-600 min-h-[120px] resize-y"
              />
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-800">
              <button 
                onClick={deleteRecipe}
                className="text-red-400 hover:text-red-300 text-sm flex items-center gap-2 p-2 hover:bg-red-400/10 rounded-lg transition-colors"
              >
                <Trash2 size={16} /> Delete Record
              </button>
              
              <button 
                onClick={saveReview}
                disabled={isSavingReview}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-6 py-2.5 rounded-lg flex items-center gap-2 transition-all disabled:opacity-50 active:scale-95"
              >
                {isSavingReview ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                {isSavingReview ? 'Saving...' : 'Log Data'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
