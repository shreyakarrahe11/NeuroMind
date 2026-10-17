import React, { useState } from 'react';
import { useAssessment } from '../../context/AssessmentContext';
import { Play, RotateCcw, LogIn, LogOut, ChevronDown, ShieldCheck } from 'lucide-react';
import logoImage from '../../assets/logo.png';

export const Navbar: React.FC = () => {
  const { currentRoute, navigateTo, resetAssessment, user, logout } = useAssessment();
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="bg-[#0F0E47] text-white border-b border-[#272757] sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo and Brand */}
        <div 
          className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition-opacity" 
          onClick={() => navigateTo('/')}
        >
          <div className="w-9 h-9 flex items-center justify-center">
            <img src={logoImage} alt="NeuroMind Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight text-white block leading-none">NeuroMind</span>
            <span className="text-[10px] text-amber-400 font-medium tracking-wide">AI Early Dementia Detection System</span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 text-xs font-semibold">
          <button
            onClick={() => navigateTo('/')}
            className={`px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
              currentRoute === '/'
                ? 'bg-[#272757] text-amber-400 font-bold'
                : 'text-slate-300 hover:text-white hover:bg-[#272757]/50'
            }`}
          >
            Dashboard
          </button>

          <button
            onClick={() => navigateTo('/assessment')}
            className={`px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
              currentRoute === '/assessment' ||
              currentRoute === '/speech' ||
              currentRoute === '/memory' ||
              currentRoute === '/attention' ||
              currentRoute === '/lifestyle' ||
              currentRoute === '/review'
                ? 'bg-[#272757] text-amber-400 font-bold'
                : 'text-slate-300 hover:text-white hover:bg-[#272757]/50'
            }`}
          >
            Complete Assessment
          </button>

          <button
            onClick={() => navigateTo('/results')}
            className={`px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
              currentRoute === '/results'
                ? 'bg-[#272757] text-amber-400 font-bold'
                : 'text-slate-300 hover:text-white hover:bg-[#272757]/50'
            }`}
          >
            Results
          </button>
        </nav>

        {/* Action Controls & User Profile */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigateTo('/assessment')}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-[#0F0E47] font-bold text-xs shadow-xs transition-all cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span className="hidden sm:inline">Complete Assessment</span>
          </button>

          {/* User Account Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 py-1.5 px-2.5 rounded-lg bg-[#272757] hover:bg-[#34346e] text-white border border-[#505081]/40 text-xs transition-colors cursor-pointer"
            >
              <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center font-bold text-[10px]">
                {user.name ? user.name[0] : 'U'}
              </div>
              <span className="hidden sm:inline font-medium max-w-[100px] truncate">
                {user.name || 'Account'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-64 p-3 rounded-xl bg-[#0F0E47] text-white border border-[#505081]/60 shadow-xl z-50 space-y-2">
                <div className="p-2.5 rounded-lg bg-[#272757] space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-400 text-[11px] font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{user.role}</span>
                  </div>
                  <p className="text-xs font-bold text-white">{user.name}</p>
                  <p className="text-[11px] text-slate-300 truncate">{user.email}</p>
                </div>

                <div className="pt-1 space-y-1">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      navigateTo('/login');
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#272757] text-slate-200 text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5 text-amber-400" />
                    <span>Sign In / Switch Portal</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      logout();
                      navigateTo('/login');
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-red-500/20 text-red-300 text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5 text-red-400" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={resetAssessment}
            title="Reset Session Data"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#272757] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
