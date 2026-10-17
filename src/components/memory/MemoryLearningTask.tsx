import React, { useState, useEffect } from 'react';
import { MEMORY_STIMULI, MemoryStimulus } from '../../config/prompts';
import { Play, ArrowRight, Eye, CheckCircle2, Clock, RotateCcw } from 'lucide-react';
import * as Icons from 'lucide-react';

interface MemoryLearningTaskProps {
  onCompleteEncoding: (seenIds: string[]) => void;
  exposureDurationMs?: number;
}

export const MemoryLearningTask: React.FC<MemoryLearningTaskProps> = ({
  onCompleteEncoding,
  exposureDurationMs = 3000,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [timeLeftMs, setTimeLeftMs] = useState(exposureDurationMs);

  const currentItem = MEMORY_STIMULI[currentIndex];

  useEffect(() => {
    let timer: number;
    if (isPlaying && !isFinished) {
      setTimeLeftMs(exposureDurationMs);
      const interval = 50; // smooth countdown tick
      timer = window.setInterval(() => {
        setTimeLeftMs((prev) => {
          if (prev <= interval) {
            // Advance to next
            if (currentIndex < MEMORY_STIMULI.length - 1) {
              setCurrentIndex((c) => c + 1);
              return exposureDurationMs;
            } else {
              clearInterval(timer);
              setIsFinished(true);
              setIsPlaying(false);
              onCompleteEncoding(MEMORY_STIMULI.map((s) => s.id));
              return 0;
            }
          }
          return prev - interval;
        });
      }, interval);
    }
    return () => clearInterval(timer);
  }, [isPlaying, currentIndex, isFinished, exposureDurationMs, onCompleteEncoding]);

  const handleStart = () => {
    setCurrentIndex(0);
    setIsFinished(false);
    setIsPlaying(true);
  };

  const handleNextManual = () => {
    if (currentIndex < MEMORY_STIMULI.length - 1) {
      setCurrentIndex((c) => c + 1);
      setTimeLeftMs(exposureDurationMs);
    } else {
      setIsFinished(true);
      setIsPlaying(false);
      onCompleteEncoding(MEMORY_STIMULI.map((s) => s.id));
    }
  };

  // Helper to render lucide icon dynamically
  const renderIcon = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName] || Icons.HelpCircle;
    return <IconComponent className="w-16 h-16 stroke-[1.5]" />;
  };

  return (
    <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-xs space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Eye className="w-4 h-4 text-cyan-600" />
            Memory Task A — Visual Object Encoding
          </h3>
          <p className="text-xs text-slate-500">
            Memorize each object shown on screen. Objects will automatically transition.
          </p>
        </div>
        <span className="text-xs font-mono font-medium px-2.5 py-1 rounded-md bg-slate-100 text-slate-700">
          Item {isFinished ? MEMORY_STIMULI.length : currentIndex + 1} / {MEMORY_STIMULI.length}
        </span>
      </div>

      {!isPlaying && !isFinished && (
        <div className="p-8 text-center space-y-4 bg-slate-50 rounded-xl border border-slate-200">
          <div className="w-12 h-12 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center mx-auto">
            <Eye className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto">
            <h4 className="text-sm font-bold text-slate-900">Encoding Phase Instructions</h4>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              You will be shown 10 distinct items one by one for 3 seconds each. Look at each item carefully. You will be asked to recall them in the next stage.
            </p>
          </div>
          <button
            onClick={handleStart}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-md transition-all"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Begin Memorization Task</span>
          </button>
        </div>
      )}

      {isPlaying && currentItem && (
        <div className="flex flex-col items-center justify-center p-8 bg-slate-900 rounded-xl text-white space-y-6 shadow-inner relative">
          {/* Countdown Bar */}
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-cyan-400 h-full transition-all duration-75"
              style={{ width: `${(timeLeftMs / exposureDurationMs) * 100}%` }}
            />
          </div>

          <div
            className={`w-36 h-36 rounded-2xl flex flex-col items-center justify-center p-4 border-2 shadow-lg transition-transform scale-105 ${currentItem.color}`}
          >
            {renderIcon(currentItem.svgIconName)}
            <span className="mt-2 text-sm font-bold tracking-wide uppercase">{currentItem.name}</span>
          </div>

          <div className="flex items-center justify-between w-full max-w-sm pt-2">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              {(timeLeftMs / 1000).toFixed(1)}s
            </span>
            <button
              onClick={handleNextManual}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition-colors"
            >
              <span>Next Object</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {isFinished && (
        <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-emerald-900">Encoding Phase Complete</h4>
          <p className="text-xs text-emerald-800 max-w-md mx-auto">
            All 10 objects have been presented. Proceed below to test your immediate recall capacity.
          </p>
          <button
            onClick={handleStart}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 hover:text-emerald-900 underline"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restart Encoding Display
          </button>
        </div>
      )}
    </div>
  );
};
