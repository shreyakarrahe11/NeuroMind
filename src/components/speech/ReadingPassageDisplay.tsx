import React, { useEffect, useState, useRef } from 'react';
import { ReadingPassage } from '../../data/readingPassages';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface ReadingPassageDisplayProps {
  passage: ReadingPassage;
  isRecording: boolean;
  isPaused?: boolean;
  onProgressUpdate?: (wordCount: number, wordsCompleted: number) => void;
}

const FILLER_WORDS = new Set(['uh', 'um', 'ah', 'hmm', 'like', 'you', 'know']);

const normalizeReadingToken = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]/g, '');

export const ReadingPassageDisplay: React.FC<ReadingPassageDisplayProps> = ({ 
  passage, 
  isRecording,
  isPaused = false,
  onProgressUpdate
}) => {
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const words = passage.text.split(/(\s+)/); // keep spaces for rendering
  const wordTokens = passage.text.split(/\s+/).filter(w => w.length > 0);
  
  const recognitionRef = useRef<any>(null);
  const isRecordingRef = useRef(isRecording);
  const isPausedRef = useRef(isPaused);
  const prevIsRecordingRef = useRef(isRecording);
  const lastTranscriptRef = useRef('');
  const baseMatchedWordsRef = useRef(0);

  // Keep refs updated for event listeners
  useEffect(() => {
    isRecordingRef.current = isRecording;
    isPausedRef.current = isPaused;
  }, [isRecording, isPaused]);

  // Report progress
  useEffect(() => {
    if (onProgressUpdate) {
      onProgressUpdate(wordTokens.length, Math.max(0, currentWordIndex));
    }
  }, [currentWordIndex, wordTokens.length]);

  // Setup SpeechRecognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      
      recognition.onresult = (event: any) => {
        if (!isRecordingRef.current || isPausedRef.current) return;

        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        const accumulatedText = (lastTranscriptRef.current + ' ' + finalTranscript + ' ' + interimTranscript).trim();
        const spokenWords = accumulatedText
          .split(/\s+/)
          .map((w) => normalizeReadingToken(w))
          .filter((w) => w.length > 0 && !FILLER_WORDS.has(w));

        let matchedPrefixLength = 0;

        for (let i = 0; i < Math.min(wordTokens.length, spokenWords.length); i++) {
          const target = normalizeReadingToken(wordTokens[i]);
          const spoken = spokenWords[i];

          if (!target || !spoken) continue;

          if (target === spoken || target.includes(spoken) || spoken.includes(target)) {
            matchedPrefixLength = i + 1;
          } else {
            break;
          }
        }

        const totalMatched = Math.min(Math.max(baseMatchedWordsRef.current, matchedPrefixLength), wordTokens.length);

        setCurrentWordIndex((prev) => Math.max(prev, totalMatched));

        if (finalTranscript) {
          lastTranscriptRef.current = accumulatedText;
        }
      };

      recognition.onend = () => {
        // Recognition stops automatically sometimes; restart it if we are still "recording"
        if (isRecordingRef.current && !isPausedRef.current) {
          try {
            recognition.start();
          } catch (e) {
            console.error(e);
          }
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onend = null; // Prevent restart loops on unmount
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, [wordTokens]);

  // Handle start/pause/stop
  useEffect(() => {
    // Fresh start
    if (isRecording && !prevIsRecordingRef.current) {
      setCurrentWordIndex(0);
      lastTranscriptRef.current = '';
      baseMatchedWordsRef.current = 0;
    }
    
    prevIsRecordingRef.current = isRecording;

    if (isRecording && !isPaused) {
      if (currentWordIndex === -1) {
        setCurrentWordIndex(0);
      }
      try {
        recognitionRef.current?.start();
      } catch (e) {}
    } else {
      try {
        recognitionRef.current?.stop();
        // If we pause, lock in the current match count to avoid starting from 0 when resuming
        baseMatchedWordsRef.current = Math.max(0, currentWordIndex);
        lastTranscriptRef.current = ''; // Reset transcript for the next segment
      } catch (e) {}
    }
  }, [isRecording, isPaused]);

  let tokenCounter = 0;

  return (
    <div className="p-8 md:p-12 bg-white rounded-4xl shadow-sm border border-slate-100 mb-8 max-w-3xl mx-auto">
      <h3 className="text-xl font-bold text-slate-800 mb-6 text-center">{passage.title}</h3>
      <div className="text-2xl md:text-3xl leading-loose md:leading-[2.5] font-medium text-slate-800 text-center max-w-2xl mx-auto">
        {words.map((wordOrSpace, index) => {
          if (/^\s+$/.test(wordOrSpace)) {
            // Render spacing, preserve line breaks
            if (wordOrSpace.includes('\n')) {
              return <br key={index} />;
            }
            return <span key={index}> </span>;
          }

          const isCurrent = tokenCounter === currentWordIndex;
          const isCompleted = tokenCounter < currentWordIndex;
          
          tokenCounter++;

          return (
            <span
              key={index}
              className={`transition-all duration-300 px-1 rounded-lg ${
                isCurrent
                  ? 'bg-emerald-100 text-emerald-900 border-b-4 border-emerald-400 font-bold'
                  : isCompleted
                  ? 'text-slate-400 opacity-80'
                  : 'text-slate-800'
              }`}
            >
              {wordOrSpace}
            </span>
          );
        })}
      </div>
      
      {currentWordIndex >= 0 && (
        <div className="mt-12 flex justify-center items-center gap-4">
          <div className="text-sm font-semibold text-slate-500 uppercase tracking-widest">
            Reading Progress
          </div>
          <div className="flex items-center gap-2">
            <div className="w-48 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 transition-all duration-500" 
                style={{ width: `${Math.min(100, (Math.max(0, currentWordIndex) / wordTokens.length) * 100)}%` }}
              />
            </div>
            <span className="text-sm font-bold text-emerald-600">
              {Math.round(Math.min(100, (Math.max(0, currentWordIndex) / wordTokens.length) * 100))}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
