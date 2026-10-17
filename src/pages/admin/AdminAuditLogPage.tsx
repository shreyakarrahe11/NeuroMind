import React, { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Search, ShieldCheck } from 'lucide-react';
import { adminService } from '../../services/adminService';
import { useToast } from '../../context/ToastContext';

interface AuditEntry {
  id: string;
  userId?: string;
  actorEmail?: string;
  action: string;
  entityType: string;
  entityId?: string;
  ipAddress?: string;
  details: Record<string, unknown>;
  createdAt: string;
}

export const AdminAuditLogPage: React.FC = () => {
  const { showToast } = useToast();
  const [items, setItems] = useState<AuditEntry[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const load = async () => {
    setLoading(true);
    try {
      const response = await adminService.getAuditLogs(500, 0);
      setItems(response.items);
      setTotal(response.total);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to load the audit trail', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) => [
      item.action,
      item.entityType,
      item.entityId,
      item.actorEmail,
      item.userId,
    ].some((value) => value?.toLowerCase().includes(needle)));
  }, [items, query]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <div className="rounded-3xl bg-[#4A2333] p-8 text-white">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3"><ShieldCheck className="h-7 w-7 text-[#F29D88]" /><h1 className="text-3xl font-black">Administrative audit trail</h1></div>
            <p className="mt-2 text-sm text-white/75">Review security-sensitive account, assignment, report, and care actions recorded by the backend.</p>
          </div>
          <button onClick={() => void load()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-xs font-bold hover:bg-white/20 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search action, actor, entity, or ID" className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-xs outline-none focus:ring-2 focus:ring-[#4A2333]" /></div>
          <p className="text-xs font-semibold text-slate-500">Showing {filtered.length} of {total} records</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Time</th><th className="px-5 py-3">Action</th><th className="px-5 py-3">Actor</th><th className="px-5 py-3">Entity</th><th className="px-5 py-3">Details</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((item) => <tr key={item.id} className="align-top hover:bg-slate-50/70"><td className="whitespace-nowrap px-5 py-4 text-slate-500">{new Date(item.createdAt).toLocaleString()}</td><td className="px-5 py-4"><span className="rounded-lg bg-[#FDF0EC] px-2.5 py-1 font-bold text-[#7D3B4F]">{item.action}</span></td><td className="px-5 py-4"><p className="font-semibold text-slate-800">{item.actorEmail || 'System'}</p><p className="mt-1 font-mono text-[10px] text-slate-400">{item.userId || '—'}</p></td><td className="px-5 py-4"><p className="font-semibold text-slate-800">{item.entityType}</p><p className="mt-1 break-all font-mono text-[10px] text-slate-400">{item.entityId || '—'}</p></td><td className="max-w-sm px-5 py-4"><pre className="overflow-auto whitespace-pre-wrap break-words rounded-xl bg-slate-950 p-3 text-[10px] leading-4 text-slate-100">{JSON.stringify(item.details || {}, null, 2)}</pre></td></tr>)}
              {!loading && filtered.length === 0 && <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-slate-400">No matching audit records.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
