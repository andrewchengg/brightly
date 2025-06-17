"use client";

import { useEffect, useState } from "react";
import {
  FaTrophy,
  FaBullseye,
  FaFire,
  FaCalendarCheck,
  FaCheckCircle,
  FaLock,
  FaSpinner,
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
import { CuteLoader } from "./ui/CuteLoader";

interface Quest {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  icon: string;
  color: string;
  category: string;
  isCompleted: boolean;
}

interface QuestResponse {
  quests: Quest[];
  locked?: boolean;
  level?: number;
  requiredLevel?: number;
  message?: string;
}

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
  const [questsData, setQuestsData] = useState<QuestResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuests = async () => {
      try {
        const response = await fetch("/api/weekly-quests");
        const data = await response.json();
        setQuestsData(data);
      } catch (error) {
        console.error("Error fetching weekly quests:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuests();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <CuteLoader variant="pulse" text="Loading weekly quests..." />
      </div>
    );
  }

  if (questsData?.locked) {
    return (
      <div className="text-center py-6">
        <FaLock className="text-gray-400 text-2xl mx-auto mb-2" />
        <p className="text-sm text-gray-600 mb-1">Weekly Quests Locked</p>
        <p className="text-xs text-gray-500">
          Reach Level {questsData.requiredLevel} to unlock
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Current Level: {questsData.level}
        </p>
      </div>
    );
  }

  if (!questsData?.quests || questsData.quests.length === 0) {
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

  // Show first 2 quests in preview (changed from 3 to 2)
  const previewQuests = questsData.quests.slice(0, 2);
  const completedCount = questsData.quests.filter((q) => q.isCompleted).length;
  const totalCount = questsData.quests.length;

  return (
    <div className="space-y-3">
      {/* Progress Summary */}
      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-100">
        <div>
          <p className="text-sm font-semibold text-gray-700">
            Progress This Week
          </p>
          <p className="text-xs text-gray-600">
            {completedCount} of {totalCount} completed
          </p>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-indigo-600">
            {Math.round((completedCount / totalCount) * 100)}%
          </div>
          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
              style={{ width: `${(completedCount / totalCount) * 100}%` }}
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
            (quest.progress / quest.target) * 100,
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
                          : "bg-gradient-to-r from-indigo-400 to-purple-400"
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
      {questsData.quests.length > 2 && (
        <div className="text-center pt-2 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            +{questsData.quests.length - 2} more quest
            {questsData.quests.length - 2 > 1 ? "s" : ""}
          </p>
        </div>
      )}
    </div>
  );
}
