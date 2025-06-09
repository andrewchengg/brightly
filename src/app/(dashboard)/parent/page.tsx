"use client";
import ModularParentDashboard from "@/components/ParentDashboard/ModularParentDashboard";

const ParentPage = () => {
  return (
    <div className="flex-1 p-6 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      {/* Full Width Dashboard */}
      <div className="w-full max-w-7xl mx-auto">
        <ModularParentDashboard />
      </div>
    </div>
  );
};

export default ParentPage;
