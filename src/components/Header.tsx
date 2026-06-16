import { ChefHat, ArrowLeft } from 'lucide-react';
import { ViewState } from '../types';

interface HeaderProps {
  currentView: ViewState;
  setCurrentView: (view: ViewState) => void;
}

export default function Header({ currentView, setCurrentView }: HeaderProps) {
  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-10 shadow-sm">
      <div className="max-w-3xl mx-auto p-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-teal-500/10 p-2 rounded-lg text-teal-400">
            <ChefHat size={24} />
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent tracking-tight">
            Meal Ops
          </h1>
        </div>
        {currentView !== 'dashboard' && (
          <button 
            onClick={() => setCurrentView('dashboard')}
            className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 text-sm font-medium bg-slate-800/50 px-3 py-1.5 rounded-md"
          >
            <ArrowLeft size={16} /> Directory
          </button>
        )}
      </div>
    </header>
  );
}
