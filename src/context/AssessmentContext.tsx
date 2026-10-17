import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  FullSessionState,
  PatientInfo,
  SpeechAssessmentData,
  MemoryAssessmentData,
  AttentionAssessmentData,
  LifestyleAssessmentData,
  MultimodalPredictionResult,
  UserProfile,
  AppUser,
  PatientUser,
  DoctorUser,
  AdminUser,
  UserRole,
} from '../types/assessment';
import { createAssessmentSession, runPrediction, generateReport, completeAssessment } from '../api/client';
import { authService } from '../services/authService';

export const defaultUser: UserProfile = {
  id: '',
  name: 'Guest',
  email: '',
  role: 'Clinician',
  department: '',
  institution: '',
  isAuthenticated: false,
};

interface AssessmentContextType {
  session: FullSessionState;
  user: UserProfile;
  currentUser: AppUser | null;
  currentRoute: string;
  navigateTo: (route: string) => void;
  loginWithAuthService: (email: string, password?: string, expectedRole?: UserRole) => Promise<AppUser>;
  logout: () => void;
  updatePatientInfo: (info: Partial<PatientInfo>) => void;
  updateSpeechData: (speech: Partial<SpeechAssessmentData>) => void;
  updateMemoryData: (memory: Partial<MemoryAssessmentData>) => void;
  updateAttentionData: (attention: Partial<AttentionAssessmentData>) => void;
  updateLifestyleData: (lifestyle: Partial<LifestyleAssessmentData>) => void;
  markSectionComplete: (section: 'speech' | 'memory' | 'attention' | 'lifestyle', completed?: boolean) => void;
  executePrediction: () => Promise<MultimodalPredictionResult>;
  resetAssessment: () => void;
  startNewAssessmentForPatient: (patient: PatientUser) => Promise<void>;
  refreshUserData: () => void;
}

const createDefaultPatientInfo = (user?: AppUser | null): PatientInfo => {
  if (user && user.role === 'PATIENT') {
    const p = user as PatientUser;
    return {
      id: p.id,
      name: p.name,
      age: p.age || '',
      gender: p.gender || 'Prefer not to say',
      education: p.education || '',
      occupation: p.occupation || '',
      assessmentDate: new Date().toISOString().split('T')[0],
      phone: p.phone,
    };
  }
  return {
    id: '',
    name: '',
    age: '',
    gender: 'Prefer not to say',
    education: '',
    occupation: '',
    assessmentDate: new Date().toISOString().split('T')[0],
  };
};

