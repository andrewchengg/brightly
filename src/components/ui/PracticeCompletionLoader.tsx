"use client";

import React from "react";
import { FaSpinner } from "react-icons/fa";

interface PracticeCompletionLoaderProps {
  studentName?: string;
  sessionType?: string;
  className?: string;
}

export const PracticeCompletionLoader: React.FC<
  PracticeCompletionLoaderProps
> = ({
  studentName = "Student",
  sessionType = "Practice Session",
  className = "",
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center min-h-screen bg-gray-50 ${className}`}
    >
      <div className="text-center">
        <FaSpinner className="animate-spin text-blue-500 text-4xl mb-4 mx-auto" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">
          Processing your practice session...
        </h2>
        <p className="text-gray-500">Please wait while we save your progress</p>
      </div>
    </div>
  );
};

export default PracticeCompletionLoader;
