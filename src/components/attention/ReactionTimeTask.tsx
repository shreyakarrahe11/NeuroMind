import React, { useState, useEffect, useRef } from 'react';
import { ReactionTimeTrial } from '../../types/assessment';
import { RefreshCw } from 'lucide-react';

interface ReactionTimeTaskProps {
  onComplete: (medianMs: number, trials: ReactionTimeTrial[]) => void;
}

export const ReactionTimeTask: React.FC<ReactionTimeTaskProps> = ({ onComplete }) => {
  const [taskState, setTaskState] = useState<'idle' | 'waiting' | 'ready' | 'finished'>('idle');
  const [trials, setTrials] = useState<ReactionTimeTrial[]>([]);
  const [startTime, setStartTime] = useState<number>(0);
  const [currentLatency, setCurrentLatency] = useState<number | null>(null);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const maxTrials = 5;

  const startTrial = () => {
    setTaskState('waiting');
    setCurrentLatency(null);

    const delay = Math.floor(Math.random() * 2000) + 1500; // 1.5s - 3.5s delay
    timerRef.current = setTimeout(() => {
      setTaskState('ready');
      setStartTime(performance.now());
    }, delay);
  };

  const handleTargetClick = () => {
    if (taskState === 'waiting') {
      if (timerRef.current) clearTimeout(timerRef.current);
      
      const newTrial: ReactionTimeTrial = {
        trialNumber: trials.length + 1,
        delayMs: 0,
        reactionTimeMs: 0,
        isValid: false,
        occurredAt: new Date().toISOString(),
      };
      setTrials([...trials, newTrial]);
      
      alert('Too early! Wait for the screen to turn green.');
      setTaskState('idle');
      return;
    }

    if (taskState === 'ready') {
      const elapsed = performance.now() - startTime;
      
      const newTrial: ReactionTimeTrial = {
        trialNumber: trials.length + 1,
        delayMs: 0,
        reactionTimeMs: Math.round(elapsed),
        isValid: elapsed >= 150, // Prevents impossible times
        occurredAt: new Date().toISOString(),
      };
      
      const newTrials = [...trials, newTrial];
      setTrials(newTrials);
      setCurrentLatency(Math.round(elapsed));
      setTaskState('finished');
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleNext = () => {
    if (trials.length >= maxTrials) {
      const validTrials = trials.filter((t) => t.isValid).map((t) => t.reactionTimeMs);
      const median = calculateMedian(validTrials);
      onComplete(median, trials);
    } else {
      startTrial();
    }
  };

  const calculateMedian = (arr: number[]) => {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] w-full p-8 bg-[#FDF8F5] rounded-[2rem]">
      <div className="text-center w-full">
        <h2 className="text-2xl font-bold text-[#4A2333] mb-2">Reaction Time</h2>
        <p className="text-sm text-slate-500 mb-8 font-semibold uppercase tracking-wider">
          Trial {Math.min(trials.length + 1, maxTrials)} of {maxTrials}
        </p>
        
        {taskState === 'idle' && (
          <div className="space-y-6">
            <div className="text-xl font-medium text-slate-700">Ready to test reaction speed?</div>
            <button
              onClick={startTrial}
              className="px-8 py-4 rounded-2xl bg-[#4A2333] text-white font-bold text-lg shadow-md cursor-pointer hover:bg-[#5D2E42]"
            >
              Start Trial
            </button>
          </div>
        )}

        {taskState === 'waiting' && (
          <div
            onClick={handleTargetClick}
            className="w-full max-w-2xl mx-auto py-32 rounded-[2rem] bg-slate-200 cursor-pointer select-none space-y-4"
          >
            <div className="text-4xl font-extrabold text-slate-500">Wait...</div>
          </div>
        )}

        {taskState === 'ready' && (
          <div
            onClick={handleTargetClick}
            className="w-full max-w-2xl mx-auto py-32 rounded-[2rem] bg-emerald-500 hover:bg-emerald-400 text-white font-black text-6xl tracking-widest cursor-pointer shadow-lg select-none"
          >
            <div>TARGET</div>
          </div>
        )}

        {taskState === 'finished' && (
          <div className="space-y-6">
            <div className="text-sm font-semibold text-emerald-700 bg-emerald-100 px-4 py-2 rounded-full inline-block">
              Recorded
            </div>
            {/* The prompt says: "Do NOT show the numerical reaction time after every trial. This keeps the patient focused."
                So we just show Recorded and next trial button. */}
            <div className="pt-6">
              <button
                onClick={handleNext}
                className="px-8 py-4 rounded-2xl bg-[#4A2333] text-white text-lg font-bold transition-all cursor-pointer inline-flex items-center gap-2 shadow-sm"
              >
                {trials.length >= maxTrials ? 'Complete Task' : 'Next Trial'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
