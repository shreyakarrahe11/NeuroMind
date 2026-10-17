import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAssessment } from '../context/AssessmentContext';
import { submitAttentionAssessment } from '../api/client';
import { ArrowLeft, ArrowRight, Activity, CheckCircle2, Zap } from 'lucide-react';
import { CompletedAssessmentPlaceholder } from '../components/common/CompletedAssessmentPlaceholder';
import { useToast } from '../context/ToastContext';
import { attentionImage } from '../assets/index';

// Task Components
import { DigitSpanTask } from '../components/attention/DigitSpanTask';
import { ReactionTimeTask } from '../components/attention/ReactionTimeTask';
import { MediaAttentionTask } from '../components/attention/MediaAttentionTask';
import { VISUAL_ATTENTION, AUDIO_ATTENTION, MUSIC_ATTENTION, VIDEO_ATTENTION } from '../data/attentionStimuli';

const TASKS = [
  'Instructions',
  'Digit Span',
  'Reaction Time',
  'Visual Attention',
  'Audio Attention',
  'Music Attention',
  'Video Attention',
  'Summary'
];

const ATTENTION_PROGRESS_KEY = 'neuromind_attention_progress';

export const AttentionPage: React.FC = () => {
  const { session, updateAttentionData, markSectionComplete, navigateTo } = useAssessment();
  const { attention, status } = session;
  const { showToast } = useToast();

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [inProgressData, setInProgressData] = useState<any>({ startedAt: new Date().toISOString() });

  useEffect(() => {
    if (status.attention) {
      localStorage.removeItem(ATTENTION_PROGRESS_KEY);
      return;
    }

    try {
      const saved = localStorage.getItem(ATTENTION_PROGRESS_KEY);
      if (!saved) return;

      const parsed = JSON.parse(saved);
      if (typeof parsed.currentStepIndex === 'number') {
        setCurrentStepIndex(parsed.currentStepIndex);
      }
      if (parsed.inProgressData) {
        setInProgressData(parsed.inProgressData);
      }
    } catch (error) {
      console.warn('Failed to restore attention assessment progress', error);
    }
  }, [status.attention]);

  useEffect(() => {
    if (status.attention) {
      localStorage.removeItem(ATTENTION_PROGRESS_KEY);
      return;
    }

    localStorage.setItem(
      ATTENTION_PROGRESS_KEY,
      JSON.stringify({ currentStepIndex, inProgressData })
    );
  }, [currentStepIndex, inProgressData, status.attention]);

  if (status.attention) {
    return <CompletedAssessmentPlaceholder title="Attention Assessment" />;
  }

  const handleNext = () => {
    setCurrentStepIndex((prev) => Math.min(prev + 1, TASKS.length - 1));
  };

  const handleComplete = async () => {
    const completedAt = new Date().toISOString();
    const startedAt = inProgressData.startedAt || completedAt;
    const finalData = {
      ...attention,
      ...inProgressData,
      startedAt,
      completedAt,
      totalDurationMs: Math.max(0, Date.parse(completedAt) - Date.parse(startedAt)),
    };
    
    updateAttentionData(finalData);
    await submitAttentionAssessment(session.sessionId, finalData);
    
    markSectionComplete('attention', true);
    showToast('Attention assessment completed successfully.');
    navigateTo('/lifestyle');
  };

  const renderCurrentTask = () => {
    switch (currentStepIndex) {
      case 0:
        return (
          <div className="flex flex-col items-center justify-center min-h-100 p-8 bg-[#FDF8F5] rounded-4xl text-center">
            <h2 className="text-3xl font-bold text-[#4A2333] mb-4">Attention Assessment</h2>
            <p className="text-lg text-slate-600 mb-8 max-w-lg">
              This assessment measures attention, reaction speed, and sustained focus.
            </p>
            <div className="bg-white p-6 rounded-2xl text-left space-y-3 mb-8 shadow-sm border border-slate-100 max-w-md w-full">
              <p className="font-semibold text-slate-800">Please follow these instructions carefully:</p>
              <ul className="list-disc pl-5 text-slate-600 space-y-1">
                <li>Stay focused.</li>
                <li>Complete the tasks yourself.</li>
                <li>Respond as quickly as possible when instructed.</li>
                <li>Do not refresh the page during the assessment.</li>
              </ul>
              <p className="text-sm text-slate-500 pt-3 border-t border-slate-100">
                Estimated time: 5–8 minutes
              </p>
            </div>
            <button
              onClick={handleNext}
              className="px-8 py-4 rounded-2xl bg-[#4A2333] hover:bg-[#5D2E42] text-white font-bold text-lg transition-all cursor-pointer shadow-md"
            >
              Begin Attention Assessment
            </button>
          </div>
        );
      
      case 1:
        return (
          <DigitSpanTask 
            onComplete={(maxSpan, trials) => {
              setInProgressData(prev => ({ ...prev, digitSpan: maxSpan, digitSpanTrials: trials }));
              handleNext();
            }} 
          />
        );
        
      case 2:
        return (
          <ReactionTimeTask 
            onComplete={(medianMs, trials) => {
              setInProgressData(prev => ({ ...prev, reactionTimeMs: medianMs, reactionTimeTrials: trials }));
              handleNext();
            }} 
          />
        );

      case 3:
        return (
          <MediaAttentionTask
            key="visual"
            mediaType="visual"
            title="Visual Attention"
            instruction="Watch carefully. Press TARGET whenever you see a person wearing a red shirt."
            mediaUrl={VISUAL_ATTENTION.mediaUrl}
            targetWindows={VISUAL_ATTENTION.targetWindows}
            onComplete={(result) => {
              setInProgressData(prev => ({ ...prev, visualAttention: result, sustainedAttention: result }));
              handleNext();
            }}
          />
        );

      case 4:
        return (
          <MediaAttentionTask
            key="audio"
            mediaType="audio"
            title="Audio Attention"
            instruction="You will hear several sounds. Press TARGET HEARD only when you hear the target sound."
            mediaUrl={AUDIO_ATTENTION.mediaUrl}
            targetWindows={AUDIO_ATTENTION.targetWindows}
            onComplete={(result) => {
              setInProgressData(prev => ({ ...prev, audioAttention: result }));
              handleNext();
            }}
          />
        );

      case 5:
        return (
          <MediaAttentionTask
            key="music"
            mediaType="music"
            title="Music Attention"
            instruction="Listen carefully to the music. Press the button whenever you hear the target musical event."
            mediaUrl={MUSIC_ATTENTION.mediaUrl}
            targetWindows={MUSIC_ATTENTION.targetWindows}
            onComplete={(result) => {
              setInProgressData(prev => ({ ...prev, musicAttention: result }));
              handleNext();
            }}
          />
        );

      case 6:
        return (
          <MediaAttentionTask
            key="video"
            mediaType="video"
            title="Video Attention"
            instruction="Watch the video carefully. Press TARGET whenever the target event occurs."
            mediaUrl={VIDEO_ATTENTION.mediaUrl}
            targetWindows={VIDEO_ATTENTION.targetWindows}
            onComplete={(result) => {
              setInProgressData(prev => ({ ...prev, videoAttention: result }));
              handleNext();
            }}
          />
        );

      case 7:
        return (
          <div className="flex flex-col items-center justify-center min-h-100 p-8 bg-[#FDF8F5] rounded-4xl text-center space-y-6">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-2">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-bold text-[#4A2333]">Attention Assessment Complete</h2>
            
            <div className="w-full max-w-sm text-left bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-3">
              {TASKS.slice(1, 7).map((t, idx) => (
                <div key={t} className="flex items-center gap-3 text-slate-700 font-medium">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span>{t}</span>
                </div>
              ))}
            </div>

            <div className="pt-6">
              <button
                onClick={handleComplete}
                className="px-8 py-4 rounded-2xl bg-[#4A2333] hover:bg-[#5D2E42] text-white font-bold text-lg shadow-md transition-all cursor-pointer flex items-center gap-2"
              >
                <span>Continue to Lifestyle Assessment</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Animated Hero Section */}
      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="relative space-y-6"
      >
        <div className="absolute inset-0 -z-10 bg-linear-to-br from-orange-50/40 via-white to-yellow-50/40 rounded-4xl blur-2xl" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="flex items-center gap-4"
        >
          <motion.div
            animate={{ y: [0, -8, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="w-14 h-14 bg-linear-to-br from-orange-400 to-yellow-500 rounded-full flex items-center justify-center shadow-lg"
          >
            <Zap className="w-7 h-7 text-white" />
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-[#4A2333] tracking-tight">
            Attention Assessment
          </h1>
        </motion.div>

        {/* Image showcase with 3D effect */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, rotateX: -15 }}
          animate={{ opacity: 1, scale: 1, rotateX: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="relative rounded-3xl overflow-hidden shadow-[0_30px_80px_rgba(74,35,51,0.12)] border border-white/40"
          style={{ perspective: '1200px' }}
        >
          <motion.img
            src={attentionImage}
            alt="Attention Assessment"
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

      {/* Global Progress Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">
            Step {Math.min(currentStepIndex + 1, TASKS.length)} of {TASKS.length}
          </p>
          <span className="text-sm font-semibold text-[#4A2333]">
            {Math.round(((currentStepIndex + 1) / TASKS.length) * 100)}%
          </span>
        </div>
        
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-[#4A2333] transition-all duration-500 ease-out"
            style={{ width: `${((currentStepIndex + 1) / TASKS.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Internal Sidebar Navigation */}
        <div className="hidden lg:block w-64 shrink-0">
          <div className="bg-white border border-slate-100 rounded-2xl p-4 sticky top-6 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-2">Task Sequence</h3>
            <div className="space-y-1">
              {TASKS.slice(1).map((task, idx) => {
                const stepIdx = idx + 1; // offset for Instructions
                const isCompleted = currentStepIndex > stepIdx;
                const isActive = currentStepIndex === stepIdx;
                
                return (
                  <div 
                    key={task}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      isActive ? 'bg-[#FDF8F5] text-[#4A2333]' : 
                      isCompleted ? 'text-emerald-700' : 'text-slate-400'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : isActive ? (
                      <div className="w-4 h-4 rounded-full border-4 border-[#4A2333] shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-slate-300 shrink-0" />
                    )}
                    <span>{task}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Main Task Area */}
        <div className="flex-1">
          {renderCurrentTask()}
        </div>
      </div>
    </div>
  );
};
