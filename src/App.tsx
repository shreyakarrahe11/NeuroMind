import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSafeUser, useSafeClerk, useSafeClerkAuth } from './components/auth/ClerkBridge';
import { AssessmentProvider, useAssessment } from './context/AssessmentContext';
import { Sidebar } from './components/layout/Sidebar';
import { HeaderBar } from './components/layout/HeaderBar';
import { LandingPage } from './pages/LandingPage';
import { AssessmentOverviewPage } from './pages/AssessmentOverviewPage';
import { SpeechPage } from './pages/SpeechPage';
import { MemoryPage } from './pages/MemoryPage';
import { AttentionPage } from './pages/AttentionPage';
import { LifestylePage } from './pages/LifestylePage';
import { ReviewPage } from './pages/ReviewPage';
import { AnalyzingPage } from './pages/AnalyzingPage';
import { ResultsPage } from './pages/ResultsPage';
import { ReportPage } from './pages/ReportPage';
import { AboutPage } from './pages/AboutPage';
import { HowItWorksPage } from './pages/HowItWorksPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DoctorRegisterPage } from './pages/DoctorRegisterPage';
import { PatientDashboardPage } from './pages/patient/PatientDashboardPage';
import { PatientReportsPage } from './pages/patient/PatientReportsPage';
import { PatientProfilePage } from './pages/patient/PatientProfilePage';
import { DoctorDashboardPage } from './pages/doctor/DoctorDashboardPage';
import { DoctorPatientsPage } from './pages/doctor/DoctorPatientsPage';
import { DoctorReportsPage } from './pages/doctor/DoctorReportsPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminDoctorsPage } from './pages/admin/AdminDoctorsPage';
import { AdminAssignmentsPage } from './pages/admin/AdminAssignmentsPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminReportsPage } from './pages/admin/AdminReportsPage';
import { AdminAssessmentDataPage } from './pages/admin/AdminAssessmentDataPage';
import { AdminAuditLogPage } from './pages/admin/AdminAuditLogPage';
import { AdminAiReadinessPage } from './pages/admin/AdminAiReadinessPage';
import { CareCenterPage } from './pages/CareCenterPage';
import { ExploreOverviewPage } from './pages/explore/ExploreOverviewPage';
import { ExploreSpeechPage } from './pages/explore/ExploreSpeechPage';
import { ExploreMemoryPage } from './pages/explore/ExploreMemoryPage';
import { ExploreAttentionPage } from './pages/explore/ExploreAttentionPage';
import { ExploreLifestylePage } from './pages/explore/ExploreLifestylePage';
import { AnimatePresence, motion } from 'motion/react';
import { ToastProvider } from './context/ToastContext';
import { authService } from './services/authService';

const PageWrapper: React.FC<{ children: React.ReactNode; path: string }> = ({ children, path }) => (
  <motion.div
    key={path}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.25, ease: 'easeOut' }}
    className="h-full"
  >
    {children}
  </motion.div>
);

