import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ClerkProvider, useAuth as useClerkAuthOriginal, useUser as useClerkUserOriginal, useClerk as useClerkOriginal, UserButton as ClerkUserButtonOriginal, SignIn as ClerkSignInOriginal, SignUp as ClerkSignUpOriginal } from '@clerk/react';
import { useAssessment } from '../../context/AssessmentContext';
import { AlertTriangle, LogOut, Shield } from 'lucide-react';

const publishableKey = (import.meta as unknown as { env?: { VITE_CLERK_PUBLISHABLE_KEY?: string; VITE_ENABLE_CLERK?: string } }).env?.VITE_CLERK_PUBLISHABLE_KEY;
const clerkEnabledFlag = (import.meta as unknown as { env?: { VITE_ENABLE_CLERK?: string } }).env?.VITE_ENABLE_CLERK;
const isClerkConfigured = Boolean(
  publishableKey &&
  publishableKey.trim().startsWith('pk_') &&
  (clerkEnabledFlag === 'true' || clerkEnabledFlag === '1' || clerkEnabledFlag === 'yes')
);

interface ClerkBridgeContextType {
  isClerkActive: boolean;
  isLoaded: boolean;
  isSignedIn: boolean;
  user: SafeUserData | null;
  getToken: (options?: Record<string, unknown>) => Promise<string | null>;
  clerkSignOut: () => Promise<void>;
}

const ClerkBridgeContext = createContext<ClerkBridgeContextType>({
  isClerkActive: false,
  isLoaded: true,
  isSignedIn: false,
  user: null,
  getToken: async () => null,
  clerkSignOut: async () => undefined,
});

const ActiveClerkBridge: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = useClerkAuthOriginal();
  const clerkUser = useClerkUserOriginal();
  const clerk = useClerkOriginal();

  const user = useMemo<SafeUserData | null>(() => {
    if (!clerkUser.user) return null;
    const primaryEmail = clerkUser.user.primaryEmailAddress?.emailAddress;
    const emailAddresses = clerkUser.user.emailAddresses.map((entry) => ({
      emailAddress: entry.emailAddress,
    }));
    if (primaryEmail) {
      emailAddresses.sort((entry) => entry.emailAddress === primaryEmail ? -1 : 1);
    }
    return {
      id: clerkUser.user.id,
      fullName: clerkUser.user.fullName,
      firstName: clerkUser.user.firstName,
      emailAddresses,
    };
  }, [clerkUser.user]);

  const getToken = useCallback(
    (options?: Record<string, unknown>) => auth.getToken(options),
    [auth.getToken],
  );
  const clerkSignOut = useCallback(async () => {
    await clerk.signOut();
  }, [clerk]);

  const value = useMemo<ClerkBridgeContextType>(() => ({
    isClerkActive: true,
    isLoaded: Boolean(auth.isLoaded && clerkUser.isLoaded),
    isSignedIn: Boolean(auth.isSignedIn && clerkUser.isSignedIn),
    user,
    getToken,
    clerkSignOut,
  }), [auth.isLoaded, auth.isSignedIn, clerkUser.isLoaded, clerkUser.isSignedIn, user, getToken, clerkSignOut]);

  return <ClerkBridgeContext.Provider value={value}>{children}</ClerkBridgeContext.Provider>;
};

export const ClerkBridgeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (isClerkConfigured && publishableKey) {
    return (
      <ClerkProvider
        publishableKey={publishableKey}
        signInUrl="/login"
        signUpUrl="/register"
        afterSignOutUrl="/"
      >
        <ActiveClerkBridge>
          {children}
        </ActiveClerkBridge>
      </ClerkProvider>
    );
  }

  return (
    <ClerkBridgeContext.Provider value={{
      isClerkActive: false,
      isLoaded: true,
      isSignedIn: false,
      user: null,
      getToken: async () => null,
      clerkSignOut: async () => undefined,
    }}>
      {children}
    </ClerkBridgeContext.Provider>
  );
};

export interface SafeUserData {
  id?: string;
  fullName?: string | null;
  firstName?: string | null;
  emailAddresses?: Array<{ emailAddress: string }>;
}

export function useSafeUser(): {
  isSignedIn: boolean;
  isLoaded: boolean;
  user: SafeUserData | null;
} {
  const clerk = useContext(ClerkBridgeContext);
  const { user } = useAssessment();

  if (clerk.isClerkActive) {
    return {
      isSignedIn: clerk.isSignedIn,
      isLoaded: clerk.isLoaded,
      user: clerk.user,
    };
  }

  return {
    isSignedIn: Boolean(user.isAuthenticated),
    isLoaded: true,
    user: user.isAuthenticated
      ? {
          fullName: user.name,
          firstName: user.name.split(' ')[0],
          emailAddresses: [{ emailAddress: user.email }],
        }
      : null,
  };
}

