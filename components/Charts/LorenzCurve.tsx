import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { ChartPoint } from '../../types';

interface LorenzCurveProps {
  data: ChartPoint[];
  currentName: string;
  targetName: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-slate-200 shadow-lg rounded-lg text-xs z-50">
        <p className="font-semibold text-slate-700 mb-2">Bottom {label}% of Population</p>
        <div className="space-y-1">
          <p className="text-slate-500 flex items-center justify-between gap-4">
            <span>Equality:</span>
            <span className="font-mono">{label}% of income</span>
          </p>
          <p className="text-indigo-600 flex items-center justify-between gap-4">
            <span>Current:</span>
            <span className="font-mono font-medium">{(payload[0].value).toFixed(1)}% of income</span>
          </p>
           <p className="text-emerald-600 flex items-center justify-between gap-4">
            <span>Target:</span>
            <span className="font-mono font-medium">{(payload[1].value).toFixed(1)}% of income</span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

const LorenzCurve: React.FC<LorenzCurveProps> = ({ data, currentName, targetName }) => {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis 
            dataKey="percentile" 
            type="number" 
            domain={[0, 100]} 
            tick={{fontSize: 10, fill: '#64748b'}}
            tickFormatter={(value) => `${value}%`}
            label={{ value: 'Population %', position: 'insideBottom', offset: -5, fontSize: 10, fill: '#94a3b8' }}
            height={30}
          />
          <YAxis 
            domain={[0, 100]} 
            tick={{fontSize: 10, fill: '#64748b'}}
            tickFormatter={(value) => `${value}%`}
            width={35}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{fontSize: '11px', paddingTop: '10px'}} />
          
          {/* Equality Line (Diagonal) */}
          <Line 
            type="monotone" 
            dataKey="equalityShare" 
            stroke="#cbd5e1" 
            strokeWidth={1} 
            strokeDasharray="4 4" 
            dot={false}
            name="Perfect Equality"
          />
          
          {/* Current Distribution */}
          <Line 
            type="monotone" 
            dataKey="currentShare" 
            stroke="#4f46e5" 
            strokeWidth={2} 
            dot={false}
            name="Current US"
            animationDuration={1000}
          />
          
          {/* Target Distribution */}
          <Line 
            type="monotone" 
            dataKey="targetShare" 
            stroke="#10b981" 
            strokeWidth={2} 
            strokeDasharray="5 5"
            dot={false}
            name={targetName}
            animationDuration={1000}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default LorenzCurve;