import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAssessment } from '../context/AssessmentContext';
import { submitMemoryAssessment } from '../api/client';
import { MEMORY_STIMULI, MemoryStimulus } from '../data/memoryStimuli';
import { Brain, ArrowRight, CheckCircle2, Clock } from 'lucide-react';
import { CompletedAssessmentPlaceholder } from '../components/common/CompletedAssessmentPlaceholder';
import { useToast } from '../context/ToastContext';
import { memoryImage } from '../assets/index';

type MemoryStep = 
  | 'instructions' 
  | 'learning' 
  | 'immediate' 
  | 'intervening' 
  | 'delayed' 
  | 'recognition' 
  | 'complete';

const MEMORY_STEP_SEQUENCE: MemoryStep[] = [
  'instructions',
  'learning',
  'immediate',
  'intervening',
  'delayed',
  'recognition',
  'complete',
];

const MEMORY_STEP_LABELS: Record<MemoryStep, string> = {
  instructions: 'Instructions',
  learning: 'Learning',
  immediate: 'Immediate Recall',
  intervening: 'Intervening Task',
  delayed: 'Delayed Recall',
  recognition: 'Recognition',
  complete: 'Complete',
};

const MEMORY_PROGRESS_KEY = 'neuromind_memory_progress';

const shuffleStimuli = (items: MemoryStimulus[]) => {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  return shuffled;
};

const splitRecallAnswers = (value: string) =>
  value
    .split(/[\n,;]+/)
    .map((answer) => answer.trim())
    .filter(Boolean);