const AppContent: React.FC = () => {
  const { currentRoute, currentUser, session, logout, navigateTo, refreshUserData } = useAssessment();
  const { isSignedIn, isLoaded, user: clerkUser } = useSafeUser();
  const { getToken: getClerkToken, isClerkActive } = useSafeClerkAuth();
  const { signOut } = useSafeClerk();
  const [clerkSyncState, setClerkSyncState] = useState<'idle' | 'syncing' | 'ready' | 'error'>('idle');
  const [clerkSyncError, setClerkSyncError] = useState('');
  const [syncAttempt, setSyncAttempt] = useState(0);
  const activeSyncAttempt = useRef(0);

  const clerkEmail = clerkUser?.emailAddresses?.[0]?.emailAddress?.trim().toLowerCase() ?? '';
  const clerkIdentity = `${clerkUser?.id ?? ''}:${clerkEmail}`;
  const isPublicPage = useMemo(() => (
    currentRoute === '/' ||
    currentRoute === '/about' ||
    currentRoute === '/how-it-works' ||
    currentRoute === '/login' ||
    currentRoute === '/register' ||
    currentRoute === '/doctor/register' ||
    currentRoute.startsWith('/explore')
  ), [currentRoute]);

  useEffect(() => {
    let cancelled = false;
    const attemptId = activeSyncAttempt.current + 1;
    activeSyncAttempt.current = attemptId;

    const syncClerkPatient = async () => {
      if (!isClerkActive) {
        setClerkSyncState('ready');
        return;
      }
      if (!isLoaded) return;
      if (!isSignedIn) {
        setClerkSyncState('idle');
        setClerkSyncError('');
        return;
      }
      if (!clerkUser || !clerkEmail) {
        setClerkSyncState('error');
        setClerkSyncError('Your Clerk account does not provide a primary email address. Add one and try again.');
        return;
      }

      setClerkSyncState('syncing');
      setClerkSyncError('');

      try {
        const token = await getClerkToken({ skipCache: true });
        if (!token) throw new Error('Clerk did not return a session token. Please sign in again.');
        const parts = (clerkUser.fullName || clerkUser.firstName || 'NeuroMind Patient').trim().split(/\s+/);
        const first_name = clerkUser.firstName || parts[0] || 'NeuroMind';
        const last_name = clerkUser.fullName ? (parts.slice(1).join(' ') || 'Patient') : 'Patient';
        await authService.exchangeClerkSession(token, { first_name, last_name });
        if (!cancelled && activeSyncAttempt.current === attemptId) {
          refreshUserData();
          setClerkSyncState('ready');
          const browserPath = typeof window !== 'undefined' ? window.location.pathname : '/';
          if (browserPath.startsWith('/login') || browserPath.startsWith('/register')) {
            navigateTo('/patient/dashboard');
          }
        }
      } catch (error) {
        console.error('Unable to synchronize Clerk patient with NeuroMind backend:', error);
        if (!cancelled && activeSyncAttempt.current === attemptId) {
          setClerkSyncState('error');
          setClerkSyncError(error instanceof Error ? error.message : 'Unable to create the NeuroMind patient session.');
        }
      }
    };

    syncClerkPatient();
    return () => { cancelled = true; };
  }, [isClerkActive, isLoaded, isSignedIn, clerkIdentity, clerkEmail, clerkUser?.fullName, clerkUser?.firstName, getClerkToken, refreshUserData, navigateTo, syncAttempt]);

  useEffect(() => {
    if (isClerkActive && isLoaded && !isSignedIn && currentUser?.role === 'PATIENT') {
      logout();
    }
  }, [isClerkActive, isLoaded, isSignedIn, currentUser?.role, logout]);

  useEffect(() => {
    if (!isLoaded || isPublicPage || clerkSyncState === 'syncing') return;
    if (!currentUser) {
      navigateTo('/login');
      return;
    }

    const clinicalAssessmentRoute = ['/assessment', '/speech', '/memory', '/attention', '/lifestyle', '/review', '/analyzing', '/results', '/report'].includes(currentRoute);
    if ((currentRoute.startsWith('/patient/') || clinicalAssessmentRoute) && currentUser.role !== 'PATIENT') {
      navigateTo(currentUser.role === 'DOCTOR' ? '/doctor/dashboard' : '/admin/dashboard');
    } else if (clinicalAssessmentRoute && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(session.sessionId)) {
      navigateTo('/patient/dashboard');
    } else if (currentRoute.startsWith('/doctor/') && currentUser.role !== 'DOCTOR') {
      navigateTo(currentUser.role === 'PATIENT' ? '/patient/dashboard' : '/admin/dashboard');
    } else if (currentRoute.startsWith('/admin/') && currentUser.role !== 'ADMIN') {
      navigateTo(currentUser.role === 'PATIENT' ? '/patient/dashboard' : '/doctor/dashboard');
    }
  }, [isLoaded, isPublicPage, clerkSyncState, currentRoute, currentUser, session.sessionId, navigateTo]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F3F2] text-[#4A2333]">
        <div className="text-center">
          <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-2 border-[#F29D88] border-t-transparent" />
          <p className="text-sm font-semibold tracking-[0.18em] uppercase text-[#4A2333]">Loading workspace</p>
        </div>
      </div>
    );
  }

  if (isClerkActive && isSignedIn && clerkSyncState === 'syncing') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F3F2] text-[#4A2333]">
        <div className="text-center">
          <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-2 border-[#F29D88] border-t-transparent" />
          <p className="text-sm font-semibold">Securing your NeuroMind patient session…</p>
        </div>
      </div>
    );
  }

  if (isClerkActive && isSignedIn && clerkSyncState === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F3F2] p-4">
        <div className="w-full max-w-lg rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-xl">
          <h1 className="text-xl font-black text-[#4A2333]">Patient sign-in needs attention</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">{clerkSyncError}</p>
          <p className="mt-2 text-xs text-slate-500">Confirm the backend is running and its Clerk issuer or JWT public key is configured.</p>
          <div className="mt-6 flex justify-center gap-3">
            <button onClick={() => setSyncAttempt((value) => value + 1)} className="rounded-xl bg-[#4A2333] px-5 py-2.5 text-xs font-bold text-white">Retry</button>
            <button onClick={() => void signOut()} className="rounded-xl border border-slate-300 px-5 py-2.5 text-xs font-bold text-slate-700">Sign out</button>
          </div>
        </div>
      </div>
    );
  }

  const renderCurrentPage = () => {
    switch (currentRoute) {
      // Landing & Public info
      case '/':
        return <PageWrapper path="/"><LandingPage /></PageWrapper>;
      case '/about':
        return <PageWrapper path="/about"><AboutPage /></PageWrapper>;
      case '/how-it-works':
        return <PageWrapper path="/how-it-works"><HowItWorksPage /></PageWrapper>;
      case '/login':
        return <PageWrapper path="/login"><LoginPage /></PageWrapper>;
      case '/register':
        return <PageWrapper path="/register"><RegisterPage /></PageWrapper>;
      case '/doctor/register':
        return <PageWrapper path="/doctor/register"><DoctorRegisterPage /></PageWrapper>;

      // Explore interactive showcases
      case '/explore':
        return <PageWrapper path="/explore"><ExploreOverviewPage /></PageWrapper>;
      case '/explore/speech':
        return <PageWrapper path="/explore/speech"><ExploreSpeechPage /></PageWrapper>;
      case '/explore/memory':
        return <PageWrapper path="/explore/memory"><ExploreMemoryPage /></PageWrapper>;
      case '/explore/attention':
        return <PageWrapper path="/explore/attention"><ExploreAttentionPage /></PageWrapper>;
      case '/explore/lifestyle':
        return <PageWrapper path="/explore/lifestyle"><ExploreLifestylePage /></PageWrapper>;

      // Patient Portal
      case '/patient/dashboard':
        return <PageWrapper path="/patient/dashboard"><PatientDashboardPage /></PageWrapper>;
      case '/patient/reports':
        return <PageWrapper path="/patient/reports"><PatientReportsPage /></PageWrapper>;
      case '/patient/profile':
        return <PageWrapper path="/patient/profile"><PatientProfilePage /></PageWrapper>;
      case '/patient/care':
        return <PageWrapper path="/patient/care"><CareCenterPage /></PageWrapper>;

      // Doctor Portal
      case '/doctor/dashboard':
        return <PageWrapper path="/doctor/dashboard"><DoctorDashboardPage /></PageWrapper>;
      case '/doctor/patients':
        return <PageWrapper path="/doctor/patients"><DoctorPatientsPage /></PageWrapper>;
      case '/doctor/reports':
        return <PageWrapper path="/doctor/reports"><DoctorReportsPage /></PageWrapper>;
      case '/doctor/care':
        return <PageWrapper path="/doctor/care"><CareCenterPage /></PageWrapper>;

      // Admin Governance Portal
      case '/admin/dashboard':
        return <PageWrapper path="/admin/dashboard"><AdminDashboardPage /></PageWrapper>;
      case '/admin/doctors':
        return <PageWrapper path="/admin/doctors"><AdminDoctorsPage /></PageWrapper>;
      case '/admin/assignments':
        return <PageWrapper path="/admin/assignments"><AdminAssignmentsPage /></PageWrapper>;
      case '/admin/users':
        return <PageWrapper path="/admin/users"><AdminUsersPage /></PageWrapper>;
      case '/admin/reports':
        return <PageWrapper path="/admin/reports"><AdminReportsPage /></PageWrapper>;
      case '/admin/data':
        return <PageWrapper path="/admin/data"><AdminAssessmentDataPage /></PageWrapper>;
      case '/admin/audit':
        return <PageWrapper path="/admin/audit"><AdminAuditLogPage /></PageWrapper>;
      case '/admin/ai-readiness':
        return <PageWrapper path="/admin/ai-readiness"><AdminAiReadinessPage /></PageWrapper>;
      case '/admin/care':
        return <PageWrapper path="/admin/care"><CareCenterPage /></PageWrapper>;

      // Clinical Screening Suite Steps
      case '/assessment':
        return <PageWrapper path="/assessment"><AssessmentOverviewPage /></PageWrapper>;
      case '/speech':
        return <PageWrapper path="/speech"><SpeechPage /></PageWrapper>;
      case '/memory':
        return <PageWrapper path="/memory"><MemoryPage /></PageWrapper>;
      case '/attention':
        return <PageWrapper path="/attention"><AttentionPage /></PageWrapper>;
      case '/lifestyle':
        return <PageWrapper path="/lifestyle"><LifestylePage /></PageWrapper>;
      case '/review':
        return <PageWrapper path="/review"><ReviewPage /></PageWrapper>;
      case '/analyzing':
        return <PageWrapper path="/analyzing"><AnalyzingPage /></PageWrapper>;
      case '/results':
        return <PageWrapper path="/results"><ResultsPage /></PageWrapper>;
      case '/report':
        return <PageWrapper path="/report"><ReportPage /></PageWrapper>;

      default:
        return <PageWrapper path="/"><LandingPage /></PageWrapper>;
    }
  };

  // If viewing standalone landing/public/auth pages without sidebar wrapper
  if (
    currentRoute === '/' ||
    currentRoute === '/about' ||
    currentRoute === '/how-it-works' ||
    currentRoute === '/login' ||
    currentRoute === '/register' ||
    currentRoute === '/doctor/register' ||
    currentRoute.startsWith('/explore')
  ) {
    return (
      <AnimatePresence mode="wait">
        {renderCurrentPage()}
      </AnimatePresence>
    );
  }

  // Inside Workspace Layout (Sidebar + Header + Content)
  return (
    <div className="min-h-screen flex bg-[#F7F3F2] text-[#6C5D62] selection:bg-[#F29D88] selection:text-white font-sans antialiased">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <HeaderBar />
        <main className="flex-1 p-6 sm:p-8 overflow-y-auto">
          <AnimatePresence mode="wait">
            {renderCurrentPage()}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

function App() {
  return (
    <AssessmentProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AssessmentProvider>
  );
}

export default App;
