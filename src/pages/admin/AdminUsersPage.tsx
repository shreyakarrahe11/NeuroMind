import React, { useState, useEffect } from 'react';
import { useAssessment } from '../../context/AssessmentContext';
import { adminService } from '../../services/adminService';
import { useToast } from '../../context/ToastContext';
import { AppUser, UserRole, AccountStatus } from '../../types/assessment';
import {
  Users,
  Search,
  Shield,
  Stethoscope,
  User,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  LogIn,
} from 'lucide-react';

export const AdminUsersPage: React.FC = () => {
  const { navigateTo } = useAssessment();
  const { showToast } = useToast();

  const [users, setUsers] = useState<AppUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [loginActivity, setLoginActivity] = useState<any[]>([]);

  const loadUsers = async () => {
    const list = await adminService.getAllUsers();
    setUsers(list);
    try { setLoginActivity(await adminService.getLoginActivity(20)); } catch (err) { console.error(err); }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleStatusChange = async (userId: string, status: AccountStatus, name: string) => {
    try {
      await adminService.updateUserStatus(userId, status);
      showToast(`User ${name} status updated to ${status}.`, 'info');
      loadUsers();
    } catch (err: any) {
      showToast(err.message || 'Failed to update user', 'error');
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.id.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (roleFilter === 'ALL') return true;
    return u.role === roleFilter;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-black text-[#4A2333] tracking-tight">
            User Account Governance
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            System-wide user directory, authentication status controls, and role-based permissions.
          </p>
        </div>

        <button
          onClick={() => navigateTo('/admin/dashboard')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#4A2333] hover:underline cursor-pointer"
        >
          <span>Admin Dashboard</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Filters */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by name, email, or user ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-[#4A2333] focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
          {(['ALL', 'PATIENT', 'DOCTOR', 'ADMIN'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer ${
                roleFilter === r ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-6">User Name</th>
                <th className="py-3.5 px-6">Email / ID</th>
                <th className="py-3.5 px-6">Role</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6">Created</th>
                <th className="py-3.5 px-6">Last Login</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-4 px-6 font-bold text-slate-900">{u.name}</td>
                  <td className="py-4 px-6">
                    <div>{u.email}</div>
                    <div className="font-mono text-[10px] text-slate-400">{u.id}</div>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-bold text-[10px] ${
                      u.role === 'ADMIN'
                        ? 'bg-purple-100 text-purple-800'
                        : u.role === 'DOCTOR'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {u.role === 'ADMIN' && <Shield className="w-3 h-3" />}
                      {u.role === 'DOCTOR' && <Stethoscope className="w-3 h-3" />}
                      {u.role === 'PATIENT' && <User className="w-3 h-3" />}
                      <span>{u.role}</span>
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      u.status === 'ACTIVE'
                        ? 'bg-emerald-100 text-emerald-800'
                        : u.status === 'PENDING'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-slate-500">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-4 px-6 text-slate-500 text-[11px]">
                    {u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'Never'}
                  </td>
                  <td className="py-4 px-6 text-right">
                    {u.role !== 'ADMIN' && (
                      <select
                        value={u.status}
                        onChange={(e) => handleStatusChange(u.id, e.target.value as AccountStatus, u.name)}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-semibold bg-white text-slate-800 cursor-pointer focus:outline-hidden"
                      >
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="SUSPENDED">SUSPENDED</option>
                        <option value="DEACTIVATED">DEACTIVATED</option>
                        {u.status === 'PENDING' && <option value="PENDING">PENDING</option>}
                      </select>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#4A2333]" />
              Recent Login Activity
            </h2>
            <p className="text-xs text-slate-500">Successful and failed sign-in attempts with exact recorded timestamps.</p>
          </div>
          <LogIn className="w-4 h-4 text-slate-300" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-3">Email</th>
                <th className="py-3 px-3">Role</th>
                <th className="py-3 px-3">Provider</th>
                <th className="py-3 px-3">Result</th>
                <th className="py-3 px-3 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loginActivity.map((event) => (
                <tr key={event.id}>
                  <td className="py-3 px-3 font-medium text-slate-700">{event.email || 'Unknown'}</td>
                  <td className="py-3 px-3 text-slate-500">{event.role || '—'}</td>
                  <td className="py-3 px-3 text-slate-500">{event.authProvider || '—'}</td>
                  <td className="py-3 px-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${event.success ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>{event.success ? 'SUCCESS' : 'FAILED'}</span></td>
                  <td className="py-3 px-3 text-right text-slate-500">{new Date(event.createdAt).toLocaleString()}</td>
                </tr>
              ))}
              {loginActivity.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-slate-400">No login activity recorded yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
