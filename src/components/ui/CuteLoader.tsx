"use client";

import React from 'react';

interface CuteLoaderProps {
  text?: string;
  theme?: "light" | "dark";
  className?: string;
}

const CuteLoader: React.FC<CuteLoaderProps> = ({ text, theme = "light", className = "" }) => {
  const iconColor = theme === "dark" ? "text-white" : "text-gray-600";
  const textColor = theme === "dark" ? "text-white" : "text-gray-600";
  const sparkleColor1 = theme === "dark" ? "bg-yellow-300" : "bg-yellow-400";
  const sparkleColor2 = theme === "dark" ? "bg-purple-100" : "bg-purple-800";

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className="relative mb-2">
        <div className="animate-spin duration-1000">
          <svg className={`w-6 h-6 ${iconColor}`} fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
          </svg>
        </div>
        <div className={`absolute -top-0.5 -right-0.5 w-1.5 h-1.5 ${sparkleColor1} rounded-full animate-ping`} />
        <div className={`absolute -bottom-0.5 -left-0.5 w-1 h-1 ${sparkleColor2} rounded-full animate-ping`} style={{ animationDelay: "0.5s" }} />
      </div>
      {text && <p className={`text-xs ${textColor} animate-pulse`}>{text}</p>}
    </div>
  );
};

export default CuteLoader;

// Alternative spinning book loader for education theme
export const StudyLoader: React.FC<{
  text?: string;
  className?: string;
  theme?: "light" | "dark";
}> = ({ text = "Loading...", className = "", theme = "light" }) => {
  const iconColor = theme === "dark" ? "text-white" : "text-blue-500";
  const textColor = theme === "dark" ? "text-white" : "text-gray-600";
  const sparkleColor1 = theme === "dark" ? "bg-yellow-300" : "bg-yellow-400";
  const sparkleColor2 = theme === "dark" ? "bg-purple-100" : "bg-purple-800";

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className="relative mb-2">
        <div className="animate-spin duration-1000">
          <svg className={`w-6 h-6 ${iconColor}`} fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
          </svg>
        </div>
        <div className={`absolute -top-0.5 -right-0.5 w-1.5 h-1.5 ${sparkleColor1} rounded-full animate-ping`} />
        <div className={`absolute -bottom-0.5 -left-0.5 w-1 h-1 ${sparkleColor2} rounded-full animate-ping`} style={{ animationDelay: "0.5s" }} />
      </div>
      {text && <p className={`text-xs ${textColor} animate-pulse`}>{text}</p>}
    </div>
  );
};