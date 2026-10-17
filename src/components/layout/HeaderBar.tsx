import React, { useState, useEffect, useRef } from 'react';
import { SafeUserButton } from '../auth/ClerkBridge';
import { useAssessment } from '../../context/AssessmentContext';
import { notificationService } from '../../services/notificationService';
import { AppNotification, UserRole } from '../../types/assessment';
import {
  Bell,
  Check,
  ExternalLink,
  Shield,
  Stethoscope,
  User,
  Sparkles,
  LayoutDashboard,
  CheckCheck,
} from 'lucide-react';

export const HeaderBar: React.FC = () => {
  const { user, currentUser, currentRoute, navigateTo } = useAssessment();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const role = currentUser?.role || (user.userRole as UserRole) || 'PATIENT';

  useEffect(() => {
    if (currentUser) {
      notificationService.getNotificationsForUser(currentUser.id, currentUser.role)
        .then(setNotifications)
        .catch((err) => console.error(err));
    }
  }, [currentUser, currentRoute]);

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = async () => {
    if (currentUser) {
      await notificationService.markAllAsRead(currentUser.id);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  };

  const handleNotificationClick = async (notif: AppNotification) => {
    await notificationService.markAsRead(notif.id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
    );
    setShowNotifs(false);
    if (notif.link) {
      navigateTo(notif.link);
    }
  };


  const getDashboardRoute = () => {
    if (role === 'PATIENT') return '/patient/dashboard';
    if (role === 'DOCTOR') return '/doctor/dashboard';
    if (role === 'ADMIN') return '/admin/dashboard';
    return '/assessment';
  };

  return (
    <header className="bg-white border-b border-slate-200/80 px-4 sm:px-6 py-2.5 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigateTo(getDashboardRoute())}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#4A2333] text-xs font-bold transition cursor-pointer"
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">
            {role === 'PATIENT' ? 'Patient Portal' : role === 'DOCTOR' ? 'Doctor Portal' : role === 'ADMIN' ? 'Admin Center' : 'Dashboard'}
          </span>
          <span className="sm:hidden">Portal</span>
        </button>

        <span className="text-slate-300 hidden sm:inline">|</span>

        <span className="text-xs font-medium text-slate-500 hidden md:inline truncate max-w-xs">
          {currentUser ? `Signed in as ${currentUser.name}` : 'Cognitive Screening Session'}
        </span>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Current role badge — role changes are controlled by authentication/admin approval, not demo switching. */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#F8E3DA]/80 text-[#4A2333] text-xs font-bold border border-[#E8CFC6]">
          {role === 'PATIENT' && <User className="w-3.5 h-3.5 text-[#A76A5B]" />}
          {role === 'DOCTOR' && <Stethoscope className="w-3.5 h-3.5 text-[#A76A5B]" />}
          {role === 'ADMIN' && <Shield className="w-3.5 h-3.5 text-[#A76A5B]" />}
          <span className="uppercase text-[11px] tracking-wider">{role}</span>
        </div>

        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition relative cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl border border-slate-200 shadow-2xl py-3 z-50 animate-in fade-in zoom-in-95">
              <div className="px-4 pb-2 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">Notifications ({unreadCount} unread)</span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] font-bold text-[#4A2333] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                {notifications.length > 0 ? (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`p-3 text-xs hover:bg-slate-50 transition cursor-pointer space-y-1 ${
                        !notif.read ? 'bg-amber-50/40 font-semibold' : 'text-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-bold text-slate-900 text-xs">{notif.title}</p>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-snug">{notif.message}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 text-center py-6">No notifications.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Button */}
        <SafeUserButton />
      </div>
    </header>
  );
};
