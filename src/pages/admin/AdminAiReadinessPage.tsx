import React, { useEffect, useState } from 'react';
import { BrainCircuit, CheckCircle2, Database, RefreshCw, TriangleAlert, XCircle } from 'lucide-react';
import { adminService } from '../../services/adminService';
import { useToast } from '../../context/ToastContext';

const StateBadge: React.FC<{ ready: boolean; readyText: string; pendingText: string }> = ({ ready, readyText, pendingText }) => (
  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold ${ready ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
    {ready ? <CheckCircle2 className="h-3 w-3" /> : <TriangleAlert className="h-3 w-3" />}{ready ? readyText : pendingText}
  </span>
);

export const AdminAiReadinessPage: React.FC = () => {
  const { showToast } = useToast();
  const [state, setState] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setBusy(true);
    try { setState(await adminService.getAiReadiness()); }
    catch (error) { showToast(error instanceof Error ? error.message : 'Unable to load AI readiness', 'error'); }
    finally { setBusy(false); }
  };

  useEffect(() => { void load(); }, []);

  const indexKnowledge = async () => {
    setBusy(true);
    try {
      const result = await adminService.indexKnowledgeBase();
      showToast(`Knowledge sync finished: ${result.documentsIndexed} document(s) changed.`, 'success');
      await load();
    } catch (error) { showToast(error instanceof Error ? error.message : 'Knowledge indexing failed', 'error'); setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <div className="rounded-3xl bg-[#4A2333] p-8 text-white">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-3"><BrainCircuit className="h-7 w-7 text-[#F29D88]" /><h1 className="text-3xl font-black">AI and knowledge readiness</h1></div><p className="mt-2 text-sm text-white/75">Truthful status for model artifacts, background processing, report generation, and the evidence corpus.</p></div><button onClick={() => void load()} disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-xs font-bold hover:bg-white/20 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />Refresh</button></div>
      </div>

      {!state && <div className="rounded-3xl border bg-white p-12 text-center text-sm text-slate-400">Loading readiness status…</div>}
      {state && <>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border bg-white p-5"><p className="text-xs font-bold text-slate-500">Final fusion inference</p><div className="mt-3"><StateBadge ready={state.inferenceReady} readyText="READY" pendingText="ARTIFACT REQUIRED" /></div></div>
          <div className="rounded-2xl border bg-white p-5"><p className="text-xs font-bold text-slate-500">Task queue</p><div className="mt-3"><StateBadge ready={state.taskQueueReady} readyText="READY" pendingText="UNAVAILABLE" /></div></div>
          <div className="rounded-2xl border bg-white p-5"><p className="text-xs font-bold text-slate-500">Evidence-grounded report provider</p><div className="mt-3"><StateBadge ready={state.reportProviderConfigured} readyText="CONFIGURED" pendingText="API KEY REQUIRED" /></div></div>
        </div>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-lg font-black text-slate-900">Model adapters</h2><p className="mt-1 text-xs text-slate-500">An artifact is usable only when its manifest and SHA-256 checksum pass validation. Only speech and final fusion are required.</p><div className="mt-5 grid gap-3 md:grid-cols-2">{state.models.map((model: any) => <div key={model.name} className="rounded-2xl border border-slate-100 bg-slate-50 p-4"><div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><p className="font-bold capitalize text-slate-900">{model.name}</p><span className="rounded-full bg-white px-2 py-0.5 text-[9px] font-bold text-slate-500">{model.requiredForFinalInference ? 'REQUIRED' : 'OPTIONAL'}</span></div><p className="mt-1 break-all font-mono text-[10px] text-slate-400">{model.artifactName || 'No artifact configured'}</p></div>{model.state === 'READY' ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : model.requiredForFinalInference ? <XCircle className="h-5 w-5 text-amber-600" /> : <span className="text-[10px] font-bold text-slate-400">SCORED</span>}</div><p className="mt-3 text-xs font-semibold text-slate-600">{model.state}</p><p className="mt-1 text-[10px] text-slate-400">{model.role}</p>{model.error && <p className="mt-1 text-[11px] text-rose-700">{model.error}</p>}</div>)}</div></section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><Database className="h-5 w-5 text-[#A76A5B]" /><h2 className="text-lg font-black text-slate-900">Clinical knowledge corpus</h2></div><p className="mt-1 text-xs text-slate-500">{state.knowledge.documentCount} document(s), {state.knowledge.chunkCount} retrievable chunk(s). Report generation requires evidence when the safety gate is enabled.</p></div><button onClick={() => void indexKnowledge()} disabled={busy} className="rounded-xl bg-[#4A2333] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">Sync approved folder</button></div>{state.knowledge.documentCount === 0 && <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">No knowledge documents are indexed. Add only reviewed TXT, Markdown, or PDF sources to the configured knowledge directory, then sync. NeuroMind will not invent evidence.</div>}{state.knowledge.semanticIndexError && <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">Semantic index error: {state.knowledge.semanticIndexError}. Lexical fallback remains explicitly labeled.</div>}<div className="mt-5 space-y-2">{state.knowledge.documents.map((document: any) => <div key={document.id} className="flex flex-col gap-2 rounded-2xl border border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-bold text-slate-900">{document.title}</p><p className="text-[11px] text-slate-500">{document.source} • {document.documentType.toUpperCase()}</p></div><p className="text-xs font-semibold text-slate-500">{document.chunkCount} chunks</p></div>)}</div></section>
      </>}
    </div>
  );
};
