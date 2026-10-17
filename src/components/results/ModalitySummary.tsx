import React from 'react';
import { MultimodalPredictionResult } from '../../types/assessment';
import { Mic, Brain, Activity, HeartPulse } from 'lucide-react';

interface ModalitySummaryProps {
  scores: MultimodalPredictionResult['modalityScores'];
}

export const ModalitySummary: React.FC<ModalitySummaryProps> = ({ scores }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Speech Modality */}
      <div className="p-4 bg-white rounded-[1.5rem] border border-slate-200 shadow-xs space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
            <Mic className="w-4 h-4" />
          </div>
          <span className="text-sm font-bold text-slate-900">Speech Representation</span>
        </div>
        <p className="text-2xl font-black text-slate-900">{scores.speechEmbeddingDimension}-D</p>
        <p className="text-[11px] text-slate-500">Wav2Vec2 Neural Embedding Extracted</p>
      </div>

      {/* Memory Modality */}
      <div className="p-4 bg-white rounded-[1.5rem] border border-slate-200 shadow-xs space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
            <Brain className="w-4 h-4" />
          </div>
          <span className="text-sm font-bold text-slate-900">Episodic Memory</span>
        </div>
        <p className="text-2xl font-black text-slate-900">{scores.memoryScore} / 100</p>
        <p className="text-[11px] text-slate-500">
          Immediate: {scores.immediateRecallScore}% | Delayed: {scores.delayedRecallScore}%
        </p>
      </div>

      {/* Attention Modality */}
      <div className="p-4 bg-white rounded-[1.5rem] border border-slate-200 shadow-xs space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
            <Activity className="w-4 h-4" />
          </div>
          <span className="text-sm font-bold text-slate-900">Attention & Working Memory</span>
        </div>
        <p className="text-2xl font-black text-slate-900">{scores.attentionScore} / 100</p>
        <p className="text-[11px] text-slate-500">
          Digit Span: {scores.digitSpanScore} | RT: {scores.reactionTimeMs}ms
        </p>
      </div>

      {/* Lifestyle Modality */}
      <div className="p-4 bg-white rounded-[1.5rem] border border-slate-200 shadow-xs space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
            <HeartPulse className="w-4 h-4" />
          </div>
          <span className="text-sm font-bold text-slate-900">Lifestyle Risk Score</span>
        </div>
        <p className="text-2xl font-black text-slate-900">{scores.lifestyleScore} / 100</p>
        <p className="text-[11px] text-slate-500">Sleep, exercise & vascular risk factors</p>
      </div>
    </div>
  );
};
