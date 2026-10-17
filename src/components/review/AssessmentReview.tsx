import React from 'react';
import { useAssessment } from '../../context/AssessmentContext';
import { Mic, Brain, Activity, HeartPulse, CheckCircle2, Clock, Edit3, Cpu, AlertTriangle } from 'lucide-react';

export const AssessmentReview: React.FC = () => {
  const { session, navigateTo } = useAssessment();
  const { status, speech, memory, attention, lifestyle } = session;

  const allCompleted = status.speech && status.memory && status.attention && status.lifestyle;

  return (
    <div className="space-y-8">
      <div className="p-8 bg-[#FDF8F5] rounded-[2rem] space-y-3">
        <h2 className="text-2xl font-bold text-[#4A2333]">Assessment Review & Readiness Check</h2>
        <p className="text-base text-slate-500 leading-relaxed">
          Verify captured data across all 4 assessment modalities before initiating multimodal feature fusion and model prediction inference.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Speech Card */}
        <div className="p-8 bg-white rounded-[2rem] shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
                <Mic className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-slate-900">Speech Assessment</h4>
            </div>
            {status.speech ? (
              <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
                <CheckCircle2 className="w-4 h-4" /> Completed
              </span>
            ) : (
              <span className="text-sm font-semibold text-slate-500 bg-slate-50 px-3 py-1 rounded-full">
                Pending
              </span>
            )}
          </div>

          <div className="text-sm text-slate-600 space-y-2">
            <p>Prompt: <strong className="font-semibold text-slate-800">{speech.promptId}</strong></p>
            <p>Audio Duration: <strong className="font-semibold text-slate-800">{speech.durationSeconds || 0} seconds</strong></p>
            <p className="text-xs text-slate-400 uppercase tracking-widest mt-1">Target ML Feature: Wav2Vec2</p>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              onClick={() => navigateTo('/speech')}
              className="inline-flex items-center gap-2 text-sm font-bold text-slate-700 hover:text-slate-900 bg-slate-50 px-4 py-2 rounded-xl transition-colors"
            >
              <Edit3 className="w-4 h-4" /> Edit Speech
            </button>
          </div>
        </div>

        {/* Memory Card */}
        <div className="p-8 bg-white rounded-[2rem] shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Brain className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-slate-900">Memory Assessment</h4>
            </div>
            {status.memory ? (
              <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
                <CheckCircle2 className="w-4 h-4" /> Completed
              </span>
            ) : (
              <span className="text-sm font-semibold text-slate-500 bg-slate-50 px-3 py-1 rounded-full">
                Pending
              </span>
            )}
          </div>

          <div className="text-sm text-slate-600 space-y-2">
            <p>Immediate Recall: <strong className="font-semibold text-slate-800">{memory.rawMetrics.immediateRecallCount} items</strong></p>
            <p>Delayed Recall: <strong className="font-semibold text-slate-800">{memory.rawMetrics.delayedRecallCount} items</strong></p>
            <p>Recognition Hits: <strong className="font-semibold text-slate-800">{memory.rawMetrics.recognitionTruePositives} selected</strong></p>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              onClick={() => navigateTo('/memory')}
              className="inline-flex items-center gap-2 text-sm font-bold text-slate-700 hover:text-slate-900 bg-slate-50 px-4 py-2 rounded-xl transition-colors"
            >
              <Edit3 className="w-4 h-4" /> Edit Memory
            </button>
          </div>
        </div>

        {/* Attention Card */}
        <div className="p-8 bg-white rounded-[2rem] shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Activity className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-slate-900">Attention Assessment</h4>
            </div>
            {status.attention ? (
              <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
                <CheckCircle2 className="w-4 h-4" /> Completed
              </span>
            ) : (
              <span className="text-sm font-semibold text-slate-500 bg-slate-50 px-3 py-1 rounded-full">
                Pending
              </span>
            )}
          </div>

          <div className="text-sm text-slate-600 space-y-2">
            <p>Max Digit Span: <strong className="font-semibold text-slate-800">{attention.digitSpanMaxScore || 'N/A'} digits</strong></p>
            <p>Median Reaction Time: <strong className="font-semibold text-slate-800">{attention.reactionTimeMedianMs || 'N/A'} ms</strong></p>
            <p>Sustained Hits: <strong className="font-semibold text-slate-800">{attention.sustainedAttention.hits} hits</strong></p>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              onClick={() => navigateTo('/attention')}
              className="inline-flex items-center gap-2 text-sm font-bold text-slate-700 hover:text-slate-900 bg-slate-50 px-4 py-2 rounded-xl transition-colors"
            >
              <Edit3 className="w-4 h-4" /> Edit Attention
            </button>
          </div>
        </div>

        {/* Lifestyle Card */}
        <div className="p-8 bg-white rounded-[2rem] shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <HeartPulse className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-slate-900">Lifestyle Assessment</h4>
            </div>
            {status.lifestyle ? (
              <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
                <CheckCircle2 className="w-4 h-4" /> Completed
              </span>
            ) : (
              <span className="text-sm font-semibold text-slate-500 bg-slate-50 px-3 py-1 rounded-full">
                Pending
              </span>
            )}
          </div>

          <div className="text-sm text-slate-600 space-y-2">
            <p>Sleep Duration: <strong className="font-semibold text-slate-800">{lifestyle.sleepHours} hrs ({lifestyle.sleepQuality})</strong></p>
            <p>Exercise: <strong className="font-semibold text-slate-800">{lifestyle.exerciseHoursWeek} hrs/week</strong></p>
            <p>Vascular History: <strong className="font-semibold text-slate-800">{lifestyle.medicalHistory.join(', ') || 'None'}</strong></p>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              onClick={() => navigateTo('/lifestyle')}
              className="inline-flex items-center gap-2 text-sm font-bold text-slate-700 hover:text-slate-900 bg-slate-50 px-4 py-2 rounded-xl transition-colors"
            >
              <Edit3 className="w-4 h-4" /> Edit Lifestyle
            </button>
          </div>
        </div>
      </div>

      {!allCompleted && (
        <div className="p-6 bg-[#FDF8F5] rounded-[2rem] flex items-center gap-4 text-sm text-slate-600 font-medium">
          <AlertTriangle className="w-6 h-6 text-[#F29D88] shrink-0" />
          <span>
            Complete all four assessment modules before analysis. NeuroMind will not run a partial feature vector or invent missing inputs.
          </span>
        </div>
      )}

      {/* Start Analysis Button */}
      <div className="flex justify-center pt-8">
        <button
          onClick={() => navigateTo('/analyzing')}
          disabled={!allCompleted}
          className="inline-flex items-center gap-3 px-10 py-5 rounded-3xl bg-[#4A2333] hover:bg-[#5D2E42] text-white font-bold text-lg shadow-lg transition-all scale-105 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
        >
          <Cpu className="w-6 h-6 text-[#F29D88]" />
          <span>Start Multimodal Analysis</span>
        </button>
      </div>
    </div>
  );
};
