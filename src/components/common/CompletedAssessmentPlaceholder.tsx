import React from 'react';
import { useAssessment } from '../../context/AssessmentContext';
import { CheckCircle2, ArrowRight, Home } from 'lucide-react';

interface CompletedAssessmentPlaceholderProps {
  title: string;
}

export const CompletedAssessmentPlaceholder: React.FC<CompletedAssessmentPlaceholderProps> = ({ title }) => {
  const { session, navigateTo } = useAssessment();
  const { status } = session;

  const handleNext = () => {
    if (!status.speech) return navigateTo('/speech');
    if (!status.memory) return navigateTo('/memory');
    if (!status.attention) return navigateTo('/attention');
    if (!status.lifestyle) return navigateTo('/lifestyle');
    return navigateTo('/review');
  };

  const getNextTestName = () => {
    if (!status.speech) return 'Speech Assessment';
    if (!status.memory) return 'Memory Assessment';
    if (!status.attention) return 'Attention Assessment';
    if (!status.lifestyle) return 'Lifestyle Questionnaire';
    return 'Review Assessment';
  };

  const allCompleted = Object.values(status).every(Boolean);

  return (
    <div className="space-y-12 max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
        <CheckCircle2 className="w-12 h-12" />
      </div>
      <h1 className="text-3xl md:text-4xl font-heading font-bold text-[#4A2333] tracking-tight">
        {title} Completed
      </h1>
      <p className="text-lg text-slate-500 max-w-lg">
        You have successfully completed this section of the assessment. Your responses have been recorded securely.
      </p>
      
      <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
        <button
          onClick={() => navigateTo('/assessment')}
          className="px-8 py-4 rounded-2xl bg-[#FDF8F5] hover:bg-[#F9EFEA] text-slate-700 font-bold text-base transition-all flex items-center gap-3 cursor-pointer"
        >
          <Home className="w-5 h-5" />
          <span>Back to Overview</span>
        </button>
        <button
          onClick={handleNext}
          className="px-8 py-4 rounded-2xl bg-[#4A2333] hover:bg-[#5D2E42] text-white font-bold text-base transition-all flex items-center gap-3 cursor-pointer"
        >
          <span>{allCompleted ? 'Proceed to Review' : `Next: ${getNextTestName()}`}</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
