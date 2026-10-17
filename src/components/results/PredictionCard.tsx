import React from 'react';
import { MultimodalPredictionResult } from '../../types/assessment';
import { AlertCircle, CheckCircle2, ShieldCheck, ArrowUpRight, BarChart2 } from 'lucide-react';
import { formatPercentage } from '../../utils/formatters';

interface PredictionCardProps {
  result: MultimodalPredictionResult;
  onViewReport: () => void;
}

export const PredictionCard: React.FC<PredictionCardProps> = ({
  result,
  onViewReport,
}) => {
  const isDementia = result.prediction === 'Dementia';

  return (
    <div
      className={`p-6 rounded-2xl border-2 shadow-sm space-y-5 transition-all ${
        isDementia
          ? 'bg-rose-50/70 border-rose-300 text-rose-950'
          : 'bg-emerald-50/70 border-[#F29D88] text-emerald-950'
      }`}
    >
      {/* Badge & Mode Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 border-slate-200/60">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-slate-700" />
          <span className="text-sm font-bold uppercase tracking-wider text-slate-700">
            NeuroMind Multimodal Fusion Model
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono">
          {result.predictionThreshold != null && (
            <span className="bg-white/80 border border-slate-300 px-2 py-0.5 rounded-md font-semibold text-slate-700">
              Decision Threshold: {result.predictionThreshold}
            </span>
          )}
        </div>
      </div>

      {/* Main Prediction Display */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
            Multimodal Model Screening Outcome
          </p>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl sm:text-4xl font-heading font-bold tracking-tight">
              {result.prediction}
            </h2>
            {isDementia ? (
              <span className="px-3 py-1 rounded-full bg-rose-600 text-white font-bold text-sm">
                Higher Screening Risk
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-emerald-600 text-white font-bold text-sm">
                Lower Screening Risk
              </span>
            )}
          </div>
          <p className="text-sm text-slate-600 max-w-lg mt-1">
            Generated from the exact speech and cognitive features declared by the configured model manifest. This is a screening aid, not a diagnosis.
          </p>
          <p className="text-sm font-semibold mt-2">
            {isDementia
              ? 'Higher screening risk: arrange an appointment with a qualified doctor for assessment.'
              : 'Lower screening risk: speak with a qualified doctor if memory or thinking concerns remain.'}
          </p>
        </div>

        {/* Probability Metric Pill */}
        <div className="bg-white p-4 rounded-[1.5rem] border border-slate-200 shadow-xs text-center min-w-[150px]">
          <p className="text-[10px] font-semibold text-slate-500 uppercase">Model Class Score</p>
          <p className="text-3xl font-black text-slate-900 mt-1">
            {formatPercentage(result.confidenceScore)}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Dementia class: {formatPercentage(result.dementiaProbability)}. This score is not a diagnosis.
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-2 flex flex-wrap gap-3">
        <button
          onClick={onViewReport}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[1.5rem] bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 font-bold text-sm transition-all shadow-xs"
        >
          <span>View Screening Report</span>
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
