import React, { useState, useEffect } from 'react';
import { useAssessment } from '../../context/AssessmentContext';
import { adminService } from '../../services/adminService';
import { doctorService } from '../../services/doctorService';
import { useToast } from '../../context/ToastContext';
import { PatientUser, DoctorUser } from '../../types/assessment';
import {
  Link,
  Users,
  Stethoscope,
  Search,
  CheckCircle2,
  XCircle,
  ArrowRight,
  X,
  UserCheck,
  Building2,
  Sparkles,
} from 'lucide-react';

export const AdminAssignmentsPage: React.FC = () => {
  const { navigateTo } = useAssessment();
  const { showToast } = useToast();

  const [patients, setPatients] = useState<PatientUser[]>([]);
  const [requests, setRequests] = useState<PatientUser[]>([]);
  const [doctors, setDoctors] = useState<DoctorUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAssignment, setFilterAssignment] = useState<'ALL' | 'UNASSIGNED' | 'ASSIGNED'>('ALL');

  // Assignment Modal
  const [assigningPatient, setAssigningPatient] = useState<PatientUser | null>(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');

  const loadData = async () => {
    const [p, pending] = await Promise.all([adminService.getAllPatients(), adminService.getDoctorAssistanceRequests()]);
    setRequests(pending);
    const pendingById = new Map(pending.map((item) => [item.id, item]));
    setPatients([...pending, ...p.filter((item) => !pendingById.has(item.id))]);

    const allDoctors = await adminService.getAllDoctors();
    const d = allDoctors.filter((doc) => doc.status === 'ACTIVE');
    setDoctors(d);
    if (d.length > 0) {
      setSelectedDoctorId(d[0].id);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAssignModal = (patient: PatientUser) => {
    if (!patient.doctorAssistanceRequestedAt || patient.assignedDoctorId) return;
    setAssigningPatient(patient);
    if (patient.assignedDoctorId) {
      setSelectedDoctorId(patient.assignedDoctorId);
    } else if (doctors.length > 0) {
      setSelectedDoctorId(doctors[0].id);
    }
  };

  const handleConfirmAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningPatient || !selectedDoctorId) return;

    try {
      const updated = await adminService.assignPatientToDoctor(assigningPatient.id, selectedDoctorId);
      showToast(`Assigned ${updated.name} to ${updated.assignedDoctorName}.`, 'success');
      setAssigningPatient(null);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Assignment failed', 'error');
    }
  };

  const handleRemoveAssignment = async (patientId: string, patientName: string) => {
    try {
      await adminService.removeAssignment(patientId);
      showToast(`Removed doctor assignment for ${patientName}.`, 'info');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to remove assignment', 'error');
    }
  };

  const filteredPatients = patients.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.assignedDoctorName && p.assignedDoctorName.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;
    if (filterAssignment === 'UNASSIGNED') return !p.assignedDoctorId;
    if (filterAssignment === 'ASSIGNED') return Boolean(p.assignedDoctorId);
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-black text-[#4A2333] tracking-tight">
            Patient-Doctor Clinical Assignments
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Match patients who requested assistance with approved doctors. Patients can also choose a doctor themselves.
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

      {/* Filter and Search Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search patients or assigned doctors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-[#4A2333] focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
          <button
            onClick={() => setFilterAssignment('ALL')}
            className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
              filterAssignment === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            All Patients ({patients.length})
          </button>
          <button
            onClick={() => setFilterAssignment('UNASSIGNED')}
            className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
              filterAssignment === 'UNASSIGNED' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Unassigned ({patients.filter((p) => !p.assignedDoctorId).length})
          </button>
          <button
            onClick={() => setFilterAssignment('ASSIGNED')}
            className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
              filterAssignment === 'ASSIGNED' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Assigned ({patients.filter((p) => Boolean(p.assignedDoctorId)).length})
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-semibold text-amber-900" role="status">
        {requests.length} patient{requests.length === 1 ? '' : 's'} waiting for help choosing a doctor.
      </div>
      {/* Patient Assignments Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-6">Patient</th>
                <th className="py-3.5 px-6">Age / Gender</th>
                <th className="py-3.5 px-6">Assigned Doctor</th>
                <th className="py-3.5 px-6">Assignment Date</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredPatients.map((p) => {
                const isAssigned = Boolean(p.assignedDoctorId);
                return (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-4 px-6">
                      <div className="font-bold text-slate-900">{p.name}</div>
                      <div className="font-mono text-[10px] text-slate-400">{p.id}</div>
                    </td>
                    <td className="py-4 px-6">{p.age} yrs • {p.gender}</td>
                    <td className="py-4 px-6">
                      {isAssigned ? (
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-900 flex items-center gap-1.5">
                            <Stethoscope className="w-3.5 h-3.5 text-[#A76A5B]" />
                            <span>{p.assignedDoctorName}</span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">{p.assignedDoctorId}</span>
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-slate-500">
                      {p.assignedAt ? new Date(p.assignedAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      {p.doctorAssistanceRequestedAt && !isAssigned ?
                        <button onClick={() => handleOpenAssignModal(p)} className="rounded-xl bg-[#4A2333] px-3 py-1.5 text-xs font-bold text-white">Help choose doctor</button> :
                        <span className="text-[11px] text-slate-500">{isAssigned ? 'Patient care team active' : 'Patient may choose a doctor'}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredPatients.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-10">No patients matching criteria.</p>
        )}
      </div>

      {/* Assignment Modal */}
      {assigningPatient && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-heading font-black text-[#4A2333] flex items-center gap-2">
                <Link className="w-5 h-5 text-[#A76A5B]" />
                <span>Assign Clinical Specialist</span>
              </h2>
              <button
                onClick={() => setAssigningPatient(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-1">
              <p className="font-bold text-slate-900 text-sm">{assigningPatient.name}</p>
              <p className="text-slate-500">
                Patient ID: <span className="font-mono font-bold text-slate-700">{assigningPatient.id}</span> • {assigningPatient.age} yrs • {assigningPatient.gender}
              </p>
            </div>

            <form onSubmit={handleConfirmAssignment} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">Select Active Verified Doctor:</label>
                
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {doctors.map((doc) => {
                    const isSelected = selectedDoctorId === doc.id;
                    const patientCount = doc.assignedPatientCount || 0;
                    return (
                      <div
                        key={doc.id}
                        onClick={() => setSelectedDoctorId(doc.id)}
                        className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-[#F8E3DA]/50 border-[#4A2333] ring-1 ring-[#4A2333]'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="space-y-0.5 text-xs">
                          <p className="font-bold text-slate-900">{doc.name}</p>
                          <p className="text-slate-500">{doc.specialization} • {doc.institution}</p>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                          {patientCount} patients
                        </span>
                      </div>
                    );
                  })}

                  {doctors.length === 0 && (
                    <p className="text-xs text-rose-600 text-center py-4">
                      No active verified doctors available. Please approve pending doctor applications first.
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAssigningPatient(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={doctors.length === 0}
                  className="px-5 py-2.5 rounded-xl bg-[#4A2333] hover:bg-[#5E2F43] text-white font-bold text-xs uppercase tracking-wider shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
