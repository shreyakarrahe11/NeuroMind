import React, { useState, useEffect } from 'react';
import { useAssessment } from '../../context/AssessmentContext';
import { patientService } from '../../services/patientService';
import { useToast } from '../../context/ToastContext';
import { PatientUser, DoctorUser, AssessmentRecord } from '../../types/assessment';
import { predictionPanelClass, predictionTextClass } from '../../utils/predictionStyles';
import {
  FileText,
  Share2,
  Calendar,
  User,
  Printer,
  Download,
  CheckCircle2,
  AlertTriangle,
  Stethoscope,
  X,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { Disclaimer } from '../../components/common/Disclaimer';
import { downloadAuthenticatedFile } from '../../api/http';

export const PatientReportsPage: React.FC = () => {
  const { currentUser, navigateTo } = useAssessment();
  const patient = currentUser?.role === 'PATIENT' ? (currentUser as PatientUser) : null;

  const [reports, setReports] = useState<AssessmentRecord[]>([]);
  const [selectedReport, setSelectedReport] = useState<AssessmentRecord | null>(null);
  const { showToast } = useToast();
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [availableDoctors, setAvailableDoctors] = useState<DoctorUser[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');

  useEffect(() => {
    if (patient) {
      patientService.getAvailableDoctors().then(setAvailableDoctors).catch((err) => console.error(err));
    }
  }, [patient]);

  const handleShareSubmit = async () => {
    if (!selectedReport || !selectedDoctorId || !patient) return;
    try {
      await patientService.shareReportWithDoctor(selectedReport.assessmentId, patient.id, selectedDoctorId);
      showToast('Report successfully shared with doctor.', 'success');
      setShareModalOpen(false);
      setSelectedDoctorId('');
      
      // refresh reports
      const recs = await patientService.getPatientReports(patient.id);
      setReports(recs);
      const updatedReport = recs.find(r => r.assessmentId === selectedReport.assessmentId);
      if (updatedReport) setSelectedReport(updatedReport);
    } catch (err: any) {
      showToast(err.message || 'Failed to share report', 'error');
    }
  };
  const handleRevokeShare = async (doctorId: string) => {
    if (!selectedReport || !patient) return;
    try {
      await patientService.revokeReportShare(selectedReport.reportId || selectedReport.id || '', doctorId);
      const recs = await patientService.getPatientReports(patient.id);
      setReports(recs);
      setSelectedReport(recs.find((r) => r.assessmentId === selectedReport.assessmentId) || null);
      showToast('Doctor access to this report was removed.', 'success');
    } catch (error: any) { showToast(error.message || 'Could not remove access', 'error'); }
  };


  useEffect(() => {
    const load = async () => {
    if (patient) {
      const recs = await patientService.getPatientReports(patient.id);
      setReports(recs);
      if (recs.length > 0) {
        setSelectedReport(recs[0]);
      }
    }
    };
    load().catch((err) => console.error(err));
  }, [patient]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async (rec: AssessmentRecord) => {
    const reportId = rec.reportId || rec.id;
    if (!reportId) return showToast('Report ID is unavailable.', 'error');
    try {
      await downloadAuthenticatedFile(`/reports/${reportId}/download`, `NeuroMind_Report_${rec.patientName.replace(/\s+/g, '_')}_${rec.assessmentId}.pdf`);
    } catch (error: any) { showToast(error.message, 'error'); }
  };

  if (!patient) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-slate-200">
        <p className="text-sm font-semibold text-slate-700">Please sign in to view your reports.</p>
        <button
          onClick={() => navigateTo('/login')}
          className="mt-4 px-5 py-2.5 bg-[#4A2333] text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
        >
          Sign In
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
            My Cognitive Assessment Reports
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Confidential multimodal screening summaries and clinical reviews for {patient.name}
          </p>
        </div>

        <button
          onClick={() => navigateTo('/patient/dashboard')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#4A2333] hover:underline cursor-pointer"
        >
          <span>Return to Dashboard</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {reports.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <FileText className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No Assessment Reports Generated</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Once you complete a full cognitive screening, your synthesized report and doctor review notes will appear here.
          </p>
          <button
            onClick={() => navigateTo('/assessment')}
            className="px-5 py-2.5 bg-[#4A2333] text-white text-xs font-bold rounded-xl shadow-md hover:bg-[#5E2F43] transition cursor-pointer"
          >
            Start Assessment Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Reports List Column */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
              Select Report ({reports.length})
            </h2>

            {reports.map((rec) => {
              const isSelected = selectedReport?.assessmentId === rec.assessmentId;
              return (
                <div
                  key={rec.assessmentId}
                  onClick={() => setSelectedReport(rec)}
                  className={`p-4.5 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white border-[#4A2333] shadow-md ring-2 ring-[#4A2333]/10'
                      : 'bg-white/80 border-slate-200 hover:border-slate-300 hover:bg-white shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-mono text-xs font-bold text-slate-900 truncate">
                      {rec.assessmentId}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      rec.reportStatus === 'REVIEWED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : rec.reportStatus === 'UNDER_REVIEW'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {rec.reportStatus}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-bold ${predictionTextClass(rec.predictionResult?.prediction)}`}>
                      {rec.predictionResult?.prediction} ({( (rec.predictionResult?.dementiaProbability ?? 0) * 100).toFixed(1)}%)
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      {new Date(rec.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Report Detailed Document Preview (2 cols) */}
          {selectedReport && (
            <div className="lg:col-span-2 space-y-6">
              {/* Actions Header Bar */}
              <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-3 print:hidden">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700">Document ID:</span>
                  <span className="font-mono text-xs text-slate-900 font-bold">{selectedReport.assessmentId}</span>
                </div>

                <div className="flex items-center gap-2">
                                    <button
                    onClick={() => setShareModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share with Doctor</span>
                  </button>

                  <button
                    onClick={() => handleDownload(selectedReport)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download TXT</span>
                  </button>

                  <button
                    onClick={handlePrint}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#4A2333] hover:bg-[#5E2F43] text-white text-xs font-bold shadow-xs transition cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print / Save PDF</span>
                  </button>
                </div>
              </div>

              {!!selectedReport.shares?.some((share) => !share.revokedAt) && <section className="rounded-2xl border border-slate-200 bg-white p-4 print:hidden" aria-label="Report sharing permissions">
                <h3 className="text-xs font-bold text-slate-800">Doctors with access to this report</h3>
                {selectedReport.shares.filter((share) => !share.revokedAt).map((share) => <div key={share.doctorId} className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-600">
                  <span>{share.doctorName || 'Approved doctor'}</span>
                  <button type="button" onClick={() => handleRevokeShare(share.doctorId)} className="font-bold text-rose-700 underline">Remove access</button>
                </div>)}
              </section>}

              {/* Printable Document Card */}
              <div className="p-8 bg-white rounded-3xl border border-slate-300 shadow-lg space-y-6 text-slate-900 font-sans print:border-none print:shadow-none print:p-0">
                {/* Header */}
                <div className="border-b-2 border-[#4A2333] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="text-xl font-black text-[#4A2333] uppercase tracking-tight">
                      NeuroMind Multimodal Cognitive Report
                    </h2>
                    <p className="text-xs font-semibold text-slate-500">
                      Machine Learning Clinical Screening & Explainability Record
                    </p>
                  </div>
                  <div className="text-left sm:text-right text-xs font-mono text-slate-600">
                    <p>Date: {new Date(selectedReport.createdAt).toLocaleDateString()}</p>
                    <p>Status: <strong className="text-emerald-700 uppercase">{selectedReport.reportStatus}</strong></p>
                  </div>
                </div>

                {/* Patient Demographics Box */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-1.5">
                  <p className="font-bold text-slate-800 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span>Patient Profile</span>
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-700 font-medium pt-1">
                    <div>Name: <strong>{selectedReport.patientName}</strong></div>
                    <div>Age: <strong>{selectedReport.patientAge} yrs</strong></div>
                    <div>Gender: <strong>{selectedReport.patientGender}</strong></div>
                    <div>Education: <strong>{selectedReport.patientEducation}</strong></div>
                  </div>
                </div>

                {/* Prediction Result Banner */}
                {selectedReport.predictionResult && (
                  <div className={`p-4 rounded-2xl border-2 space-y-1.5 ${predictionPanelClass(selectedReport.predictionResult.prediction)}`}>
                    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
                      <span>Model Inference: {selectedReport.predictionResult.prediction}</span>
                      <span>Binary screening probability</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-black">
                        Dementia Risk: {(selectedReport.predictionResult.dementiaProbability * 100).toFixed(1)}%
                      </span>
                      <span className="text-xs font-semibold text-slate-600">
                        (Confidence: {(selectedReport.predictionResult.confidenceScore * 100).toFixed(0)}%)
                      </span>
                    </div>
                  </div>
                )}

                {/* Doctor's Review & Recommendations (if reviewed) */}
                {selectedReport.doctorNotes && (
                  <div className="p-5 bg-amber-50/70 border border-amber-200/80 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
                        <Stethoscope className="w-4 h-4 text-amber-700" />
                        <span>Physician Clinical Notes & Recommendations</span>
                      </h3>
                      {selectedReport.reviewedAt && (
                        <span className="text-[10px] font-semibold text-amber-800">
                          Reviewed on {new Date(selectedReport.reviewedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    <div className="space-y-2 text-xs text-amber-950">
                      <div>
                        <p className="font-bold text-[11px] text-amber-900">Clinical Evaluation:</p>
                        <p className="font-medium whitespace-pre-wrap">{selectedReport.doctorNotes}</p>
                      </div>

                      {selectedReport.doctorRecommendations && (
                        <div>
                          <p className="font-bold text-[11px] text-amber-900">Recommendations & Follow-up:</p>
                          <p className="font-medium whitespace-pre-wrap">{selectedReport.doctorRecommendations}</p>
                        </div>
                      )}

                      {selectedReport.assignedDoctorName && (
                        <p className="pt-2 text-[11px] font-bold text-slate-600 italic">
                          Signed: {selectedReport.assignedDoctorName}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Report Text Content */}
                <div className="p-6 bg-slate-900 text-slate-100 rounded-2xl font-mono text-xs leading-relaxed whitespace-pre-wrap shadow-inner">
                  {selectedReport.reportText || selectedReport.predictionResult?.reportSummary || 'Report text not available.'}
                </div>

                {/* Disclaimer */}
                <div className="pt-4 border-t border-slate-200">
                  <Disclaimer compact={true} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {shareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative border border-slate-200">
            <button
              onClick={() => setShareModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-full transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="text-center space-y-2 mb-6">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto text-indigo-700">
                <Share2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Share Report</h3>
              <p className="text-xs text-slate-500">
                Choose an approved doctor. The report is sent immediately after you confirm.
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Select Doctor *</label>
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-[#4A2333] focus:outline-hidden bg-slate-50/50"
                >
                  <option value="">-- Choose a Practitioner --</option>
                  {availableDoctors.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.name} - {doc.specialization} ({doc.institution})
                    </option>
                  ))}
                </select>
              </div>
              
              <button
                onClick={handleShareSubmit}
                disabled={!selectedDoctorId}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider shadow-md transition cursor-pointer"
              >
                Share Now
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
