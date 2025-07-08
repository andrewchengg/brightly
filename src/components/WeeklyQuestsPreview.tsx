"use client";

import React from "react";
import { useCallback } from "react";
import {
  FaTrophy,
  FaBullseye,
  FaFire,
  FaCalendarCheck,
  FaCheckCircle,
  FaLock,
  FaExclamationTriangle,
  FaChartLine,
  FaCrown,
  FaHeart,
  FaSun,
  FaStar,
  FaPlay,
  FaBookOpen,
  FaBolt,
  FaRunning,
  FaCrosshairs,
  FaGem,
  FaFistRaised,
  FaSearch,
  FaShieldAlt,
  FaArrowUp,
  FaQuestionCircle,
  FaClock,
  FaMedal,
  FaLevelUpAlt,
  FaMountain,
  FaMoon,
  FaCalendarWeek,
  FaThumbsUp,
  FaRandom,
} from "react-icons/fa";
import { useQuestData } from "@/contexts/QuestContext";

const iconMap: { [key: string]: React.ComponentType<any> } = {
  FaTrophy,
  FaBullseye,
  FaFire,
  FaCalendarCheck,
  FaCheckCircle,
  FaExclamationTriangle,
  FaChartLine,
  FaCrown,
  FaHeart,
  FaSun,
  FaStar,
  FaPlay,
  FaBookOpen,
  FaBolt,
  FaRunning,
  FaCrosshairs,
  FaGem,
  FaFistRaised,
  FaSearch,
  FaShieldAlt,
  FaArrowUp,
  FaQuestionCircle,
  FaClock,
  FaMedal,
  FaLevelUpAlt,
  FaMountain,
  FaMoon,
  FaCalendarWeek,
  FaThumbsUp,
  FaRandom,
};

const colorMap: { [key: string]: string } = {
  amber: "bg-amber-100 text-amber-800 border-amber-200",
  green: "bg-green-100 text-green-800 border-green-200",
  orange: "bg-orange-100 text-orange-800 border-orange-200",
  red: "bg-red-100 text-red-800 border-red-200",
  teal: "bg-teal-100 text-teal-800 border-teal-200",
  blue: "bg-blue-100 text-blue-800 border-blue-200",
  purple: "bg-purple-100 text-purple-800 border-purple-200",
  pink: "bg-pink-100 text-pink-800 border-pink-200",
  indigo: "bg-indigo-100 text-indigo-800 border-indigo-200",
};

export default function WeeklyQuestsPreview() {
  const { quests, locked, level, requiredLevel, message, loading, error } =
    useQuestData();

  // Fast loading skeleton
  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg animate-pulse">
          <div>
            <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-24"></div>
          </div>
          <div className="text-right">
            <div className="h-6 bg-gray-200 rounded w-12 mb-1"></div>
            <div className="w-16 h-2 bg-gray-200 rounded-full"></div>
          </div>
        </div>
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="p-3 bg-gray-50 rounded-lg animate-pulse">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-28 mb-2"></div>
                  <div className="h-2 bg-gray-200 rounded w-full"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error && quests.length === 0) {
    return (
      <div className="text-center py-6">
        <FaExclamationTriangle className="text-red-400 text-2xl mx-auto mb-2" />
        <p className="text-sm text-red-600 mb-2">{error}</p>
      </div>
    );
  }

  if (locked) {
    return (
      <div className="text-center py-6">
        <FaLock className="text-gray-400 text-2xl mx-auto mb-2" />
        <p className="text-sm text-gray-600 mb-1">Weekly Quests Locked</p>
        <p className="text-xs text-gray-500">
          Reach Level {requiredLevel} to unlock
        </p>
        <p className="text-xs text-gray-400 mt-1">Current Level: {level}</p>
      </div>
    );
  }

  if (quests.length === 0) {
    return (
      <div className="text-center py-6">
        <FaTrophy className="text-gray-400 text-2xl mx-auto mb-2" />
        <p className="text-sm text-gray-600 mb-1">No Quests Available</p>
        <p className="text-xs text-gray-500">
          Check back later for new challenges!
        </p>
      </div>
    );
  }

  // Show first 2 quests in preview
  const previewQuests = quests.slice(0, 2);
  const completedCount = quests.filter((q) => q.isCompleted).length;
  const totalCount = quests.length;

  return (
    <div className="space-y-3">
      {/* Progress Summary */}
      <div className="flex items-center justify-between p-3 bg-purple-100 rounded-lg border border-purple-200">
        <div>
          <p className="text-sm font-semibold text-gray-700">
            Progress This Week
          </p>
          <p className="text-xs text-gray-600">
            {completedCount} of {totalCount} completed
          </p>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-purple-800">
            {totalCount > 0
              ? Math.round((completedCount / totalCount) * 100)
              : 0}
            %
          </div>
          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-800 transition-all duration-300"
              style={{
                width: `${
                  totalCount > 0 ? (completedCount / totalCount) * 100 : 0
                }%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Quest Preview List */}
      <div className="space-y-2">
        {previewQuests.map((quest) => {
          const IconComponent = iconMap[quest.icon] || FaTrophy;
          const colorClass = colorMap[quest.color] || colorMap.amber;
          const progressPercent = Math.min(
            quest.target > 0 ? (quest.progress / quest.target) * 100 : 0,
            100
          );

          return (
            <div
              key={quest.id}
              className={`p-3 rounded-lg border transition-all ${
                quest.isCompleted
                  ? "bg-green-50 border-green-200"
                  : "bg-gray-50 border-gray-200 hover:bg-gray-100"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-1 rounded-lg ${colorClass} flex-shrink-0`}>
                  <IconComponent className="text-sm" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {quest.title}
                    </h4>
                    {quest.isCompleted && (
                      <FaCheckCircle className="text-green-500 text-xs flex-shrink-0" />
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span>
                      {quest.progress} / {quest.target}
                    </span>
                    <span>{Math.round(progressPercent)}%</span>
                  </div>

                  <div className="w-full h-1 bg-gray-200 rounded-full mt-1 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        quest.isCompleted
                          ? "bg-green-500"
                          : "bg-purple-800"
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Show more indicator */}
      {quests.length > 2 && (
        <div className="text-center pt-2 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            +{quests.length - 2} more quest
            {quests.length - 2 > 1 ? "s" : ""}
          </p>
        </div>
      )}
    </div>
  );
}
