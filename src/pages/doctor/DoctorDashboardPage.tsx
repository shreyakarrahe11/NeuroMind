import React, { useState, useEffect } from 'react';
import { useAssessment } from '../../context/AssessmentContext';
import { doctorService } from '../../services/doctorService';
import { DoctorUser, PatientUser, AssessmentRecord } from '../../types/assessment';
import { predictionBadgeClass } from '../../utils/predictionStyles';
import {
  Users,
  FileCheck,
  AlertTriangle,
  Clock,
  ArrowRight,
  Stethoscope,
  Brain,
  CheckCircle2,
  Calendar,
  Search,
  ExternalLink,
  Building2,
  ShieldAlert,
} from 'lucide-react';

export const DoctorDashboardPage: React.FC = () => {
  const { currentUser, navigateTo } = useAssessment();
  const doctor = currentUser?.role === 'DOCTOR' ? (currentUser as DoctorUser) : null;

  const [patients, setPatients] = useState<PatientUser[]>([]);
  const [reports, setReports] = useState<AssessmentRecord[]>([]);

  useEffect(() => {
    const load = async () => {
    if (doctor) {
      const assigned = await doctorService.getAssignedPatients(doctor.id);
      setPatients(assigned);

      const doctorReports = await doctorService.getDoctorReports(doctor.id);
      setReports(doctorReports);
    }
    };
    load().catch((err) => console.error(err));
  }, [doctor]);

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

  const isPendingApproval = doctor.status === 'PENDING';
  const pendingReviews = reports.filter((r) => r.reportStatus !== 'REVIEWED');
  const highRiskReports = reports.filter((r) => (r.predictionResult?.dementiaProbability ?? 0) >= 0.52);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Pending Account Notice */}
      {isPendingApproval && (
        <div className="p-4 sm:p-5 bg-amber-50 border-2 border-amber-300 rounded-3xl flex items-start gap-4 text-amber-950">
          <ShieldAlert className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <h3 className="font-bold text-sm text-amber-950">Medical Credential Verification Pending</h3>
            <p className="font-medium text-amber-900 leading-relaxed">
              Your practitioner profile (License: <strong>{doctor.licenseNumber}</strong>) is awaiting administrative approval. Patient records and clinical sign-off remain unavailable until verification is complete.
            </p>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="p-8 sm:p-10 bg-gradient-to-br from-[#4A2333] via-[#5E2F43] to-[#391926] text-white rounded-3xl shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[#F8E3DA] text-[11px] font-bold uppercase tracking-wider">
              <Stethoscope className="w-3.5 h-3.5" />
              <span>{doctor.department || 'Clinical Neurology'}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-heading font-black tracking-tight">
              {doctor.name}
            </h1>
            <p className="text-xs sm:text-sm text-white/80 max-w-xl font-normal leading-relaxed">
              {doctor.specialization} • {doctor.institution}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigateTo('/doctor/reports')}
              className="px-5 py-3 rounded-2xl bg-[#F29D88] hover:bg-[#F08B73] text-[#4A2333] font-bold text-xs uppercase tracking-wider shadow-lg transition cursor-pointer"
            >
              Review Reports ({pendingReviews.length})
            </button>
            <button
              onClick={() => navigateTo('/doctor/patients')}
              className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider backdrop-blur-md transition cursor-pointer"
            >
              Patient Roster ({patients.length})
            </button>
          </div>
        </div>
      </div>

      {/* Clinical Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Assigned Patients</span>
            <Users className="w-4 h-4 text-[#A76A5B]" />
          </div>
          <p className="text-2xl font-black text-slate-900">{patients.length}</p>
          <p className="text-[11px] text-slate-400 font-medium">Active memory clinic cohort</p>
        </div>

        <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Pending Reviews</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600">{pendingReviews.length}</p>
          <p className="text-[11px] text-slate-400 font-medium">Awaiting physician clinical review</p>
        </div>

        <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Elevated Risk</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-black text-rose-600">{highRiskReports.length}</p>
          <p className="text-[11px] text-slate-400 font-medium">Probability ≥ 52% threshold</p>
        </div>

        <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Signed Reports</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600">
            {reports.filter((r) => r.reportStatus === 'REVIEWED').length}
          </p>
          <p className="text-[11px] text-slate-400 font-medium">Reviewed & finalized</p>
        </div>
      </div>

      {/* Pending Reviews Action Queue */}
      <div className="p-6 sm:p-8 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Clinical Review Queue</h2>
            <p className="text-xs text-slate-500">Recent multimodal screening reports requiring physician assessment</p>
          </div>
          <button
            onClick={() => navigateTo('/doctor/reports')}
            className="text-xs font-bold text-[#4A2333] hover:underline cursor-pointer"
          >
            Open All Reports
          </button>
        </div>

        {pendingReviews.length > 0 ? (
          <div className="space-y-3">
            {pendingReviews.map((rec) => (
              <div
                key={rec.assessmentId}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-100/70 transition"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-xs">{rec.patientName}</span>
                    <span className="text-[11px] text-slate-500">({rec.patientAge} yrs, {rec.patientGender})</span>
                    <span className={`px-2 py-0.2 text-[10px] font-bold rounded-md ${predictionBadgeClass(rec.predictionResult?.prediction)}`}>
                      {rec.predictionResult?.prediction} ({((rec.predictionResult?.dementiaProbability ?? 0) * 100).toFixed(1)}%)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Session: {rec.assessmentId} • Completed on {new Date(rec.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <button
                  onClick={() => navigateTo('/doctor/reports')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#4A2333] hover:bg-[#5E2F43] text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer self-start sm:self-auto"
                >
                  <span>Review & Add Clinical Notes</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-800">All Patient Reports Reviewed</p>
            <p className="text-xs text-slate-400">There are no pending reports requiring immediate attention.</p>
          </div>
        )}
      </div>

      {/* Assigned Patient Cohort Table */}
      <div className="p-6 sm:p-8 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Assigned Patient Cohort</h2>
            <p className="text-xs text-slate-500">Patients linked to your clinical practice for longitudinal observation</p>
          </div>
          <button
            onClick={() => navigateTo('/doctor/patients')}
            className="text-xs font-bold text-[#4A2333] hover:underline cursor-pointer"
          >
            View Full Patient Directory
          </button>
        </div>

        {patients.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Patient Name</th>
                  <th className="py-3 px-4">Patient ID</th>
                  <th className="py-3 px-4">Age / Gender</th>
                  <th className="py-3 px-4">Occupation</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {patients.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{p.name}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-500">{p.id}</td>
                    <td className="py-3.5 px-4">{p.age} yrs • {p.gender}</td>
                    <td className="py-3.5 px-4">{p.occupation || '—'}</td>
                    <td className="py-3.5 px-4">{p.phone || '—'}</td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => navigateTo('/doctor/patients')}
                        className="font-bold text-[#4A2333] hover:underline cursor-pointer"
                      >
                        Clinical Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-slate-400 text-center py-6">No patients currently assigned to your roster.</p>
        )}
      </div>
    </div>
  );
};
