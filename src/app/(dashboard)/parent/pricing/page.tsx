"use client";

import React from "react";
import { useRouter } from "next/navigation";
import SubjectPricingDashboard from "@/components/Pricing/SubjectPricingDashboard";
import { Button } from "@/components/ui/button";
import { FaArrowLeft } from "react-icons/fa";

export default function PricingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Navigation */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="flex items-center space-x-2"
            >
              <FaArrowLeft />
              <span>Back to Dashboard</span>
            </Button>
          </div>

          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">
              Subject Subscriptions
            </h1>
            <p className="text-sm text-gray-600">
              Manage your child's learning subscriptions
            </p>
          </div>

          <div className="w-32"> {/* Spacer for centering */}</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <SubjectPricingDashboard />
      </div>
    </div>
  );
}
