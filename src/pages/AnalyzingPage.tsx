import React, { useEffect, useState } from 'react';
import { useAssessment } from '../context/AssessmentContext';
import logoImage from '../assets/logo.png';

export const AnalyzingPage: React.FC = () => {
  const { executePrediction, navigateTo } = useAssessment();
  const [progress, setProgress] = useState(15);
  const [statusText, setStatusText] = useState('Extracting acoustic features (Wav2Vec2)...');
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let currentProgress = 15;
    let active = true;
    const interval = setInterval(() => {
      // Progress is indicative while the backend job runs; only success completes it.
      currentProgress = Math.min(currentProgress + 2, 90);
      setProgress(currentProgress);

      if (currentProgress > 30 && currentProgress <= 60) {
        setStatusText('Evaluating episodic recall & reaction time metrics...');
      } else if (currentProgress > 60 && currentProgress <= 85) {
        setStatusText('Running multimodal fusion neural classifier...');
      } else if (currentProgress > 85) {
        setStatusText('Finalizing assessment results...');
      }
    }, 400);

    const runAnalysis = async () => {
      try {
        await executePrediction();
        if (active) {
          clearInterval(interval);
          setProgress(100);
          navigateTo('/results');
        }
      } catch (err) {
        if (active) {
          clearInterval(interval);
          setError(err instanceof Error ? err.message : 'Analysis could not be completed.');
        }
      }
    };

    runAnalysis();

    return () => { active = false; clearInterval(interval); };
  }, [attempt]);

  return (
    <div className="max-w-2xl mx-auto py-12 text-center space-y-8">
      {/* Screen 9 Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-heading font-bold text-[#4A2333] tracking-tight">
          Analyzing Your Assessment
        </h1>
        <p className="text-xs text-slate-500">
          Please wait while we analyze your responses.
        </p>
      </div>

      {/* Screen 9 Brain Network Illustration */}
      <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
        <div className="absolute inset-0 bg-emerald-500/10 rounded-full blur-2xl animate-pulse" />
        <div className="w-32 h-32 flex items-center justify-center relative z-10 animate-pulse">
          <img src={logoImage} alt="Analyzing Logo" className="w-full h-full object-contain" />
        </div>
      </div>

      {/* Progress Bar & Subtext matching Screen 9 */}
      <div className="space-y-3 max-w-md mx-auto">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
          <span>{statusText}</span>
          <span className="font-mono text-[#4A2333]">{progress}%</span>
        </div>

        <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-[#4A2333] h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {error ? (
          <div role="alert" className="space-y-3 text-sm text-rose-700">
            <p>{error}</p>
            <button type="button" className="rounded-xl bg-[#4A2333] px-5 py-2 text-white" onClick={() => { setError(null); setProgress(15); setAttempt(value => value + 1); }}>Retry analysis</button>
          </div>
        ) : (
          <p className="text-xs text-slate-400 font-medium">This may take a few moments. Do not close this window.</p>
        )}
      </div>
    </div>
  );
};
