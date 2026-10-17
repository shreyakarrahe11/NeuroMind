import React, { useState, useEffect, useRef } from 'react';
import { SustainedAttentionData } from '../../types/assessment';
import { Play } from 'lucide-react';

interface MediaAttentionTaskProps {
  mediaType: 'visual' | 'audio' | 'music' | 'video';
  title: string;
  instruction: string;
  mediaUrl: string;
  targetWindows: { startMs: number; endMs: number }[];
  onComplete: (result: SustainedAttentionData) => void;
}

export const MediaAttentionTask: React.FC<MediaAttentionTaskProps> = ({
  mediaType,
  title,
  instruction,
  mediaUrl,
  targetWindows,
  onComplete,
}) => {
  const [taskState, setTaskState] = useState<'idle' | 'running' | 'finished'>('idle');
  const [mediaError, setMediaError] = useState<string | null>(null);
  
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null);
  const taskStartedAt = useRef<number>(0);
  
  // Stats
  const stats = useRef({
    totalStimuliCount: targetWindows.length,
    targetCount: targetWindows.length,
    hits: 0,
    misses: 0,
    falseAlarms: 0,
    reactionTimes: [] as number[],
    rawResponses: [] as SustainedAttentionData['rawResponses'] extends (infer T)[] | undefined ? T[] : never[],
  });

  const stateRef = useRef({
    respondedWindows: new Set<number>(),
  });

  const startGame = () => {
    setTaskState('running');
    setMediaError(null);
    stats.current = { 
      totalStimuliCount: targetWindows.length, 
      targetCount: targetWindows.length, 
      hits: 0, 
      misses: 0, 
      falseAlarms: 0, 
      reactionTimes: [],
      rawResponses: []
    };
    stateRef.current.respondedWindows.clear();
    taskStartedAt.current = performance.now();
  };

  useEffect(() => {
    if (taskState === 'running' && mediaRef.current) {
      mediaRef.current.currentTime = 0;
      mediaRef.current.play().catch(e => {
        console.error("Playback failed:", e);
        setMediaError("Playback was blocked by the browser. Press play on the media controls to continue.");
      });
    }
  }, [taskState]);

  const endGame = () => {
    setTaskState('finished');
    
    const s = stats.current;
    s.misses = s.targetCount - s.hits;
    
    // Since we don't have explicit non-target stimuli, correctRejections can be 0 or derived if needed
    const correctRejections = 0; 
    
    const meanRt = s.reactionTimes.length > 0 
       ? s.reactionTimes.reduce((a,b) => a + b, 0) / s.reactionTimes.length 
       : 0;

    const result: SustainedAttentionData = {
      totalStimuliCount: s.totalStimuliCount,
      targetCount: s.targetCount,
      hits: s.hits,
      misses: s.misses,
      falseAlarms: s.falseAlarms,
      correctRejections,
      meanResponseTimeMs: Math.round(meanRt),
      reactionTimes: [...s.reactionTimes],
      rawResponses: [...s.rawResponses],
    };

    onComplete(result);
  };

  const handleUserResponse = () => {
    if (taskState !== 'running' || !mediaRef.current) return;
    
    const currentMediaTimeMs = mediaRef.current.currentTime * 1000;
    
    let isHit = false;
    let targetWindowIndex: number | undefined;
    let reactionTimeMs: number | undefined;

    // Check if current time falls within any target window
    for (let i = 0; i < targetWindows.length; i++) {
      const window = targetWindows[i];
      if (currentMediaTimeMs >= window.startMs && currentMediaTimeMs <= window.endMs) {
        if (!stateRef.current.respondedWindows.has(i)) {
          // Hit
          isHit = true;
          const rt = currentMediaTimeMs - window.startMs; // reaction time from start of window
          stats.current.hits += 1;
          stats.current.reactionTimes.push(rt);
          targetWindowIndex = i;
          reactionTimeMs = rt;
          stateRef.current.respondedWindows.add(i);
        }
        break; // matched a window
      }
    }

    if (!isHit) {
      // False Alarm
      stats.current.falseAlarms += 1;
    }
    stats.current.rawResponses.push({
      occurredAt: new Date().toISOString(),
      elapsedMs: Math.round(performance.now() - taskStartedAt.current),
      mediaTimeMs: Math.round(currentMediaTimeMs),
      outcome: isHit ? 'hit' : 'false_alarm',
      targetWindowIndex,
      reactionTimeMs: reactionTimeMs === undefined ? undefined : Math.round(reactionTimeMs),
    });
  };

  const handleMediaEnded = () => {
    endGame();
  };

  const handleMediaError = () => {
    setMediaError(`Failed to load ${mediaUrl}. Please check that the file exists in the public directory.`);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[450px] w-full p-8 bg-[#FDF8F5] rounded-[2rem]">
      <div className="text-center w-full max-w-2xl mx-auto space-y-6">
        <h2 className="text-2xl font-bold text-[#4A2333]">{title}</h2>
        <p className="text-slate-600 font-medium">{instruction}</p>

        {mediaError && (
          <div className="p-4 bg-red-50 text-red-600 rounded-xl font-medium border border-red-200">
            {mediaError}
          </div>
        )}

        {taskState === 'idle' && (
          <div className="pt-8">
            <button
              onClick={startGame}
              className="px-8 py-4 rounded-2xl bg-[#4A2333] text-white font-bold text-lg shadow-md cursor-pointer hover:bg-[#5D2E42] inline-flex items-center gap-3"
            >
              <Play className="w-5 h-5" />
              <span>Begin</span>
            </button>
          </div>
        )}

        {taskState === 'running' && (
          <div className="space-y-8">
            <div className="relative w-full rounded-[2rem] overflow-hidden flex items-center justify-center shadow-inner bg-slate-900 min-h-[200px]">
              {/* Media Elements */}
              {(mediaType === 'visual' || mediaType === 'video') ? (
                <video 
                  ref={mediaRef as React.RefObject<HTMLVideoElement>}
                  controls
                  autoPlay
                  playsInline
                  preload="auto"
                  className="w-full h-auto object-cover max-h-[500px]"
                  src={mediaUrl}
                  onEnded={handleMediaEnded}
                  onError={handleMediaError}
                  disablePictureInPicture
                  controlsList="nodownload nofullscreen noremoteplayback"
                />
              ) : (
                <div className="p-12 w-full flex flex-col items-center justify-center">
                  <div className="w-16 h-16 rounded-full border-4 border-slate-700 border-t-emerald-500 animate-spin mb-4" />
                  <p className="text-slate-400 font-medium tracking-widest uppercase text-sm">Playing Audio</p>
                  <audio
                    ref={mediaRef as React.RefObject<HTMLAudioElement>}
                    controls
                    autoPlay
                    preload="auto"
                    className="w-full max-w-md"
                    src={mediaUrl}
                    onEnded={handleMediaEnded}
                    onError={handleMediaError}
                  />
                </div>
              )}
            </div>

            <button
              onMouseDown={handleUserResponse} // use mousedown for faster reaction than click
              className="w-full py-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-white font-black text-2xl tracking-widest shadow-lg transition-colors cursor-pointer select-none"
            >
              {(mediaType === 'audio' || mediaType === 'music') ? 'TARGET HEARD' : 'TARGET'}
            </button>
          </div>
        )}

        {taskState === 'finished' && (
          <div className="py-20 text-xl font-bold text-slate-700">
            {title} Complete
          </div>
        )}
      </div>
    </div>
  );
};
