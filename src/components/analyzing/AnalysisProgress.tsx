import React, { useEffect, useRef, useState } from 'react';
import { useAssessment } from '../../context/AssessmentContext';
import { Cpu, CheckCircle2, Loader2, Sparkles } from 'lucide-react';

interface ProcessingStage {
  id: string;
  label: string;
  completedLabel: string;
}

const STAGES: ProcessingStage[] = [
  { id: 'input', label: 'Validating the assessment feature contract...', completedLabel: 'Assessment feature contract validated' },
  { id: 'speech', label: 'Running the configured speech encoder...', completedLabel: 'Speech features prepared' },
  { id: 'fusion', label: 'Running the versioned multimodal model...', completedLabel: 'Multimodal probabilities calculated' },
  { id: 'explanation', label: 'Calculating feature attribution...', completedLabel: 'Feature attribution calculated' },
  { id: 'report', label: 'Retrieving evidence and generating the report...', completedLabel: 'Evidence-grounded report generated' },
];

export const AnalysisProgress: React.FC = () => {
  const { executePrediction, navigateTo } = useAssessment();
  const [activeStageIndex, setActiveStageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    executePrediction()
      .then(() => {
        setActiveStageIndex(STAGES.length);
        window.setTimeout(() => navigateTo('/results'), 400);
      })
      .catch((reason: unknown) => {
        const message = reason instanceof Error ? reason.message : 'Analysis failed.';
        setError(message);
      });
  }, [executePrediction, navigateTo]);

  useEffect(() => {
    if (error || activeStageIndex >= STAGES.length - 1) return;
    const timer = window.setTimeout(() => setActiveStageIndex((value) => value + 1), 1300);
    return () => window.clearTimeout(timer);
  }, [activeStageIndex, error]);

  return (
    <div className="max-w-2xl mx-auto py-12 px-4 space-y-8">
      <div className="text-center space-y-3">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-slate-900 to-cyan-900 text-cyan-400 flex items-center justify-center mx-auto shadow-xl shadow-cyan-900/20">
          <Cpu className="w-8 h-8 animate-pulse" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Multimodal Neural Feature Extraction</h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Running the exact modality inputs and class contract declared by the installed model manifest.
        </p>
      </div>

      <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-4">
        {STAGES.map((stage, idx) => {
          const isDone = idx < activeStageIndex;
          const isCurrent = idx === activeStageIndex;

          return (
            <div
              key={stage.id}
              className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all ${
                isDone
                  ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                  : isCurrent
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/10'
                  : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
              }`}
            >
              <div className="shrink-0">
                {isDone ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : isCurrent ? (
                  <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-slate-300" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold">
                  {isDone ? stage.completedLabel : stage.label}
                </p>
              </div>
              {isCurrent && (
                <span className="text-[10px] font-mono font-medium bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-full shrink-0">
                  Processing
                </span>
              )}
            </div>
          );
        })}
      </div>

      {error ? (
        <div className="space-y-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-center text-xs text-rose-800">
          <p className="font-bold">Analysis could not be completed</p>
          <p>{error}</p>
          <button onClick={() => navigateTo('/assessment')} className="rounded-lg bg-rose-700 px-4 py-2 font-bold text-white">
            Return to assessment
          </button>
        </div>
      ) : <div className="p-3.5 bg-slate-100 rounded-xl border border-slate-200 text-center text-xs text-slate-600 flex items-center justify-center gap-2">
        <Sparkles className="w-4 h-4 text-cyan-600" />
        <span>NeuroMind records the model version, checksum, inputs, outputs, and evidence trail.</span>
      </div>}
    </div>
  );
};
