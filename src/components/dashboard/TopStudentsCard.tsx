"use client";

import { FaTrophy, FaStar, FaMedal } from "react-icons/fa";

interface TopStudentsCardProps {
  students: Array<{
    id: string;
    name: string;
    xpPoints: number;
    level: number;
  }>;
}

export default function TopStudentsCard({ students }: TopStudentsCardProps) {
  const getTrophyIcon = (index: number) => {
    switch (index) {
      case 0:
        return <FaTrophy className="text-yellow-500 text-xl" />;
      case 1:
        return <FaMedal className="text-gray-400 text-xl" />;
      case 2:
        return <FaMedal className="text-orange-600 text-xl" />;
      default:
        return <FaStar className="text-blue-500 text-lg" />;
    }
  };

  const getRankColors = (index: number) => {
    switch (index) {
      case 0:
        return "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white";
      case 1:
        return "bg-gradient-to-r from-gray-300 to-gray-500 text-white";
      case 2:
        return "bg-gradient-to-r from-orange-400 to-orange-600 text-white";
      default:
        return "bg-gradient-to-r from-blue-400 to-blue-600 text-white";
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          Top Performing Students
        </h3>
        <p className="text-sm text-gray-600">Highest XP earners this period</p>
      </div>

      <div className="space-y-3">
        {students.map((student, index) => (
          <div
            key={student.id}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div
                className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                ${getRankColors(index)}
              `}
              >
                {index + 1}
              </div>

              <div className="flex items-center space-x-2">
                {getTrophyIcon(index)}
                <div>
                  <div className="font-medium text-gray-800">
                    {student.name}
                  </div>
                  <div className="text-sm text-gray-500">
                    Level {student.level}
                  </div>
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="font-bold text-gray-800">
                {student.xpPoints.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500">XP Points</div>
            </div>
          </div>
        ))}
      </div>

      {students.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          <FaStar className="mx-auto text-4xl mb-2 text-gray-300" />
          <p>No student data available</p>
        </div>
      )}
    </div>
  );
}
