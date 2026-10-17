import React, { useState } from 'react';
import { LifestyleAssessmentData } from '../../types/assessment';
import { Check, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LifestyleQuestionnaireProps {
  initialData?: LifestyleAssessmentData;
  onSaveLifestyle: (data: LifestyleAssessmentData) => void;
}

const QUESTIONS = [
  {
    id: 'sleepHours',
    text: '1. How many hours do you usually sleep each night?',
    options: ['4 hours or less', '5–6 hours', '7–8 hours', '9–10 hours', 'More than 10 hours'],
    mapToVal: (opt: string) => {
      if (opt === '4 hours or less') return '<4';
      if (opt === '5–6 hours') return '5-6';
      if (opt === '7–8 hours') return '7-8';
      if (opt === '9–10 hours') return '9-10';
      return '>10';
    }
  },
  {
    id: 'sleepQuality',
    text: '2. How would you rate the quality of your sleep?',
    options: ['Bad', 'Moderate', 'Good'],
    mapToVal: (opt: string) => opt as 'Bad' | 'Moderate' | 'Good'
  },
  {
    id: 'exerciseHoursWeek',
    text: '3. How many hours of physical exercise or activity do you usually do per week?',
    options: ['Less than 1 hour', '1–2 hours', '3–5 hours', '6–10 hours', 'More than 10 hours'],
    mapToVal: (opt: string) => {
      if (opt === 'Less than 1 hour') return '<1';
      if (opt === '1–2 hours') return '1-2';
      if (opt === '3–5 hours') return '3-5';
      if (opt === '6–10 hours') return '6-10';
      return '>10';
    }
  },
  {
    id: 'smoking',
    text: '4. Do you currently smoke or use tobacco products?',
    options: ['No', 'Yes'],
    mapToVal: (opt: string) => opt === 'Yes'
  },
  {
    id: 'alcoholUse',
    text: '5. How often do you consume alcohol?',
    options: ['None', 'Occasional', 'Frequent'],
    mapToVal: (opt: string) => opt as 'None' | 'Occasional' | 'Frequent'
  },
  {
    id: 'hypertension',
    text: '6. Do you have a history of high blood pressure (hypertension)?',
    options: ['No', 'Yes'],
    mapToVal: (opt: string) => opt === 'Yes'
  },
  {
    id: 'diabetes',
    text: '7. Do you have diabetes?',
    options: ['No', 'Yes'],
    mapToVal: (opt: string) => opt === 'Yes'
  },
  {
    id: 'cardiovascular',
    text: '8. Do you have a cardiovascular condition or history of heart-related disease?',
    options: ['No', 'Yes'],
    mapToVal: (opt: string) => opt === 'Yes'
  },
  {
    id: 'dailyLifestyle',
    text: '9. How would you describe your overall daily lifestyle?',
    options: ['Very healthy', 'Generally healthy', 'Moderate', 'Unhealthy'],
    mapToVal: (opt: string) => opt as 'Very healthy' | 'Generally healthy' | 'Moderate' | 'Unhealthy'
  },
  {
    id: 'socialActivity',
    text: '10. How often do you participate in activities that keep you mentally or socially active, such as reading, puzzles, hobbies, conversations, or social activities?',
    options: ['Rarely', 'Occasionally', 'Several times a week', 'Daily'],
    mapToVal: (opt: string) => opt as 'Rarely' | 'Occasionally' | 'Several times a week' | 'Daily'
  }
];

export const LifestyleQuestionnaire: React.FC<LifestyleQuestionnaireProps> = ({
  onSaveLifestyle,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<LifestyleAssessmentData>>({});

  const handleAnswer = (questionId: string, value: any) => {
    const updatedAnswers = { ...answers, [questionId]: value };
    setAnswers(updatedAnswers);

    if (currentStep < QUESTIONS.length - 1) {
      setTimeout(() => {
        setCurrentStep((prev) => prev + 1);
      }, 300);
    } else {
      // Finalize
      setTimeout(() => {
        setCurrentStep(QUESTIONS.length);
        finalizeAssessment(updatedAnswers);
      }, 300);
    }
  };

  const finalizeAssessment = (finalAnswers: Partial<LifestyleAssessmentData>) => {
    // Populate medicalHistory array based on yes/no answers
    const medicalHistory: ('Hypertension' | 'Diabetes' | 'Cardiovascular' | 'Depression' | 'Head Injury' | 'None')[] = [];
    if (finalAnswers.hypertension) medicalHistory.push('Hypertension');
    if (finalAnswers.diabetes) medicalHistory.push('Diabetes');
    if (finalAnswers.cardiovascular) medicalHistory.push('Cardiovascular');
    if (medicalHistory.length === 0) medicalHistory.push('None');

    const data: LifestyleAssessmentData = {
      sleepHours: finalAnswers.sleepHours as any || '7-8',
      sleepQuality: finalAnswers.sleepQuality as any || 'Moderate',
      exerciseHoursWeek: finalAnswers.exerciseHoursWeek as any || '1-2',
      smoking: finalAnswers.smoking || false,
      alcoholUse: finalAnswers.alcoholUse as any || 'Occasional',
      hypertension: finalAnswers.hypertension,
      diabetes: finalAnswers.diabetes,
      cardiovascular: finalAnswers.cardiovascular,
      medicalHistory,
      dailyLifestyle: finalAnswers.dailyLifestyle as any,
      socialActivity: finalAnswers.socialActivity as any,
    };
    onSaveLifestyle(data);
  };

  if (currentStep >= QUESTIONS.length) {
    return (
      <div className="p-8 bg-white rounded-2xl border border-slate-200 shadow-sm text-center space-y-6">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
          <Check className="w-8 h-8 text-emerald-600" />
        </div>
        <h3 className="text-2xl font-heading font-bold text-slate-900">Assessment Complete</h3>
        <p className="text-slate-600 max-w-lg mx-auto leading-relaxed">
          Thank you. Your lifestyle assessment is complete. Your responses will be combined with the Speech, Memory, and Attention assessments to generate the NeuroMind multimodal screening result.
        </p>
      </div>
    );
  }

  const currentQuestion = QUESTIONS[currentStep];

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-2xl border border-slate-200 shadow-sm min-h-[400px] flex flex-col justify-center">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
            Question {currentStep + 1} of {QUESTIONS.length}
          </span>
          <span className="text-sm font-semibold text-indigo-600">
            {Math.round((currentStep / QUESTIONS.length) * 100)}%
          </span>
        </div>
        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-indigo-600 rounded-full"
            initial={{ width: `${(currentStep / QUESTIONS.length) * 100}%` }}
            animate={{ width: `${((currentStep) / QUESTIONS.length) * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="space-y-6 flex-1"
        >
          <h3 className="text-2xl font-heading font-semibold text-slate-900 leading-snug">
            {currentQuestion.text}
          </h3>

          <div className="space-y-3">
            {currentQuestion.options.map((option, idx) => {
              const val = currentQuestion.mapToVal(option);
              const isSelected = answers[currentQuestion.id as keyof LifestyleAssessmentData] === val;
              
              return (
                <button
                  key={idx}
                  onClick={() => handleAnswer(currentQuestion.id, val)}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center justify-between group ${
                    isSelected 
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-900' 
                      : 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span className="font-medium text-lg">{option}</span>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                    isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300 group-hover:border-indigo-400'
                  }`}>
                    {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

