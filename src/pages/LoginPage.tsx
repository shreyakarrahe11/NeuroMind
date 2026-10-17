import React, { useState } from 'react';
import { useAssessment } from '../context/AssessmentContext';
import { UserRole } from '../types/assessment';
import { ArrowRight, ShieldCheck, Stethoscope, User, Shield, AlertCircle } from 'lucide-react';
import logoImage from '../assets/logo.png';
import { SafeSignIn } from '../components/auth/ClerkBridge';

export const LoginPage: React.FC = () => {
  const { navigateTo, loginWithAuthService } = useAssessment();
  const [selectedRole, setSelectedRole] = useState<UserRole>('PATIENT');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRoleTabChange = (role: UserRole) => {
    setSelectedRole(role);
    setError(null);
    setEmail('');
    setPassword('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const user = await loginWithAuthService(email.trim(), password, selectedRole);
      // Route appropriately based on user role
      if (user.role === 'PATIENT') {
        navigateTo('/patient/dashboard');
      } else if (user.role === 'DOCTOR') {
        navigateTo('/doctor/dashboard');
      } else if (user.role === 'ADMIN') {
        navigateTo('/admin/dashboard');
      } else {
        navigateTo('/assessment');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F3F2] flex items-center justify-center py-12 px-4 selection:bg-[#F29D88] selection:text-white">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 sm:p-9 border border-slate-200 shadow-xl space-y-6">
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
          <h1 className="text-2xl font-heading font-black text-[#4A2333] tracking-tight">
            NeuroMind Access Portal
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Select your clinical access tier to enter the multimodal cognitive system
          </p>
        </div>

        {/* Role Selection Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100/80 rounded-2xl border border-slate-200/80">
          <button
            type="button"
            onClick={() => handleRoleTabChange('PATIENT')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              selectedRole === 'PATIENT'
                ? 'bg-white text-[#4A2333] shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Patient</span>
          </button>
          <button
            type="button"
            onClick={() => handleRoleTabChange('DOCTOR')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              selectedRole === 'DOCTOR'
                ? 'bg-white text-[#4A2333] shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span>Doctor</span>
          </button>
          <button
            type="button"
            onClick={() => handleRoleTabChange('ADMIN')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              selectedRole === 'ADMIN'
                ? 'bg-white text-[#4A2333] shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Admin</span>
          </button>
        </div>

        {selectedRole === 'PATIENT' ? (
          <div className="flex flex-col items-center">
            <SafeSignIn />
            <div className="mt-4 pt-3 border-t w-full border-slate-100 space-y-2 text-center text-xs">
              <p className="text-slate-500">
                New patient?{' '}
                <button
                  onClick={() => navigateTo('/register')}
                  className="font-bold text-[#4A2333] hover:underline cursor-pointer"
                >
                  Create a Patient Account
                </button>
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 my-1">
              <div className="flex-1 border-t border-slate-200" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">enter credentials</span>
              <div className="flex-1 border-t border-slate-200" />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">User Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-[#4A2333] focus:outline-hidden bg-slate-50/50"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-[#4A2333] focus:outline-hidden bg-slate-50/50"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-[#4A2333] hover:bg-[#5E2F43] text-white font-bold text-xs uppercase tracking-wider shadow-md transition cursor-pointer disabled:opacity-50"
              >
                {isLoading ? 'Authenticating...' : `Sign In to ${selectedRole.toLowerCase()} Portal`}
              </button>
            </form>

            <div className="pt-3 border-t border-slate-100 space-y-2 text-center text-xs">
              {selectedRole === 'DOCTOR' && (
                <p className="text-slate-500">
                  New medical specialist?{' '}
                  <button
                    onClick={() => navigateTo('/doctor/register')}
                    className="font-bold text-[#4A2333] hover:underline cursor-pointer"
                  >
                    Apply for Doctor Portal Access
                  </button>
                </p>
              )}
              {selectedRole === 'ADMIN' && (
                <p className="text-[11px] text-slate-400">
                  Use the administrator credentials configured only in <code>backend/.env</code>.
                </p>
              )}
              <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Role-Based Access Control Protected</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
