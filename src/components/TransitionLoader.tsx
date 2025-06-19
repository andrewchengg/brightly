"use client";

import { useEffect, useState } from "react";
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
      <div className="bg-white p-6 rounded-xl shadow-lg flex items-center gap-3">
        <FaSpinner className="animate-spin text-blue-600 text-xl" />
        <span className="text-gray-700 font-medium">{message}</span>
      </div>
    </div>
  );
}

// Simplified hook for managing route transition loading
export function useTransitionLoader() {
  const [isTransitioning, setIsTransitioning] = useState(false);

  const startTransition = () => {
    setIsTransitioning(true);
  };

  const endTransition = () => {
    setIsTransitioning(false);
  };

  // Auto-end transition after 3 seconds as a safety measure
  useEffect(() => {
    if (isTransitioning) {
      const timeout = setTimeout(() => {
        endTransition();
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [isTransitioning]);

  return {
    isTransitioning,
    startTransition,
    endTransition,
  };
}
