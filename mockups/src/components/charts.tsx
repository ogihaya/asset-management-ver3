import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatMonthLabel } from '../lib/months';
import { formatCurrency } from '../lib/utils';

const PIE_COLORS = ['#2f7d5c', '#6c9c84', '#b4d3c1', '#dbe8df'];

export function AssetTrendChart({ data }: { data: Array<{ month: string; label: string; value: number }> }) {
  return (
    <div className='h-80 w-full'>
      <ResponsiveContainer width='100%' height='100%'>
        <LineChart data={data} margin={{ top: 12, right: 20, left: 0, bottom: 12 }}>
          <CartesianGrid strokeDasharray='3 3' stroke='#dfe6de' vertical={false} />
          <XAxis dataKey='month' tickFormatter={(value) => formatMonthLabel(value)} tick={{ fill: '#596273', fontSize: 12 }} />
          <YAxis tickFormatter={(value) => `${Math.round(value / 10000)}万`} tick={{ fill: '#596273', fontSize: 12 }} width={60} />
          <Tooltip
            formatter={(value) => formatCurrency(typeof value === 'number' ? value : Number(value ?? 0))}
            labelFormatter={(value) => formatMonthLabel(value)}
            contentStyle={{ borderRadius: 18, border: '1px solid rgba(20,33,61,0.08)' }}
          />
          <Line type='monotone' dataKey='value' stroke='#2f7d5c' strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AllocationPieChart({ data }: { data: Array<{ name: string; value: number }> }) {
  return (
    <div className='h-72 w-full'>
      <ResponsiveContainer width='100%' height='100%'>
        <PieChart>
          <Pie data={data} dataKey='value' nameKey='name' innerRadius={58} outerRadius={92} paddingAngle={3}>
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => {
              const numeric = typeof value === 'number' ? value : Number(value ?? 0);
              return `${numeric.toFixed(2)}%`;
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
