import React from 'react';
import { useAssessment } from '../context/AssessmentContext';
import { ReportViewer } from '../components/report/ReportViewer';
import { FileText, ArrowLeft } from 'lucide-react';

export const ReportPage: React.FC = () => {
  const { navigateTo } = useAssessment();

  return (
    <div className="space-y-12 max-w-5xl mx-auto">
      {/* Screen 12 Header */}
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div className="space-y-3">
          <h1 className="text-3xl md:text-4xl font-heading font-bold text-[#4A2333] tracking-tight flex items-center gap-4">
            <FileText className="w-10 h-10 text-[#F29D88]" />
            <span>NeuroMind Assessment Report</span>
          </h1>
          <p className="text-base text-slate-500 font-medium">
            Generate an evidence-grounded summary and an authenticated PDF for this completed assessment.
          </p>
        </div>

        <button
          onClick={() => navigateTo('/results')}
          className="px-6 py-3 rounded-2xl bg-[#FDF8F5] text-slate-700 font-bold text-sm hover:bg-[#F9EFEA] transition-all flex items-center gap-2 cursor-pointer shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Results</span>
        </button>
      </div>

      <ReportViewer />
    </div>
  );
};
