import React from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';

interface DisclaimerProps {
  compact?: boolean;
}

export const Disclaimer: React.FC<DisclaimerProps> = ({ compact = false }) => {
  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 dark:bg-slate-900 p-2.5 rounded-md border border-slate-200 dark:border-slate-800">
        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
        <span>
          <strong>Research Disclaimer:</strong> NeuroMind is a research-oriented screening system.
          Outputs are model-based screening indicators, not a clinical medical diagnosis.
        </span>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 text-amber-900 shadow-xs">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-amber-100 text-amber-700 shrink-0">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-amber-900 flex items-center gap-2">
            Clinical Research & Medical Disclaimer
          </h4>
          <p className="mt-1 text-xs text-amber-800 leading-relaxed">
            NeuroMind is a research-oriented multimodal screening and assessment platform. Its output is
            a machine learning model-based screening result and is <strong>NOT a medical diagnosis</strong>.
            This software is designed to complement, not replace, formal neurological evaluations by certified healthcare professionals.
          </p>
        </div>
      </div>
    </div>
  );
};
