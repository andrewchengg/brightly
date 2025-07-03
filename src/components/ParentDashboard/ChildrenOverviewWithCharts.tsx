"use client";

import React from "react";
import moment from "moment";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  AreaChart,
  Area,
  Legend,
} from "recharts";
import {
  FaUser,
  FaTrophy,
  FaFire,
  FaClock,
  FaChartLine,
  FaQuestionCircle,
  FaBookOpen,
  FaPlay,
} from "react-icons/fa";
import { calculateLevel } from "@/lib/xp-utils";

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
    marksEarned: number;
    possibleMarks: number;
  };
  week: {
    timeSpent: number;
    timeSpentMinutes: number;
    questionsAnswered: number;
    correctAnswers: number;
    accuracy: number;
    sessionsCompleted: number;
    marksEarned: number;
    possibleMarks: number;
  };
  subjectBreakdown: Array<{
    subject: string;
    questions: number;
    correct: number;
    accuracy: number;
    timeSpent: number;
    marksEarned: number;
    possibleMarks: number;
  }>;
  dailyStats?: Array<{
    date: string;
    questions: number;
    correctAnswers: number;
    timeSpent: number;
    accuracy: number;
    marksEarned: number;
    possibleMarks: number;
  }>;
  dailySubjectStats?: Array<{
    date: string;
    subjects: Record<string, { 
      accuracy: number; 
      questions: number;
      marksEarned: number;
      possibleMarks: number;
    }>;
  }>;
}

interface ChildrenOverviewWithChartsProps {
  childrenStats: ChildStats[];
  loading?: boolean;
  dateRange?: {
    startDate: Date;
    endDate: Date;
    period: "7d" | "30d" | "3m";
  };
}

