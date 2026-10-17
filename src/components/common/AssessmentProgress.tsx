import React from 'react';
import { useAssessment } from '../../context/AssessmentContext';
import { Check, Mic, Brain, Activity, HeartPulse, FileText, Cpu, Award } from 'lucide-react';

interface StepItem {
  id: string;
  route: string;
  label: string;
  icon: React.ElementType;
  sectionKey?: 'speech' | 'memory' | 'attention' | 'lifestyle';
}

const STEPS: StepItem[] = [
  { id: 'speech', route: '/speech', label: 'Speech', icon: Mic, sectionKey: 'speech' },
  { id: 'memory', route: '/memory', label: 'Memory', icon: Brain, sectionKey: 'memory' },
  { id: 'attention', route: '/attention', label: 'Attention', icon: Activity, sectionKey: 'attention' },
  { id: 'lifestyle', route: '/lifestyle', label: 'Lifestyle', icon: HeartPulse, sectionKey: 'lifestyle' },
  { id: 'review', route: '/review', label: 'Review', icon: FileText },
  { id: 'analyzing', route: '/analyzing', label: 'Analysis', icon: Cpu },
  { id: 'results', route: '/results', label: 'Results', icon: Award },
];

export const AssessmentProgress: React.FC = () => {
  const { session, currentRoute, navigateTo } = useAssessment();
  const { status } = session;

  return (
    <div className="w-full bg-white border-b border-slate-200 shadow-xs px-4 py-3 sticky top-16 z-20">
      <div className="max-w-7xl mx-auto flex items-center justify-between overflow-x-auto no-scrollbar gap-2">
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isCurrent = currentRoute === step.route;
          const isCompleted = step.sectionKey ? status[step.sectionKey] : false;

          // Enable clicking if step is review/results or if previous sections are progressing
          const canClick =
            step.route === '/' ||
            step.route === '/assessment' ||
            step.sectionKey !== undefined ||
            (step.route === '/review' && (status.speech || status.memory)) ||
            (step.route === '/results' && session.predictionResult !== undefined);

          return (
            <React.Fragment key={step.id}>
              {idx > 0 && <div className="h-0.5 w-4 sm:w-8 bg-slate-200 shrink-0 hidden sm:block" />}
              <button
                onClick={() => canClick && navigateTo(step.route)}
                disabled={!canClick}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                  isCurrent
                    ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/30 font-bold'
                    : isCompleted
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                    : canClick
                    ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                    : 'bg-slate-50 text-slate-400 border border-slate-100 cursor-not-allowed opacity-60'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                    isCompleted
                      ? 'bg-emerald-600 text-white'
                      : isCurrent
                      ? 'bg-white text-blue-600 font-bold'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {isCompleted ? <Check className="w-3 h-3 stroke-[3]" /> : <Icon className="w-3 h-3" />}
                </div>
                <span>{step.label}</span>
              </button>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
