import React from 'react';
import { useAssessment } from '../context/AssessmentContext';
import {
  Mic,
  Brain,
  Activity,
  HeartPulse,
  CheckCircle2,
  Clock3,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';

export const ReviewPage: React.FC = () => {
  const { session, navigateTo } = useAssessment();
  const { status } = session;

  const handleProceedToAnalysis = () => {
    navigateTo('/analyzing');
  };

  const tasks = [
    {
      id: 'speech',
      title: 'Speech',
      detail: 'Audio recorded',
      isCompleted: status.speech,
      route: '/speech',
      icon: Mic,
      iconBg: 'bg-red-50 text-red-600',
      pendingText: 'Audio not recorded yet',
    },
    {
      id: 'memory',
      title: 'Memory',
      detail: 'All tasks completed',
      isCompleted: status.memory,
      route: '/memory',
      icon: Brain,
      iconBg: 'bg-blue-50 text-blue-600',
      pendingText: 'Memory tasks not completed',
    },
    {
      id: 'attention',
      title: 'Attention',
      detail: 'All tasks completed',
      isCompleted: status.attention,
      route: '/attention',
      icon: Activity,
      iconBg: 'bg-amber-50 text-amber-600',
      pendingText: 'Attention tasks not completed',
    },
    {
      id: 'lifestyle',
      title: 'Lifestyle',
      detail: 'Questionnaire completed',
      isCompleted: status.lifestyle,
      route: '/lifestyle',
      icon: HeartPulse,
      iconBg: 'bg-purple-50 text-purple-600',
      pendingText: 'Lifestyle questionnaire not completed',
    },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Screen 8 Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-heading font-bold text-[#4A2333] tracking-tight">
          Review Assessment
        </h1>
        <p className="text-xs text-slate-500">
          Review your responses before proceeding.
        </p>
      </div>

      {/* Screen 8 Status Cards */}
      <div className="space-y-3">
        {tasks.map((task) => {
          const Icon = task.icon;
          const isCompleted = task.isCompleted;

          return (
            <button
              key={task.id}
              type="button"
              onClick={() => navigateTo(task.route)}
              className="w-full p-5 bg-white rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-4 text-left transition-all hover:border-slate-300 hover:bg-slate-50 cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl ${task.iconBg} flex items-center justify-center shrink-0`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{task.title}</h3>
                  <p className="text-xs text-slate-500">{isCompleted ? task.detail : task.pendingText}</p>
                </div>
              </div>

              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold ${
                  isCompleted
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}
              >
                <span>{isCompleted ? 'Completed' : 'Pending'}</span>
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Clock3 className="w-4 h-4 text-amber-600" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Screen 8 Bottom Navigation Bar */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200/80">
        <button
          onClick={() => navigateTo('/lifestyle')}
          className="px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-all flex items-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <button
          onClick={handleProceedToAnalysis}
          className="px-6 py-2.5 rounded-xl bg-[#4A2333] hover:bg-[#5D2E42] text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer"
        >
          <span>Proceed to Analysis</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
