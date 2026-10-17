import React, { useState } from 'react';
import { useAssessment } from '../context/AssessmentContext';
import { ArrowRight, ShieldCheck, Stethoscope } from 'lucide-react';
import { authService } from '../services/authService';
import logoImage from '../assets/logo.png';

export const DoctorRegisterPage: React.FC = () => {
  const { navigateTo } = useAssessment();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: '',
    institution: '',
    licenseNumber: '',
    password: '',
    specialization: 'Neurology / Memory Disorders',
    phone: '',
    city: '', area: '', yearsOfExperience: '', qualification: '', bio: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await authService.registerDoctor({
        name: formData.name,
        email: formData.email,
        department: formData.department,
        institution: formData.institution,
        licenseNumber: formData.licenseNumber,
        password: formData.password,
        specialization: formData.specialization,
        phone: formData.phone,
        city: formData.city, area: formData.area,
        yearsOfExperience: formData.yearsOfExperience ? Number(formData.yearsOfExperience) : undefined,
        qualification: formData.qualification, bio: formData.bio,
      });

      // Clear form and show success message
      setFormData({
        name: '',
        email: '',
        department: '',
        institution: '',
        licenseNumber: '',
        password: '',
        specialization: '',
        phone: '',
        city: '', area: '', yearsOfExperience: '', qualification: '', bio: '',
      });
      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to submit registration application. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[#F7F3F2] flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xl space-y-6 text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8 text-amber-600" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-heading font-black text-[#4A2333]">
              Application Submitted
            </h2>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Your clinical practitioner profile has been submitted and is currently in{' '}
              <strong className="text-amber-600">Pending Verification</strong> status. A medical administrator will review your medical license and activate your portal access.
            </p>
          </div>

          <div className="pt-2 space-y-3">
            <button
              onClick={() => navigateTo('/login')}
              className="w-full py-3 px-4 rounded-xl bg-[#4A2333] hover:bg-[#5E2F43] text-white font-bold text-xs shadow-md transition cursor-pointer"
            >
              Go to Clinical Login
            </button>
            <button
              onClick={() => navigateTo('/')}
              className="w-full py-2.5 px-4 text-xs font-bold text-slate-600 hover:text-slate-900 transition cursor-pointer"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F3F2] flex items-center justify-center py-12 px-4 selection:bg-[#F29D88] selection:text-white">
      <div className="max-w-xl w-full bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <button
            onClick={() => navigateTo('/')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors mb-2 cursor-pointer"
          >
            <ArrowRight className="w-3.5 h-3.5 rotate-180" />
            <span>Back to Home</span>
          </button>
          <div className="w-14 h-14 mx-auto mb-2">
            <img src={logoImage} alt="NeuroMind" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-black text-[#4A2333] tracking-tight">
            Doctor & Clinician Registration
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-md mx-auto">
            Register your clinical account to review assigned patient assessments, multimodal screening telemetry, and clinician-reviewed reports.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Full Name (with title) *</label>
              <input
                type="text"
                required
                placeholder="e.g. Dr. Robert Sterling, MD"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-[#4A2333] focus:outline-hidden bg-slate-50/50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Institutional Email *</label>
              <input
                type="email"
                required
                placeholder="e.g. r.sterling@hospital.org"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-[#4A2333] focus:outline-hidden bg-slate-50/50"
              />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <Stethoscope className="w-3.5 h-3.5 text-[#F29D88]" />
              <span>Medical Credentials & Practice Details</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600">Medical License / NPI Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MD-NEURO-94021"
                  value={formData.licenseNumber}
                  onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium bg-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600">Portal Password *</label>
                <input type="password" required minLength={12} placeholder="12+ chars with upper, lower, number & symbol"
                  value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium bg-white" />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600">Specialization *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Behavioral Neurology"
                  value={formData.specialization}
                  onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium bg-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600">Hospital / Institution Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Memorial Neuroscience Center"
                  value={formData.institution}
                  onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium bg-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600">Department</label>
                <input
                  type="text"
                  placeholder="e.g. Memory & Aging Clinic"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium bg-white"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600">Direct Clinical Phone (Optional)</label>
              <input
                type="tel"
                placeholder="+1 (555) 000-0000"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium bg-white"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="text-[11px] font-bold text-slate-600">City
                <input value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} maxLength={120} placeholder="City of practice" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium" />
              </label>
              <label className="text-[11px] font-bold text-slate-600">Area
                <input value={formData.area} onChange={(e) => setFormData({ ...formData, area: e.target.value })} maxLength={120} placeholder="Neighbourhood or district" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium" />
              </label>
              <label className="text-[11px] font-bold text-slate-600">Years of experience
                <input type="number" min={0} max={75} value={formData.yearsOfExperience} onChange={(e) => setFormData({ ...formData, yearsOfExperience: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium" />
              </label>
              <label className="text-[11px] font-bold text-slate-600">Qualification
                <input value={formData.qualification} onChange={(e) => setFormData({ ...formData, qualification: e.target.value })} maxLength={255} placeholder="Medical degree or certification" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium" />
              </label>
            </div>
            <label className="block text-[11px] font-bold text-slate-600">Professional background
              <textarea value={formData.bio} onChange={(e) => setFormData({ ...formData, bio: e.target.value })} maxLength={2000} rows={3} placeholder="Describe your clinical experience" className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium" />
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-6 rounded-2xl bg-[#4A2333] hover:bg-[#5E2F43] text-white font-bold text-xs uppercase tracking-wider shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Stethoscope className="w-4 h-4" />
            <span>{isLoading ? 'Submitting Credentials...' : 'Submit Doctor Registration'}</span>
          </button>
        </form>

        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Already registered?{' '}
            <button
              onClick={() => navigateTo('/login')}
              className="font-bold text-[#4A2333] hover:underline cursor-pointer"
            >
              Sign In
            </button>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Subject to Administrator Verification</span>
          </div>
        </div>
      </div>
    </div>
  );
};
