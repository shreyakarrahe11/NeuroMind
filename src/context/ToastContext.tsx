import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastData {
  id: string;
  message: string;
  type: ToastType;
  subtitle?: string;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, subtitle?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toast, setToast] = useState<ToastData | null>(null);

  const showToast = useCallback((message: string, type: ToastType = 'success', subtitle?: string) => {
    setToast({
      id: Math.random().toString(36).substring(7),
      message,
      type,
      subtitle,
    });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`fixed bottom-6 right-6 z-[100] flex items-start gap-3 px-4 py-4 text-white rounded-2xl shadow-2xl max-w-sm border ${
              toast.type === 'error'
                ? 'bg-rose-950 border-rose-800'
                : toast.type === 'warning'
                ? 'bg-amber-950 border-amber-800'
                : toast.type === 'info'
                ? 'bg-slate-900 border-slate-700'
                : 'bg-[#4A2333] border-[#5D2E42]'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            ) : toast.type === 'warning' ? (
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            ) : toast.type === 'info' ? (
              <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            )}

            <div className="flex-1">
              <span className="text-sm font-semibold block leading-tight">{toast.message}</span>
              {toast.subtitle && (
                <span className="text-xs text-[#FDF8F5] opacity-80 block mt-1">
                  {toast.subtitle}
                </span>
              )}
            </div>

            <button
              onClick={() => setToast(null)}
              className="ml-1 p-1 hover:bg-white/10 rounded-md transition-colors cursor-pointer"
            >
              <X className="w-4 h-4 text-slate-300 hover:text-white" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
