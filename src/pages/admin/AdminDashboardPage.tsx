import React, { useState, useEffect } from 'react';
import { useAssessment } from '../../context/AssessmentContext';
import { adminService, SystemMetrics } from '../../services/adminService';
import { useToast } from '../../context/ToastContext';
import { AdminUser, DoctorUser, AssessmentRecord } from '../../types/assessment';
import {
  Shield,
  Users,
  Stethoscope,
  Brain,
  FileCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  UserPlus,
  Link,
  Activity,
  Layers,
} from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const { currentUser, navigateTo } = useAssessment();
  const { showToast } = useToast();
  const admin = currentUser?.role === 'ADMIN' ? (currentUser as AdminUser) : null;

  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [pendingDoctors, setPendingDoctors] = useState<DoctorUser[]>([]);
  const [recentReports, setRecentReports] = useState<AssessmentRecord[]>([]);

  const loadData = async () => {
    const m = await adminService.getSystemMetrics();
    setMetrics(m);

    const doctors = await adminService.getAllDoctors();
    setPendingDoctors(doctors.filter((d) => d.status === 'PENDING'));

    const reports = await adminService.getAllReports();
    setRecentReports(reports.slice(0, 5));
  };

  useEffect(() => {
    if (admin) {
      loadData();
    }
  }, [admin]);

  const handleApproveDoctor = async (doctorId: string, doctorName: string) => {
    try {
      await adminService.approveDoctor(doctorId, admin?.id);
      showToast(`Doctor credentials verified. ${doctorName} is now active.`, 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to approve doctor', 'error');
    }
  };

  const handleRejectDoctor = async (doctorId: string, doctorName: string) => {
    try {
      await adminService.rejectDoctor(doctorId);
      showToast(`Doctor application rejected for ${doctorName}.`, 'info');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to reject doctor', 'error');
    }
  };

  if (!admin) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-slate-200">
        <p className="text-sm font-semibold text-slate-700">Please sign in with an Administrator account.</p>
        <button
          onClick={() => navigateTo('/login')}
          className="mt-4 px-5 py-2.5 bg-[#4A2333] text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
        >
          Admin Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header Banner */}
      <div className="p-8 sm:p-10 bg-gradient-to-br from-[#1E293B] via-[#0F172A] to-[#020617] text-white rounded-3xl shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[#F8E3DA] text-[11px] font-bold uppercase tracking-wider">
              <Shield className="w-3.5 h-3.5" />
              <span>{admin.department || 'Central Clinical Operations & Governance'}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-heading font-black tracking-tight">
              Administrative Control Center
            </h1>
            <p className="text-xs sm:text-sm text-white/80 max-w-xl font-normal leading-relaxed">
              System governance, practitioner credential verification, doctor-patient assignment workflows, and screening audit logs.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => navigateTo('/admin/doctors')}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs uppercase tracking-wider transition cursor-pointer"
            >
              Verify Doctors ({pendingDoctors.length})
            </button>
            <button
              onClick={() => navigateTo('/admin/assignments')}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider backdrop-blur-md transition cursor-pointer"
            >
              Patient Assignments
            </button>
            <button
              onClick={() => navigateTo('/admin/users')}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider backdrop-blur-md transition cursor-pointer"
            >
              User Directory
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      {metrics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-1.5">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Registered Patients</span>
              <Users className="w-4 h-4 text-[#A76A5B]" />
            </div>
            <p className="text-2xl font-black text-slate-900">{metrics.totalPatients}</p>
            <p className="text-[11px] text-slate-400 font-medium">In active clinical registries</p>
          </div>

          <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-1.5">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Clinical Doctors</span>
              <Stethoscope className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-black text-emerald-600">{metrics.activeDoctors}</p>
            <p className="text-[11px] text-amber-600 font-medium font-bold">
              {metrics.pendingDoctors} pending verification
            </p>
          </div>

          <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-1.5">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Assessments</span>
              <Brain className="w-4 h-4 text-[#4A2333]" />
            </div>
            <p className="text-2xl font-black text-slate-900">{metrics.totalAssessments}</p>
            <p className="text-[11px] text-slate-400 font-medium">{metrics.totalReports} generated reports</p>
          </div>

          <div className="p-5 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-1.5">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">High Risk Identified</span>
              <AlertTriangle className="w-4 h-4 text-rose-500" />
            </div>
            <p className="text-2xl font-black text-rose-600">{metrics.highRiskAssessments}</p>
            <p className="text-[11px] text-slate-400 font-medium">Model-classified high risk</p>
          </div>
        </div>
      )}

      {/* Pending Doctor Approvals Section */}
      <div className="p-6 sm:p-8 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Doctor Credential Verification Queue</h2>
            <p className="text-xs text-slate-500">Review medical licenses and activate doctor clinical accounts</p>
          </div>
          <button
            onClick={() => navigateTo('/admin/doctors')}
            className="text-xs font-bold text-[#4A2333] hover:underline cursor-pointer"
          >
            All Doctors ({metrics?.totalDoctors ?? 0})
          </button>
        </div>

        {pendingDoctors.length > 0 ? (
          <div className="space-y-3">
            {pendingDoctors.map((doc) => (
              <div
                key={doc.id}
                className="p-4 sm:p-5 rounded-2xl bg-amber-50/50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{doc.name}</span>
                    <span className="font-mono text-[10px] bg-white px-2 py-0.5 rounded-md border border-slate-200 text-slate-600">
                      License: {doc.licenseNumber}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                      PENDING VERIFICATION
                    </span>
                  </div>
                  <p className="text-slate-600">
                    <strong>{doc.specialization}</strong> • {doc.institution} ({doc.department})
                  </p>
                  <p className="text-slate-400 font-mono text-[11px]">
                    Email: {doc.email} {doc.phone && `• Phone: ${doc.phone}`}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleApproveDoctor(doc.id, doc.name)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve & Activate</span>
                  </button>
                  <button
                    onClick={() => handleRejectDoctor(doc.id, doc.name)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center bg-slate-50 rounded-2xl border border-slate-100">
            <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5" />
            <p className="text-xs font-bold text-slate-700">No Doctor Applications Pending</p>
            <p className="text-xs text-slate-400">All registered clinical doctors have been verified and active.</p>
          </div>
        )}
      </div>

      {/* Quick Governance Links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div
          onClick={() => navigateTo('/admin/assignments')}
          className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm hover:border-[#4A2333] transition cursor-pointer space-y-2 group"
        >
          <div className="w-10 h-10 rounded-2xl bg-[#F8E3DA] text-[#4A2333] flex items-center justify-center font-bold">
            <Link className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#4A2333] transition">
            Patient-Doctor Assignments
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Pair memory clinic patients with dedicated clinical specialists for screening oversight.
          </p>
        </div>

        <div
          onClick={() => navigateTo('/admin/users')}
          className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm hover:border-[#4A2333] transition cursor-pointer space-y-2 group"
        >
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition">
            User Account Governance
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Manage permissions, suspend/reactivate accounts, and audit authentication records.
          </p>
        </div>

        <div
          onClick={() => navigateTo('/admin/reports')}
          className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm hover:border-[#4A2333] transition cursor-pointer space-y-2 group"
        >
          <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
            <FileCheck className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 group-hover:text-purple-700 transition">
            System-Wide Screening Reports
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Comprehensive archive of all multimodal assessments and physician review logs.
          </p>
        </div>
      </div>
    </div>
  );
};