export const MemoryPage: React.FC = () => {
  const { session, updateMemoryData, markSectionComplete, navigateTo } = useAssessment();
  const { memory, status } = session;
  const { showToast } = useToast();

  const [step, setStep] = useState<MemoryStep>('instructions');
  const [targetStimuli, setTargetStimuli] = useState<MemoryStimulus[]>([]);
  const [distractorStimuli, setDistractorStimuli] = useState<MemoryStimulus[]>([]);
  
  // Learning state
  const [currentLearningIndex, setCurrentLearningIndex] = useState(0);
  const [learningTimer, setLearningTimer] = useState(0);
  
  // Answers state
  const [immediateAnswers, setImmediateAnswers] = useState('');
  const [delayedAnswers, setDelayedAnswers] = useState('');
  const [recognitionSelections, setRecognitionSelections] = useState<string[]>([]);
  const [startedAt, setStartedAt] = useState(() => new Date().toISOString());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const progressKey = `${MEMORY_PROGRESS_KEY}:${session.sessionId}`;

  useEffect(() => {
    if (status.memory) {
      localStorage.removeItem(progressKey);
      return;
    }

    try {
      // Remove progress created by older builds because it was not scoped to an
      // assessment and could restore another patient's stimuli.
      localStorage.removeItem(MEMORY_PROGRESS_KEY);
      const saved = localStorage.getItem(progressKey);
      if (!saved) return;

      const parsed = JSON.parse(saved);
      const hasValidStimuli =
        Array.isArray(parsed.targetStimuli) && parsed.targetStimuli.length === 10 &&
        Array.isArray(parsed.distractorStimuli) && parsed.distractorStimuli.length === 10;
      if (parsed?.step && parsed.step !== 'instructions' && !hasValidStimuli) {
        localStorage.removeItem(progressKey);
        return;
      }
      if (parsed?.step && MEMORY_STEP_SEQUENCE.includes(parsed.step)) {
        setStep(parsed.step);
      }
      if (Array.isArray(parsed.targetStimuli) && parsed.targetStimuli.length === 10) {
        setTargetStimuli(parsed.targetStimuli);
      }
      if (Array.isArray(parsed.distractorStimuli) && parsed.distractorStimuli.length === 10) {
        setDistractorStimuli(parsed.distractorStimuli);
      }
      if (typeof parsed.currentLearningIndex === 'number') {
        setCurrentLearningIndex(parsed.currentLearningIndex);
      }
      if (typeof parsed.learningTimer === 'number') {
        setLearningTimer(parsed.learningTimer);
      }
      if (typeof parsed.immediateAnswers === 'string') {
        setImmediateAnswers(parsed.immediateAnswers);
      }
      if (typeof parsed.delayedAnswers === 'string') {
        setDelayedAnswers(parsed.delayedAnswers);
      }
      if (Array.isArray(parsed.recognitionSelections)) {
        setRecognitionSelections(parsed.recognitionSelections);
      }
      if (typeof parsed.startedAt === 'string') setStartedAt(parsed.startedAt);
    } catch (error) {
      console.warn('Failed to restore memory assessment progress', error);
      localStorage.removeItem(progressKey);
    }
  }, [progressKey, status.memory]);

  useEffect(() => {
    if (status.memory) {
      localStorage.removeItem(progressKey);
      return;
    }

    const payload = {
      step,
      targetStimuli,
      distractorStimuli,
      currentLearningIndex,
      learningTimer,
      immediateAnswers,
      delayedAnswers,
      recognitionSelections,
      startedAt,
    };

    localStorage.setItem(progressKey, JSON.stringify(payload));
  }, [step, targetStimuli, distractorStimuli, currentLearningIndex, learningTimer, immediateAnswers, delayedAnswers, recognitionSelections, startedAt, status.memory, progressKey]);

  // Initialize stimuli on start
  const handleStart = () => {
    setSubmissionError(null);
    setStartedAt(new Date().toISOString());
    const shuffled = shuffleStimuli(MEMORY_STIMULI);
    const targets = shuffled.slice(0, 10);
    const distractors = shuffled.slice(10, 20);
    
    setTargetStimuli(targets);
    setDistractorStimuli(distractors);
    setStep('learning');
    setCurrentLearningIndex(0);
    setLearningTimer(0);
  };

  // Learning auto-advance timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 'learning') {
      timer = setInterval(() => {
        setLearningTimer((prev) => {
          if (prev >= 2.9) { // 3 seconds per image
            if (currentLearningIndex < targetStimuli.length - 1) {
              setCurrentLearningIndex(i => i + 1);
              return 0; // reset timer for next image
            } else {
              setStep('immediate');
              clearInterval(timer);
              return 0;
            }
          }
          return prev + 0.1; // Check every 100ms for smooth progress bar
        });
      }, 100);
    }
    return () => clearInterval(timer);
  }, [step, currentLearningIndex, targetStimuli.length]);

  const normalizeWord = (word: string) => word.trim().toLowerCase().replace(/[^a-z0-9\s-]/g, ' ');

  const scoreRecall = (answersText: string) => {
    const normalizedText = ` ${normalizeWord(answersText)} `;
    const targetLabels = targetStimuli.map(t => normalizeWord(t.label));

    return targetLabels.filter((label) => {
      const variants = label === 'glasses'
        ? ['glasses', 'spectacles', 'eyeglasses']
        : label.endsWith('s')
          ? [label, label.slice(0, -1)]
          : [label, `${label}s`];
      return variants.some((variant) => {
        const escaped = variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(`(^|\\s)${escaped}(?=\\s|$)`, 'i').test(normalizedText);
      });
    }).length;
  };

  const handleImmediateSubmit = () => {
    if (!immediateAnswers.trim()) return;
    setSubmissionError(null);
    setStep('intervening');
  };

  const handleInterveningComplete = () => {
    setStep('delayed');
  };

  const handleDelayedSubmit = () => {
    if (!delayedAnswers.trim()) return;
    setSubmissionError(null);
    setStep('recognition');
  };

  const toggleRecognitionSelection = (id: string) => {
    if (recognitionSelections.includes(id)) {
      setRecognitionSelections(recognitionSelections.filter(s => s !== id));
    } else {
      setRecognitionSelections([...recognitionSelections, id]);
    }
  };

  const handleRecognitionSubmit = async () => {
    if (isSubmitting || targetStimuli.length !== 10 || distractorStimuli.length !== 10) {
      setSubmissionError('The memory task data is incomplete. Please restart this assessment.');
      return;
    }

    setIsSubmitting(true);
    setSubmissionError(null);

    const immediateRecallScore = scoreRecall(immediateAnswers);
    const delayedRecallScore = scoreRecall(delayedAnswers);

    const targetIds = targetStimuli.map(t => t.id);
    const correctSelections = recognitionSelections.filter(id => targetIds.includes(id)).length;
    const falsePositives = recognitionSelections.length - correctSelections;
    const correctRejections = distractorStimuli.length - falsePositives;
    const recognitionTotalCorrect = correctSelections + correctRejections;

    const updatedMetrics = {
      immediateRecallCount: immediateRecallScore,
      delayedRecallCount: delayedRecallScore,
      recognitionTruePositives: correctSelections,
      recognitionFalsePositives: falsePositives,
      recognitionTotalCorrect,
    };

    const completedMemory = {
      ...memory,
      encodingImagesSeen: targetIds,
      exposureDurationMs: 3000,
      immediateRecallText: immediateAnswers.trim(),
      immediateRecallItems: splitRecallAnswers(immediateAnswers),
      delayedRecallText: delayedAnswers.trim(),
      delayedRecallItems: splitRecallAnswers(delayedAnswers),
      recognitionSelectedIds: recognitionSelections,
      recognitionCorrectIds: recognitionSelections.filter((id) => targetIds.includes(id)),
      rawMetrics: updatedMetrics,
      startedAt,
      completedAt: new Date().toISOString(),
      stepDurationsMs: {},
    };

    try {
      await submitMemoryAssessment(session.sessionId, completedMemory);
      updateMemoryData(completedMemory);
      markSectionComplete('memory', true);
      localStorage.removeItem(progressKey);
      setStep('complete');
      showToast('Memory assessment completed successfully.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save the memory assessment.';
      setSubmissionError(message);
      showToast(message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStepNumber = () => {
    switch (step) {
      case 'instructions': return 1;
      case 'learning': return 2;
      case 'immediate': return 3;
      case 'intervening': return 4;
      case 'delayed': return 5;
      case 'recognition': return 6;
      case 'complete': return 7;
    }
  };

  // Combine and shuffle targets and distractors for recognition grid
  const allRecognitionStimuli = React.useMemo(() => {
    if (step === 'recognition') {
      return shuffleStimuli([...targetStimuli, ...distractorStimuli]);
    }
    return [];
  }, [step, targetStimuli, distractorStimuli]);

  // This return must stay after every hook above. Returning earlier caused a
  // React hook-order crash as soon as the memory section was marked complete.
  if (status.memory && step !== 'complete') {
    return <CompletedAssessmentPlaceholder title="Memory Assessment" />;
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Animated Hero Section */}
      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="relative space-y-6"
      >
        <div className="absolute inset-0 -z-10 bg-linear-to-br from-blue-50/40 via-white to-purple-50/40 rounded-4xl blur-2xl" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="flex items-center gap-4"
        >
          <motion.div
            animate={{ y: [0, -8, 0], rotate: [0, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="w-14 h-14 bg-linear-to-br from-blue-400 to-purple-600 rounded-full flex items-center justify-center shadow-lg"
          >
            <Brain className="w-7 h-7 text-white" />
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-[#4A2333] tracking-tight">
            Memory Assessment
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
            src={memoryImage}
            alt="Memory Assessment"
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

      <div className="space-y-4">
        {step !== 'complete' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">
                Step {getStepNumber()} of 6
              </p>
              <span className="text-sm font-semibold text-[#4A2333]">
                {Math.round(((getStepNumber()) / 6) * 100)}%
              </span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#4A2333] transition-all duration-500 ease-out" 
                style={{ width: `${(getStepNumber() / 6) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="hidden lg:block w-64 shrink-0">
          <div className="bg-white border border-slate-100 rounded-2xl p-4 sticky top-6 shadow-sm">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-2">
              Task Sequence
            </h3>
            <div className="space-y-1">
              {MEMORY_STEP_SEQUENCE.slice(0, 6).map((memoryStep) => {
                const stepIndex = MEMORY_STEP_SEQUENCE.indexOf(memoryStep);
                const currentStepIndex = MEMORY_STEP_SEQUENCE.indexOf(step);
                const isCompleted = currentStepIndex > stepIndex;
                const isActive = currentStepIndex === stepIndex;

                return (
                  <div
                    key={memoryStep}
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
                    <span>{MEMORY_STEP_LABELS[memoryStep]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex-1">
              {/* STEP 1: Instructions */}
          {step === 'instructions' && (
        <div className="space-y-8">
          <div className="p-10 bg-white rounded-4xl shadow-sm border border-slate-100 space-y-6">
            <div className="w-16 h-16 bg-[#FDF8F5] text-[#4A2333] rounded-2xl flex items-center justify-center mb-6">
              <Brain className="w-8 h-8" />
            </div>
            
            <h2 className="text-2xl font-bold text-slate-900">
              This assessment measures memory through learning, recall, and recognition tasks.
            </h2>
            
            <div className="bg-[#FDF8F5] p-6 rounded-2xl">
              <p className="text-lg text-slate-700 font-medium leading-relaxed">
                You will be shown a series of pictures one at a time. Try to remember each item carefully. Later, you will be asked to recall and recognize the items.
              </p>
            </div>

            <ul className="space-y-4 text-slate-600 font-medium">
              <li className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-[#4A2333]" />
                Pay attention to each image.
              </li>
              <li className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-[#4A2333]" />
                Try to remember the objects.
              </li>
              <li className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-[#4A2333]" />
                Do not write anything down.
              </li>
              <li className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-[#4A2333]" />
                Complete the tasks yourself.
              </li>
            </ul>

            <div className="pt-6 border-t border-slate-100 flex items-center gap-2 text-slate-500 font-medium">
              <Clock className="w-5 h-5" />
              Estimated time: 5–7 minutes
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleStart}
              className="px-8 py-4 rounded-2xl bg-[#4A2333] hover:bg-[#5D2E42] text-white font-bold text-lg shadow-md transition-all flex items-center gap-3"
            >
              <span>Begin Memory Assessment</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

          {/* STEP 2: Learning */}
          {step === 'learning' && (
        <div className="space-y-8 max-w-2xl mx-auto">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-slate-900">Remember this object.</h2>
            <p className="text-slate-500 font-medium">Focus on the image carefully.</p>
          </div>

          <div className="bg-white p-8 rounded-4xl shadow-sm border border-slate-100 flex flex-col items-center space-y-8">
            <div className="relative w-64 h-64 md:w-80 md:h-80 rounded-3xl overflow-hidden bg-slate-50 border border-slate-100 shadow-inner">
              <img 
                src={targetStimuli[currentLearningIndex]?.imageUrl} 
                alt="Memory Stimulus"
                className="w-full h-full object-cover"
              />
            </div>
            
            <div className="w-full max-w-xs space-y-3">
              <div className="text-center font-bold text-slate-500 uppercase tracking-widest text-sm">
                Object {currentLearningIndex + 1} of 10
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-400 transition-all duration-100 ease-linear"
                  style={{ width: `${(learningTimer / 3) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

          {/* STEP 3: Immediate Recall */}
          {step === 'immediate' && (
        <div className="space-y-8 max-w-2xl mx-auto">
          <div className="p-8 bg-white rounded-4xl shadow-sm border border-slate-100 space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-900">Immediate Recall</h2>
              <p className="text-slate-600 font-medium text-lg leading-relaxed">
                Type the objects you remember from the previous activity.
              </p>
              <p className="text-slate-500 text-sm">
                Enter as many as you can remember. You do not need to enter them in the original order. You can separate them by commas or new lines.
              </p>
            </div>

            <textarea
              value={immediateAnswers}
              onChange={(e) => setImmediateAnswers(e.target.value)}
              placeholder="Example: apple, book, dog, chair..."
              className="w-full h-48 p-5 text-lg rounded-2xl border-2 border-slate-200 focus:border-[#4A2333] focus:ring-4 focus:ring-[#4A2333]/10 transition-all outline-none resize-none font-medium text-slate-800 placeholder:text-slate-300"
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleImmediateSubmit}
              disabled={!immediateAnswers.trim()}
              className={`px-8 py-4 rounded-2xl font-bold text-lg shadow-md transition-all flex items-center gap-3 ${
                immediateAnswers.trim()
                  ? 'bg-[#4A2333] hover:bg-[#5D2E42] text-white'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <span>Submit</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

          {/* STEP 4: Intervening Activity */}
          {step === 'intervening' && (
        <div className="space-y-8 max-w-2xl mx-auto text-center">
          <div className="p-12 bg-white rounded-4xl shadow-sm border border-slate-100 space-y-6">
            <h2 className="text-2xl font-bold text-slate-900">Short Intervening Activity</h2>
            <p className="text-slate-600 font-medium text-lg max-w-md mx-auto">
              Next, you will complete a short activity before continuing with the memory test. Take a brief breath, then continue.
            </p>
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleInterveningComplete}
              className="px-8 py-4 rounded-2xl bg-[#4A2333] hover:bg-[#5D2E42] text-white font-bold text-lg shadow-md transition-all flex items-center gap-3"
            >
              <span>Continue</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

          {/* STEP 5: Delayed Recall */}
          {step === 'delayed' && (
        <div className="space-y-8 max-w-2xl mx-auto">
          <div className="p-8 bg-white rounded-4xl shadow-sm border border-slate-100 space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-900">Delayed Recall</h2>
              <p className="text-slate-600 font-medium text-lg leading-relaxed">
                Without looking back, type the objects you remember from the earlier memory activity.
              </p>
              <p className="text-slate-500 text-sm">
                Enter as many as you can remember. You can separate them by commas or new lines.
              </p>
            </div>

            <textarea
              value={delayedAnswers}
              onChange={(e) => setDelayedAnswers(e.target.value)}
              placeholder="Example: apple, book, dog, chair..."
              className="w-full h-48 p-5 text-lg rounded-2xl border-2 border-slate-200 focus:border-[#4A2333] focus:ring-4 focus:ring-[#4A2333]/10 transition-all outline-none resize-none font-medium text-slate-800 placeholder:text-slate-300"
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleDelayedSubmit}
              disabled={!delayedAnswers.trim()}
              className={`px-8 py-4 rounded-2xl font-bold text-lg shadow-md transition-all flex items-center gap-3 ${
                delayedAnswers.trim()
                  ? 'bg-[#4A2333] hover:bg-[#5D2E42] text-white'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <span>Submit Delayed Recall</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

          {/* STEP 6: Recognition */}
          {step === 'recognition' && (
        <div className="space-y-8">
          {submissionError && (
            <div role="alert" className="p-4 rounded-2xl border border-rose-200 bg-rose-50 text-sm font-semibold text-rose-800">
              {submissionError}
            </div>
          )}
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-900">Recognition</h2>
            <p className="text-slate-600 font-medium text-lg">
              Which of these objects did you see earlier? Select every object you remember seeing in the first task.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
            {allRecognitionStimuli.map((stimulus) => {
              const isSelected = recognitionSelections.includes(stimulus.id);
              return (
                <button
                  key={stimulus.id}
                  onClick={() => toggleRecognitionSelection(stimulus.id)}
                  className={`relative group rounded-2xl overflow-hidden transition-all duration-200 border-4 focus:outline-none focus:ring-4 focus:ring-[#4A2333]/20 ${
                    isSelected 
                      ? 'border-[#4A2333] shadow-md scale-105' 
                      : 'border-transparent hover:border-slate-200 bg-white shadow-sm'
                  }`}
                >
                  <div className="aspect-square bg-slate-50 w-full relative">
                    <img 
                      src={stimulus.imageUrl} 
                      alt="Selectable object" 
                      className={`w-full h-full object-cover transition-opacity ${isSelected ? 'opacity-80' : 'opacity-100 group-hover:opacity-90'}`}
                    />
                    {isSelected && (
                      <div className="absolute inset-0 bg-[#4A2333]/10 flex items-center justify-center">
                        <div className="bg-[#4A2333] text-white rounded-full p-2 shadow-lg scale-110">
                          <CheckCircle2 className="w-8 h-8" />
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="text-slate-600 font-medium">
              <span className="font-bold text-slate-900">{recognitionSelections.length}</span> objects selected
            </div>
            <button
              onClick={handleRecognitionSubmit}
              disabled={isSubmitting}
              className="px-8 py-4 rounded-2xl bg-[#4A2333] hover:bg-[#5D2E42] text-white font-bold text-lg shadow-md transition-all flex items-center gap-3 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span>{isSubmitting ? 'Saving Assessment...' : 'Finish Recognition'}</span>
              <CheckCircle2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

          {/* STEP 7: Complete */}
          {step === 'complete' && (
        <div className="space-y-8 max-w-2xl mx-auto text-center">
          <div className="p-12 bg-emerald-50 rounded-4xl border border-emerald-100 space-y-6">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            
            <h2 className="text-3xl font-bold text-emerald-900">Memory Assessment Complete</h2>
            <p className="text-emerald-700 font-medium text-lg">
              Your memory assessment has been recorded.
            </p>

            <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto pt-6 text-left">
              <div className="flex items-center gap-3 text-emerald-800 font-medium bg-white px-4 py-3 rounded-xl shadow-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                Learning
              </div>
              <div className="flex items-center gap-3 text-emerald-800 font-medium bg-white px-4 py-3 rounded-xl shadow-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                Immediate Recall
              </div>
              <div className="flex items-center gap-3 text-emerald-800 font-medium bg-white px-4 py-3 rounded-xl shadow-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                Delayed Recall
              </div>
              <div className="flex items-center gap-3 text-emerald-800 font-medium bg-white px-4 py-3 rounded-xl shadow-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                Recognition
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={() => navigateTo('/attention')}
              className="px-8 py-4 rounded-2xl bg-[#4A2333] hover:bg-[#5D2E42] text-white font-bold text-lg shadow-md transition-all flex items-center gap-3"
            >
              <span>Continue to Attention Assessment</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
};
