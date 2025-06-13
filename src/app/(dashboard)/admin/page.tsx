"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FaUsers,
  FaUserGraduate,
  FaUserFriends,
  FaUserShield,
  FaQuestionCircle,
  FaBook,
  FaLayerGroup,
  FaChartLine,
} from "react-icons/fa";
import StatsCard from "@/components/dashboard/StatsCard";
import QuestionStatusChart from "@/components/dashboard/QuestionStatusChart";
import SubjectQuestionsChart from "@/components/dashboard/SubjectQuestionsChart";
import UserGrowthChart from "@/components/dashboard/UserGrowthChart";
import TopStudentsCard from "@/components/dashboard/TopStudentsCard";

interface DashboardStats {
  users: {
    students: number;
    parents: number;
    admins: number;
  };
  content: {
    questions: number;
    subjects: number;
    topics: number;
    questionGroups: number;
  };
  questionStats: {
    ready: number;
    productionNeedsRefactor: number;
    needsReview: number;
    total: number;
  };
  questionsBySubject: Array<{
    name: string;
    count: number;
  }>;
  questionsByDifficulty: Array<{
    difficulty: string;
    count: number;
  }>;
  recentActivity: {
    newStudents: number;
    newQuestions: number;
    practiceSessions: number;
  };
  practiceSessionStats: Array<{
    status: string;
    count: number;
  }>;
  studentRegistrationTrend: Array<{
    month: string;
    count: number;
  }>;
  topStudents: Array<{
    id: string;
    name: string;
    xpPoints: number;
    level: number;
  }>;
}

export default function AdminPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/admin/dashboard-stats");
        if (!response.ok) {
          throw new Error("Failed to fetch dashboard statistics");
        }
        const data = await response.json();
        setStats(data);
      } catch (err: any) {
        setError(err.message);
        console.error("Error fetching dashboard stats:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard statistics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[400px]">
        <div className="text-center text-red-600">
          <p className="text-lg font-semibold mb-2">Error Loading Dashboard</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[400px]">
        <p className="text-gray-600">No data available</p>
      </div>
    );
  }

  const completionRate = Math.round(
    (stats.questionStats.ready / stats.questionStats.total) * 100
  );

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Admin Dashboard
          </h1>
          <p className="text-gray-600">
            Overview of your platform's performance and statistics
          </p>
        </div>

        {/* User Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link href="/admin/students" className="block">
            <StatsCard
              title="Total Students"
              value={stats.users.students}
              icon={<FaUserGraduate className="text-xl" />}
              color="blue"
              change={{ value: 12, isPositive: true, period: "last month" }}
            />
          </Link>
          <Link href="/admin/parents" className="block">
            <StatsCard
              title="Total Parents"
              value={stats.users.parents}
              icon={<FaUserFriends className="text-xl" />}
              color="green"
              change={{ value: 8, isPositive: true, period: "last month" }}
            />
          </Link>
          <StatsCard
            title="Total Admins"
            value={stats.users.admins}
            icon={<FaUserShield className="text-xl" />}
            color="orange"
          />
        </div>

        {/* Content Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Total Questions"
            value={stats.content.questions}
            icon={<FaQuestionCircle className="text-xl" />}
            color="blue"
            change={{
              value: stats.recentActivity.newQuestions,
              isPositive: true,
              period: "this month",
            }}
          />
          <StatsCard
            title="Subjects"
            value={stats.content.subjects}
            icon={<FaBook className="text-xl" />}
            color="green"
          />
          <StatsCard
            title="Topics"
            value={stats.content.topics}
            icon={<FaLayerGroup className="text-xl" />}
            color="purple"
          />
          <StatsCard
            title="Completion Rate"
            value={`${completionRate}%`}
            icon={<FaChartLine className="text-xl" />}
            color="orange"
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Question Status Chart */}
          <QuestionStatusChart data={stats.questionStats} />

          {/* Top Students */}
          <TopStudentsCard students={stats.topStudents} />
        </div>

        {/* Larger Charts */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
          {/* Questions by Subject */}
          <SubjectQuestionsChart data={stats.questionsBySubject} />

          {/* Student Growth Trend */}
          <UserGrowthChart data={stats.studentRegistrationTrend} />
        </div>

        {/* Recent Activity Summary */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Recent Activity (Last 30 Days)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {stats.recentActivity.newStudents}
              </div>
              <div className="text-sm text-blue-700 font-medium">
                New Students
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Registered this month
              </div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {stats.recentActivity.newQuestions}
              </div>
              <div className="text-sm text-green-700 font-medium">
                New Questions
              </div>
              <div className="text-xs text-gray-500 mt-1">Added this month</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {stats.recentActivity.practiceSessions}
              </div>
              <div className="text-sm text-purple-700 font-medium">
                Practice Sessions
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Started this month
              </div>
            </div>
          </div>
        </div>

        {/* Question Difficulty Breakdown */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Questions by Difficulty
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {stats.questionsByDifficulty.map((item) => (
              <div
                key={item.difficulty}
                className="text-center p-4 rounded-lg border border-gray-200"
              >
                <div
                  className={`text-2xl font-bold mb-2 ${
                    item.difficulty === "EASY"
                      ? "text-green-600"
                      : item.difficulty === "MEDIUM"
                      ? "text-yellow-600"
                      : "text-red-600"
                  }`}
                >
                  {item.count}
                </div>
                <div className="text-sm font-medium text-gray-700">
                  {item.difficulty}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {Math.round((item.count / stats.content.questions) * 100)}% of
                  total
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
