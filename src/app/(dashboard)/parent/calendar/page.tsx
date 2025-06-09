"use client";

import ParentCalendar from "@/components/ParentCalendar";

const ParentCalendarPage = () => {
  return (
    <div className="flex-1 p-6 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      <div className="w-full max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-teal-600 rounded-2xl p-8 text-white shadow-xl mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">Family Calendar</h1>
              <p className="text-green-100 text-lg">
                Manage your children's schedule and important events
              </p>
            </div>
          </div>
        </div>

        {/* Calendar Component */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <ParentCalendar className="w-full" />
        </div>
      </div>
    </div>
  );
};

export default ParentCalendarPage;
