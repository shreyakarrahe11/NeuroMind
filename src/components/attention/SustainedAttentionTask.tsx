import React, { useState, useEffect, useRef } from 'react';
import { SustainedAttentionData } from '../../types/assessment';
import { Activity, Play, CheckCircle2, AlertTriangle } from 'lucide-react';

interface SustainedAttentionTaskProps {
  onCompleteSustained: (data: SustainedAttentionData) => void;
  initialData?: SustainedAttentionData;
}

const STIMULI_STREAM = ['A', 'B', 'X', 'C', 'X', 'D', 'E', 'X', 'F', 'X', 'G', 'H', 'X', 'I', 'J', 'X'];
const TARGET_SYMBOL = 'X';

export const SustainedAttentionTask: React.FC<SustainedAttentionTaskProps> = ({
  onCompleteSustained,
  initialData,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [streamIndex, setStreamIndex] = useState(0);
  const [hits, setHits] = useState(initialData?.hits || 0);
  const [misses, setMisses] = useState(initialData?.misses || 0);
  const [falseAlarms, setFalseAlarms] = useState(initialData?.falseAlarms || 0);
  const [respondedThisSymbol, setRespondedThisSymbol] = useState(false);

  const timerRef = useRef<number | null>(null);

  const currentSymbol = STIMULI_STREAM[streamIndex];

  useEffect(() => {
    if (isRunning && !isFinished) {
      setRespondedThisSymbol(false);
      timerRef.current = window.setTimeout(() => {
        // Check if target was missed
        if (currentSymbol === TARGET_SYMBOL && !respondedThisSymbol) {
          setMisses((m) => m + 1);
        }

        if (streamIndex < STIMULI_STREAM.length - 1) {
          setStreamIndex((prev) => prev + 1);
        } else {
          setIsRunning(false);
          setIsFinished(true);
        }
      }, 1200); // 1.2s per symbol stream
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isRunning, streamIndex, isFinished, currentSymbol, respondedThisSymbol]);

  useEffect(() => {
    if (isFinished) {
      const targetCount = STIMULI_STREAM.filter((s) => s === TARGET_SYMBOL).length;
      const totalCount = STIMULI_STREAM.length;
      const data: SustainedAttentionData = {
        totalStimuliCount: totalCount,
        targetCount,
        hits,
        misses,
        falseAlarms,
        correctRejections: totalCount - targetCount - falseAlarms,
        meanResponseTimeMs: 380, reactionTimes: [],
      };
      onCompleteSustained(data);
    }
  }, [isFinished, hits, misses, falseAlarms, onCompleteSustained]);

  const handleStart = () => {
    setStreamIndex(0);
    setHits(0);
    setMisses(0);
    setFalseAlarms(0);
    setIsFinished(false);
    setIsRunning(true);
  };

  const handleUserClick = () => {
    if (!isRunning || respondedThisSymbol) return;
    setRespondedThisSymbol(true);

    if (currentSymbol === TARGET_SYMBOL) {
      setHits((h) => h + 1);
    } else {
      setFalseAlarms((f) => f + 1);
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-xs space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-600" />
            Attention Task C — Continuous Sustained Attention Performance
          </h3>
          <p className="text-xs text-slate-500">
            Click or tap ONLY when the target symbol <strong>'{TARGET_SYMBOL}'</strong> appears in the continuous stream.
          </p>
        </div>
        <span className="text-xs font-mono font-medium px-2.5 py-1 rounded-md bg-slate-100 text-slate-700">
          Stream: {streamIndex + 1} / {STIMULI_STREAM.length}
        </span>
      </div>

      <div
        onClick={handleUserClick}
        className="p-10 rounded-xl bg-slate-900 text-white flex flex-col items-center justify-center min-h-[200px] select-none cursor-pointer shadow-inner space-y-4 relative overflow-hidden"
      >
        {!isRunning && !isFinished && (
          <div className="text-center space-y-3">
            <p className="text-xs text-slate-300">
              Target Symbol is: <strong className="text-cyan-400 font-mono text-xl">{TARGET_SYMBOL}</strong>
            </p>
            <button
              onClick={handleStart}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-md transition-all"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Start Continuous Stream Task</span>
            </button>
          </div>
        )}

        {isRunning && (
          <div className="text-center space-y-3">
            <div className="w-24 h-24 rounded-2xl bg-slate-800 border-2 border-cyan-500/50 flex items-center justify-center font-mono font-black text-5xl text-cyan-300 shadow-xl animate-pulse">
              {currentSymbol}
            </div>
            <p className="text-xs text-slate-400">TAP SCREEN WHEN '{TARGET_SYMBOL}' APPEARS</p>
          </div>
        )}

        {isFinished && (
          <div className="text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-[#F29D88] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-white">Stream Complete</h4>
            <p className="text-xs text-slate-400">Raw sustained performance tracked successfully.</p>
          </div>
        )}
      </div>

      {/* Metrics breakdown */}
      <div className="grid grid-cols-3 gap-2 text-xs font-medium text-center">
        <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
          <p className="text-[10px] text-emerald-600 uppercase">Hits (Correct)</p>
          <p className="text-lg font-bold">{hits}</p>
        </div>
        <div className="p-2.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
          <p className="text-[10px] text-amber-600 uppercase">False Alarms</p>
          <p className="text-lg font-bold">{falseAlarms}</p>
        </div>
        <div className="p-2.5 rounded-lg bg-rose-50 text-rose-800 border border-rose-200">
          <p className="text-[10px] text-rose-600 uppercase">Misses</p>
          <p className="text-lg font-bold">{misses}</p>
        </div>
      </div>
    </div>
  );
};
