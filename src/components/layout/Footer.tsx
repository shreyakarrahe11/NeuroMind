import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { useAssessment } from '../../context/AssessmentContext';
import logoImage from '../../assets/logo.png';
import footerBgImage from '../../assets/service1-1.png';

export const Footer: React.FC = () => {
  const { navigateTo } = useAssessment();

  return (
    <footer 
      className="bg-[#0F0E47] text-slate-300 text-xs border-t border-[#272757] mt-16 relative bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${footerBgImage})` }}
    >
      {/* Dark overlay to keep the content readable */}
      <div className="absolute inset-0 bg-[#0F0E47]/50 pointer-events-none" />
      
      <div className="relative z-10">
        <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <div className="w-7 h-7 flex items-center justify-center">
                <img src={logoImage} alt="NeuroMind Logo" className="w-full h-full object-contain" />
              </div>
              <span>NeuroMind — AI-Powered Early Dementia Detection System</span>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              AI-powered multimodal early dementia detection platform integrating Wav2Vec2 acoustic speech features, episodic memory, attention metrics, and lifestyle risk factors.
            </p>
          </div>

          <div>
            <h4 className="text-amber-400 font-bold text-xs mb-2.5 uppercase tracking-wider">Quick Navigation</h4>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-slate-300">
              <button onClick={() => navigateTo('/')} className="hover:text-amber-300 transition-colors cursor-pointer">
                Dashboard
              </button>
              <button onClick={() => navigateTo('/assessment')} className="hover:text-amber-300 transition-colors cursor-pointer">
                Assessment Battery
              </button>
              <button onClick={() => navigateTo('/results')} className="hover:text-amber-300 transition-colors cursor-pointer">
                Screening Results
              </button>
            </div>
          </div>

          <div>
            <div className="p-3 bg-[#272757] rounded-xl border border-[#505081]/60 space-y-1.5">
              <div className="flex items-center gap-1.5 text-amber-300 font-bold text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Research & Screening Notice</span>
              </div>
              <p className="text-[10px] text-slate-300 leading-relaxed">
                NeuroMind is a clinical decision-support screening tool. Outputs provide screening risk estimates and do NOT constitute a definitive medical diagnosis.
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-[#272757] py-3 px-6 text-center text-[11px] text-slate-400">
          <p>© 2026 NeuroMind Health Systems. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};
