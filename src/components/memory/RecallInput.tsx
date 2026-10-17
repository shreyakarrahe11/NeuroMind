import React, { useState } from 'react';
import { MEMORY_STIMULI } from '../../config/prompts';
import { Brain, Check, HelpCircle } from 'lucide-react';

interface RecallInputProps {
  type: 'immediate' | 'delayed';
  initialValue?: string;
  onSaveRecall: (text: string, itemsList: string[], matchedCount: number) => void;
}

export const RecallInput: React.FC<RecallInputProps> = ({ type, initialValue = '', onSaveRecall }) => {
  const [text, setText] = useState(initialValue);

  const title =
    type === 'immediate'
      ? 'Memory Task B — Immediate Free Recall'
      : 'Memory Task D — 10-Minute Delayed Recall';

  const subtitle =
    type === 'immediate'
      ? 'Type all objects you remember seeing during the encoding phase. Separate items with commas or newlines.'
      : 'Without looking back, type all the objects you remember seeing earlier during the encoding phase.';

  // Calculate matching items against MEMORY_STIMULI
  const parsedItems = text
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const validTargetNames = MEMORY_STIMULI.map((s) => s.name.toLowerCase());
  const matchedTargets = parsedItems.filter((item) => validTargetNames.includes(item.toLowerCase()));
  const uniqueMatchedCount = new Set(matchedTargets.map((s) => s.toLowerCase())).size;

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    const items = val
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const matches = items.filter((item) => validTargetNames.includes(item.toLowerCase()));
    const matchedCount = new Set(matches.map((s) => s.toLowerCase())).size;

    onSaveRecall(val, items, matchedCount);
  };

  return (
    <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Brain className="w-4 h-4 text-cyan-600" />
            {title}
          </h3>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
        <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-md bg-cyan-50 text-cyan-800 border border-cyan-200">
          Matched: {uniqueMatchedCount} / {MEMORY_STIMULI.length}
        </span>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">
          Your Recalled Items (Comma or newline separated)
        </label>
        <textarea
          rows={4}
          value={text}
          onChange={handleTextChange}
          placeholder="e.g. Anchor, Bicycle, Camera, Guitar, Key..."
          className="w-full p-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 text-sm font-medium text-slate-800"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2 bg-slate-50 p-3 rounded-lg">
        <div className="flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>Raw text response stored for backend feature extraction (Immediate/Delayed Recall).</span>
        </div>
        <div className="flex items-center gap-2">
          {parsedItems.length > 0 && (
            <span className="text-slate-700 font-semibold">
              Entered: {parsedItems.length} {parsedItems.length === 1 ? 'item' : 'items'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
