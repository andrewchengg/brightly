"use client";

import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import {
  FaSpinner,
  FaGraduationCap,
  FaExclamationTriangle,
  FaUsers,
  FaCalendarAlt,
} from "react-icons/fa";

// Import modular components
import ChildrenOverviewWithCharts from "./ChildrenOverviewWithCharts";
import ChildrenSummaryCards from "./ChildrenSummaryCards";
import DetailedChildrenPerformance from "./DetailedChildrenPerformance";
import RecentResultsPreview from "./RecentResultsPreview";
import MistakesReviewPreview from "./MistakesReviewPreview";
import CalendarPreview from "./CalendarPreview";
import FullCalendarWithEvents from "./FullCalendarWithEvents";
import DateRangeController from "./DateRangeController";

// Import the custom hook
import useDateRange from "@/hooks/useDateRange";

// Types
interface ChildStats {
  id: string;
  name: string;
  level: number;
  xpPoints: number;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
  today: {
    timeSpent: number;
    timeSpentMinutes: number;
    questionsAnswered: number;
    correctAnswers: number;
    accuracy: number;
    xpEarned: number;
    sessionsCompleted: number;
  };
  week: {
    timeSpent: number;
    timeSpentMinutes: number;
    questionsAnswered: number;
    correctAnswers: number;
    accuracy: number;
    sessionsCompleted: number;
  };
  subjectBreakdown: Array<{
    subject: string;
    questions: number;
    correct: number;
    accuracy: number;
    timeSpent: number;
  }>;
  dailyStats?: Array<{
    date: string;
    questions: number;
    correctAnswers: number;
    timeSpent: number;
    accuracy: number;
  }>;
}

interface OverallStats {
  totalChildren: number;
  todayTotalTime: number;
  todayTotalQuestions: number;
  todayTotalCorrect: number;
  weekTotalSessions: number;
}

interface DashboardStats {
  children: ChildStats[];
  overallStats: OverallStats;
}

const ModularParentDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"overview" | "children">(
    "overview"
  );

  // Use the custom date range hook
  const {
    dateRange,
    updateDateRange,
    data: stats,
    loading,
    updating,
    error,
  } = useDateRange();

  // Show toast errors
  useEffect(() => {
    if (error) {
      toast.error("Failed to load dashboard data. Please try again.");
    }
  }, [error]);

  const tabs = [
    {
      id: "overview" as const,
      label: "Overview",
      icon: FaGraduationCap,
      description: "Individual children progress with charts",
    },
    {
      id: "children" as const,
      label: "Children",
      icon: FaUsers,
      description: "Detailed performance analytics per child",
    },
  ];

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[60vh]">
        <div className="w-16 h-16 border-4 border-t-purple-800 border-purple-200 rounded-full animate-spin mb-4"></div>
        <p className="text-lg text-gray-600 font-medium">
          Loading Dashboard...
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Gathering your children's progress data
        </p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[60vh]">
        <FaExclamationTriangle className="w-16 h-16 text-red-400 mb-4" />
        <p className="text-lg text-gray-600 font-medium">
          Failed to Load Dashboard
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Please refresh the page to try again
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-purple-800 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Parent Dashboard</h1>
            <p className="text-purple-100 text-lg">
              Monitor your children's learning progress and achievements
            </p>
            <div className="flex items-center gap-6 mt-4 text-purple-200">
              <div className="flex items-center">
                <FaUsers className="mr-2" />
                <span>{stats.overallStats.totalChildren} Children</span>
              </div>
              <div className="flex items-center">
                <FaCalendarAlt className="mr-2" />
                <span>
                  {new Date().toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
            </div>
          </div>
          <div className="hidden lg:block">
            <FaGraduationCap className="w-24 h-24 text-purple-300 opacity-50" />
          </div>
        </div>
      </div>

      {/* Date Range Controller */}
      <DateRangeController
        currentRange={dateRange}
        onRangeChange={updateDateRange}
        updating={updating}
      />

      {/* Updating Indicator */}
      {updating && (
        <div className="bg-purple-100 border border-purple-200 rounded-lg px-4 py-2 flex items-center gap-3">
          <FaSpinner className="w-4 h-4 text-purple-800 animate-spin" />
          <span className="text-purple-800 text-sm font-medium">
            Updating charts with new data...
          </span>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl border border-gray-200 p-2 shadow-sm">
        <div className="flex space-x-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-lg transition-all duration-300 font-bold text-gray-900 text-lg ${
                  activeTab === tab.id
                    ? "bg-white border-2 border-purple-500 shadow-md z-10"
                    : "hover:bg-gray-50 border border-transparent"
                }`}
              >
                <Icon className="w-5 h-5 text-gray-900" />
                <div className="text-left">
                  <p className="font-bold text-gray-900 text-lg">{tab.label}</p>
                  <p className="text-xs font-bold text-gray-900">
                    {tab.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div
        className={`min-h-[400px] transition-opacity duration-300 ${
          updating ? "opacity-70" : "opacity-100"
        }`}
      >
        {activeTab === "overview" && (
          <div className="space-y-8">
            {/* Children Overview with Charts */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Children's Progress Overview
              </h2>
              <ChildrenOverviewWithCharts
                childrenStats={stats.children}
                loading={false}
                dateRange={dateRange}
              />
            </section>

            {/* Recent Activity Previews */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <RecentResultsPreview limit={5} />
              <MistakesReviewPreview limit={5} />
            </div>
          </div>
        )}

        {activeTab === "children" && (
          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Detailed Children Performance
              </h2>
              <DetailedChildrenPerformance
                childrenStats={stats.children}
                loading={false}
                dateRange={dateRange}
              />
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModularParentDashboard;