const ChildrenOverviewWithCharts: React.FC<ChildrenOverviewWithChartsProps> = ({
  childrenStats,
  loading = false,
  dateRange,
}) => {
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getActivityStatus = (lastActivityDate: string | null) => {
    if (!lastActivityDate) return { status: "Never", color: "text-gray-500" };

    const now = new Date();
    const lastActivity = new Date(lastActivityDate);
    const diffHours = Math.floor(
      (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60)
    );

    // Determine color based on how recent the activity was
    let color = "text-gray-500";
    if (diffHours < 24) color = "text-green-600";
    else if (diffHours < 48) color = "text-yellow-600";
    else if (diffHours < 168) color = "text-orange-600";
    else color = "text-red-600";

    // Always return precise timestamp (e.g., Jul 1, 2025 2:18 PM)
    const formatted = moment.utc(lastActivity).add(8, 'hours').format("MMM D, YYYY h:mm A");
    return { status: formatted, color };
  };

  const getPerformanceColor = (accuracy: number) => {
    if (accuracy >= 90) return "text-green-600";
    if (accuracy >= 80) return "text-blue-600";
    if (accuracy >= 70) return "text-yellow-600";
    if (accuracy >= 60) return "text-orange-600";
    return "text-red-600";
  };

  const getStreakEmoji = (streak: number) => {
    if (streak >= 7) return "🔥🔥🔥";
    if (streak >= 3) return "🔥🔥";
    if (streak >= 1) return "🔥";
    return "💤";
  };

  const prepareWeeklyData = (child: ChildStats) => {
    console.log('ChildrenOverviewWithCharts - Raw dailyStats:', child.dailyStats);
    return (
      child.dailyStats?.map((day) => {
        // Convert UTC date from API to local time for display
        const utcDate = new Date(day.date);
        const localDate = new Date(utcDate.getTime() + utcDate.getTimezoneOffset() * 60000);
        
        console.log('ChildrenOverviewWithCharts - Date conversion:', {
          utc: utcDate.toISOString(),
          local: localDate.toLocaleString(),
          offset: utcDate.getTimezoneOffset() / 60
        });

        return {
          day: localDate.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric"
          }),
          questions: day.questions,
          timeMinutes: Math.round(day.timeSpent / 60),
          sessions: day.questions > 0 ? 1 : 0,
        };
      }) || []
    );
  };

  const prepareSubjectData = (child: ChildStats) => {
    const colors = ["#6366f1", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444"];
    return child.subjectBreakdown.map((subject, index) => ({
      name: subject.subject,
      questions: subject.questions,
      accuracy: subject.accuracy,
      fill: colors[index % colors.length],
    }));
  };

  // Build accuracy trend from backend stats per subject
  const buildAccuracyTrendData = (child: ChildStats) => {
    if (!child.dailySubjectStats) return [];

    console.log('ChildrenOverviewWithCharts - Raw dailySubjectStats:', child.dailySubjectStats);
    console.log('ChildrenOverviewWithCharts - Current dateRange:', dateRange);

    const recentStats = child.dailySubjectStats;
    const { period } = dateRange || { period: "7d" } as { period: "7d" | "30d" | "3m" };

    const chartData = recentStats.map((d) => {
      // Convert UTC date from API to local time for display
      const utcDate = new Date(d.date);
      const localDate = new Date(utcDate.getTime() + utcDate.getTimezoneOffset() * 60000);
      
      console.log('ChildrenOverviewWithCharts - Subject stats date conversion:', {
        utc: utcDate.toISOString(),
        local: localDate.toLocaleString(),
        offset: utcDate.getTimezoneOffset() / 60
      });

      const dayLabel = localDate.toLocaleDateString("en-US", { 
        month: "short", 
        day: "numeric" 
      });

      // Get subject data or default to 0
      const chineseAccuracy = d.subjects["Chinese"]?.accuracy ?? 0;
      const mathAccuracy = d.subjects["Mathematics"]?.accuracy ?? 0;

      return {
        day: dayLabel,
        Chinese: chineseAccuracy,
        Math: mathAccuracy,
        date: d.date,
      };
    });

    console.log('ChildrenOverviewWithCharts - Final chart data:', chartData);
    return chartData;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {Array.from({ length: 2 }).map((_, index) => (
          <Card key={index} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded w-32"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="h-40 bg-gray-200 rounded"></div>
                <div className="grid grid-cols-3 gap-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-16 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (childrenStats.length === 0) {
    return (
      <Card className="text-center py-16">
        <CardContent>
          <FaUser className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            No Children Found
          </h3>
          <p className="text-gray-500 mb-6">
            Add children to your account to see their progress here.
          </p>
          <Link href="/sign-up/parent-child-setup">
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              Add Your Child
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {childrenStats.map((child) => {
        const activityStatus = getActivityStatus(child.lastActivityDate);
        const accuracyColor = getPerformanceColor(child.today.accuracy);
        const weeklyData = prepareWeeklyData(child);
        const subjectData = prepareSubjectData(child);

        return (
          <Card
            key={child.id}
            className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-white"
          >
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                      <FaUser className="text-indigo-600" />
                    </div>
                    {child.name}
                  </CardTitle>
                  <p className="text-sm text-gray-600 ml-13">
                    Level {calculateLevel(child.xpPoints)} • {child.xpPoints.toLocaleString()} XP
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center justify-end gap-2 mb-1">
                    <span className="text-xl">
                      {getStreakEmoji(child.currentStreak)}
                    </span>
                    <span className="text-sm font-bold text-orange-600">
                      {child.currentStreak} day streak
                    </span>
                  </div>
                  <p className={`text-xs font-medium ${activityStatus.color}`}>
                    Last active: {activityStatus.status}
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Key Stats Row */}
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <FaClock className="w-4 h-4 text-blue-600 mx-auto mb-1" />
                  <p className="text-xs text-gray-600">Today</p>
                  <p className="text-sm font-bold text-blue-700">
                    {formatTime(child.today.timeSpent)}
                  </p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <FaQuestionCircle className="w-4 h-4 text-green-600 mx-auto mb-1" />
                  <p className="text-xs text-gray-600">Questions</p>
                  <p className="text-sm font-bold text-green-700">
                    {child.today.questionsAnswered}
                  </p>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <FaChartLine className="w-4 h-4 text-purple-600 mx-auto mb-1" />
                  <p className="text-xs text-gray-600">Accuracy</p>
                  <p className={`text-sm font-bold ${accuracyColor}`}>
                    {child.today.accuracy}%
                  </p>
                </div>
                <div className="text-center p-3 bg-amber-50 rounded-lg">
                  <FaTrophy className="w-4 h-4 text-amber-600 mx-auto mb-1" />
                  <p className="text-xs text-gray-600">XP Today</p>
                  <p className="text-sm font-bold text-amber-700">
                    {child.today.xpEarned}
                  </p>
                </div>
              </div>

              {/* Practice Activity */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <FaPlay className="text-indigo-600" />
                  Practice Activity
                  {dateRange && (
                    <span className="text-xs text-gray-500 ml-2">
                      ({dateRange.period === "7d" ? "7 days" : 
                        dateRange.period === "30d" ? "Month" : "Quarter"})
                    </span>
                  )}
                </h4>
                <div className="h-24">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={weeklyData}>
                      <XAxis
                        dataKey="day"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis hide />
                      <Tooltip
                        contentStyle={{
                          background: "white",
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                        formatter={(value: any, name: any) => [
                          name === "questions" ? `${value} questions` : `${value} min`,
                          name === "questions" ? "Questions" : "Time"
                        ]}
                      />
                      <Area
                        type="monotone"
                        dataKey="questions"
                        stroke="#6366f1"
                        fill="#6366f1"
                        fillOpacity={0.3}
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Subject Breakdown */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <FaBookOpen className="text-indigo-600" />
                  Subject Performance
                </h4>
                <div className="flex items-center gap-4">
                  <div className="h-20 w-20">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={subjectData}
                          dataKey="questions"
                          cx="50%"
                          cy="50%"
                          innerRadius={15}
                          outerRadius={35}
                        >
                          {subjectData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            background: "white",
                            border: "1px solid #e5e7eb",
                            borderRadius: "8px",
                            fontSize: "12px",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-1">
                    {subjectData.slice(0, 3).map((subject, index) => (
                      <div key={index} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: subject.fill }}
                          ></div>
                          <span className="text-gray-700">{subject.name}</span>
                        </div>
                        <span className="text-gray-600 font-medium">
                          {subject.accuracy}%
                        </span>
                      </div>
                    ))}
                    {subjectData.length > 3 && (
                      <p className="text-xs text-gray-500">
                        +{subjectData.length - 3} more subjects
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Accuracy Trend Line Chart */}
              <div className="space-y-3 pt-4">
                <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <FaChartLine className="text-indigo-600" />
                  Accuracy Trend ({buildAccuracyTrendData(child).length} days) ({(() => {
                    if (!dateRange) return "";
                    const { startDate, endDate, period } = dateRange;
                    switch (period) {
                      case "7d":
                        return `${startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${endDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
                      case "30d":
                        return startDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
                      case "3m":
                        const quarters = ["Q1", "Q2", "Q3", "Q4"];
                        const qIndex = Math.floor(startDate.getMonth() / 3);
                        return `${quarters[qIndex]} ${startDate.getFullYear()}`;
                      default:
                        return "";
                    }
                  })()})
                </h4>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={buildAccuracyTrendData(child)} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <XAxis dataKey="day" axisLine={false} tickLine={false} fontSize={12} />
                      <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} fontSize={12} />
                      <Tooltip
                        formatter={(value: any) => `${value}%`}
                        contentStyle={{
                          background: "white",
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                      <Legend verticalAlign="top" height={24} wrapperStyle={{ fontSize: 12 }} />
                      <Line type="monotone" dataKey="Chinese" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="Math" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Action Buttons removed as requested */}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default ChildrenOverviewWithCharts; 