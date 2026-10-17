import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine, Cell } from 'recharts';
import { MultimodalPredictionResult } from '../../types/assessment';

interface ProbabilityChartProps {
  result: MultimodalPredictionResult;
}

export const ProbabilityChart: React.FC<ProbabilityChartProps> = ({ result }) => {
  const colors: Record<string, string> = {
    'Non-Dementia': '#10b981',
    Dementia: '#e11d48',
  };
  const suppliedProbabilities = result.classProbabilities && Object.keys(result.classProbabilities).length
    ? result.classProbabilities
    : { 'Non-Dementia': result.nonDementiaProbability, Dementia: result.dementiaProbability };
  const chartData = Object.entries(suppliedProbabilities).map(([name, probability]) => ({
    name,
    probability: Math.round(probability * 100),
    color: colors[name] || '#64748b',
  }));

  return (
    <div className="p-8 bg-white rounded-[1.5rem] border border-slate-200 shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Multimodal Classification Probabilities</h3>
          <p className="text-sm text-slate-500">
            Probabilities returned by the configured trained model
          </p>
        </div>
        <span className="text-sm font-mono font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
          {chartData.length}-Class Output
        </span>
      </div>

      <div className="h-56 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
            <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 600 }} />
            <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(value: any) => [`${value}%`, 'Probability']}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
            />
            {result.predictionThreshold != null && (
              <ReferenceLine
                y={result.predictionThreshold * 100}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                label={{ value: `Threshold ${Math.round(result.predictionThreshold * 100)}%`, fill: '#d97706', fontSize: 11, position: 'right' }}
              />
            )}
            <Bar dataKey="probability" radius={[8, 8, 0, 0]} barSize={48}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
