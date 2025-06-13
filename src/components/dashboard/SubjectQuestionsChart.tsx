"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface SubjectQuestionsChartProps {
  data: Array<{
    name: string;
    count: number;
  }>;
}

export default function SubjectQuestionsChart({
  data,
}: SubjectQuestionsChartProps) {
  // Sort data by count and take top 10
  const sortedData = data
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map((item) => ({
      ...item,
      name:
        item.name.length > 15 ? item.name.substring(0, 15) + "..." : item.name,
    }));

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          Questions by Subject
        </h3>
        <p className="text-sm text-gray-600">
          Distribution of questions across subjects
        </p>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={sortedData}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="name"
              stroke="#6B7280"
              fontSize={12}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis stroke="#6B7280" fontSize={12} />
            <Tooltip
              formatter={(value: number) => [
                value.toLocaleString(),
                "Questions",
              ]}
              labelStyle={{ color: "#374151" }}
              contentStyle={{
                backgroundColor: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
              }}
            />
            <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
