import { useState, useMemo } from 'react';
import { ChefHat, Search, Plus, Star, Clock } from 'lucide-react';
import { Recipe } from '../types';

interface DashboardProps {
  recipes: Recipe[];
  onSelect: (recipe: Recipe) => void;
  onNew: () => void;
}

export default function Dashboard({ recipes, onSelect, onNew }: DashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRecipes = useMemo(() => {
    return recipes.filter(r => 
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.tags?.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [recipes, searchTerm]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search directory..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 transition-all text-slate-200 placeholder:text-slate-500"
          />
        </div>
        <button 
          onClick={onNew}
          className="bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-lg shadow-teal-500/20 active:scale-95"
        >
          <Plus size={18} /> Generate New Week
        </button>
      </div>

      {recipes.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/50 border border-slate-800/50 rounded-xl border-dashed">
          <ChefHat size={48} className="mx-auto text-slate-700 mb-4" />
          <h3 className="text-lg font-medium text-slate-300 mb-2">No recipes yet</h3>
          <p className="text-slate-500 max-w-sm mx-auto mb-6">Initialize your directory by generating your first week of high-efficiency meals.</p>
          <button onClick={onNew} className="text-teal-400 font-medium hover:text-teal-300">Start Generator &rarr;</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRecipes.map(recipe => (
            <div 
              key={recipe.id} 
              onClick={() => onSelect(recipe)}
              className="bg-slate-900 border border-slate-800 p-5 rounded-xl cursor-pointer hover:border-teal-500/30 hover:bg-slate-800/50 transition-all group flex flex-col h-full"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-slate-100 group-hover:text-teal-300 transition-colors leading-tight">
                  {recipe.name}
                </h3>
                {recipe.rating && recipe.rating > 0 && (
                  <div className="flex items-center gap-1 bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded text-xs font-bold border border-amber-500/20 shrink-0">
                    <Star size={12} className="fill-amber-400" /> {recipe.rating}
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-400 mb-4 line-clamp-2 leading-relaxed">
                {recipe.description}
              </p>
              <div className="flex flex-wrap gap-2 mb-4 mt-auto">
                {recipe.tags?.slice(0, 3).map(tag => (
                  <span key={tag} className="text-xs bg-slate-950 text-slate-400 px-2 py-1 rounded-md border border-slate-800">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-800/50 pt-3 mt-auto">
                <span className="flex items-center gap-1"><Clock size={14}/> {recipe.prepTime} min prep</span>
                <span>{new Date(recipe.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric'})}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
