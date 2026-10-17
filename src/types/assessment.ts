/**
 * NeuroMind Unified Types & Role-Based System Models
 */

export type UserRole = 'PATIENT' | 'DOCTOR' | 'ADMIN';
export type AccountStatus = 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'DEACTIVATED';
export type ReportStatus = 'GENERATED' | 'VIEWED' | 'UNDER_REVIEW' | 'REVIEWED';

export interface BaseUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: AccountStatus;
  createdAt: string;
  lastLogin?: string;
  avatarUrl?: string;
}

export interface PatientUser extends BaseUser {
  role: 'PATIENT';
  age: string;
  dateOfBirth?: string;
  gender: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
  education: string;
  occupation: string;
  phone?: string;
  assignedDoctorId?: string;
  assignedDoctorName?: string;
  assignedAt?: string;
  doctorAssistanceRequestedAt?: string | null;
}

export interface DoctorUser extends BaseUser {
  role: 'DOCTOR';
  password?: string;
  department: string;
  institution: string;
  licenseNumber: string;
  specialization: string;
  phone?: string;
  approvedBy?: string;
  approvedAt?: string;
  assignedPatientCount?: number;
  isApproved?: boolean;
  doctorProfileId?: string;
  qualification?: string;
  yearsOfExperience?: number | null;
  bio?: string | null;
  city?: string | null;
  area?: string | null;
}

export interface AdminUser extends BaseUser {
  role: 'ADMIN';
  password?: string;
  department?: string;
  accessLevel: 'SUPER_ADMIN' | 'AUDITOR';
}

export type AppUser = PatientUser | DoctorUser | AdminUser;

export interface PatientInfo {
  id: string;
  name: string;
  age: string;
  gender: string;
  education: string;
  occupation: string;
  assessmentDate: string;
  phone?: string;
}

export interface SpeechAssessmentData {
  audioBlob?: Blob;
  audioUrl?: string;
  fileName?: string;
  fileFormat?: 'wav' | 'mp3' | 'flac' | 'm4a' | 'webm' | 'ogg' | 'recorded';
  durationSeconds: number;
  promptType: 'reading' | 'picture_description' | 'free_speech';
  promptId: string;
  transcriptText?: string;
  recordedAt?: string;
  passageId?: string;
  passageText?: string;
  wordCount?: number;
  wordsCompleted?: number;
  completionRate?: number;
  audioMetrics?: {
    pitchVariance?: number;
    pauseRatio?: number;
    speechRateWpm?: number;
    articulationRate?: number;
  };
}

export interface MemoryAssessmentData {
  encodingImagesSeen: string[];
  exposureDurationMs: number;
  immediateRecallText: string;
  immediateRecallItems: string[];
  delayedRecallText: string;
  delayedRecallItems: string[];
  recognitionSelectedIds: string[];
  recognitionCorrectIds: string[];
  rawMetrics: {
    immediateRecallCount: number;
    delayedRecallCount: number;
    recognitionTruePositives: number;
    recognitionFalsePositives: number;
    recognitionTotalCorrect: number;
  };
  startedAt?: string;
  completedAt?: string;
  stepDurationsMs?: Record<string, number>;
}

export interface DigitSpanTrial {
  digitCount: number;
  sequence: number[];
  userResponse: number[];
  isCorrect: boolean;
  timeTakenMs: number;
  occurredAt?: string;
}

export interface ReactionTimeTrial {
  trialNumber: number;
  delayMs: number;
  reactionTimeMs: number;
  isValid: boolean;
  occurredAt?: string;
}

export interface SustainedAttentionData {
  totalStimuliCount: number;
  targetCount: number;
  hits: number;
  misses: number;
  falseAlarms: number;
  correctRejections: number;
  meanResponseTimeMs: number;
  reactionTimes: number[];
  rawResponses?: {
    occurredAt: string;
    elapsedMs: number;
    mediaTimeMs: number;
    outcome: 'hit' | 'false_alarm';
    targetWindowIndex?: number;
    reactionTimeMs?: number;
  }[];
}

export interface AttentionAssessmentData {
  digitSpanMaxScore?: number;
  digitSpanTrials?: DigitSpanTrial[];
  reactionTimeTrials?: ReactionTimeTrial[];
  reactionTimeMedianMs?: number;
  reactionTimeMeanMs?: number;
  sustainedAttention?: SustainedAttentionData;
  stimulusTypeUsed?: 'standard' | 'audio' | 'video' | 'music';
  
