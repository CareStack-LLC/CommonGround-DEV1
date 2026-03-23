'use client';

import {
  BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { type AriaInsights, CustomTooltipStyle, SEVERITY_COLORS } from './page';

export default function CategoriesTab({ data }: { data: AriaInsights }) {
  const severityData = data.top_categories?.map((cat) => ({
    ...cat,
    fill: SEVERITY_COLORS[cat.category] || '#71717a',
  })) || [];

  return (
    <div className="space-y-4">
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Actual category breakdown */}
        <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#D0E4EC] mb-4">
            Detected Categories ({data.days}d)
          </h2>
          {data.detailed_categories?.length ? (
            <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
              {data.detailed_categories.map((cat) => {
                const maxCat = Math.max(...data.detailed_categories.map((c) => c.count));
                const pct = maxCat > 0 ? (cat.count / maxCat) * 100 : 0;
                return (
                  <div key={cat.category}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-[#8AACBC] capitalize">
                        {cat.category.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[#D0E4EC] font-medium">{cat.count}</span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-teal-500 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[#4A6E7F] text-sm text-center py-10">No category data</p>
          )}
        </div>

        {/* Severity distribution */}
        <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#D0E4EC] mb-4">By Severity</h2>
          {severityData.length ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={severityData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: '#71717a', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="category"
                  tick={{ fill: '#a1a1aa', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={80}
                />
                <Tooltip contentStyle={CustomTooltipStyle} />
                <Bar dataKey="count" name="Flags" radius={[0, 4, 4, 0]} barSize={18}>
                  {severityData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-[#4A6E7F] text-sm text-center py-10">No severity data</p>
          )}
        </div>
      </div>

      {/* Circle categories */}
      {data.circle_data?.categories?.length > 0 && (
        <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#D0E4EC] mb-4">
            Circle (KidComs) Categories
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.circle_data.categories.map((cat) => (
              <div
                key={cat.category}
                className="flex items-center justify-between p-3 bg-[#2D6A8F]/10 rounded-lg"
              >
                <span className="text-xs text-[#8AACBC] capitalize">
                  {cat.category.replace(/_/g, ' ')}
                </span>
                <span className="text-sm font-semibold text-white">{cat.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Call flag severity */}
      {data.call_data?.flag_severity?.length > 0 && (
        <div className="bg-[#1A3648]/60 border border-[#2D6A8F]/20 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-[#D0E4EC] mb-4">Call Flag Severity</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {data.call_data.flag_severity.map((item) => (
              <div
                key={item.severity}
                className="flex items-center justify-between p-3 bg-[#2D6A8F]/10 rounded-lg"
              >
                <span
                  className="text-xs font-medium capitalize"
                  style={{ color: SEVERITY_COLORS[item.severity] || '#8AACBC' }}
                >
                  {item.severity}
                </span>
                <span className="text-sm font-semibold text-white">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
