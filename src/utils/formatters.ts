/**
 * Utility functions for NeuroMind
 */

export function formatSecondsToMinutes(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatPercentage(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function formatMsToSeconds(ms: number): string {
  return `${(ms / 1000).toFixed(2)}s`;
}

export function getModalityStatusBadge(isCompleted: boolean) {
  if (isCompleted) {
    return {
      text: 'Completed',
      className: 'bg-emerald-100 text-emerald-800 border-[#F29D88] dark:bg-emerald-950 dark:text-[#F29D88]',
    };
  }
  return {
    text: 'Not Started',
    className: 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400',
  };
}
