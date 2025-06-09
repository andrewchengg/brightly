"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "react-toastify";
import {
  FaSpinner,
  FaGraduationCap,
  FaChartLine,
  FaExclamationTriangle,
  FaUsers,
  FaCalendarAlt,
} from "react-icons/fa";

// Import modular components
import OverviewCards from "./OverviewCards";
import ChildrenSummaryCards from "./ChildrenSummaryCards";
import RecentResultsPreview from "./RecentResultsPreview";
import MistakesReviewPreview from "./MistakesReviewPreview";
import PerformanceCharts from "./PerformanceCharts";
import CalendarPreview from "./CalendarPreview";
import FullCalendarWithEvents from "./FullCalendarWithEvents";

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
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activeTab, setActiveTab] = useState<
    "overview" | "children" | "analytics"
  >("overview");

  const supabase = createClient();

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          toast.error("You must be logged in to view this page.");
          return;
        }

        // Fetch statistics
        const statsResponse = await fetch("/api/parent/statistics");
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats(statsData);
        } else {
          throw new Error("Failed to fetch statistics");
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        toast.error("Failed to load dashboard data. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const tabs = [
    {
      id: "overview" as const,
      label: "Overview",
      icon: FaGraduationCap,
      description: "Quick overview of all children's progress",
    },
    {
      id: "children" as const,
      label: "Children",
      icon: FaUsers,
      description: "Individual children performance cards",
    },
    {
      id: "analytics" as const,
      label: "Analytics",
      icon: FaChartLine,
      description: "Detailed charts and performance analytics",
    },
  ];

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[60vh]">
        <div className="w-16 h-16 border-4 border-t-indigo-600 border-indigo-200 rounded-full animate-spin mb-4"></div>
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
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Parent Dashboard</h1>
            <p className="text-indigo-100 text-lg">
              Monitor your children's learning progress and achievements
            </p>
            <div className="flex items-center gap-6 mt-4 text-indigo-200">
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
            <FaGraduationCap className="w-24 h-24 text-indigo-300 opacity-50" />
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl border border-gray-200 p-2 shadow-sm">
        <div className="flex space-x-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-lg transition-all duration-300 ${
                  activeTab === tab.id
                    ? "bg-indigo-600 text-white shadow-lg"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${
                    activeTab === tab.id ? "text-white" : "text-gray-400"
                  }`}
                />
                <div className="text-left">
                  <p className="font-semibold">{tab.label}</p>
                  <p
                    className={`text-xs ${
                      activeTab === tab.id ? "text-indigo-100" : "text-gray-500"
                    }`}
                  >
                    {tab.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === "overview" && (
          <div className="space-y-8">
            {/* Overview Cards */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Today's Overview
              </h2>
              <OverviewCards
                overallStats={stats.overallStats}
                childrenStats={stats.children}
                loading={false}
              />
            </section>

            {/* Recent Activity Previews */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <RecentResultsPreview limit={5} />
              <MistakesReviewPreview limit={5} />
            </div>

            {/* Full Calendar */}
            <section>
              <FullCalendarWithEvents />
            </section>
          </div>
        )}

        {activeTab === "children" && (
          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Children Performance
              </h2>
              <ChildrenSummaryCards
                childrenStats={stats.children}
                loading={false}
              />
            </section>
          </div>
        )}

        {activeTab === "analytics" && (
          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Performance Analytics
              </h2>
              <PerformanceCharts
                childrenStats={stats.children}
                loading={false}
              />
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModularParentDashboard;
