import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MessageCircle, RefreshCw, Send, ShieldCheck, Star, UserRoundCheck } from 'lucide-react';
import { useAssessment } from '../context/AssessmentContext';
import { useToast } from '../context/ToastContext';
import { careService, CareContact, CareMessage, DoctorChangeRequest } from '../services/careService';
import { patientService } from '../services/patientService';
import { DoctorUser } from '../types/assessment';

export const CareCenterPage: React.FC = () => {
  const { currentUser } = useAssessment();
  const { showToast } = useToast();
  const [contacts, setContacts] = useState<CareContact[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [messages, setMessages] = useState<CareMessage[]>([]);
  const [message, setMessage] = useState('');
  const [requests, setRequests] = useState<DoctorChangeRequest[]>([]);
  const [doctors, setDoctors] = useState<DoctorUser[]>([]);
  const [requestedDoctorId, setRequestedDoctorId] = useState('');
  const [changeReason, setChangeReason] = useState('');
  const [rating, setRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [busy, setBusy] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    if (!currentUser) return;
    if (currentUser.role === 'ADMIN') {
      const [requestRows, doctorRows] = await Promise.all([
        careService.getChangeRequests(),
        patientService.getAvailableDoctors(),
      ]);
      setRequests(requestRows);
      setDoctors(doctorRows);
      return;
    }
    const contactRows = await careService.getContacts();
    setContacts(contactRows);
    setSelectedId((value) => value || contactRows[0]?.id || '');
    if (currentUser.role === 'PATIENT') {
      const [requestRows, doctorRows] = await Promise.all([
        careService.getChangeRequests(),
        patientService.getAvailableDoctors(),
      ]);
      setRequests(requestRows);
      setDoctors(doctorRows);
    }
  }, [currentUser]);

  const loadMessages = useCallback(async () => {
    if (!selectedId) return;
    setMessages(await careService.getMessages(selectedId));
  }, [selectedId]);

  useEffect(() => { load().catch((error) => showToast(error.message, 'error')); }, [load, showToast]);
  useEffect(() => { loadMessages().catch((error) => showToast(error.message, 'error')); }, [loadMessages, showToast]);
  useEffect(() => {
    if (!selectedId) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') loadMessages().catch(() => undefined);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [loadMessages, selectedId]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length, selectedId]);

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedId || !message.trim()) return;
    setBusy(true);
    try {
      await careService.sendMessage(selectedId, message.trim());
      setMessage('');
      await loadMessages();
    } catch (error: any) { showToast(error.message, 'error'); }
    finally { setBusy(false); }
  };

  const submitChange = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await careService.requestDoctorChange(changeReason, requestedDoctorId || undefined);
      setChangeReason('');
      setRequestedDoctorId('');
      await load();
      showToast('Your doctor change request was sent securely.');
    } catch (error: any) { showToast(error.message, 'error'); }
    finally { setBusy(false); }
  };

  const submitRating = async () => {
    if (!selectedId || rating < 1) return;
    setBusy(true);
    try {
      await careService.rateDoctor(selectedId, rating, ratingComment);
      setRatingComment('');
      showToast('Thank you. Your rating was saved.');
    } catch (error: any) { showToast(error.message, 'error'); }
    finally { setBusy(false); }
  };

  const resolve = async (row: DoctorChangeRequest, status: 'APPROVED' | 'REJECTED') => {
    const doctorId = row.requestedDoctorId || requestedDoctorId;
    try {
      await careService.resolveDoctorChange(row.id, status, doctorId || undefined);
      await load();
      showToast(`Request ${status.toLowerCase()}.`);
    } catch (error: any) { showToast(error.message, 'error'); }
  };

  if (!currentUser) return null;

  if (currentUser.role === 'ADMIN') {
    return (
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-3xl bg-[#4A2333] p-8 text-white">
          <h1 className="text-3xl font-black">Care assignment requests</h1>
          <p className="mt-2 text-sm text-white/75">Review patient requests and keep every reassignment auditable.</p>
        </div>
        <div className="space-y-3">
          {requests.length === 0 && <div className="rounded-2xl border bg-white p-8 text-center text-sm text-slate-500">No doctor change requests.</div>}
          {requests.map((row) => (
            <div key={row.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <p className="font-bold text-slate-900">{row.patientName}</p>
                  <p className="mt-1 text-sm text-slate-600">{row.reason}</p>
                  <p className="mt-2 text-xs text-slate-400">Requested: {row.requestedDoctorName || 'Administrator to choose'} · {new Date(row.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{row.status}</span>
                  {row.status === 'PENDING' && <>
                    {!row.requestedDoctorId && (
                      <select value={requestedDoctorId} onChange={(e) => setRequestedDoctorId(e.target.value)} className="rounded-xl border px-3 py-2 text-xs">
                        <option value="">Choose doctor</option>
                        {doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name}</option>)}
                      </select>
                    )}
                    <button onClick={() => resolve(row, 'APPROVED')} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white">Approve</button>
                    <button onClick={() => resolve(row, 'REJECTED')} className="rounded-xl bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700">Reject</button>
                  </>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="rounded-3xl bg-gradient-to-br from-[#4A2333] to-[#6D344D] p-8 text-white">
        <div className="flex items-center gap-3"><MessageCircle className="h-7 w-7 text-[#F29D88]" /><h1 className="text-3xl font-black">Secure care center</h1></div>
        <p className="mt-2 text-sm text-white/75">Private communication is limited to active doctor–patient assignments.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="px-2 pb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Care contacts</p>
          {contacts.length === 0 && <p className="p-4 text-sm text-slate-500">No active care assignment yet.</p>}
          {contacts.map((contact) => (
            <button key={contact.id} onClick={() => setSelectedId(contact.id)} className={`mb-2 w-full rounded-2xl p-3 text-left ${selectedId === contact.id ? 'bg-[#F8E3DA] text-[#4A2333]' : 'hover:bg-slate-50'}`}>
              <p className="text-sm font-bold">{contact.name}</p><p className="text-xs opacity-70">{contact.role === 'DOCTOR' ? 'Assigned doctor' : 'Assigned patient'}</p>
            </button>
          ))}
        </div>
        <div className="flex min-h-[520px] flex-col rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b p-5"><p className="font-bold text-slate-900">Care messages</p><button onClick={loadMessages} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><RefreshCw className="h-4 w-4" /></button></div>
          <div className="flex-1 space-y-3 overflow-y-auto p-5">
            {messages.length === 0 && <p className="pt-20 text-center text-sm text-slate-400">Start a secure conversation with your care contact.</p>}
            {messages.map((row) => {
              const mine = row.senderId === currentUser.id;
              return <div key={row.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[80%] rounded-2xl px-4 py-3 ${mine ? 'bg-[#4A2333] text-white' : 'bg-slate-100 text-slate-800'}`}><p className="text-sm whitespace-pre-wrap">{row.body}</p><p className={`mt-1 text-[10px] ${mine ? 'text-white/60' : 'text-slate-400'}`}>{new Date(row.createdAt).toLocaleString()}</p></div></div>;
            })}
            <div ref={messagesEndRef} />
          </div>
          <form onSubmit={send} className="flex gap-2 border-t p-4"><textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={4000} rows={2} placeholder="Type a private care message…" className="flex-1 resize-none rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-[#4A2333]" /><button disabled={busy || !selectedId || !message.trim()} className="rounded-xl bg-[#4A2333] px-5 text-white disabled:opacity-40"><Send className="h-4 w-4" /></button></form>
        </div>
      </div>

      {currentUser.role === 'PATIENT' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <form onSubmit={submitChange} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2"><UserRoundCheck className="h-5 w-5 text-[#A76A5B]" /><h2 className="font-bold text-slate-900">Request a different doctor</h2></div>
            <select value={requestedDoctorId} onChange={(e) => setRequestedDoctorId(e.target.value)} className="mt-4 w-full rounded-xl border p-3 text-sm"><option value="">Let an administrator choose</option>{doctors.filter((doctor) => doctor.id !== selectedId).map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name} — {doctor.specialization}</option>)}</select>
            <textarea required minLength={10} maxLength={2000} value={changeReason} onChange={(e) => setChangeReason(e.target.value)} placeholder="Tell the care team why you are requesting a change…" className="mt-3 w-full rounded-xl border p-3 text-sm" rows={4} />
            <button disabled={busy || requests.some((row) => row.status === 'PENDING')} className="mt-3 rounded-xl bg-[#4A2333] px-5 py-3 text-xs font-bold text-white disabled:opacity-40">Submit secure request</button>
          </form>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-emerald-600" /><h2 className="font-bold text-slate-900">Rate your assigned doctor</h2></div>
            <div className="mt-5 flex gap-2">{[1,2,3,4,5].map((value) => <button key={value} onClick={() => setRating(value)} aria-label={`${value} stars`}><Star className={`h-7 w-7 ${value <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} /></button>)}</div>
            <textarea value={ratingComment} onChange={(e) => setRatingComment(e.target.value)} maxLength={2000} placeholder="Optional feedback…" className="mt-4 w-full rounded-xl border p-3 text-sm" rows={3} />
            <button onClick={submitRating} disabled={busy || !selectedId || rating < 1} className="mt-3 rounded-xl bg-emerald-600 px-5 py-3 text-xs font-bold text-white disabled:opacity-40">Save rating</button>
          </div>
        </div>
      )}
    </div>
  );
};
