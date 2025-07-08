"use client";

import React, { useState, useEffect } from "react";
import { FaBook, FaMagic, FaPuzzlePiece, FaLightbulb } from "react-icons/fa";

interface InteractiveLoadingAnimationProps {
  title?: string;
  subtitle?: string;
  className?: string;
  theme?: "practice" | "study" | "quiz";
}

export const InteractiveLoadingAnimation: React.FC<
  InteractiveLoadingAnimationProps
> = ({
  title = "Preparing Your Practice Session",
  subtitle = "Loading questions and personalizing your experience...",
  className = "",
  theme = "practice",
}) => {
  const [progress, setProgress] = useState(0);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [bookOpen, setBookOpen] = useState(false);

  const phases = [
    { text: "Gathering questions...", icon: FaPuzzlePiece, duration: 1000 },
    { text: "Analyzing your progress...", icon: FaLightbulb, duration: 1200 },
    { text: "Personalizing content...", icon: FaMagic, duration: 800 },
    { text: "Almost ready...", icon: FaBook, duration: 600 },
  ];

  useEffect(() => {
    // Animate progress and phases
    const totalDuration = phases.reduce(
      (sum, phase) => sum + phase.duration,
      0
    );
    let elapsed = 0;

    const interval = setInterval(() => {
      elapsed += 50;
      const newProgress = Math.min((elapsed / totalDuration) * 100, 95);
      setProgress(newProgress);

      // Determine current phase
      let cumulativeDuration = 0;
      for (let i = 0; i < phases.length; i++) {
        cumulativeDuration += phases[i].duration;
        if (elapsed <= cumulativeDuration) {
          setCurrentPhase(i);
          break;
        }
      }

      if (elapsed >= totalDuration) {
        setProgress(100);
        clearInterval(interval);
      }
    }, 50);

    // Open book animation after a delay
    const bookTimer = setTimeout(() => {
      setBookOpen(true);
    }, 300);

    return () => {
      clearInterval(interval);
      clearTimeout(bookTimer);
    };
  }, []);

  const CurrentIcon = phases[currentPhase]?.icon || FaBook;

  return (
    <div
      className={`flex flex-col items-center justify-center min-h-screen bg-gray-50 ${className}`}
    >
      <div className="relative bg-white/80 backdrop-blur-lg p-8 rounded-3xl shadow-2xl text-center w-full max-w-lg mx-4 border border-white/20">
        {/* Animated Book */}
        <div className="relative w-32 h-32 mx-auto mb-8">
          {/* Book Base */}
          <div className="absolute inset-0 transform perspective-1000">
            {/* Left Cover */}
            <div
              className={`absolute left-0 w-1/2 h-full bg-purple-800 rounded-l-lg border-2 border-purple-900 transition-transform duration-1000 ease-out transform-origin-right ${
                bookOpen ? "-rotate-y-30" : ""
              }`}
              style={{
                transform: bookOpen ? "rotateY(-30deg)" : "rotateY(0deg)",
                transformStyle: "preserve-3d",
              }}
            >
              <div className="absolute inset-2 bg-purple-200 rounded opacity-30"></div>
              <FaBook className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white text-xl" />
            </div>

            {/* Right Cover */}
            <div
              className={`absolute right-0 w-1/2 h-full bg-purple-800 rounded-r-lg border-2 border-purple-900 transition-transform duration-1000 ease-out transform-origin-left ${
                bookOpen ? "rotate-y-30" : ""
              }`}
              style={{
                transform: bookOpen ? "rotateY(30deg)" : "rotateY(0deg)",
                transformStyle: "preserve-3d",
              }}
            >
              <div className="absolute inset-2 bg-purple-200 rounded opacity-30"></div>
            </div>

            {/* Pages */}
            {bookOpen && (
              <div className="absolute inset-2 bg-white rounded-sm border border-gray-200 flex items-center justify-center animate-fadeIn">
                <div className="text-center">
                  <CurrentIcon className="text-purple-800 text-2xl mb-2 animate-bounce" />
                  <div className="w-12 h-0.5 bg-purple-300 mx-auto mb-1"></div>
                  <div className="w-8 h-0.5 bg-purple-200 mx-auto mb-1"></div>
                  <div className="w-10 h-0.5 bg-purple-200 mx-auto"></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-800 mb-3 animate-slideUp">
          {title}
        </h2>

        {/* Current Phase */}
        <div
          className="flex items-center justify-center mb-4 animate-slideUp"
          style={{ animationDelay: "0.2s" }}
        >
          <CurrentIcon className="text-purple-800 text-lg mr-2 animate-pulse" />
          <p className="text-gray-600 font-medium">
            {phases[currentPhase]?.text || subtitle}
          </p>
        </div>

        {/* Progress Bar */}
        <div
          className="w-full bg-gray-200 h-3 rounded-full overflow-hidden mb-4 animate-slideUp"
          style={{ animationDelay: "0.4s" }}
        >
          <div
            className="bg-purple-800 h-full rounded-full transition-all duration-300 ease-out relative overflow-hidden"
            style={{ width: `${progress}%` }}
          >
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
          </div>
        </div>

        {/* Progress Percentage */}
        <p
          className="text-sm text-gray-500 mb-4 animate-slideUp"
          style={{ animationDelay: "0.6s" }}
        >
          {Math.round(progress)}% Complete
        </p>

        {/* Feature Cards */}
        <div
          className="grid grid-cols-3 gap-3 mt-6 animate-slideUp"
          style={{ animationDelay: "0.8s" }}
        >
          {[
            {
              icon: FaPuzzlePiece,
              label: "Smart\nQuestions",
              color: "text-blue-500",
            },
            {
              icon: FaLightbulb,
              label: "Adaptive\nLearning",
              color: "text-yellow-500",
            },
            {
              icon: FaMagic,
              label: "Personal\nProgress",
              color: "text-purple-800",
            },
          ].map((feature, index) => (
            <div
              key={index}
              className="bg-white/50 rounded-lg p-3 border border-white/30 hover:bg-white/70 transition-all duration-300 hover:scale-105"
              style={{ animationDelay: `${1 + index * 0.2}s` }}
            >
              <feature.icon
                className={`${feature.color} text-lg mx-auto mb-1`}
              />
              <p className="text-xs text-gray-600 leading-tight whitespace-pre-line">
                {feature.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Styles */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(200%);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }

        .animate-slideUp {
          animation: slideUp 0.6s ease-out forwards;
          opacity: 0;
        }

        .animate-shimmer {
          animation: shimmer 2s ease-in-out infinite;
        }

        .perspective-1000 {
          perspective: 1000px;
        }

        .transform-origin-right {
          transform-origin: right center;
        }

        .transform-origin-left {
          transform-origin: left center;
        }

        .-rotate-y-30 {
          transform: rotateY(-30deg);
        }

        .rotate-y-30 {
          transform: rotateY(30deg);
        }
      `}</style>
    </div>
  );
};

export default InteractiveLoadingAnimation;
