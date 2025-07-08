"use client";

import { FaArrowUp, FaArrowDown } from "react-icons/fa";

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  change?: {
    value: number;
    isPositive: boolean;
    period: string;
  };
  color: "blue" | "green" | "purple" | "orange" | "red";
}

const colorClasses = {
  blue: "bg-blue-500 from-blue-400 to-blue-600",
  green: "bg-green-500 from-green-400 to-green-600",
  purple: "bg-purple-800",
  orange: "bg-orange-500 from-orange-400 to-orange-600",
  red: "bg-red-500 from-red-400 to-red-600",
};

export default function StatsCard({
  title,
  value,
  icon,
  change,
  color,
}: StatsCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">
            {value.toLocaleString()}
          </p>
          {change && (
            <div className="flex items-center mt-2">
              {change.isPositive ? (
                <FaArrowUp className="text-green-500 mr-1 text-sm" />
              ) : (
                <FaArrowDown className="text-red-500 mr-1 text-sm" />
              )}
              <span
                className={`text-sm font-medium ${
                  change.isPositive ? "text-green-600" : "text-red-600"
                }`}
              >
                {change.value}%
              </span>
              <span className="text-sm text-gray-500 ml-1">
                vs {change.period}
              </span>
            </div>
          )}
        </div>
        <div
          className={`
          ${colorClasses[color]} 
          bg-gradient-to-br text-white p-3 rounded-lg shadow-lg
        `}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
