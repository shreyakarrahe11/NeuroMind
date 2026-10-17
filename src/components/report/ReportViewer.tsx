import React, { useState } from 'react';
import { useAssessment } from '../../context/AssessmentContext';
import { generateReportRecord } from '../../api/client';
import { downloadAuthenticatedFile } from '../../api/http';
import { FileText, Download, Printer, RefreshCw, User, Brain, Mic, Activity, HeartPulse } from 'lucide-react';
import { Disclaimer } from '../common/Disclaimer';
import { predictionPanelClass } from '../../utils/predictionStyles';

export const ReportViewer: React.FC = () => {
  const { session } = useAssessment();
  const { patientInfo, predictionResult, speech, memory, attention, lifestyle } = session;
  const [reportText, setReportText] = useState<string | null>(predictionResult?.reportSummary || null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const generated = await generateReportRecord(session);
      setReportText(generated.reportText);
      setReportId(generated.report?.id || generated.report?.reportId || null);
    } catch (err: any) {
      console.error('Failed to generate report:', err);
      setError(err?.message || 'Report generation failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    if (!reportId) return;
    try {
      await downloadAuthenticatedFile(`/reports/${reportId}/download`, `NeuroMind_Report_${reportId.slice(0, 8)}.pdf`);
    } catch (err: any) {
      setError(err?.message || 'PDF download failed.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="p-8 bg-white rounded-[1.5rem] border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-600" />
            Clinical Assessment Report Generator
          </h2>
          <p className="text-sm text-slate-500">
            Synthesizes assessment metrics and outcomes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-[1.5rem] bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition-colors shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>{isGenerating ? 'Synthesizing...' : 'Generate Report'}</span>
          </button>

          

          <button
            onClick={handlePrint}
            disabled={!reportText}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-[1.5rem] bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-sm transition-colors shadow-xs disabled:opacity-50"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / Save PDF</span>
          </button>
          <button
            onClick={handleDownload}
            disabled={!reportId}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-[1.5rem] bg-[#4A2333] hover:bg-[#5E2F43] text-white font-semibold text-sm transition-colors shadow-xs disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download verified PDF</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800 print:hidden">
          {error}
        </div>
      )}

      {/* Printable Report Document Card */}
      <div className="p-8 bg-white rounded-2xl border border-slate-300 shadow-lg space-y-6 text-slate-900 font-sans print:border-none print:shadow-none print:p-0">
        {/* Document Header */}
        <div className="border-b-2 border-slate-900 pb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
              NeuroMind Cognitive Report
            </h1>
            <p className="text-sm font-semibold text-slate-600">
              Research Cognitive Screening & Feature Evaluation Record
            </p>
          </div>
          <div className="text-right text-sm font-mono">
            <p className="font-bold">Session ID: {session.sessionId}</p>
            <p className="text-slate-500">Date: {new Date().toLocaleDateString()}</p>
          </div>
        </div>

        {/* Patient Information Section */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] space-y-2 text-sm">
          <h3 className="font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
            <User className="w-4 h-4 text-slate-700" /> Patient Demographics & Profile
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-700 font-medium">
            <div>Name: <strong>{patientInfo.name}</strong></div>
            <div>Age: <strong>{patientInfo.age} years</strong></div>
            <div>Gender: <strong className="capitalize">{patientInfo.gender}</strong></div>
            <div>Education: <strong>{patientInfo.education}</strong></div>
            <div>Occupation: <strong>{patientInfo.occupation}</strong></div>
          </div>
        </div>

        {/* Prediction Outcome Banner */}
        {predictionResult && (
          <div
            className={`p-5 rounded-[1.5rem] border-2 space-y-2 ${predictionPanelClass(predictionResult.prediction)}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold uppercase tracking-wider">
                Classifier Result
              </span>
              <span className="text-sm font-mono font-bold">Binary screening output</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-black">{predictionResult.prediction} Result</span>
              <span className="text-sm font-semibold">
                (Dementia Probability: {(predictionResult.dementiaProbability * 100).toFixed(1)}%)
              </span>
            </div>
          </div>
        )}

        {/* Evidence-grounded report text returned by the backend */}
        {reportText ? (
          <div className="p-6 bg-slate-900 text-slate-100 rounded-[1.5rem] font-mono text-sm leading-relaxed whitespace-pre-wrap shadow-inner">
            {reportText}
          </div>
        ) : (
          <div className="p-8 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-center space-y-3">
            <FileText className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">No report has been generated for this assessment.</p>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Complete model processing, then choose Generate Report. NeuroMind requires indexed knowledge evidence before producing a report.
            </p>
          </div>
        )}

        {/* Medical Research Disclaimer Footer */}
        <div className="pt-4 border-t border-slate-200">
          <Disclaimer compact={true} />
        </div>
      </div>
    </div>
  );
};
