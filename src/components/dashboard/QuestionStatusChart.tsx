"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

interface QuestionStatusChartProps {
  data: {
    ready: number;
    productionNeedsRefactor: number;
    needsReview: number;
    total: number;
  };
}

const COLORS = ["#10B981", "#F59E0B", "#EF4444"]; // Green, Orange, Red

export default function QuestionStatusChart({
  data,
}: QuestionStatusChartProps) {
  const chartData = [
    { name: "Ready", value: data.ready, color: "#10B981" },
    {
      name: "Production (Needs Refactor)",
      value: data.productionNeedsRefactor,
      color: "#F59E0B",
    },
    { name: "Needs Review", value: data.needsReview, color: "#EF4444" },
  ].filter((item) => item.value > 0);

  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: any) => {
    if (percent < 0.05) return null; // Don't show label if less than 5%

    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        fontSize="12"
        fontWeight="600"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          Question Status Overview
        </h3>
        <p className="text-sm text-gray-600">
          Breakdown of question review status
        </p>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => [
                value.toLocaleString(),
                "Questions",
              ]}
              labelStyle={{ color: "#374151" }}
            />
            <Legend
              wrapperStyle={{ paddingTop: "20px" }}
              formatter={(value) => (
                <span style={{ color: "#374151" }}>{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-4 mt-4 text-center">
        <div className="p-3 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{data.ready}</div>
          <div className="text-sm text-green-700">Ready</div>
        </div>
        <div className="p-3 bg-orange-50 rounded-lg">
          <div className="text-2xl font-bold text-orange-600">
            {data.productionNeedsRefactor}
          </div>
          <div className="text-sm text-orange-700">Needs Refactor</div>
        </div>
        <div className="p-3 bg-red-50 rounded-lg">
          <div className="text-2xl font-bold text-red-600">
            {data.needsReview}
          </div>
          <div className="text-sm text-red-700">Needs Review</div>
        </div>
      </div>
    </div>
  );
}
