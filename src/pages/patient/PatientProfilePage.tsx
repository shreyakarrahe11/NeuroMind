import React, { useState } from 'react';
import { useAssessment } from '../../context/AssessmentContext';
import { patientService } from '../../services/patientService';
import { useToast } from '../../context/ToastContext';
import { PatientUser } from '../../types/assessment';
import { User, Save, ShieldCheck, HeartPulse, Building2, Phone } from 'lucide-react';

export const PatientProfilePage: React.FC = () => {
  const { currentUser, refreshUserData, navigateTo } = useAssessment();
  const { showToast } = useToast();
  const patient = currentUser?.role === 'PATIENT' ? (currentUser as PatientUser) : null;

  const [formData, setFormData] = useState({
    name: patient?.name || '',
    dateOfBirth: patient?.dateOfBirth || '',
    gender: (patient?.gender || 'Prefer not to say') as any,
    education: patient?.education || '',
    occupation: patient?.occupation || '',
    phone: patient?.phone || '',
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient) return;
    setIsSaving(true);
    try {
      await patientService.updatePatientDemographics(patient.id, formData);
      refreshUserData();
      showToast('Patient profile updated successfully', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update profile', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (!patient) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-slate-200">
        <p className="text-sm font-semibold text-slate-700">Please sign in as a Patient to manage your profile.</p>
        <button
          onClick={() => navigateTo('/login')}
          className="mt-4 px-5 py-2.5 bg-[#4A2333] text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
        >
          Go to Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-2xl sm:text-3xl font-heading font-black text-[#4A2333] tracking-tight">
          Patient Profile & Demographics
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium">
          Manage the demographic information stored with your account.
        </p>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between text-xs">
            <div className="space-y-0.5">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Account ID</span>
              <p className="font-mono font-bold text-slate-900">{patient.id}</p>
            </div>
            <div className="space-y-0.5 text-right">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Account Status</span>
              <p className="font-bold text-emerald-700">{patient.status}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Full Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-[#4A2333] focus:outline-hidden"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Email Address (Read-only)</label>
              <input
                type="email"
                disabled
                value={patient.email}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium bg-slate-100 text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <HeartPulse className="w-3.5 h-3.5 text-[#F29D88]" />
              <span>Demographic Variables</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600">Date of birth</label>
                <input
                  type="date"
                  required
                  max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600">Gender</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium bg-white"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600">Phone</label>
                <input
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600">Highest Education</label>
                <input
                  type="text"
                  value={formData.education}
                  onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600">Occupation</label>
                <input
                  type="text"
                  value={formData.occupation}
                  onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium bg-white"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#4A2333] hover:bg-[#5E2F43] text-white font-bold text-xs uppercase tracking-wider shadow-md transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
