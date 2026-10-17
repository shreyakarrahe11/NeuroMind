import React from 'react';
import { useAssessment } from '../context/AssessmentContext';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { SafeSignUp } from '../components/auth/ClerkBridge';
import logoImage from '../assets/logo.png';

export const RegisterPage: React.FC = () => {
  const { navigateTo } = useAssessment();

  return (
    <div className="min-h-screen bg-[#F7F3F2] flex flex-col items-center justify-center py-12 px-4 selection:bg-[#F29D88] selection:text-white">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 sm:p-9 border border-slate-200 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <button
            onClick={() => navigateTo('/')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors mb-2 cursor-pointer"
          >
            <ArrowRight className="w-3.5 h-3.5 rotate-180" />
            <span>Back to Home</span>
          </button>
          <div className="w-14 h-14 mx-auto mb-2">
            <img src={logoImage} alt="NeuroMind" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-heading font-black text-[#4A2333] tracking-tight">
            Patient Portal Registration
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Create your confidential patient account to access personalized cognitive assessments, tracking, and clinical reports.
          </p>
        </div>

        <div className="flex flex-col items-center">
          <SafeSignUp />
        </div>

        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Already have an account?{' '}
            <button
              onClick={() => navigateTo('/login')}
              className="font-bold text-[#4A2333] hover:underline cursor-pointer"
            >
              Sign In
            </button>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Encrypted authenticated access</span>
          </div>
        </div>
      </div>
    </div>
  );
};
