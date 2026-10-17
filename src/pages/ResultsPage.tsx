import React from 'react';
import { useAssessment } from '../context/AssessmentContext';
import { patientService } from '../services/patientService';
import { PatientUser, DoctorUser } from '../types/assessment';
import { useToast } from '../context/ToastContext';
import { ModalitySummary } from '../components/results/ModalitySummary';
import { PredictionCard } from '../components/results/PredictionCard';
import { ProbabilityChart } from '../components/results/ProbabilityChart';
import {
  BarChart3,
  Sparkles,
  FileText,
  RotateCcw,
  ShieldCheck,
  ArrowRight,
  Share2,
  X
} from 'lucide-react';

export const ResultsPage: React.FC = () => {
  const { session, navigateTo, resetAssessment } = useAssessment();
  const prediction = session.predictionResult;
  const { showToast } = useToast();
  const [shareModalOpen, setShareModalOpen] = React.useState(false);
  const [availableDoctors, setAvailableDoctors] = React.useState<DoctorUser[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = React.useState('');
  
  React.useEffect(() => {
    if (session.patientId) {
      patientService.getAvailableDoctors().then(setAvailableDoctors).catch((err) => console.error(err));
    }
  }, [session.patientId]);

  const handleShareSubmit = async () => {
    if (!prediction || !selectedDoctorId || !session.patientId) return;
    try {
      await patientService.shareReportWithDoctor(session.sessionId, session.patientId, selectedDoctorId);
      showToast('Report successfully shared with doctor.', 'success');
      setShareModalOpen(false);
      setSelectedDoctorId('');
    } catch (err: any) {
      showToast(err.message || 'Failed to share report', 'error');
    }
  };


  return (
    <div className="space-y-12 max-w-5xl mx-auto">
      {/* Screen 10 Header */}
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div className="space-y-3">
          <h1 className="text-3xl md:text-4xl font-heading font-bold text-[#4A2333] tracking-tight">
            Assessment Results
          </h1>
          <p className="text-base text-slate-500 font-medium">
            Versioned multimodal screening output with probabilities and feature-level explainability.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {prediction && (
            <button
              onClick={() => setShareModalOpen(true)}
              className="px-6 py-3 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-sm hover:bg-indigo-100 transition-all flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <Share2 className="w-4 h-4" />
              <span>Share with Doctor</span>
            </button>
          )}
          <button
            onClick={() => navigateTo('/patient/reports')}
            className="px-6 py-3 rounded-2xl bg-white border border-slate-200 text-[#4A2333] font-bold text-sm hover:bg-[#FDF8F5] transition-all flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <FileText className="w-4 h-4" />
            <span>View Full Report</span>
          </button>
        </div>
      </div>

      {prediction ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <PredictionCard result={prediction} onViewReport={() => navigateTo('/patient/reports')} />
            <ProbabilityChart result={prediction} />
          </div>

          <ModalitySummary scores={prediction.modalityScores} />

          {/* Quick Nav Row */}
          <div className="p-8 bg-[#FDF8F5] rounded-[2rem] flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-emerald-700" />
              </div>
              <span className="text-sm text-slate-600 font-medium">
                Model identity, feature contract, and artifact checksum are recorded with this analysis.
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={resetAssessment}
                className="px-6 py-3 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 text-sm font-bold transition-all cursor-pointer flex items-center gap-2 shadow-sm"
              >
                <RotateCcw className="w-4 h-4" />
                <span>New Session</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-16 bg-[#FDF8F5] rounded-[2rem] text-center space-y-6">
          <BarChart3 className="w-16 h-16 text-slate-300 mx-auto" />
          <h3 className="text-2xl font-bold text-[#4A2333]">No completed analysis yet</h3>
          <p className="text-base text-slate-500 max-w-lg mx-auto">
            Complete all four assessment sections and run the configured model. If a model artifact is not installed, NeuroMind will stop with a clear configuration error rather than inventing a result.
          </p>
          <button
            onClick={() => navigateTo('/assessment')}
            className="px-8 py-4 rounded-2xl bg-[#4A2333] text-white font-bold text-base cursor-pointer shadow-md hover:bg-[#5D2E42] transition-colors"
          >
            Go to Assessment
          </button>
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
