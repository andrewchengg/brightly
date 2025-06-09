"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import {
  FaChartLine,
  FaChartBar,
  FaChartPie,
  FaArrowUp as FaTrendingUp,
  FaArrowDown as FaTrendingDown,
  FaEquals,
} from "react-icons/fa";

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

interface PerformanceChartsProps {
  childrenStats: ChildStats[];
  loading?: boolean;
}

const PerformanceCharts: React.FC<PerformanceChartsProps> = ({
  childrenStats,
  loading = false,
}) => {
  // Prepare data for charts
  const prepareWeeklyProgressData = () => {
    if (!childrenStats.length || !childrenStats[0]?.dailyStats) return [];

    // Get the first child's daily stats as base, then aggregate all children
    const dailyData = childrenStats[0].dailyStats.map((day) => {
      const dayData = {
        date: new Date(day.date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        totalQuestions: 0,
        totalCorrect: 0,
        totalTimeMinutes: 0,
        avgAccuracy: 0,
      };

      // Aggregate all children's data for this day
      childrenStats.forEach((child) => {
        const childDayStats = child.dailyStats?.find(
          (d) => d.date === day.date
        );
        if (childDayStats) {
          dayData.totalQuestions += childDayStats.questions;
          dayData.totalCorrect += childDayStats.correctAnswers;
          dayData.totalTimeMinutes += Math.round(childDayStats.timeSpent / 60);
        }
      });

      dayData.avgAccuracy =
        dayData.totalQuestions > 0
          ? Math.round((dayData.totalCorrect / dayData.totalQuestions) * 100)
          : 0;

      return dayData;
    });

    return dailyData;
  };

  const prepareChildComparisonData = () => {
    return childrenStats.map((child) => ({
      name: child.name,
      accuracy: child.today.accuracy,
      questions: child.today.questionsAnswered,
      xp: child.today.xpEarned,
      timeMinutes: child.today.timeSpentMinutes,
      streak: child.currentStreak,
    }));
  };

  const prepareSubjectBreakdownData = () => {
    const subjectTotals: {
      [key: string]: { questions: number; correct: number; timeSpent: number };
    } = {};

    childrenStats.forEach((child) => {
      child.subjectBreakdown.forEach((subject) => {
        if (!subjectTotals[subject.subject]) {
          subjectTotals[subject.subject] = {
            questions: 0,
            correct: 0,
            timeSpent: 0,
          };
        }
        subjectTotals[subject.subject].questions += subject.questions;
        subjectTotals[subject.subject].correct += subject.correct;
        subjectTotals[subject.subject].timeSpent += subject.timeSpent;
      });
    });

    return Object.entries(subjectTotals).map(([subject, data]) => ({
      subject,
      accuracy:
        data.questions > 0
          ? Math.round((data.correct / data.questions) * 100)
          : 0,
      questions: data.questions,
      timeMinutes: Math.round(data.timeSpent / 60),
    }));
  };

  const weeklyData = prepareWeeklyProgressData();
  const childComparisonData = prepareChildComparisonData();
  const subjectData = prepareSubjectBreakdownData();

  // Color schemes
  const colors = {
    primary: "#6366f1",
    secondary: "#8b5cf6",
    success: "#10b981",
    warning: "#f59e0b",
    danger: "#ef4444",
    info: "#3b82f6",
  };

  const pieColors = [
    "#6366f1",
    "#8b5cf6",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#3b82f6",
  ];

  const calculateTrend = (data: any[], field: string) => {
    if (data.length < 2) return 0;
    const recent = data
      .slice(-3)
      .reduce((sum, item) => sum + (item[field] || 0), 0);
    const previous = data
      .slice(-6, -3)
      .reduce((sum, item) => sum + (item[field] || 0), 0);
    return recent - previous;
  };

  const accuracyTrend = calculateTrend(weeklyData, "avgAccuracy");
  const questionsTrend = calculateTrend(weeklyData, "totalQuestions");

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded w-48"></div>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Weekly Progress Chart */}
      <Card className="col-span-1 lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <FaChartLine className="mr-2 text-indigo-600" />
              Weekly Progress
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center">
                {accuracyTrend > 0 ? (
                  <FaTrendingUp className="text-green-500 mr-1" />
                ) : accuracyTrend < 0 ? (
                  <FaTrendingDown className="text-red-500 mr-1" />
                ) : (
                  <FaEquals className="text-gray-500 mr-1" />
                )}
                <span
                  className={`font-medium ${
                    accuracyTrend > 0
                      ? "text-green-600"
                      : accuracyTrend < 0
                      ? "text-red-600"
                      : "text-gray-600"
                  }`}
                >
                  Accuracy {accuracyTrend > 0 ? "+" : ""}
                  {Math.abs(accuracyTrend)}%
                </span>
              </div>
              <div className="flex items-center">
                {questionsTrend > 0 ? (
                  <FaTrendingUp className="text-green-500 mr-1" />
                ) : questionsTrend < 0 ? (
                  <FaTrendingDown className="text-red-500 mr-1" />
                ) : (
                  <FaEquals className="text-gray-500 mr-1" />
                )}
                <span
                  className={`font-medium ${
                    questionsTrend > 0
                      ? "text-green-600"
                      : questionsTrend < 0
                      ? "text-red-600"
                      : "text-gray-600"
                  }`}
                >
                  Questions {questionsTrend > 0 ? "+" : ""}
                  {Math.abs(questionsTrend)}
                </span>
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="avgAccuracy"
                stackId="1"
                stroke={colors.primary}
                fill={colors.primary}
                fillOpacity={0.6}
                name="Accuracy (%)"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="totalQuestions"
                stroke={colors.success}
                strokeWidth={3}
                name="Questions"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Children Comparison Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FaChartBar className="mr-2 text-purple-600" />
            Children Performance Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={childComparisonData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar
                dataKey="accuracy"
                fill={colors.primary}
                name="Accuracy (%)"
              />
              <Bar
                dataKey="questions"
                fill={colors.secondary}
                name="Questions"
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Subject Performance Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FaChartPie className="mr-2 text-green-600" />
            Subject Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={subjectData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.subject}: ${entry.accuracy}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="questions"
              >
                {subjectData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={pieColors[index % pieColors.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [
                  value,
                  name === "questions" ? "Questions" : name,
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Study Time Analysis */}
      <Card className="col-span-1 lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center">
            <FaChartLine className="mr-2 text-blue-600" />
            Daily Study Time & Questions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="totalTimeMinutes"
                stroke={colors.info}
                strokeWidth={3}
                name="Study Time (minutes)"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="totalQuestions"
                stroke={colors.warning}
                strokeWidth={3}
                name="Questions"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default PerformanceCharts;
