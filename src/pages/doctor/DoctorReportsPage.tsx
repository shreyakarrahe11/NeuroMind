import React, { useState, useEffect } from 'react';
import { useAssessment } from '../../context/AssessmentContext';
import { doctorService } from '../../services/doctorService';
import { useToast } from '../../context/ToastContext';
import { DoctorUser, AssessmentRecord, ReportStatus } from '../../types/assessment';
import { predictionBadgeClass, predictionTextClass } from '../../utils/predictionStyles';
import {
  FileText,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Stethoscope,
  Save,
  Printer,
  Download,
  Brain,
  Sparkles,
  ArrowRight,
  BookOpen,
  Zap,
} from 'lucide-react';
import { Disclaimer } from '../../components/common/Disclaimer';
import { downloadAuthenticatedFile } from '../../api/http';

export const DoctorReportsPage: React.FC = () => {
  const { currentUser, navigateTo } = useAssessment();
  const { showToast } = useToast();
  const doctor = currentUser?.role === 'DOCTOR' ? (currentUser as DoctorUser) : null;

  const [reports, setReports] = useState<AssessmentRecord[]>([]);
  const [selectedReport, setSelectedReport] = useState<AssessmentRecord | null>(null);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'REVIEWED'>('ALL');

  // Review Form state
  const [doctorNotes, setDoctorNotes] = useState('');
  const [doctorRecommendations, setDoctorRecommendations] = useState('');
  const [reviewStatus, setReviewStatus] = useState<ReportStatus>('REVIEWED');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
    if (doctor) {
      const recs = await doctorService.getDoctorReports(doctor.id);
      setReports(recs);
      if (recs.length > 0) {
        setSelectedReport(recs[0]);
      }
    }
    };
    load().catch((err) => console.error(err));
  }, [doctor]);

  useEffect(() => {
    if (selectedReport) {
      setDoctorNotes(selectedReport.doctorNotes || '');
      setDoctorRecommendations(selectedReport.doctorRecommendations || '');
      setReviewStatus(selectedReport.reportStatus || 'REVIEWED');
    }
  }, [selectedReport]);

  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctor || !selectedReport) return;

    setIsSaving(true);
    try {
      const updated = await doctorService.reviewReport(
        selectedReport.assessmentId,
        doctor.id,
        doctorNotes,
        doctorRecommendations,
        reviewStatus
      );

      // Update local state
      setSelectedReport(updated);
      setReports((prev) =>
        prev.map((r) => (r.assessmentId === updated.assessmentId ? updated : r))
      );

      showToast('Clinical review signed and saved. Patient notified.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save review', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredReports = reports.filter((r) => {
    if (filterStatus === 'PENDING') return r.reportStatus !== 'REVIEWED';
    if (filterStatus === 'REVIEWED') return r.reportStatus === 'REVIEWED';
    return true;
  });

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async (rec: AssessmentRecord) => {
    const reportId = rec.reportId || rec.id;
    if (!reportId) return showToast('Report ID is unavailable.', 'error');
    try {
      await downloadAuthenticatedFile(`/reports/${reportId}/download`, `Clinical_Report_${rec.patientName.replace(/\s+/g, '_')}_${rec.assessmentId}.pdf`);
    } catch (error: any) { showToast(error.message, 'error'); }
  };

  if (!doctor) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-slate-200">
        <p className="text-sm font-semibold text-slate-700">Please sign in with a Doctor account.</p>
        <button
          onClick={() => navigateTo('/login')}
          className="mt-4 px-5 py-2.5 bg-[#4A2333] text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
        >
          Doctor Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-black text-[#4A2333] tracking-tight">
            Clinical Screening Reviewer
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Review multimodal AI inferences, inspect SHAP biomarker contributors, and add physician recommendations.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200">
          <button
            onClick={() => setFilterStatus('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              filterStatus === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            All ({reports.length})
          </button>
          <button
            onClick={() => setFilterStatus('PENDING')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              filterStatus === 'PENDING' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Pending ({reports.filter((r) => r.reportStatus !== 'REVIEWED').length})
          </button>
          <button
            onClick={() => setFilterStatus('REVIEWED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              filterStatus === 'REVIEWED' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Reviewed ({reports.filter((r) => r.reportStatus === 'REVIEWED').length})
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Reports Navigation Sidebar */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
            Patient Assessment Reports
          </h2>

          {filteredReports.map((rec) => {
            const isSelected = selectedReport?.assessmentId === rec.assessmentId;
            return (
              <div
                key={rec.assessmentId}
                onClick={() => setSelectedReport(rec)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-white border-[#4A2333] shadow-md ring-2 ring-[#4A2333]/10'
                    : 'bg-white/80 border-slate-200 hover:border-slate-300 hover:bg-white shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-slate-900">{rec.patientName}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    rec.reportStatus === 'REVIEWED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {rec.reportStatus}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className={`font-semibold ${predictionTextClass(rec.predictionResult?.prediction)}`}>
                    {rec.predictionResult?.prediction} ({((rec.predictionResult?.dementiaProbability ?? 0) * 100).toFixed(1)}%)
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {new Date(rec.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            );
          })}

          {filteredReports.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-8 bg-white rounded-2xl border border-slate-200">
              No reports in this category.
            </p>
          )}
        </div>

        {/* Clinical Detailed Review & Note Editor (2 cols) */}
        {selectedReport ? (
          <div className="lg:col-span-2 space-y-6">
            {/* Action Bar */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-3 print:hidden">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">Assessment ID:</span>
                <span className="font-mono text-xs text-slate-900 font-bold">{selectedReport.assessmentId}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(selectedReport)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>

                <button
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#4A2333] hover:bg-[#5E2F43] text-white text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print PDF</span>
                </button>
              </div>
            </div>

            {/* Doctor Note & Review Form */}
            <form
              onSubmit={handleSaveReview}
              className="p-6 bg-gradient-to-br from-amber-50/80 to-orange-50/50 rounded-3xl border-2 border-amber-300/80 shadow-sm space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
                  <Stethoscope className="w-4 h-4 text-amber-700" />
                  <span>Physician Clinical Notes & Recommendations</span>
                </h3>
                <div className="flex items-center gap-2">
                  <label className="text-[11px] font-bold text-amber-900">Status:</label>
                  <select
                    value={reviewStatus}
                    onChange={(e) => setReviewStatus(e.target.value as ReportStatus)}
                    className="px-2.5 py-1 rounded-lg border border-amber-300 text-xs font-bold bg-white text-amber-950 focus:outline-hidden"
                  >
                    <option value="REVIEWED">REVIEWED (Signed)</option>
                    <option value="UNDER_REVIEW">UNDER REVIEW</option>
                    <option value="VIEWED">VIEWED</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-amber-950">Clinical Impressions & Review Notes:</label>
                <textarea
                  rows={3}
                  value={doctorNotes}
                  onChange={(e) => setDoctorNotes(e.target.value)}
                  placeholder="Enter your clinical observations (e.g., patient demonstrates delayed recall attenuation alongside expressive speech hesitations)..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-amber-200 text-xs font-medium bg-white text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-amber-950">Physician Action Plan & Recommendations:</label>
                <textarea
                  rows={2}
                  value={doctorRecommendations}
                  onChange={(e) => setDoctorRecommendations(e.target.value)}
                  placeholder="Enter clinical follow-up guidance, referral suggestions, or neuropsychology testing recommendations..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-amber-200 text-xs font-medium bg-white text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <p className="text-[11px] text-amber-800 font-medium italic">
                  Saving will update the patient's record and trigger an in-portal notification.
                </p>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs uppercase tracking-wider shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Signing...' : 'Sign & Finalize Review'}</span>
                </button>
              </div>
            </form>

            {/* Comprehensive Report Presentation */}
            <div className="p-8 bg-white rounded-3xl border border-slate-200 shadow-lg space-y-6">
              {/* Demographics & Prediction Summary */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                <div>
                  <p className="font-bold text-slate-900 text-sm">{selectedReport.patientName}</p>
                  <p className="text-slate-500">
                    Age: {selectedReport.patientAge} • {selectedReport.patientGender} • {selectedReport.patientEducation}
                  </p>
                </div>
                {selectedReport.predictionResult && (
                  <div className="text-left sm:text-right">
                    <span className={`px-2.5 py-1 rounded-md font-bold text-xs uppercase ${predictionBadgeClass(selectedReport.predictionResult.prediction)}`}>
                      {selectedReport.predictionResult.prediction}
                    </span>
                    <p className="font-bold text-slate-800 mt-1">
                      Probability: {(selectedReport.predictionResult.dementiaProbability * 100).toFixed(1)}%
                    </p>
                  </div>
                )}
              </div>

              {/* Explainability SHAP Biomarkers */}
              {selectedReport.predictionResult?.shapExplanation && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    <span>Top Machine Learning Feature Contributions (SHAP Values)</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedReport.predictionResult.shapExplanation.map((shap, idx) => (
                      <div key={idx} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{shap.featureName}</span>
                          <span className="font-mono font-bold text-amber-700">+{shap.shapValue.toFixed(2)}</span>
                        </div>
                        <p className="text-[11px] text-slate-500">{shap.featureValueDisplay}</p>
                        <p className="text-[11px] text-slate-600 font-medium leading-tight">{shap.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* RAG Literature References */}
              {selectedReport.predictionResult?.ragKnowledge && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-[#4A2333]" />
                    <span>Peer-Reviewed Clinical RAG Citations</span>
                  </h4>

                  <div className="space-y-2">
                    {selectedReport.predictionResult.ragKnowledge.map((rag) => (
                      <div key={rag.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                        <p className="font-bold text-slate-900">{rag.title}</p>
                        <p className="text-[11px] text-slate-500">{rag.source} — <em>{rag.retrievalMethod} retrieval</em></p>
                        <p className="text-[11px] text-slate-700 font-medium italic">"{rag.snippet}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Full Screening Summary Text */}
              <div className="p-6 bg-slate-900 text-slate-100 rounded-2xl font-mono text-xs leading-relaxed whitespace-pre-wrap shadow-inner">
                {selectedReport.reportText || selectedReport.predictionResult?.reportSummary || 'Full report text available in download.'}
              </div>

              {/* Medical Research Disclaimer */}
              <Disclaimer compact={true} />
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 p-12 text-center bg-white rounded-3xl border border-slate-200">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-xs text-slate-500 font-medium">Select a patient report to review.</p>
          </div>
        )}
      </div>
    </div>
  );
};
