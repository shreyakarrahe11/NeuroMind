import React, { useState, useEffect } from 'react';
import { useAssessment } from '../../context/AssessmentContext';
import { adminService } from '../../services/adminService';
import { AssessmentRecord } from '../../types/assessment';
import { predictionPanelClass, predictionTextClass } from '../../utils/predictionStyles';
import {
  FileCheck,
  Search,
  Download,
  Printer,
  Brain,
  Stethoscope,
  User,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Disclaimer } from '../../components/common/Disclaimer';
import { downloadAuthenticatedFile } from '../../api/http';
import { useToast } from '../../context/ToastContext';

export const AdminReportsPage: React.FC = () => {
  const { navigateTo } = useAssessment();
  const { showToast } = useToast();
  const [reports, setReports] = useState<AssessmentRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReport, setSelectedReport] = useState<AssessmentRecord | null>(null);

  useEffect(() => {
    const load = async () => {
      const list = await adminService.getAllReports();
      setReports(list);
      if (list.length > 0) setSelectedReport(list[0]);
    };
    load().catch((err) => console.error(err));
  }, []);

  const filteredReports = reports.filter(
    (r) =>
      r.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.assessmentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.assignedDoctorName && r.assignedDoctorName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async (rec: AssessmentRecord) => {
    const reportId = rec.reportId || rec.id;
    if (!reportId) return showToast('Report ID is unavailable.', 'error');
    try {
      await downloadAuthenticatedFile(`/reports/${reportId}/download`, `Admin_Audit_Report_${rec.patientName.replace(/\s+/g, '_')}_${rec.assessmentId}.pdf`);
    } catch (error: any) { showToast(error.message, 'error'); }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-black text-[#4A2333] tracking-tight">
            System Screening Reports Repository
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Clinical audit archive of all multimodal screenings, probability inferences, and physician sign-offs.
          </p>
        </div>

        <button
          onClick={() => navigateTo('/admin/dashboard')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#4A2333] hover:underline cursor-pointer"
        >
          <span>Admin Dashboard</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Reports List */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by patient, doctor, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-[#4A2333] focus:outline-hidden shadow-xs"
            />
          </div>

          <div className="space-y-2.5">
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
              <p className="text-xs text-slate-400 text-center py-6 bg-white rounded-2xl border border-slate-200">
                No reports found.
              </p>
            )}
          </div>
        </div>

        {/* Selected Report Inspection */}
        {selectedReport ? (
          <div className="lg:col-span-2 space-y-6">
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-3 print:hidden">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">Audit ID:</span>
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
                  <span>Print Document</span>
                </button>
              </div>
            </div>

            <div className="p-8 bg-white rounded-3xl border border-slate-200 shadow-lg space-y-6">
              {/* Header Info */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <p className="font-bold text-slate-900 text-sm">{selectedReport.patientName}</p>
                  <p className="text-slate-500">
                    Age {selectedReport.patientAge} • {selectedReport.patientGender} • ID: {selectedReport.patientId}
                  </p>
                </div>
                <div>
                  <p className="font-bold text-slate-900">
                    Reviewing Doctor: {selectedReport.assignedDoctorName || 'Not Assigned'}
                  </p>
                  <p className="text-slate-500 text-[11px]">
                    Status: <strong className="text-emerald-700 uppercase">{selectedReport.reportStatus}</strong>
                  </p>
                </div>
              </div>

              {/* Prediction */}
              {selectedReport.predictionResult && (
                <div className={`p-4 rounded-2xl border ${predictionPanelClass(selectedReport.predictionResult.prediction)} flex items-center justify-between text-xs`}>
                  <span className="font-black text-sm uppercase">
                    Inference: {selectedReport.predictionResult.prediction}
                  </span>
                  <span className="font-bold">
                    Risk Probability: {(selectedReport.predictionResult.dementiaProbability * 100).toFixed(1)}% (Confidence: {(selectedReport.predictionResult.confidenceScore * 100).toFixed(0)}%)
                  </span>
                </div>
              )}

              {/* Doctor Review Notes */}
              {selectedReport.doctorNotes && (
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs space-y-2">
                  <p className="font-bold text-amber-950 uppercase tracking-wider text-[10px]">
                    Doctor Clinical Evaluation & Notes
                  </p>
                  <p className="text-amber-950 font-medium whitespace-pre-wrap">{selectedReport.doctorNotes}</p>
                  {selectedReport.doctorRecommendations && (
                    <p className="text-amber-900 font-medium whitespace-pre-wrap pt-1 border-t border-amber-200">
                      <strong>Recommendations:</strong> {selectedReport.doctorRecommendations}
                    </p>
                  )}
                </div>
              )}

              {/* Full Text */}
              <div className="p-6 bg-slate-900 text-slate-100 rounded-2xl font-mono text-xs leading-relaxed whitespace-pre-wrap">
                {selectedReport.reportText || selectedReport.predictionResult?.reportSummary}
              </div>

              <Disclaimer compact={true} />
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 p-12 text-center bg-white rounded-3xl border border-slate-200">
            <FileCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-xs text-slate-500 font-medium">Select a screening report to inspect.</p>
          </div>
        )}
      </div>
    </div>
  );
};
