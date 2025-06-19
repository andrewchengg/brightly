"use client";

import {
  FaSpinner,
  FaUser,
  FaFire,
  FaMedal,
  FaTasks,
  FaPlayCircle,
} from "react-icons/fa";

export default function StudentDashboardLoading() {
  return (
    <div className="flex flex-col gap-6 p-6 min-h-screen animate-pulse">
      {/* Welcome header skeleton */}
      <div className="bg-gradient-to-br from-blue-500 via-purple-600 to-indigo-700 text-white p-6 md:p-8 rounded-2xl shadow-xl w-full">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 md:w-16 md:h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
            <FaUser className="text-2xl md:text-3xl opacity-50" />
          </div>
          <div className="flex-1">
            <div className="h-6 md:h-8 bg-white/20 rounded-lg mb-2 w-3/4"></div>
            <div className="h-4 bg-white/10 rounded-lg w-1/2"></div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 md:gap-4 mt-5">
          <div className="h-6 bg-white/20 rounded-xl w-32"></div>
          <div className="bg-white/20 backdrop-blur-sm px-3 py-1.5 md:px-4 md:py-2 rounded-xl flex items-center gap-2">
            <FaMedal className="text-yellow-300 text-lg md:text-xl opacity-50" />
            <div className="h-4 bg-white/20 rounded w-12"></div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm px-3 py-1.5 md:px-4 md:py-2 rounded-xl flex items-center gap-2">
            <FaFire className="text-orange-400 text-lg md:text-xl opacity-50" />
            <div className="h-4 bg-white/20 rounded w-16"></div>
          </div>
        </div>
      </div>

      {/* Loading message */}
      <div className="flex items-center justify-center mb-4">
        <div className="bg-white rounded-xl shadow-lg px-6 py-4 flex items-center gap-3">
          <FaSpinner className="animate-spin text-blue-600 text-xl" />
          <span className="text-gray-700 font-medium">
            Loading your dashboard...
          </span>
        </div>
      </div>

      {/* Main content skeleton */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left side - Calendar skeleton */}
        <div className="flex-1">
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <FaFire className="text-orange-500 opacity-50" />
              <div className="h-6 bg-gray-200 rounded w-48"></div>
            </div>
            <div className="space-y-4">
              <div className="h-8 bg-gray-100 rounded w-full"></div>
              <div className="grid grid-cols-7 gap-2">
                {Array(35)
                  .fill(0)
                  .map((_, i) => (
                    <div key={i} className="h-8 bg-gray-100 rounded"></div>
                  ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Quests and Tasks skeleton */}
        <div className="w-full lg:w-80 space-y-6">
          {/* Weekly Quests skeleton */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <FaTasks className="text-purple-500 opacity-50" />
              <div className="h-6 bg-gray-200 rounded w-32"></div>
            </div>
            <div className="space-y-3">
              {Array(3)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-lg">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
            </div>
          </div>

          {/* Assigned Tasks skeleton */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FaPlayCircle className="text-blue-500 opacity-50" />
                <div className="h-6 bg-gray-200 rounded w-32"></div>
              </div>
              <div className="h-6 bg-gray-100 rounded w-16"></div>
            </div>

            <div className="space-y-3">
              {Array(2)
                .fill(0)
                .map((_, i) => (
                  <div
                    key={i}
                    className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-6 bg-blue-100 rounded w-20"></div>
                      <div className="h-6 bg-green-100 rounded w-16"></div>
                    </div>
                    <div className="h-8 bg-gray-200 rounded w-full"></div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
