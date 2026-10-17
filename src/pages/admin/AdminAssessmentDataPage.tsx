import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Brain, Database, Mic, Search } from 'lucide-react';
import { adminService } from '../../services/adminService';
import { AssessmentRecord } from '../../types/assessment';
import { useToast } from '../../context/ToastContext';
import { downloadAuthenticatedFile } from '../../api/http';

const JsonBlock: React.FC<{ value: unknown }> = ({ value }) => (
  <pre className="max-h-80 overflow-auto rounded-2xl bg-slate-950 p-4 text-[11px] leading-5 text-slate-100">
    {JSON.stringify(value ?? {}, null, 2)}
  </pre>
);

export const AdminAssessmentDataPage: React.FC = () => {
  const { showToast } = useToast();
  const [rows, setRows] = useState<AssessmentRecord[]>([]);
  const [selected, setSelected] = useState<AssessmentRecord | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    adminService.getAllAssessments().then((items) => {
      setRows(items);
      setSelected(items[0] || null);
    }).catch((error) => showToast(error.message, 'error'));
  }, [showToast]);

  useEffect(() => {
    if (!selected) return setDetail(null);
    adminService.getAssessmentClinicalData(selected.assessmentId)
      .then(setDetail)
      .catch((error) => showToast(error.message, 'error'));
  }, [selected, showToast]);

  const filtered = useMemo(() => rows.filter((row) => (
    row.patientName.toLowerCase().includes(query.toLowerCase()) ||
    row.assessmentId.toLowerCase().includes(query.toLowerCase())
  )), [rows, query]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="rounded-3xl bg-[#4A2333] p-8 text-white">
        <div className="flex items-center gap-3"><Database className="h-7 w-7 text-[#F29D88]" /><h1 className="text-3xl font-black">Assessment data explorer</h1></div>
        <p className="mt-2 text-sm text-white/75">Authorized view of raw answers, exact interaction timing, derived scores, and model-run provenance stored in PostgreSQL.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="relative mb-4"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Patient or assessment ID" className="w-full rounded-xl border py-2.5 pl-10 pr-3 text-xs" /></div>
          <div className="max-h-[720px] space-y-2 overflow-y-auto">
            {filtered.map((row) => <button key={row.assessmentId} onClick={() => setSelected(row)} className={`w-full rounded-2xl border p-4 text-left ${selected?.assessmentId === row.assessmentId ? 'border-[#4A2333] bg-[#FDF8F5]' : 'border-slate-100 hover:bg-slate-50'}`}><p className="text-sm font-bold text-slate-900">{row.patientName || 'Patient'}</p><p className="mt-1 break-all font-mono text-[10px] text-slate-500">{row.assessmentId}</p><p className="mt-2 text-[10px] text-slate-400">{new Date(row.createdAt).toLocaleString()}</p></button>)}
          </div>
        </div>
        <div className="space-y-5">
          {!detail && <div className="rounded-3xl border bg-white p-12 text-center text-sm text-slate-400">Select an assessment to inspect.</div>}
          {detail && <>
            <div className="grid gap-4 sm:grid-cols-4">
              {[['Speech', detail.speech, Mic], ['Memory', detail.memory, Brain], ['Attention', detail.attention, Activity], ['Lifestyle', detail.lifestyle, Activity]].map(([label, value, Icon]: any) => <div key={label} className="rounded-2xl border bg-white p-4"><Icon className="h-5 w-5 text-[#A76A5B]" /><p className="mt-2 text-xs font-bold text-slate-800">{label}</p><p className="text-[11px] text-slate-500">{value ? 'Captured' : 'Not submitted'}</p></div>)}
            </div>
            <section className="rounded-3xl border bg-white p-6"><h2 className="mb-3 font-bold text-slate-900">Memory answers and scores</h2><JsonBlock value={detail.memory} /></section>
            <section className="rounded-3xl border bg-white p-6"><h2 className="mb-3 font-bold text-slate-900">Attention clicks, trials, and scores</h2><JsonBlock value={detail.attention} /></section>
            <section className="rounded-3xl border bg-white p-6"><h2 className="mb-3 font-bold text-slate-900">Normalized interaction events</h2><JsonBlock value={detail.events} /></section>
            <section className="rounded-3xl border bg-white p-6"><h2 className="mb-3 font-bold text-slate-900">Speech features and processing</h2>
              {detail.speech?.recording?.storedInPostgres && selected && <button type="button" onClick={() => downloadAuthenticatedFile(`/assessments/${selected.assessmentId}/speech/audio`, `speech-${selected.assessmentId}.${detail.speech.format}`).catch((error) => showToast(error.message, 'error'))} className="mb-3 rounded-xl bg-[#4A2333] px-4 py-2 text-xs font-bold text-white">Download stored patient recording</button>}
              <JsonBlock value={detail.speech} /></section>
            <section className="rounded-3xl border bg-white p-6"><h2 className="mb-3 font-bold text-slate-900">Lifestyle responses</h2><JsonBlock value={detail.lifestyle} /></section>
            <section className="rounded-3xl border bg-white p-6"><h2 className="mb-3 font-bold text-slate-900">Model run provenance</h2><JsonBlock value={detail.modelRuns} /></section>
          </>}
        </div>
      </div>
    </div>
  );
};
