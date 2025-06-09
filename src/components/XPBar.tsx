"use client";

import { FaTrophy } from "react-icons/fa";
import {
  calculateLevel,
  calculateLevelXP,
  calculateNextLevelXP,
  calculateProgressToNextLevel,
  calculateXPToNextLevel,
} from "@/lib/xp-utils";

interface XPBarProps {
  currentXP: number;
  showTooltip?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "light" | "dark";
  className?: string;
}

const XPBar = ({
  currentXP,
  showTooltip = false,
  size = "md",
  variant = "light",
  className = "",
}: XPBarProps) => {
  const currentLevel = calculateLevel(currentXP);
  const currentLevelXP = calculateLevelXP(currentLevel);
  const nextLevelXP = calculateNextLevelXP(currentLevel);
  const progressToNextLevel = calculateProgressToNextLevel(currentXP);
  const xpToNextLevel = calculateXPToNextLevel(currentXP);

  // Size configurations
  const sizeConfig = {
    sm: {
      levelCircle: "w-6 h-6 text-xs",
      levelText: "text-xs",
      progressBar: "h-1",
      progressContainer: "w-20",
      levelNumbers: "text-[10px]",
    },
    md: {
      levelCircle: "w-8 h-8 md:w-10 md:h-10 text-sm md:text-base",
      levelText: "text-sm md:text-base",
      progressBar: "h-1.5",
      progressContainer: "w-28 md:w-36",
      levelNumbers: "text-xs",
    },
    lg: {
      levelCircle: "w-12 h-12 text-lg",
      levelText: "text-base",
      progressBar: "h-2",
      progressContainer: "w-40",
      levelNumbers: "text-sm",
    },
  };

  // Variant configurations
  const variantConfig = {
    light: {
      container: "bg-white/20 backdrop-blur-sm",
      levelCircle: "bg-yellow-500 text-white shadow-inner",
      levelText: "text-white font-semibold",
      progressBarBg: "bg-white/30",
      progressBarFill: "bg-yellow-400",
      progressNumbers: "text-white/70",
      tooltipBg: "bg-white text-gray-700",
      tooltipTitle: "text-indigo-700",
      tooltipIcon: "text-yellow-500",
    },
    dark: {
      container: "bg-gray-800/90 backdrop-blur-sm",
      levelCircle: "bg-yellow-500 text-white shadow-inner",
      levelText: "text-white font-semibold",
      progressBarBg: "bg-gray-700",
      progressBarFill: "bg-yellow-400",
      progressNumbers: "text-gray-300",
      tooltipBg: "bg-white text-gray-700",
      tooltipTitle: "text-indigo-700",
      tooltipIcon: "text-yellow-500",
    },
  };

  const config = {
    size: sizeConfig[size],
    variant: variantConfig[variant],
  };

  return (
    <div className={`relative group ${className}`}>
      <div
        className={`flex items-center gap-2 ${config.variant.container} px-3 py-1.5 md:px-4 md:py-2 rounded-xl`}
      >
        {/* Level Circle */}
        <div
          className={`${config.size.levelCircle} ${config.variant.levelCircle} rounded-full flex items-center justify-center`}
        >
          <span className="font-bold">{currentLevel}</span>
        </div>

        {/* Progress Section */}
        <div>
          <span
            className={`${config.variant.levelText} ${config.size.levelText}`}
          >
            Level {currentLevel}
          </span>
          <div className={`${config.size.progressContainer} mt-1`}>
            {/* Progress Bar */}
            <div
              className={`w-full ${config.variant.progressBarBg} rounded-full ${config.size.progressBar}`}
            >
              <div
                className={`${config.variant.progressBarFill} ${config.size.progressBar} rounded-full transition-all duration-300 ease-out`}
                style={{ width: `${progressToNextLevel}%` }}
              />
            </div>
            {/* XP Numbers */}
            <div
              className={`flex justify-between ${config.size.levelNumbers} ${config.variant.progressNumbers} mt-0.5`}
            >
              <span>{currentLevelXP}</span>
              <span>{nextLevelXP}</span>
            </div>
          </div>
        </div>

        {/* Tooltip */}
        {showTooltip && (
          <div
            className={`absolute hidden group-hover:block ${config.variant.tooltipBg} p-3 shadow-xl rounded-lg w-60 md:w-72 z-10 top-full left-0 mt-2`}
          >
            <p
              className={`font-semibold mb-1.5 ${config.variant.tooltipTitle} text-sm`}
            >
              Your Learning Progress
            </p>
            <p className="mb-1.5 text-xs">
              You need {xpToNextLevel} more XP to reach Level {currentLevel + 1}
            </p>
            <div className="flex items-center gap-1.5 mt-2 text-xs">
              <FaTrophy className={config.variant.tooltipIcon} />
              <span>
                Total XP: <strong>{currentXP}</strong>
              </span>
            </div>
            <div className="mt-2 text-xs">
              <div className="mb-1">
                <span className="font-medium">Current Level Progress:</span>
              </div>
              <div className="flex justify-between">
                <span>
                  XP in this level:{" "}
                  <strong>{currentXP - currentLevelXP}</strong>
                </span>
                <span>
                  Needed: <strong>{nextLevelXP - currentLevelXP}</strong>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default XPBar;