const createFreshSession = (patientInfo: PatientInfo, patientId?: string, assignedDoctorId?: string): FullSessionState => ({
  sessionId: `NM-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  patientInfo,
  patientId,
  assignedDoctorId,
  speech: {
    durationSeconds: 0,
    promptType: 'reading',
    promptId: 'reading-passage-1',
  },
  memory: {
    encodingImagesSeen: [],
    exposureDurationMs: 3000,
    immediateRecallText: '',
    immediateRecallItems: [],
    delayedRecallText: '',
    delayedRecallItems: [],
    recognitionSelectedIds: [],
    recognitionCorrectIds: [],
    rawMetrics: {
      immediateRecallCount: 0,
      delayedRecallCount: 0,
      recognitionTruePositives: 0,
      recognitionFalsePositives: 0,
      recognitionTotalCorrect: 0,
    },
  },
  attention: {
    digitSpanMaxScore: 0,
    digitSpanTrials: [],
    reactionTimeTrials: [],
    reactionTimeMedianMs: 0,
    reactionTimeMeanMs: 0,
    sustainedAttention: {
      totalStimuliCount: 0,
      targetCount: 0,
      hits: 0,
      misses: 0,
      falseAlarms: 0,
      correctRejections: 0,
      meanResponseTimeMs: 0,
      reactionTimes: [],
    },
    stimulusTypeUsed: 'standard',
  },
  lifestyle: {
    sleepHours: 7,
    sleepQuality: 'Moderate',
    exerciseHoursWeek: 2.5,
    smoking: false,
    alcoholUse: 'Occasional',
    medicalHistory: ['Hypertension'],
  },
  status: {
    speech: false,
    memory: false,
    attention: false,
    lifestyle: false,
  },
});

const AssessmentContext = createContext<AssessmentContextType | undefined>(undefined);

export const AssessmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    return authService.getCurrentUser();
  });

  const [session, setSession] = useState<FullSessionState>(() => {
    const saved = localStorage.getItem('neuromind_session');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn('Failed to parse saved session from localStorage', e);
      }
    }
    const initialPatient = createDefaultPatientInfo(authService.getCurrentUser());
    const initialAppUser = authService.getCurrentUser();
    return createFreshSession(
      initialPatient,
      initialAppUser?.role === 'PATIENT' ? initialAppUser.id : undefined,
      initialAppUser?.role === 'PATIENT' ? (initialAppUser as PatientUser).assignedDoctorId : undefined
    );
  });

  const [user, setUser] = useState<UserProfile>(() => {
    const current = authService.getCurrentUser();
    if (current) {
      return {
        id: current.id,
        name: current.name,
        email: current.email,
        role: current.role as UserProfile['role'],
        department: (current as DoctorUser).department || (current as AdminUser).department || 'Patient Portal',
        institution: (current as DoctorUser).institution || 'NeuroMind Cognitive Health',
        avatarUrl: current.avatarUrl,
        isAuthenticated: true,
        accountStatus: current.status,
        userRole: current.role,
      };
    }
    return defaultUser;
  });

  const [currentRoute, setCurrentRoute] = useState<string>(() => {
    if (typeof window === 'undefined') return '/';
    return window.location.pathname || '/';
  });

  const syncUserState = useCallback((appUser: AppUser | null) => {
    setCurrentUser(appUser);
    if (appUser) {
      setUser({
        id: appUser.id,
        name: appUser.name,
        email: appUser.email,
        role: appUser.role as UserProfile['role'],
        department: (appUser as DoctorUser).department || (appUser as AdminUser).department || 'Patient Clinical Care',
        institution: (appUser as DoctorUser).institution || 'NeuroMind Cognitive Health System',
        avatarUrl: appUser.avatarUrl,
        isAuthenticated: true,
        accountStatus: appUser.status,
        userRole: appUser.role,
        patientDetails: appUser.role === 'PATIENT' ? (appUser as PatientUser) : undefined,
        doctorDetails: appUser.role === 'DOCTOR' ? (appUser as DoctorUser) : undefined,
      });
    } else {
      setUser(defaultUser);
    }
  }, []);

  const refreshUserData = useCallback(() => {
    const active = authService.getCurrentUser();
    syncUserState(active);
    if (active?.role === 'PATIENT') {
      const patient = active as PatientUser;
      const patientInfo = createDefaultPatientInfo(patient);
      setSession((previous) => {
        if (previous.patientId && previous.patientId !== patient.id) {
          localStorage.removeItem(`neuromind_memory_progress:${previous.sessionId}`);
          localStorage.removeItem(`neuromind_attention_progress:${previous.sessionId}`);
          localStorage.removeItem(`neuromind_speech_progress:${previous.sessionId}`);
          return createFreshSession(patientInfo, patient.id, patient.assignedDoctorId);
        }
        return {
          ...previous,
          patientId: patient.id,
          assignedDoctorId: patient.assignedDoctorId,
          patientInfo,
        };
      });
    }
  }, [syncUserState]);

  useEffect(() => {
    localStorage.setItem('neuromind_session', JSON.stringify(session));
  }, [session]);

  const navigateTo = useCallback((route: string) => {
    const safeRoute = route.startsWith('/') ? route : `/${route}`;
    setCurrentRoute(safeRoute);
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      if (currentPath !== safeRoute) {
        const isAuthRedirect = currentPath === '/' || currentPath.startsWith('/login') || safeRoute === '/assessment';
        window.history[isAuthRedirect ? 'replaceState' : 'pushState']({}, '', safeRoute);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      if (typeof window !== 'undefined') {
        setCurrentRoute(window.location.pathname || '/');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const loginWithAuthService = useCallback(async (email: string, password?: string, expectedRole?: UserRole): Promise<AppUser> => {
    const loggedIn = await authService.login(email, password, expectedRole);
    syncUserState(loggedIn);

    // If patient logged in, bind session to patient
    if (loggedIn.role === 'PATIENT') {
      const p = loggedIn as PatientUser;
      const pInfo: PatientInfo = {
        id: p.id,
        name: p.name,
        age: p.age,
        gender: p.gender,
        education: p.education,
        occupation: p.occupation,
        assessmentDate: new Date().toISOString().split('T')[0],
        phone: p.phone,
      };
      setSession((prev) => ({
        ...prev,
        patientId: p.id,
        assignedDoctorId: p.assignedDoctorId,
        patientInfo: pInfo,
      }));
    }

    return loggedIn;
  }, [syncUserState]);



  const logout = useCallback(() => {
    authService.logout();
    syncUserState(null);
    localStorage.removeItem('neuromind_session');
    Object.keys(localStorage)
      .filter((key) => key.startsWith('neuromind_memory_progress') || key.startsWith('neuromind_attention_progress') || key.startsWith('neuromind_speech_progress'))
      .forEach((key) => localStorage.removeItem(key));
    setSession(createFreshSession(createDefaultPatientInfo(null)));
  }, [syncUserState]);

  const updatePatientInfo = (info: Partial<PatientInfo>) => {
    setSession((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      patientInfo: { ...prev.patientInfo, ...info },
    }));
  };

  const updateSpeechData = (speech: Partial<SpeechAssessmentData>) => {
    setSession((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      speech: { ...prev.speech, ...speech },
    }));
  };

  const updateMemoryData = (memory: Partial<MemoryAssessmentData>) => {
    setSession((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      memory: { ...prev.memory, ...memory },
    }));
  };

  const updateAttentionData = (attention: Partial<AttentionAssessmentData>) => {
    setSession((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      attention: { ...prev.attention, ...attention },
    }));
  };

  const updateLifestyleData = (lifestyle: Partial<LifestyleAssessmentData>) => {
    setSession((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      lifestyle: { ...prev.lifestyle, ...lifestyle },
    }));
  };

  const markSectionComplete = (
    section: 'speech' | 'memory' | 'attention' | 'lifestyle',
    completed = true
  ) => {
    setSession((prev) => ({
      ...prev,
      updatedAt: new Date().toISOString(),
      status: { ...prev.status, [section]: completed },
    }));
  };

  const executePrediction = async (): Promise<MultimodalPredictionResult> => {
    await completeAssessment(session.sessionId);
    const result = await runPrediction(session);
    // Inference succeeded independently of the optional RAG/LLM provider.
    // A report failure must not hide the real prediction from the patient.
    try {
      result.reportSummary = await generateReport({ ...session, predictionResult: result });
    } catch (error) {
      console.warn('Screening result is ready; report generation is pending:', error);
    }

    const updatedSession: FullSessionState = {
      ...session,
      predictionResult: result,
      updatedAt: new Date().toISOString(),
    };

    setSession(updatedSession);

    return result;
  };

  const startNewAssessmentForPatient = async (patient: PatientUser) => {
    const pInfo: PatientInfo = {
      id: patient.id,
      name: patient.name,
      age: patient.age,
      gender: patient.gender,
      education: patient.education,
      occupation: patient.occupation,
      assessmentDate: new Date().toISOString().split('T')[0],
      phone: patient.phone,
    };
    try {
      const fresh = await createAssessmentSession({ ...pInfo, id: patient.id });
      fresh.patientId = patient.id;
      fresh.assignedDoctorId = patient.assignedDoctorId;
      fresh.patientInfo = pInfo;
      setSession(fresh);
      localStorage.setItem('neuromind_session', JSON.stringify(fresh));
    } catch (err) {
      console.error('Unable to create server assessment session', err);
      throw err;
    }
  };

  const resetAssessment = async () => {
    const active = authService.getCurrentUser();
    const pInfo = createDefaultPatientInfo(active);
    const newSess = await createAssessmentSession(pInfo);
    if (active?.role === 'PATIENT') {
      newSess.patientId = active.id;
      newSess.assignedDoctorId = (active as PatientUser).assignedDoctorId;
    }
    setSession(newSess);
    localStorage.setItem('neuromind_session', JSON.stringify(newSess));
    navigateTo('/');
  };

  return (
    <AssessmentContext.Provider
      value={{
        session,
        user,
        currentUser,
        currentRoute,
        navigateTo,
        loginWithAuthService,
        logout,
        updatePatientInfo,
        updateSpeechData,
        updateMemoryData,
        updateAttentionData,
        updateLifestyleData,
        markSectionComplete,
        executePrediction,
        resetAssessment,
        startNewAssessmentForPatient,
        refreshUserData,
      }}
    >
      {children}
    </AssessmentContext.Provider>
  );
};

export const useAssessment = () => {
  const context = useContext(AssessmentContext);
  if (!context) {
    throw new Error('useAssessment must be used within an AssessmentProvider');
  }
  return context;
};