  digitSpan?: number;
  reactionTimeMs?: number;
  visualAttention?: SustainedAttentionData;
  audioAttention?: SustainedAttentionData;
  musicAttention?: SustainedAttentionData;
  videoAttention?: SustainedAttentionData;
  startedAt?: string;
  completedAt?: string;
  totalDurationMs?: number;
}

export interface LifestyleAssessmentData {
  sleepHours: '<4' | '5-6' | '7-8' | '9-10' | '>10' | number;
  sleepQuality: 'Bad' | 'Moderate' | 'Good';
  exerciseHoursWeek: '<1' | '1-2' | '3-5' | '6-10' | '>10' | number;
  smoking: boolean;
  alcoholUse: 'None' | 'Occasional' | 'Frequent';
  hypertension?: boolean;
  diabetes?: boolean;
  cardiovascular?: boolean;
  medicalHistory: ('Hypertension' | 'Diabetes' | 'Cardiovascular' | 'Depression' | 'Head Injury' | 'None')[];
  dailyLifestyle?: 'Very healthy' | 'Generally healthy' | 'Moderate' | 'Unhealthy';
  socialActivity?: 'Rarely' | 'Occasionally' | 'Several times a week' | 'Daily';
}

export interface AssessmentCompletionStatus {
  speech: boolean;
  memory: boolean;
  attention: boolean;
  lifestyle: boolean;
}

export interface SHAPFeatureContribution {
  featureName: string;
  modality: 'Speech' | 'Memory' | 'Attention' | 'Lifestyle';
  shapValue: number;
  featureValueDisplay: string;
  description: string;
}

export interface RAGKnowledgeItem {
  id: string;
  title: string;
  source: string;
  snippet: string;
  relevanceScore: number;
  retrievalMethod: 'semantic' | 'lexical';
  chunkId: string;
  documentId: string;
}

export interface MultimodalPredictionResult {
  prediction: 'Non-Dementia' | 'Dementia';
  predictionThreshold: number | null;
  dementiaProbability: number;
  nonDementiaProbability: number;
  classProbabilities?: Record<string, number>;
  confidenceScore: number;
  modalityScores: {
    speechEmbeddingDimension: number;
    memoryScore: number;
    immediateRecallScore: number;
    delayedRecallScore: number;
    recognitionScore: number;
    attentionScore: number;
    digitSpanScore: number;
    reactionTimeMs: number;
    sustainedAttentionScore: number;
    lifestyleScore: number;
  };
  shapExplanation: SHAPFeatureContribution[];
  ragKnowledge: RAGKnowledgeItem[];
  reportSummary?: string;
  analyzedAt: string;
}

export interface FullSessionState {
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  patientInfo: PatientInfo;
  speech: SpeechAssessmentData;
  memory: MemoryAssessmentData;
  attention: AttentionAssessmentData;
  lifestyle: LifestyleAssessmentData;
  status: AssessmentCompletionStatus;
  predictionResult?: MultimodalPredictionResult;
  patientId?: string;
  assignedDoctorId?: string;
  reportId?: string;
  reportStatus?: ReportStatus;
}

export interface AssessmentRecord {
  id?: string;
  reportId?: string;
  assessmentId: string;
  patientId: string;
  patientName: string;
  patientAge: string;
  patientGender: string;
  patientEducation: string;
  createdAt: string;
  updatedAt: string;
  status: AssessmentCompletionStatus;
  speech: SpeechAssessmentData;
  memory: MemoryAssessmentData;
  attention: AttentionAssessmentData;
  lifestyle: LifestyleAssessmentData;
  predictionResult?: MultimodalPredictionResult;
  reportText?: string;
  reportStatus: ReportStatus;
  assignedDoctorId?: string;
  assignedDoctorName?: string;
  doctorNotes?: string;
  doctorRecommendations?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  shares?: Array<{ doctorId: string; doctorName?: string; sharedAt: string; revokedAt?: string | null }>;
}

export interface AppNotification {
  id: string;
  recipientId: string;
  recipientRole: UserRole;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
  type: 'REPORT_GENERATED' | 'DOCTOR_ASSIGNED' | 'REPORT_REVIEWED' | 'REGISTRATION' | 'SYSTEM';
}

// Backward compatibility legacy interface
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'Clinician' | 'Neuro-AI Researcher' | 'Lab Director' | 'Student / Intern' | 'PATIENT' | 'DOCTOR' | 'ADMIN';
  department: string;
  institution: string;
  avatarUrl?: string;
  isAuthenticated: boolean;
  accountStatus?: AccountStatus;
  userRole?: UserRole;
  patientDetails?: Partial<PatientUser>;
  doctorDetails?: Partial<DoctorUser>;
}
