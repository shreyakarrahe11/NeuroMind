import React, { useState, useEffect } from 'react';
import { useAssessment } from '../../context/AssessmentContext';
import { adminService } from '../../services/adminService';
import { doctorService } from '../../services/doctorService';
import { useToast } from '../../context/ToastContext';
import { DoctorUser, AccountStatus } from '../../types/assessment';
import {
  Stethoscope,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building2,
  Phone,
  Shield,
  ArrowRight,
  Users,
} from 'lucide-react';

export const AdminDoctorsPage: React.FC = () => {
  const { currentUser, navigateTo } = useAssessment();
  const { showToast } = useToast();

  const [doctors, setDoctors] = useState<DoctorUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PENDING' | 'SUSPENDED'>('ALL');

  const loadDoctors = async () => {
    const list = await adminService.getAllDoctors();
    setDoctors(list);
  };

  useEffect(() => {
    loadDoctors();
  }, []);

  const handleApprove = async (docId: string, name: string) => {
    try {
      const updatedDoc = await adminService.approveDoctor(docId, currentUser?.id);
      showToast(`${name} approved. The doctor can now sign in with the registered password.`, 'success');
      loadDoctors();
    } catch (err: any) {
      showToast(err.message || 'Failed to approve doctor', 'error');
    }
  };

  const handleStatusToggle = async (docId: string, currentStatus: AccountStatus, name: string) => {
    try {
      const nextStatus: AccountStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
      await adminService.updateUserStatus(docId, nextStatus);
      showToast(`${name} status changed to ${nextStatus}.`, 'info');
      loadDoctors();
    } catch (err: any) {
      showToast(err.message || 'Failed to update status', 'error');
    }
  };

  const filteredDoctors = doctors.filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.licenseNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.institution.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.specialization.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter === 'ALL') return true;
    return doc.status === statusFilter;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-black text-[#4A2333] tracking-tight">
            Doctor Credential & Registry Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Review practitioner credentials, authorize clinical sign-offs, and monitor doctor cohorts.
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
            placeholder="Search by practitioner name, license number, hospital, or specialty..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-[#4A2333] focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
          {(['ALL', 'PENDING', 'ACTIVE', 'SUSPENDED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                statusFilter === st ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Doctors List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredDoctors.map((doc) => {
          const assignedCount = doc.assignedPatientCount || 0;
          return (
            <div
              key={doc.id}
              className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#F8E3DA] text-[#4A2333] flex items-center justify-center font-bold text-base">
                      {doc.name.replace('Dr. ', '').split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{doc.name}</h3>
                      <p className="text-xs text-[#A76A5B] font-semibold">{doc.specialization}</p>
                    </div>
                  </div>

                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    doc.status === 'ACTIVE'
                      ? 'bg-emerald-100 text-emerald-800'
                      : doc.status === 'PENDING'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}>
                    {doc.status}
                  </span>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5 text-xs text-slate-600 font-medium">
                  <p className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-slate-400" />
                    <span>License No.: <strong className="font-mono text-slate-900">{doc.licenseNumber}</strong></span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>{doc.institution} ({doc.department || 'Neurology'})</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>Assigned Patients: <strong>{assignedCount}</strong></span>
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-400 font-mono">ID: {doc.id}</span>

                <div className="flex items-center gap-2">
                  {doc.status === 'PENDING' && (
                    <button
                      onClick={() => handleApprove(doc.id, doc.name)}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                    >
                      Approve Doctor
                    </button>
                  )}

                  {doc.status !== 'PENDING' && (
                    <button
                      onClick={() => handleStatusToggle(doc.id, doc.status, doc.name)}
                      className={`px-3 py-1.5 font-bold text-xs rounded-xl transition cursor-pointer ${
                        doc.status === 'ACTIVE'
                          ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {doc.status === 'ACTIVE' ? 'Suspend Account' : 'Reactivate'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filteredDoctors.length === 0 && (
          <div className="col-span-2 p-12 text-center bg-white rounded-3xl border border-slate-200">
            <Stethoscope className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-xs text-slate-500 font-medium">No doctors found matching the search criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
};
