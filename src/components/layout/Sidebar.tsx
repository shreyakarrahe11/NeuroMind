import React from 'react';
import { useSafeClerk } from '../auth/ClerkBridge';
import { useAssessment } from '../../context/AssessmentContext';
import { UserRole } from '../../types/assessment';
import logoImage from '../../assets/logo.png';
import {
  Brain,
  ClipboardCheck,
  Mic,
  Activity,
  HeartPulse,
  CheckSquare,
  BarChart3,
  FileText,
  LogOut,
  CheckCircle2,
  Lock,
  Circle,
  LayoutDashboard,
  Users,
  Stethoscope,
  Shield,
  Link,
  User,
  Settings,
  FileCheck,
  MessageCircle,
  Database,
  ScrollText,
  BrainCircuit,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { currentRoute, navigateTo, logout, session, currentUser, user } = useAssessment();
  const { signOut } = useSafeClerk();
  const { status } = session;

  const role: UserRole = currentUser?.role || (user.userRole as UserRole) || 'PATIENT';

  const isComplete = (section: keyof typeof status) => status[section] === true;
  const isLocked = (section: keyof typeof status) => {
    if (section === 'speech') return false;
    if (section === 'memory') return !isComplete('speech') && currentRoute !== '/memory';
    if (section === 'attention') return !isComplete('memory') && currentRoute !== '/attention';
    if (section === 'lifestyle') return !isComplete('attention') && currentRoute !== '/lifestyle';
    return false;
  };

  const screeningNavItems = [
    { label: 'Patient Info', route: '/assessment', icon: ClipboardCheck },
    { label: 'Speech Acoustics', route: '/speech', icon: Mic, id: 'speech' as const },
    { label: 'Episodic Memory', route: '/memory', icon: Brain, id: 'memory' as const },
    { label: 'Attention Span', route: '/attention', icon: Activity, id: 'attention' as const },
    { label: 'Lifestyle Risk', route: '/lifestyle', icon: HeartPulse, id: 'lifestyle' as const },
    { label: 'Review Data', route: '/review', icon: CheckSquare },
    { label: 'Inference Results', route: '/results', icon: BarChart3 },
    { label: 'Screening Report', route: '/report', icon: FileText },
  ];

  return (
    <aside className="w-64 bg-[#4A2333] text-slate-200 flex flex-col shrink-0 min-h-screen border-r border-[#391826] shadow-lg sticky top-0 h-screen z-40 select-none">
      {/* Brand Header */}
      <div
        onClick={() => navigateTo('/')}
        className="p-5 flex items-center gap-3 border-b border-[#391826] cursor-pointer hover:bg-[#5D2E42] transition-colors"
      >
        <div className="w-10 h-10 flex items-center justify-center bg-white/10 rounded-xl overflow-hidden shrink-0">
          <img src={logoImage} alt="NeuroMind Logo" className="w-full h-full object-cover" />
        </div>
        <div>
          <h1 className="font-bold text-lg text-white tracking-tight leading-none">NeuroMind</h1>
          <p className="text-[10px] text-[#F29D88] font-medium mt-0.5 tracking-wide">
            Cognitive Assessment
          </p>
        </div>
      </div>

      {/* Main Nav Content */}
      <div className="flex-1 py-4 px-3 space-y-4 overflow-y-auto custom-scrollbar">
        {/* Role-Specific Portal Section */}
        {role === 'PATIENT' && (
          <div className="space-y-1">
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#F29D88]">
              Patient Portal
            </p>
            <button
              onClick={() => navigateTo('/patient/dashboard')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                currentRoute === '/patient/dashboard'
                  ? 'bg-white/20 text-white font-bold shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-[#F29D88]" />
              <span>Patient Dashboard</span>
            </button>

            <button
              onClick={() => navigateTo('/patient/reports')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                currentRoute === '/patient/reports'
                  ? 'bg-white/20 text-white font-bold shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <FileText className="w-4 h-4 text-[#F29D88]" />
              <span>My Reports</span>
            </button>

            <button
              onClick={() => navigateTo('/patient/profile')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                currentRoute === '/patient/profile'
                  ? 'bg-white/20 text-white font-bold shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <User className="w-4 h-4 text-[#F29D88]" />
              <span>Demographic Profile</span>
            </button>
            <button onClick={() => navigateTo('/patient/care')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${currentRoute === '/patient/care' ? 'bg-white/20 text-white font-bold shadow-xs' : 'text-slate-300 hover:text-white hover:bg-white/5'}`}>
              <MessageCircle className="w-4 h-4 text-[#F29D88]" /><span>Care Messages</span>
            </button>
          </div>
        )}

        {role === 'DOCTOR' && (
          <div className="space-y-1">
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#F29D88]">
              Doctor Portal
            </p>
            <button
              onClick={() => navigateTo('/doctor/dashboard')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                currentRoute === '/doctor/dashboard'
                  ? 'bg-white/20 text-white font-bold shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-[#F29D88]" />
              <span>Clinical Dashboard</span>
            </button>

            <button
              onClick={() => navigateTo('/doctor/patients')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                currentRoute === '/doctor/patients'
                  ? 'bg-white/20 text-white font-bold shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Users className="w-4 h-4 text-[#F29D88]" />
              <span>Assigned Patients</span>
            </button>

            <button
              onClick={() => navigateTo('/doctor/reports')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                currentRoute === '/doctor/reports'
                  ? 'bg-white/20 text-white font-bold shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Stethoscope className="w-4 h-4 text-[#F29D88]" />
              <span>Review Reports</span>
            </button>
            <button onClick={() => navigateTo('/doctor/care')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${currentRoute === '/doctor/care' ? 'bg-white/20 text-white font-bold shadow-xs' : 'text-slate-300 hover:text-white hover:bg-white/5'}`}>
              <MessageCircle className="w-4 h-4 text-[#F29D88]" /><span>Patient Messages</span>
            </button>
          </div>
        )}

        {role === 'ADMIN' && (
          <div className="space-y-1">
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#F29D88]">
              Admin Governance
            </p>
            <button
              onClick={() => navigateTo('/admin/dashboard')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                currentRoute === '/admin/dashboard'
                  ? 'bg-white/20 text-white font-bold shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-[#F29D88]" />
              <span>Control Center</span>
            </button>

            <button
              onClick={() => navigateTo('/admin/doctors')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                currentRoute === '/admin/doctors'
                  ? 'bg-white/20 text-white font-bold shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Stethoscope className="w-4 h-4 text-[#F29D88]" />
              <span>Doctor Verification</span>
            </button>

            <button
              onClick={() => navigateTo('/admin/assignments')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                currentRoute === '/admin/assignments'
                  ? 'bg-white/20 text-white font-bold shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Link className="w-4 h-4 text-[#F29D88]" />
              <span>Patient Assignments</span>
            </button>

            <button
              onClick={() => navigateTo('/admin/users')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                currentRoute === '/admin/users'
                  ? 'bg-white/20 text-white font-bold shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Users className="w-4 h-4 text-[#F29D88]" />
              <span>User Directory</span>
            </button>

            <button
              onClick={() => navigateTo('/admin/reports')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                currentRoute === '/admin/reports'
                  ? 'bg-white/20 text-white font-bold shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <FileCheck className="w-4 h-4 text-[#F29D88]" />
              <span>Audit Reports</span>
            </button>
            <button onClick={() => navigateTo('/admin/care')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${currentRoute === '/admin/care' ? 'bg-white/20 text-white font-bold shadow-xs' : 'text-slate-300 hover:text-white hover:bg-white/5'}`}>
              <MessageCircle className="w-4 h-4 text-[#F29D88]" /><span>Care Requests</span>
            </button>
            <button onClick={() => navigateTo('/admin/data')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${currentRoute === '/admin/data' ? 'bg-white/20 text-white font-bold shadow-xs' : 'text-slate-300 hover:text-white hover:bg-white/5'}`}>
              <Database className="w-4 h-4 text-[#F29D88]" /><span>Assessment Data</span>
            </button>
            <button onClick={() => navigateTo('/admin/audit')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${currentRoute === '/admin/audit' ? 'bg-white/20 text-white font-bold shadow-xs' : 'text-slate-300 hover:text-white hover:bg-white/5'}`}>
              <ScrollText className="w-4 h-4 text-[#F29D88]" /><span>Audit Trail</span>
            </button>
            <button onClick={() => navigateTo('/admin/ai-readiness')} className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${currentRoute === '/admin/ai-readiness' ? 'bg-white/20 text-white font-bold shadow-xs' : 'text-slate-300 hover:text-white hover:bg-white/5'}`}>
              <BrainCircuit className="w-4 h-4 text-[#F29D88]" /><span>AI & Knowledge</span>
            </button>
          </div>
        )}

        {/* Screening Steps Section */}
        {role === 'PATIENT' && (
          <div className="space-y-1 pt-2 border-t border-[#391826]">
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Cognitive Screening
            </p>

            {screeningNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentRoute === item.route;
              const isItemLocked = item.id ? isLocked(item.id) : false;
              const isItemComplete = item.id ? isComplete(item.id) : false;

              return (
                <button
                  key={item.route}
                  onClick={() => {
                    if (!isItemLocked) navigateTo(item.route);
                  }}
                  disabled={isItemLocked}
                  className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-white/15 text-white shadow-xs border border-white/20 font-bold'
                      : isItemLocked
                      ? 'text-slate-500 opacity-60 cursor-not-allowed'
                      : 'text-slate-300 hover:text-white hover:bg-white/5 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#F29D88]' : isItemLocked ? 'text-slate-500' : 'text-slate-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.id && (
                    <div className="flex items-center justify-center">
                      {isItemComplete ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : isActive ? (
                        <Circle className="w-2.5 h-2.5 fill-white text-white" />
                      ) : isItemLocked ? (
                        <Lock className="w-2.5 h-2.5 text-slate-500" />
                      ) : null}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Return to Landing / Sign Out */}
      <div className="p-3 border-t border-[#391826] space-y-2">
        <button
          onClick={async () => {
            try {
              await signOut();
            } catch (error) {
              console.warn('Clerk signOut failed:', error);
            }
            logout();
            navigateTo('/');
          }}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold transition cursor-pointer border border-white/10"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out / Home</span>
        </button>
      </div>
    </aside>
  );
};
