import React, { useState, useEffect } from 'react';
import { DigitSpanTrial } from '../../types/assessment';

interface DigitSpanTaskProps {
  onComplete: (maxSpan: number, trials: DigitSpanTrial[]) => void;
}

export const DigitSpanTask: React.FC<DigitSpanTaskProps> = ({ onComplete }) => {
  const [stage, setStage] = useState<'idle' | 'showing' | 'input'>('idle');
  const [currentSpan, setCurrentSpan] = useState(3);
  const [attempts, setAttempts] = useState(0); // 0 or 1 for current span length
  const [sequence, setSequence] = useState<number[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [trials, setTrials] = useState<DigitSpanTrial[]>([]);
  const [maxSpan, setMaxSpan] = useState(0);
  const [startTime, setStartTime] = useState(0);

  const generateSequence = (length: number) => {
    const seq: number[] = [];
    for (let i = 0; i < length; i++) {
      seq.push(Math.floor(Math.random() * 9) + 1); // 1-9
    }
    return seq;
  };

  const startTrial = () => {
    const seq = generateSequence(currentSpan);
    setSequence(seq);
    setStage('showing');
    setInputValue('');
    
    // Display time: 1s per digit, min 2s
    const displayTimeMs = Math.max(2000, seq.length * 1000);
    
    setTimeout(() => {
      setStage('input');
      setStartTime(performance.now());
    }, displayTimeMs);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue) return;

    const userResp = inputValue.split('').map(n => parseInt(n, 10)).filter(n => !isNaN(n));
    const isCorrect = userResp.join('') === sequence.join('');
    const timeTaken = performance.now() - startTime;

    const newTrial: DigitSpanTrial = {
      digitCount: currentSpan,
      sequence,
      userResponse: userResp,
      isCorrect,
      timeTakenMs: timeTaken,
      occurredAt: new Date().toISOString(),
    };
    
    const newTrials = [...trials, newTrial];
    setTrials(newTrials);

    if (isCorrect) {
      const newMaxSpan = Math.max(maxSpan, currentSpan);
      setMaxSpan(newMaxSpan);
      
      if (currentSpan >= 7) {
        // Cap at 7 digits, end task successfully
        onComplete(newMaxSpan, newTrials);
      } else {
        setCurrentSpan(prev => prev + 1);
        setAttempts(0);
        setStage('idle');
      }
    } else {
      if (attempts === 0) {
        setAttempts(1);
        setStage('idle');
      } else {
        // End task
        onComplete(maxSpan, newTrials);
      }
    }
  };

  // Auto-start first trial
  useEffect(() => {
    if (stage === 'idle') {
      const timer = setTimeout(() => startTrial(), 1000);
      return () => clearTimeout(timer);
    }
  }, [stage]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] w-full p-8 bg-[#FDF8F5] rounded-[2rem]">
      <div className="text-center w-full max-w-md">
        <h2 className="text-2xl font-bold text-[#4A2333] mb-8">Digit Span</h2>
        
        {stage === 'idle' && (
          <div className="text-lg text-slate-600 animate-pulse">Get ready...</div>
        )}

        {stage === 'showing' && (
          <div className="text-5xl font-mono tracking-[0.5em] md:tracking-[1em] font-bold text-slate-800 text-center ml-[0.25em] md:ml-[0.5em]">
            {sequence.join('')}
          </div>
        )}

        {stage === 'input' && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <label className="block text-lg font-medium text-slate-700">
              What numbers did you see?
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoFocus
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value.replace(/[^0-9]/g, ''))}
              className="w-full text-center text-3xl tracking-widest p-4 rounded-xl border-2 border-slate-300 focus:border-[#4A2333] focus:ring-0 outline-none"
              placeholder="..."
            />
            <button
              type="submit"
              disabled={!inputValue}
              className="w-full py-4 rounded-2xl bg-[#4A2333] hover:bg-[#5D2E42] text-white font-bold text-lg disabled:opacity-50 transition-all cursor-pointer"
            >
              Submit Answer
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
