import React, { useState, useEffect } from 'react';
import { useAssessment } from '../../context/AssessmentContext';
import { doctorService } from '../../services/doctorService';
import { DoctorUser, PatientUser, AssessmentRecord } from '../../types/assessment';
import { predictionBadgeClass } from '../../utils/predictionStyles';
import {
  Users,
  Search,
  User,
  Brain,
  Calendar,
  FileText,
  Phone,
  GraduationCap,
  Briefcase,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export const DoctorPatientsPage: React.FC = () => {
  const { currentUser, navigateTo } = useAssessment();
  const doctor = currentUser?.role === 'DOCTOR' ? (currentUser as DoctorUser) : null;

  const [patients, setPatients] = useState<PatientUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<PatientUser | null>(null);
  const [patientAssessments, setPatientAssessments] = useState<AssessmentRecord[]>([]);

  useEffect(() => {
    const load = async () => {
    if (doctor) {
      const assigned = await doctorService.getAssignedPatients(doctor.id);
      setPatients(assigned);
      if (assigned.length > 0) {
        setSelectedPatient(assigned[0]);
      }
    }
    };
    load().catch((err) => console.error(err));
  }, [doctor]);

  useEffect(() => {
    const load = async () => {
    if (selectedPatient) {
      const recs = await doctorService.getPatientAssessments(selectedPatient.id);
      setPatientAssessments(recs);
    } else {
      setPatientAssessments([]);
    }
    };
    load().catch((err) => console.error(err));
  }, [selectedPatient]);

  const filteredPatients = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.occupation && p.occupation.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
            Assigned Patient Roster
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Longitudinal cognitive assessment records and demographic tracking under Dr. {doctor.name.replace('Dr. ', '')}
          </p>
        </div>

        <button
          onClick={() => navigateTo('/doctor/dashboard')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#4A2333] hover:underline cursor-pointer"
        >
          <span>Doctor Dashboard</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patients List (1 col) */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by name, ID, or occupation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-[#4A2333] focus:outline-hidden shadow-xs"
            />
          </div>

          <div className="space-y-2.5">
            {filteredPatients.map((p) => {
              const isSelected = selectedPatient?.id === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedPatient(p)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white border-[#4A2333] shadow-md ring-2 ring-[#4A2333]/10'
                      : 'bg-white/80 border-slate-200 hover:border-slate-300 hover:bg-white shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-900">{p.name}</h3>
                    <span className="font-mono text-[10px] text-slate-400">{p.id}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    {p.age} yrs • {p.gender} • {p.occupation || 'Retired'}
                  </p>
                </div>
              );
            })}

            {filteredPatients.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-6 bg-white rounded-2xl border border-slate-200">
                No matching patients found.
              </p>
            )}
          </div>
        </div>

        {/* Selected Patient Detailed View (2 cols) */}
        {selectedPatient ? (
          <div className="lg:col-span-2 space-y-6">
            {/* Patient Header Card */}
            <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-[#F8E3DA] text-[#4A2333] flex items-center justify-center font-bold text-lg">
                    {selectedPatient.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-900">{selectedPatient.name}</h2>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                        {selectedPatient.id}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Registered on {new Date(selectedPatient.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => navigateTo('/doctor/reports')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#4A2333] hover:bg-[#5E2F43] text-white font-bold text-xs shadow-md transition cursor-pointer self-start sm:self-auto"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>View Clinical Reports</span>
                </button>
              </div>

              {/* Demographics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Age</span>
                  <p className="font-bold text-slate-800">{selectedPatient.age} years</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Gender</span>
                  <p className="font-bold text-slate-800">{selectedPatient.gender}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Education</span>
                  <p className="font-bold text-slate-800 truncate">{selectedPatient.education || 'N/A'}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Occupation</span>
                  <p className="font-bold text-slate-800 truncate">{selectedPatient.occupation || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Assessment History for Patient */}
            <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Brain className="w-4 h-4 text-[#4A2333]" />
                <span>Multimodal Screening Records ({patientAssessments.length})</span>
              </h3>

              {patientAssessments.length > 0 ? (
                <div className="space-y-3">
                  {patientAssessments.map((rec) => (
                    <div
                      key={rec.assessmentId}
                      className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-slate-800">{rec.assessmentId}</span>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            rec.reportStatus === 'REVIEWED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {rec.reportStatus}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {new Date(rec.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {rec.predictionResult && (
                        <div className="flex items-center justify-between text-xs pt-1">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${predictionBadgeClass(rec.predictionResult.prediction)}`}>
                              {rec.predictionResult.prediction}
                            </span>
                            <span className="font-medium text-slate-700">
                              Probability: {(rec.predictionResult.dementiaProbability * 100).toFixed(1)}%
                            </span>
                          </div>

                          <button
                            onClick={() => navigateTo('/doctor/reports')}
                            className="text-xs font-bold text-[#4A2333] hover:underline cursor-pointer"
                          >
                            Open in Clinical Reviewer →
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 text-center py-6">
                  No previous assessments recorded for this patient.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-sm">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-xs text-slate-500 font-medium">Select a patient to view clinical details.</p>
          </div>
        )}
      </div>
    </div>
  );
};