export function useSafeClerk(): {
  signOut: () => Promise<void>;
  isClerkActive: boolean;
} {
  const clerk = useContext(ClerkBridgeContext);
  const { logout, navigateTo } = useAssessment();
  const signOut = useCallback(async () => {
    if (clerk.isClerkActive) await clerk.clerkSignOut();
    logout();
    navigateTo('/');
  }, [clerk.isClerkActive, clerk.clerkSignOut, logout, navigateTo]);

  return {
    signOut,
    isClerkActive: clerk.isClerkActive,
  };
}

export function useSafeClerkAuth(): {
  isLoaded: boolean;
  isSignedIn: boolean;
  isClerkActive: boolean;
  getToken: (options?: Record<string, unknown>) => Promise<string | null>;
} {
  const clerk = useContext(ClerkBridgeContext);
  return {
    isLoaded: clerk.isLoaded,
    isSignedIn: clerk.isSignedIn,
    isClerkActive: clerk.isClerkActive,
    getToken: clerk.getToken,
  };
}

export const SafeUserButton: React.FC = () => {
  const { isClerkActive } = useContext(ClerkBridgeContext);
  const { user, logout, navigateTo } = useAssessment();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = () => setMenuOpen(false);
    if (menuOpen) {
      window.addEventListener('click', handleClickOutside);
      return () => window.removeEventListener('click', handleClickOutside);
    }
  }, [menuOpen]);

  if (isClerkActive) return <ClerkUserButtonOriginal />;

  const initials = user.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'NM';

  return (
    <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="w-8 h-8 rounded-full bg-[#4A2333] text-white flex items-center justify-center text-xs font-bold ring-2 ring-white/50 hover:ring-[#F29D88] transition shadow-xs cursor-pointer"
        title={user.name || 'User Profile'}
      >
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt={user.name} className="w-full h-full rounded-full object-cover" />
        ) : (
          <span>{initials}</span>
        )}
      </button>

      {menuOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white p-3 shadow-xl border border-slate-200 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 border border-slate-100">
            <div className="w-9 h-9 rounded-full bg-[#4A2333] text-white flex items-center justify-center text-xs font-bold shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-800 truncate">{user.name}</p>
              <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
              <div className="mt-1 inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-[#7A4D57] bg-[#F8E3DA] px-2 py-0.5 rounded-md">
                <Shield className="w-2.5 h-2.5" />
                <span>{user.role || 'Clinician'}</span>
              </div>
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-slate-100 space-y-1">
            <button
              onClick={() => {
                setMenuOpen(false);
                logout();
                navigateTo('/');
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const SafeSignIn: React.FC = () => {
  const { isClerkActive } = useContext(ClerkBridgeContext);

  if (isClerkActive) {
    return (
      <ClerkSignInOriginal
        routing="path"
        path="/login"
        signUpUrl="/register"
        forceRedirectUrl="/patient/dashboard"
        fallbackRedirectUrl="/patient/dashboard"
      />
    );
  }

  return (
    <ClerkConfigurationNotice action="sign in" />
  );
};

export const SafeSignUp: React.FC = () => {
  const { isClerkActive } = useContext(ClerkBridgeContext);

  if (isClerkActive) {
    return (
      <ClerkSignUpOriginal
        routing="path"
        path="/register"
        signInUrl="/login"
        forceRedirectUrl="/patient/dashboard"
        fallbackRedirectUrl="/patient/dashboard"
      />
    );
  }

  return (
    <ClerkConfigurationNotice action="register" />
  );
};

const ClerkConfigurationNotice: React.FC<{ action: 'sign in' | 'register' }> = ({ action }) => (
  <div className="w-full rounded-2xl border border-amber-200 bg-amber-50 p-5 text-left">
    <div className="flex items-start gap-3">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
      <div className="space-y-2">
        <h2 className="text-sm font-bold text-amber-950">Patient authentication is not configured</h2>
        <p className="text-xs leading-5 text-amber-900">
          Patient {action} uses Clerk. Set <code>VITE_ENABLE_CLERK=true</code> and a valid
          <code className="ml-1">VITE_CLERK_PUBLISHABLE_KEY</code> in the frontend environment, then restart NeuroMind.
        </p>
        <p className="text-[11px] leading-4 text-amber-800">
          Doctor and Admin accounts can still use their separate tabs on the sign-in page.
        </p>
      </div>
    </div>
  </div>
);
