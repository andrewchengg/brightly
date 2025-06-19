"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FaSpinner } from "react-icons/fa";

interface TransitionLoaderProps {
  isVisible: boolean;
  message?: string;
}

export default function TransitionLoader({
  isVisible,
  message = "Loading...",
}: TransitionLoaderProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/90 backdrop-blur-sm">
      <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full mx-4 text-center border border-gray-100">
        <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
          <FaSpinner className="animate-spin text-white text-3xl" />
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Getting Ready</h2>
        <p className="text-gray-600 mb-4">{message}</p>
        <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 animate-pulse rounded-full w-3/4 transition-all duration-500"></div>
        </div>
      </div>
    </div>
  );
}

// Custom hook for managing route transition loading
export function useTransitionLoader() {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionMessage, setTransitionMessage] = useState("Loading...");

  const startTransition = (message?: string) => {
    setTransitionMessage(message || "Loading...");
    setIsTransitioning(true);
  };

  const endTransition = () => {
    setIsTransitioning(false);
  };

  // Auto-end transition after 5 seconds as a safety measure
  useEffect(() => {
    if (isTransitioning) {
      const timeout = setTimeout(() => {
        endTransition();
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [isTransitioning]);

  return {
    isTransitioning,
    transitionMessage,
    startTransition,
    endTransition,
  };
}
