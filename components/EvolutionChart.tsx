"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const COLORS = ["#1f6f63", "#b3261e", "#4a6fa5", "#8a5300", "#6b4a8a", "#1f6f3d"];

export default function EvolutionChart({
  data,
  series,
}: {
  data: Record<string, number | string | null>[];
  series: string[];
}) {
  return (
    <div style={{ width: "100%", height: 320 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#dde2e8" />
          <XAxis dataKey="name" />
          <YAxis domain={[0, 10]} tickCount={6} />
          <Tooltip />
          <Legend />
          {series.map((s, i) => (
            <Line
              key={s}
              type="monotone"
              dataKey={s}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2}
              connectNulls
              dot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
