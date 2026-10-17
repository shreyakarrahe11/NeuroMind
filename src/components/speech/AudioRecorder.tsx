import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, Trash2, RefreshCw, Volume2, AlertCircle } from 'lucide-react';
import { formatSecondsToMinutes } from '../../utils/formatters';

interface AudioRecorderProps {
  onAudioRecorded: (blob: Blob, url: string, durationSeconds: number) => void;
  onClearAudio: () => void;
  recordedAudioUrl?: string;
  durationSeconds?: number;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
  onRecordingPause?: () => void;
  onRecordingResume?: () => void;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  onAudioRecorded,
  onClearAudio,
  recordedAudioUrl,
  durationSeconds = 0,
  onRecordingStart,
  onRecordingStop,
  onRecordingPause,
  onRecordingResume,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTimer, setRecordingTimer] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [micPermissionError, setMicPermissionError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  const startRecording = async () => {
    setMicPermissionError(null);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredMime = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/webm']
        .find((value) => MediaRecorder.isTypeSupported(value));
      const mediaRecorder = preferredMime
        ? new MediaRecorder(stream, { mimeType: preferredMime })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const detectedType = mediaRecorder.mimeType || audioChunksRef.current[0]?.type || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: detectedType });
        const audioUrl = URL.createObjectURL(audioBlob);
        onAudioRecorded(audioBlob, audioUrl, recordingTimer);

        // Stop all audio stream tracks to release microphone
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTimer(0);
      if (onRecordingStart) onRecordingStart();

      timerIntervalRef.current = window.setInterval(() => {
        setRecordingTimer((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone access error:', err);
      setMicPermissionError('Microphone permission denied or unavailable. You may also use the File Upload tab below.');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (onRecordingPause) onRecordingPause();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      if (onRecordingResume) onRecordingResume();
      timerIntervalRef.current = window.setInterval(() => {
        setRecordingTimer((prev) => prev + 1);
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      if (onRecordingStop) onRecordingStop();
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
  };

  const togglePlayback = () => {
    if (!audioPlayerRef.current) return;
    if (isPlaying) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    } else {
      audioPlayerRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleDelete = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
    setIsPlaying(false);
    setRecordingTimer(0);
    onClearAudio();
  };

  return (
    <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-xs space-y-5">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <Mic className="w-4 h-4 text-cyan-600" />
          Browser Microphone Speech Recorder
        </h4>
        <span className="text-xs font-mono font-medium px-2.5 py-1 rounded-md bg-slate-100 text-slate-700">
          Duration: {formatSecondsToMinutes(recordedAudioUrl ? durationSeconds : recordingTimer)}
        </span>
      </div>

      {micPermissionError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{micPermissionError}</span>
        </div>
      )}

      {/* Recording Canvas / Visual State */}
      <div className="p-8 rounded-xl bg-slate-900 text-white flex flex-col items-center justify-center space-y-4 shadow-inner relative overflow-hidden">
        {isRecording && (
          <div className="absolute inset-0 bg-red-500/10 animate-pulse pointer-events-none" />
        )}

        <div className="flex items-center gap-2">
          {isRecording ? (
            <div className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
          ) : recordedAudioUrl ? (
            <div className="w-3 h-3 rounded-full bg-[#F29D88]" />
          ) : (
            <div className="w-3 h-3 rounded-full bg-slate-600" />
          )}

          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            {isRecording
              ? 'Recording Speech Active...'
              : recordedAudioUrl
              ? 'Audio Recording Ready'
              : 'Microphone Ready'}
          </span>
        </div>

        {/* Dynamic Waveform Graphic */}
        <div className="flex items-center gap-1.5 h-12 my-2">
          {Array.from({ length: 24 }).map((_, i) => {
            const h = isRecording
              ? Math.max(12, Math.floor(Math.sin(i + recordingTimer) * 40) + 24)
              : recordedAudioUrl
              ? 20 + ((i * 7) % 24)
              : 8;
            return (
              <div
                key={i}
                className={`w-1.5 rounded-full transition-all duration-150 ${
                  isRecording
                    ? 'bg-red-400'
                    : recordedAudioUrl
                    ? 'bg-cyan-400'
                    : 'bg-slate-700'
                }`}
                style={{ height: `${h}px` }}
              />
            );
          })}
        </div>

        <p className="text-xs text-slate-400">
          {isRecording
            ? 'Speak clearly into your microphone...'
            : recordedAudioUrl
            ? 'Audio captured. Preview below or proceed to review.'
            : 'Press Start Recording when ready.'}
        </p>
      </div>

      {/* Control Actions */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {!isRecording && !recordedAudioUrl && (
          <button
            onClick={startRecording}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs shadow-md shadow-red-600/20 transition-all"
          >
            <Mic className="w-4 h-4" />
            <span>Start Recording</span>
          </button>
        )}

        {isRecording && !isPaused && (
          <button
            onClick={pauseRecording}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs shadow-sm transition-all"
          >
            <Pause className="w-4 h-4 fill-current" />
            <span>Pause</span>
          </button>
        )}

        {isRecording && isPaused && (
          <button
            onClick={resumeRecording}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs shadow-sm transition-all"
          >
            <Play className="w-4 h-4 fill-current text-emerald-600" />
            <span>Resume</span>
          </button>
        )}

        {isRecording && (
          <button
            onClick={stopRecording}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-md transition-all"
          >
            <Square className="w-4 h-4 fill-current text-red-400" />
            <span>Stop Recording</span>
          </button>
        )}

        {recordedAudioUrl && !isRecording && (
          <>
            <button
              onClick={togglePlayback}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-colors"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isPlaying ? 'Pause Playback' : 'Play Recording'}</span>
            </button>

            <button
              onClick={startRecording}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Record Again</span>
            </button>

            <button
              onClick={handleDelete}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 font-medium text-xs transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>

            <audio
              ref={audioPlayerRef}
              src={recordedAudioUrl}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
          </>
        )}
      </div>
    </div>
  );
};
