import React from 'react';
import { SPEECH_PROMPTS, SpeechPromptConfig } from '../../config/prompts';
import { BookOpen, Image as ImageIcon, MessageSquare, Check } from 'lucide-react';

interface SpeechPromptProps {
  selectedPromptId: string;
  onSelectPrompt: (prompt: SpeechPromptConfig) => void;
}

export const SpeechPrompt: React.FC<SpeechPromptProps> = ({ selectedPromptId, onSelectPrompt }) => {
  const currentPrompt = SPEECH_PROMPTS.find((p) => p.id === selectedPromptId) || SPEECH_PROMPTS[0];

  return (
    <div className="space-y-4">
      {/* Prompt Selector Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {SPEECH_PROMPTS.map((prompt) => {
          const isSelected = prompt.id === selectedPromptId;
          const Icon =
            prompt.type === 'reading'
              ? BookOpen
              : prompt.type === 'picture_description'
              ? ImageIcon
              : MessageSquare;

          return (
            <button
              key={prompt.id}
              onClick={() => onSelectPrompt(prompt)}
              className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
                isSelected
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm ring-2 ring-slate-900/10'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs shrink-0 ${
                  isSelected ? 'bg-cyan-500 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold truncate">{prompt.title}</p>
                <p className={`text-[10px] capitalize ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                  {prompt.type.replace('_', ' ')}
                </p>
              </div>
              {isSelected && <Check className="w-4 h-4 text-cyan-400 shrink-0" />}
            </button>
          );
        })}
      </div>

      {/* Selected Prompt Display Card */}
      <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Task Instructions
          </span>
          <span className="text-xs font-medium text-cyan-700 bg-cyan-50 border border-cyan-200 px-2 py-0.5 rounded-full">
            Prompt ID: {currentPrompt.id}
          </span>
        </div>

        <p className="text-sm font-medium text-slate-800">{currentPrompt.instructions}</p>

        {currentPrompt.imageUrl && (
          <div className="relative w-full max-w-lg mx-auto aspect-16/10 rounded-lg overflow-hidden border border-slate-200 shadow-xs my-3 bg-slate-100">
            <img src={currentPrompt.imageUrl} alt="Speech Task Stimulus" className="w-full h-full object-cover" />
          </div>
        )}

        {currentPrompt.type === 'reading' && (
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 font-serif leading-relaxed text-base italic shadow-inner">
            "{currentPrompt.content}"
          </div>
        )}

        {currentPrompt.type === 'free_speech' && (
          <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-lg text-blue-900 text-xs leading-relaxed">
            💡 <strong>Tip:</strong> Speak smoothly and describe details clearly. The backend Wav2Vec2 neural speech embedder analyzes vocal rhythm, pauses, and pitch variance.
          </div>
        )}
      </div>
    </div>
  );
};
