import React, { useState, useEffect } from 'react';
import { useAssessment } from '../../context/AssessmentContext';
import { patientService } from '../../services/patientService';
import { doctorService } from '../../services/doctorService';
import { notificationService } from '../../services/notificationService';
import { PatientUser, DoctorUser, AssessmentRecord, AppNotification } from '../../types/assessment';
import { useToast } from '../../context/ToastContext';
import { predictionBadgeClass, predictionPanelClass } from '../../utils/predictionStyles';
import {
  Brain,
  FileText,
  User,
  Stethoscope,
  Calendar,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Play,
  ShieldCheck,
  Bell,
  Sparkles,
  Phone,
  Building2,
  Search,
} from 'lucide-react';

export const PatientDashboardPage: React.FC = () => {
  const { currentUser, session, navigateTo, startNewAssessmentForPatient } = useAssessment();
  const { showToast } = useToast();
  const patient = currentUser?.role === 'PATIENT' ? (currentUser as PatientUser) : null;

  const [assessments, setAssessments] = useState<AssessmentRecord[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [assignedDoctor, setAssignedDoctor] = useState<any>(null);
  const [profile, setProfile] = useState<PatientUser | null>(null);
  const [doctors, setDoctors] = useState<DoctorUser[]>([]);
  const [doctorSearch, setDoctorSearch] = useState('');
  const [doctorBusy, setDoctorBusy] = useState(false);

  useEffect(() => {
    const load = async () => {
    if (patient) {
      const latestProfile = await patientService.getPatientById(patient.id);
      setProfile(latestProfile || null);
      const available = await patientService.getAvailableDoctors();
      setDoctors(available);
      const records = await patientService.getPatientAssessments(patient.id);
      setAssessments(records);

      const notifs = await notificationService.getNotificationsForUser(patient.id, 'PATIENT');
      setNotifications(notifs);

      if (latestProfile?.assignedDoctorId) {
        const doc = available.find((d) => d.id === latestProfile.assignedDoctorId);
        setAssignedDoctor(doc || null);
      }
    }
    };
    load().catch((err) => console.error(err));
  }, [patient]);

  useEffect(() => {
    if (!patient) return;
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      patientService.getAvailableDoctors(doctorSearch.trim()).then((rows) => {
        if (!cancelled) setDoctors(rows);
      }).catch((error) => { if (!cancelled) showToast(error.message, 'error'); });
    }, 250);
    return () => { cancelled = true; window.clearTimeout(timeout); };
  }, [doctorSearch, patient?.id]);

  const latestAssessment = assessments[0];
  const activeProfile = profile || patient;
  const filteredDoctors = doctors.filter((d) => [d.name, d.specialization, d.qualification, d.city, d.area, d.institution]
    .some((value) => (value || '').toLowerCase().includes(doctorSearch.toLowerCase().trim())));
  const handleDoctorChoice = async (doctor: DoctorUser) => {
    if (doctorBusy) return;
    setDoctorBusy(true);
    try {
      const updated = await patientService.chooseDoctor(doctor.id);
      setProfile(updated);
      setAssignedDoctor(doctor);
      showToast(`${doctor.name} is now your doctor. You can share reports separately.`, 'success');
    } catch (error: any) { showToast(error.message || 'Unable to select doctor', 'error'); }
    finally { setDoctorBusy(false); }
  };
  const handleDoctorHelp = async (cancel = false) => {
    if (doctorBusy) return;
    setDoctorBusy(true);
    try {
      const updated = cancel ? await patientService.cancelDoctorHelp() : await patientService.requestDoctorHelp();
      setProfile(updated);
      showToast(cancel ? 'Your assistance request was cancelled.' : 'The admin team will help you choose an approved doctor.', 'success');
    } catch (error: any) { showToast(error.message || 'Unable to update request', 'error'); }
    finally { setDoctorBusy(false); }
  };

  const handleStartAssessment = async () => {
    if (patient) {
      await startNewAssessmentForPatient(patient);
    }
    navigateTo('/assessment');
  };

  if (!patient) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-slate-200">
        <p className="text-sm font-semibold text-slate-700">Please sign in to your Patient Account to access your personal dashboard.</p>
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
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Welcome Hero Banner */}
      <div className="p-8 sm:p-10 bg-gradient-to-br from-[#4A2333] via-[#5E2F43] to-[#391926] text-white rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[#F8E3DA] text-[11px] font-bold uppercase tracking-wider">
              <User className="w-3.5 h-3.5" />
              <span>Patient ID: {patient.id}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-heading font-black tracking-tight">
              Welcome back, {patient.name}
            </h1>
            <p className="text-xs sm:text-sm text-white/80 max-w-xl font-normal leading-relaxed">
              Track your cognitive health across speech acoustics, episodic memory, sustained attention, and lifestyle biomarkers.
            </p>
          </div>

          <button
            onClick={handleStartAssessment}
            className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-[#F29D88] hover:bg-[#F08B73] text-[#4A2333] font-bold text-xs uppercase tracking-wider shadow-lg transition-all transform hover:-translate-y-0.5 cursor-pointer shrink-0"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{assessments.length > 0 ? 'Start New Assessment' : 'Begin First Assessment'}</span>
          </button>
        </div>
      </div>

      {/* Grid: Assigned Doctor + Latest Screening Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Assigned Doctor Card */}
        <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Stethoscope className="w-4 h-4 text-[#A76A5B]" />
              <span>Assigned Clinical Specialist</span>
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
              {assignedDoctor ? 'Active Care' : 'Unassigned'}
            </span>
          </div>

          {assignedDoctor ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#F8E3DA] text-[#4A2333] flex items-center justify-center font-bold text-base shrink-0">
                  {assignedDoctor.name.replace('Dr. ', '').split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{assignedDoctor.name}</h3>
                  <p className="text-xs text-[#A76A5B] font-semibold">{assignedDoctor.specialization}</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5 text-xs text-slate-600 font-medium">
                <p className="flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate">{assignedDoctor.institution}</span>
                </p>
                <p>{[assignedDoctor.area, assignedDoctor.city].filter(Boolean).join(', ')}</p>
              </div>
              <p className="text-[11px] text-slate-400">
                You control when and with which approved doctor your completed reports are shared.
              </p>
            </div>
          ) : (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center space-y-2">
              <p className="text-xs text-slate-600 font-medium">
                You do not have a dedicated clinical doctor assigned yet.
              </p>
              <p className="text-[11px] text-slate-400">
                Choose from approved doctors below, or request help from an administrator.
              </p>
            </div>
          )}
        </div>

        {/* Latest Screening Summary Card (2 cols) */}
        <div className="lg:col-span-2 p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Brain className="w-4 h-4 text-[#4A2333]" />
              <span>Latest Cognitive Screening Status</span>
            </h2>
            {latestAssessment && (
              <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(latestAssessment.createdAt).toLocaleDateString()}
              </span>
            )}
          </div>

          {latestAssessment && latestAssessment.predictionResult ? (
            <div className="space-y-4">
              <div className={`p-4 rounded-2xl border ${predictionPanelClass(latestAssessment.predictionResult.prediction)} flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-md ${predictionBadgeClass(latestAssessment.predictionResult.prediction)}`}>
                      {latestAssessment.predictionResult.prediction} Classification
                    </span>
                    <span className="text-[11px] font-bold text-slate-500">
                      Confidence: {(latestAssessment.predictionResult.confidenceScore * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-base font-bold text-slate-900">
                    Calculated Dementia Probability: {(latestAssessment.predictionResult.dementiaProbability * 100).toFixed(1)}%
                  </p>
                </div>

                <button
                  onClick={() => navigateTo('/patient/reports')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4A2333] hover:bg-[#5E2F43] text-white text-xs font-bold shadow-xs transition cursor-pointer self-start sm:self-auto"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>View Clinical Report</span>
                </button>
              </div>

              {/* Review status notice */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">Doctor Review Status:</span>
                <span className={`font-bold px-2.5 py-0.5 rounded-full text-[11px] ${
                  latestAssessment.reportStatus === 'REVIEWED'
                    ? 'bg-emerald-100 text-emerald-800'
                    : latestAssessment.reportStatus === 'UNDER_REVIEW'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-200 text-slate-700'
                }`}>
                  {latestAssessment.reportStatus}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
              <Sparkles className="w-8 h-8 text-[#F29D88] mx-auto" />
              <p className="text-xs font-bold text-slate-800">No Assessment Completed Yet</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Complete your speech, memory, attention, and lifestyle screening to calculate your baseline cognitive index.
              </p>
              <button
                onClick={handleStartAssessment}
                className="px-4 py-2 bg-[#4A2333] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
              >
                Launch Screening Now
              </button>
            </div>
          )}
        </div>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm" aria-label="Choose a doctor">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div><h2 className="text-lg font-bold text-slate-900">Choose your doctor</h2>
            <p className="mt-1 text-xs text-slate-600">Compare approved doctors by specialty, experience, qualifications and location. Profile details are provided by each doctor. Selecting a doctor does not share your reports.</p></div>
          {!activeProfile?.assignedDoctorId && <button type="button" disabled={doctorBusy} onClick={() => handleDoctorHelp(Boolean(activeProfile?.doctorAssistanceRequestedAt))} className="rounded-xl border border-[#4A2333] px-4 py-2 text-xs font-bold text-[#4A2333] disabled:opacity-50">
            {activeProfile?.doctorAssistanceRequestedAt ? 'Cancel admin help request' : 'Ask admin to choose for me'}
          </button>}
        </div>
        {activeProfile?.doctorAssistanceRequestedAt && !activeProfile?.assignedDoctorId && <p role="status" className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">Your request is in the admin queue. You can still choose a doctor yourself.</p>}
          {activeProfile?.assignedDoctorId ? <div className="mt-4 flex items-center gap-4"><p className="text-xs font-semibold text-emerald-800">Your doctor is {activeProfile.assignedDoctorName}.</p><button type="button" onClick={() => navigateTo('/patient/care')} className="text-xs font-bold text-[#4A2333] underline">Request a change</button></div> : <>
          <label className="relative mt-5 block"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><span className="sr-only">Search doctors by name, city, area, specialty or experience</span>
            <input value={doctorSearch} onChange={(e) => setDoctorSearch(e.target.value)} placeholder="Search name, specialty, qualification or area" className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm" /></label>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredDoctors.map((doctor) => <article key={doctor.id} className="rounded-2xl border border-slate-200 p-5">
              <h3 className="text-sm font-bold text-slate-900">{doctor.name}</h3>
              <p className="mt-1 text-xs font-semibold text-[#A76A5B]">{doctor.specialization || 'Clinical practitioner'}</p>
              <p className="mt-3 text-xs text-slate-600">{doctor.qualification || 'Qualification not provided'} · {doctor.yearsOfExperience == null ? 'Experience not provided' : `${doctor.yearsOfExperience} years of experience`}</p>
              <p className="mt-1 text-xs text-slate-600">{[doctor.area, doctor.city].filter(Boolean).join(', ') || 'Area not provided'} · {doctor.institution || 'Practice not provided'}</p>
              {doctor.bio && <p className="mt-2 line-clamp-3 text-xs text-slate-500">{doctor.bio}</p>}
              <button type="button" disabled={doctorBusy} onClick={() => handleDoctorChoice(doctor)} className="mt-4 rounded-xl bg-[#4A2333] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">Choose this doctor</button>
            </article>)}
          </div>
          {filteredDoctors.length === 0 && <p className="mt-5 text-xs text-slate-500">No approved doctors match this search. You can ask an admin for help.</p>}
        </>}
      </section>

      {/* Assessment History Table */}
      <div className="p-6 sm:p-8 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Assessment & Screening History</h2>
            <p className="text-xs text-slate-500">Historical records of your multimodal evaluations</p>
          </div>
          <button
            onClick={() => navigateTo('/patient/reports')}
            className="text-xs font-bold text-[#4A2333] hover:underline cursor-pointer"
          >
            All Reports ({assessments.length})
          </button>
        </div>

        {assessments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Session ID</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Outcome</th>
                  <th className="py-3 px-4">Risk %</th>
                  <th className="py-3 px-4">Doctor Review</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {assessments.map((rec) => (
                  <tr key={rec.assessmentId} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{rec.assessmentId}</td>
                    <td className="py-3.5 px-4">{new Date(rec.createdAt).toLocaleDateString()}</td>
                    <td className="py-3.5 px-4">
                      {rec.predictionResult ? (
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${predictionBadgeClass(rec.predictionResult.prediction)}`}>
                          {rec.predictionResult.prediction}
                        </span>
                      ) : (
                        <span className="text-slate-400">Incomplete</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {rec.predictionResult ? `${(rec.predictionResult.dementiaProbability * 100).toFixed(1)}%` : '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        rec.reportStatus === 'REVIEWED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : rec.reportStatus === 'UNDER_REVIEW'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {rec.reportStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => navigateTo('/patient/reports')}
                        className="inline-flex items-center gap-1 font-bold text-[#4A2333] hover:text-[#5E2F43] cursor-pointer"
                      >
                        <span>View</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-slate-500 text-center py-6">No previous assessments found on your account.</p>
        )}
      </div>

      {/* Notifications Section */}
      <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <Bell className="w-4 h-4 text-[#4A2333]" />
          <span>Recent Clinical Notifications</span>
        </h2>

        {notifications.length > 0 ? (
          <div className="space-y-2.5">
            {notifications.slice(0, 4).map((notif) => (
              <div
                key={notif.id}
                className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-start justify-between gap-4 text-xs"
              >
                <div className="space-y-1">
                  <p className="font-bold text-slate-900">{notif.title}</p>
                  <p className="text-slate-600">{notif.message}</p>
                </div>
                <span className="text-[10px] text-slate-400 shrink-0">
                  {new Date(notif.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 text-center py-4">No new notifications.</p>
        )}
      </div>
    </div>
  );
};
