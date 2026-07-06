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

// Palette de la charte : sauge, or, encre + tons complémentaires assortis
const COLORS = ["#4a6b5a", "#a07c3a", "#1a1a18", "#a03a2e", "#52708c", "#7a5a80"];

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
          <CartesianGrid strokeDasharray="3 3" stroke="#e3ddd0" />
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
