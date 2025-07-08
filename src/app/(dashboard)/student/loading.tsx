"use client";

import { FaSpinner } from "react-icons/fa";

export default function StudentDashboardLoading() {
  return (
    <div className="flex flex-col gap-6 p-6 min-h-screen">
      {/* Welcome header skeleton */}
      <div className="bg-purple-800 text-white p-6 md:p-8 rounded-2xl shadow-xl w-full">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 md:w-16 md:h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
            <FaSpinner className="animate-spin text-2xl md:text-3xl opacity-50" />
          </div>
          <div className="flex-1">
            <div className="h-6 md:h-8 bg-white/20 rounded-lg mb-2 w-3/4"></div>
            <div className="h-4 bg-white/10 rounded-lg w-1/2"></div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 md:gap-4 mt-5">
          <div className="h-6 bg-white/20 rounded-xl w-32"></div>
          <div className="h-8 bg-white/20 rounded-xl w-20"></div>
          <div className="h-8 bg-white/20 rounded-xl w-24"></div>
        </div>
      </div>

      {/* Loading message */}
      <div className="flex items-center justify-center">
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
            <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
            <div className="h-64 bg-gray-100 rounded"></div>
          </div>
        </div>

        {/* Right side - Tasks skeleton */}
        <div className="w-full lg:w-80 space-y-6">
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
            <div className="space-y-3">
              {Array(2)
                .fill(0)
                .map((_, i) => (
                  <div key={i} className="h-16 bg-gray-100 rounded"></div>
                ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
            <div className="h-20 bg-gray-100 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
