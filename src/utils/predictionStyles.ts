export const predictionTone = (label?: string) =>
  label === 'Dementia' ? 'high' : 'low';

export const predictionBadgeClass = (label?: string) => {
  const tone = predictionTone(label);
  return tone === 'high'
    ? 'bg-rose-100 text-rose-800'
    : 'bg-emerald-100 text-emerald-800';
};

export const predictionTextClass = (label?: string) => {
  const tone = predictionTone(label);
  return tone === 'high' ? 'text-rose-700' : 'text-emerald-700';
};

export const predictionPanelClass = (label?: string) => {
  const tone = predictionTone(label);
  return tone === 'high'
    ? 'bg-rose-50 border-rose-300 text-rose-950'
    : 'bg-emerald-50 border-emerald-300 text-emerald-950';
};
