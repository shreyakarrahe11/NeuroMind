import React from 'react';
import { useAssessment } from '../context/AssessmentContext';
import { submitLifestyleAssessment } from '../api/client';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { LifestyleAssessmentData } from '../types/assessment';
import { LifestyleQuestionnaire } from '../components/lifestyle/LifestyleQuestionnaire';
import { CompletedAssessmentPlaceholder } from '../components/common/CompletedAssessmentPlaceholder';
import { useToast } from '../context/ToastContext';

export const LifestylePage: React.FC = () => {
  const { session, updateLifestyleData, markSectionComplete, navigateTo } = useAssessment();
  const { status } = session;
  const { showToast } = useToast();

  const handleSaveAndContinue = async (data: LifestyleAssessmentData) => {
    updateLifestyleData(data);
    await submitLifestyleAssessment(session.sessionId, data);
    markSectionComplete('lifestyle', true);
    showToast('Lifestyle assessment completed successfully.');
    navigateTo('/review');
  };

  if (status.lifestyle) {
    return <CompletedAssessmentPlaceholder title="Lifestyle Questionnaire" />;
  }

  return (
    <div className="space-y-12 max-w-4xl mx-auto">
      <div className="space-y-3">
        <h1 className="text-3xl md:text-4xl font-heading font-bold text-[#4A2333] tracking-tight">
          Lifestyle Questionnaire
        </h1>
        <p className="text-base text-slate-500 font-medium tracking-widest uppercase">
          Please answer the following questions.
        </p>
      </div>

      <div className="bg-[#FDF8F5] p-6 rounded-4xl">
        <LifestyleQuestionnaire onSaveLifestyle={handleSaveAndContinue} />
      </div>

      <div className="flex items-center justify-between pt-8 border-t border-slate-100">
        <button
          onClick={() => navigateTo('/attention')}
          className="px-8 py-4 rounded-2xl bg-[#FDF8F5] hover:bg-[#F9EFEA] text-slate-700 font-bold text-sm transition-all flex items-center gap-3 cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>
      </div>
    </div>
  );
};

