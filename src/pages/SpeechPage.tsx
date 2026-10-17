import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAssessment } from '../context/AssessmentContext';
import { AudioRecorder } from '../components/speech/AudioRecorder';
import { AudioUploader } from '../components/speech/AudioUploader';
import { uploadSpeech } from '../api/client';
import { Mic, UploadCloud, ArrowLeft, ArrowRight, Waves } from 'lucide-react';
import { CompletedAssessmentPlaceholder } from '../components/common/CompletedAssessmentPlaceholder';
import { useToast } from '../context/ToastContext';
import { READING_PASSAGES, ReadingPassage } from '../data/readingPassages';
import { ReadingPassageDisplay } from '../components/speech/ReadingPassageDisplay';
import { serviceImage } from '../assets/index';
import { SpeechAssessmentData } from '../types/assessment';

const SPEECH_PROGRESS_KEY = 'neuromind_speech_progress';

export const SpeechPage: React.FC = () => {
  const { session, updateSpeechData, markSectionComplete, navigateTo } = useAssessment();
  const { speech, status } = session;
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'record' | 'upload'>('record');
  const [selectedPassage, setSelectedPassage] = useState<ReadingPassage | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progressStats, setProgressStats] = useState({ wordCount: 0, wordsCompleted: 0 });
  const [isUploading, setIsUploading] = useState(false);
  const [speechReady, setSpeechReady] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (status.speech) {
      localStorage.removeItem(SPEECH_PROGRESS_KEY);
      return;
    }

    try {
      const saved = localStorage.getItem(SPEECH_PROGRESS_KEY);
      if (!saved) return;

      const parsed = JSON.parse(saved);
      if (parsed.activeTab === 'record' || parsed.activeTab === 'upload') {
        setActiveTab(parsed.activeTab);
      }
      if (typeof parsed.progressStats?.wordCount === 'number') {
        setProgressStats({
          wordCount: parsed.progressStats.wordCount,
          wordsCompleted: parsed.progressStats.wordsCompleted || 0,
        });
      }
      if (parsed.selectedPassageId) {
        const passage = READING_PASSAGES.find((item) => item.id === parsed.selectedPassageId);
        if (passage) {
          setSelectedPassage(passage);
        }
      }
    } catch (error) {
      console.warn('Failed to restore speech assessment progress', error);
    }
  }, [status.speech]);

  useEffect(() => {
    if (!selectedPassage) return;
    if (status.speech) {
      localStorage.removeItem(SPEECH_PROGRESS_KEY);
      return;
    }

    localStorage.setItem(
      SPEECH_PROGRESS_KEY,
      JSON.stringify({
        activeTab,
        selectedPassageId: selectedPassage.id,
        progressStats,
      })
    );
  }, [activeTab, selectedPassage, progressStats, status.speech]);

  // Select a random passage only once when the component mounts or if not already selected in session
  useEffect(() => {
    if (speech.passageId) {
      const existing = READING_PASSAGES.find(p => p.id === speech.passageId);
      if (existing) {
        setSelectedPassage(existing);
        return;
      }
    }
    
    // Select random passage
    const randomIdx = Math.floor(Math.random() * READING_PASSAGES.length);
    const passage = READING_PASSAGES[randomIdx];
    setSelectedPassage(passage);
    
    // We only update context when they actually record or save, but we can store the selection
    updateSpeechData({
      passageId: passage.id,
      passageText: passage.text,
    });
  }, []);

  if (status.speech) {
    return <CompletedAssessmentPlaceholder title="Speech Assessment" />;
  }

  const handleProgressUpdate = (wordCount: number, wordsCompleted: number) => {
    setProgressStats({ wordCount, wordsCompleted });
  };

  const handleAudioRecorded = async (blob: Blob, url: string, durationSeconds: number) => {
    const completionRate = progressStats.wordCount > 0 ? progressStats.wordsCompleted / progressStats.wordCount : 0;
    
    const extension = blob.type.includes('ogg') ? 'ogg' : blob.type.includes('webm') ? 'webm' : 'wav';
    const audioData: SpeechAssessmentData = {
      audioBlob: blob,
      audioUrl: url,
      fileName: `recorded-speech.${extension}`,
      durationSeconds: Math.max(10, durationSeconds),
      promptId: selectedPassage?.id || 'reading-passage-1',
      promptType: 'reading',
      fileFormat: extension as 'wav' | 'webm' | 'ogg',
      wordCount: progressStats.wordCount,
      wordsCompleted: progressStats.wordsCompleted,
      completionRate,
      passageId: selectedPassage?.id,
      passageText: selectedPassage?.text,
    };
    updateSpeechData(audioData);
    setIsUploading(true); setSpeechReady(false); setUploadError(null);
    try {
      await uploadSpeech(session.sessionId, audioData);
      setSpeechReady(true);
      showToast('Speech features extracted successfully.');
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Speech upload failed.');
    } finally { setIsUploading(false); }
  };

  const handleAudioUploaded = async (file: File, url: string) => {
    const ext = file.name.split('.').pop()?.toLowerCase() as any;
    const durationSeconds = await new Promise<number>((resolve) => {
      const media = document.createElement('audio');
      media.preload = 'metadata';
      media.onloadedmetadata = () => resolve(Number.isFinite(media.duration) ? media.duration : 0);
      media.onerror = () => resolve(0);
      media.src = url;
    });
    const audioData: SpeechAssessmentData = {
      audioBlob: file,
      audioUrl: url,
      fileName: file.name,
      fileFormat: ext || 'mp3',
      durationSeconds,
      promptId: selectedPassage?.id || 'reading-passage-1',
      promptType: 'reading',
      passageId: selectedPassage?.id,
      passageText: selectedPassage?.text,
    };
    updateSpeechData(audioData);
    setIsUploading(true); setSpeechReady(false); setUploadError(null);
    try {
      await uploadSpeech(session.sessionId, audioData);
      setSpeechReady(true);
      showToast('Speech features extracted successfully.');
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Speech upload failed.');
    } finally { setIsUploading(false); }
  };

  const handleClearAudio = () => {
    setSpeechReady(false);
    setUploadError(null);
    updateSpeechData({
      audioBlob: undefined,
      audioUrl: undefined,
      fileName: undefined,
      durationSeconds: 0,
      wordCount: 0,
      wordsCompleted: 0,
      completionRate: 0,
    });
  };

  const handleSaveAndContinue = () => {
    markSectionComplete('speech', true);
    showToast('Speech assessment completed successfully.');
    navigateTo('/memory');
  };

  return (
    <div className="space-y-12 max-w-5xl mx-auto">
      {/* Animated Hero Section */}
      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="relative space-y-6"
      >
        <div className="absolute inset-0 -z-10 bg-linear-to-br from-red-50/40 via-white to-orange-50/40 rounded-4xl blur-2xl" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="flex items-center gap-4"
        >
          <motion.div
            animate={{ y: [0, -8, 0], rotate: [0, 5, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="w-14 h-14 bg-linear-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center shadow-lg"
          >
            <Mic className="w-7 h-7 text-white" />
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-[#4A2333] tracking-tight">
            Speech Assessment
          </h1>
        </motion.div>

        <motion.p 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-lg text-slate-600 font-medium max-w-2xl leading-relaxed"
        >
          Please read the passage aloud at a natural and comfortable pace. Try to read each word clearly. You do not need to rush.
        </motion.p>

        {/* Image showcase with 3D effect */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, rotateX: -15 }}
          animate={{ opacity: 1, scale: 1, rotateX: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="relative mt-8 rounded-3xl overflow-hidden shadow-[0_30px_80px_rgba(74,35,51,0.12)] border border-white/40"
          style={{ perspective: '1200px' }}
        >
          <motion.img
            src={serviceImage}
            alt="Speech Assessment"
            className="w-full h-64 object-cover"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 12, repeat: Infinity }}
            whileHover={{ scale: 1.08 }}
          />
          <motion.div
            className="absolute inset-0 bg-linear-to-t from-black/30 via-transparent to-transparent"
            animate={{ opacity: [0.2, 0.35, 0.2] }}
            transition={{ duration: 4, repeat: Infinity }}
          />
        </motion.div>
      </motion.div>

      {selectedPassage && (
        <ReadingPassageDisplay 
          passage={selectedPassage} 
          isRecording={isRecording} 
          isPaused={isPaused}
          onProgressUpdate={handleProgressUpdate}
        />
      )}

      {/* Tab Switcher: Record Audio vs Upload Audio */}
      <div className="bg-[#FDF8F5] rounded-3xl p-2 flex gap-2">
        <button
          onClick={() => setActiveTab('record')}
          className={`flex-1 py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-3 transition-all cursor-pointer ${
            activeTab === 'record'
              ? 'bg-[#4A2333] text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-[#F9EFEA]'
          }`}
        >
          <Mic className="w-5 h-5" />
          <span>Record Speech</span>
        </button>
        <button
          onClick={() => setActiveTab('upload')}
          className={`flex-1 py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-3 transition-all cursor-pointer ${
            activeTab === 'upload'
              ? 'bg-[#4A2333] text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-[#F9EFEA]'
          }`}
        >
          <UploadCloud className="w-5 h-5" />
          <span>Upload Audio</span>
        </button>
      </div>

      {/* Recording or Uploading Widget */}
      {activeTab === 'record' ? (
        <AudioRecorder
          onAudioRecorded={handleAudioRecorded}
          onClearAudio={handleClearAudio}
          recordedAudioUrl={speech.audioUrl}
          durationSeconds={speech.durationSeconds}
          onRecordingStart={() => { setIsRecording(true); setIsPaused(false); }}
          onRecordingStop={() => { setIsRecording(false); setIsPaused(false); }}
          onRecordingPause={() => setIsPaused(true)}
          onRecordingResume={() => setIsPaused(false)}
        />
      ) : (
        <AudioUploader
          onAudioUploaded={handleAudioUploaded}
          onClearAudio={handleClearAudio}
          uploadedFileName={speech.fileName}
          uploadedAudioUrl={speech.audioUrl}
        />
      )}

      {speech.audioUrl && (
        <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 flex flex-col items-center text-center space-y-4">
          <h4 className="text-xl font-bold text-emerald-800">{isUploading ? 'Processing speech…' : speechReady ? 'Speech Processing Complete' : 'Speech Audio Selected'}</h4>
          <p className="text-emerald-700">{isUploading ? 'NeuroMind is decoding the audio and extracting model features. Keep this page open.' : speechReady ? 'The backend accepted the audio and extracted the configured speech-model features.' : 'The audio must finish backend processing before you can continue.'}</p>
          
          <div className="flex gap-6 text-sm font-medium text-emerald-600 bg-white px-6 py-3 rounded-xl shadow-sm">
            <div><span className="opacity-70">Duration:</span> {speech.durationSeconds}s</div>
            {speech.wordCount !== undefined && (
              <div><span className="opacity-70">Words:</span> {speech.wordCount}</div>
            )}
            {speech.completionRate !== undefined && (
              <div><span className="opacity-70">Progress:</span> {Math.round(speech.completionRate * 100)}%</div>
            )}
          </div>
        </div>
      )}

      {uploadError && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800">{uploadError}</div>}

      {/* Bottom Navigation */}
      <div className="flex items-center justify-between pt-8 border-t border-slate-100">
        <button
          onClick={() => navigateTo('/assessment')}
          className="px-8 py-4 rounded-2xl bg-[#FDF8F5] hover:bg-[#F9EFEA] text-slate-700 font-bold text-sm transition-all flex items-center gap-3 cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>

        <button
          onClick={handleSaveAndContinue}
          disabled={!speech.audioUrl || !speechReady || isUploading}
          className={`px-8 py-4 rounded-2xl font-bold text-base shadow-md transition-all flex items-center gap-3 ${
            speech.audioUrl && speechReady && !isUploading
              ? 'bg-[#4A2333] hover:bg-[#5D2E42] text-white cursor-pointer' 
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          <span>{isUploading ? 'Processing…' : 'Continue'}</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
