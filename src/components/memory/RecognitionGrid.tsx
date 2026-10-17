import React, { useState } from 'react';
import { MEMORY_STIMULI, MEMORY_DISTRACTORS, MemoryStimulus } from '../../config/prompts';
import { Check, Grid, CheckCircle2, AlertCircle } from 'lucide-react';
import * as Icons from 'lucide-react';

interface RecognitionGridProps {
  initialSelectedIds?: string[];
  onSaveRecognition: (
    selectedIds: string[],
    truePositives: number,
    falsePositives: number,
    totalCorrect: number
  ) => void;
}

export const RecognitionGrid: React.FC<RecognitionGridProps> = ({
  initialSelectedIds = [],
  onSaveRecognition,
}) => {
  // Combine targets and distractors deterministically
  const allItems: MemoryStimulus[] = [...MEMORY_STIMULI, ...MEMORY_DISTRACTORS];
  const targetIds = MEMORY_STIMULI.map((s) => s.id);

  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);

  const toggleSelection = (id: string) => {
    const updated = selectedIds.includes(id)
      ? selectedIds.filter((item) => item !== id)
      : [...selectedIds, id];

    setSelectedIds(updated);

    // Calculate metrics
    const truePositives = updated.filter((id) => targetIds.includes(id)).length;
    const falsePositives = updated.filter((id) => !targetIds.includes(id)).length;
    const correctRejections = MEMORY_DISTRACTORS.filter((d) => !updated.includes(d.id)).length;
    const totalCorrect = truePositives + correctRejections;

    onSaveRecognition(updated, truePositives, falsePositives, totalCorrect);
  };

  const renderIcon = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName] || Icons.HelpCircle;
    return <IconComponent className="w-8 h-8" />;
  };

  const truePositivesCount = selectedIds.filter((id) => targetIds.includes(id)).length;
  const falsePositivesCount = selectedIds.filter((id) => !targetIds.includes(id)).length;

  return (
    <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-xs space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Grid className="w-4 h-4 text-cyan-600" />
            Memory Task E — Visual Recognition Memory
          </h3>
          <p className="text-xs text-slate-500">
            Instruction: Click or tap every object card that you saw during the earlier encoding stage.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-md bg-slate-100 font-semibold text-slate-700">
            Selected: {selectedIds.length}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2.5">
        {allItems.map((item) => {
          const isSelected = selectedIds.includes(item.id);

          return (
            <button
              key={item.id}
              onClick={() => toggleSelection(item.id)}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all text-center relative ${
                isSelected
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900/20 scale-102'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              {isSelected && (
                <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-cyan-400 text-slate-900 flex items-center justify-center text-[10px] font-bold">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
              )}
              <div className="mb-1">{renderIcon(item.svgIconName)}</div>
              <span className="text-xs font-semibold">{item.name}</span>
            </button>
          );
        })}
      </div>

      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 font-medium text-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Targets Selected (Hits): {truePositivesCount} / {MEMORY_STIMULI.length}
          </span>
          <span className="flex items-center gap-1 font-medium text-amber-800">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            Distractors Selected (False Alarms): {falsePositivesCount}
          </span>
        </div>
        <span className="text-[11px] text-slate-500">Raw selection pattern saved for backend feature derivation.</span>
      </div>
    </div>
  );
};
