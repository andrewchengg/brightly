"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import {
  FaUser,
  FaTrophy,
  FaFire,
  FaClock,
  FaChartLine,
  FaArrowRight,
  FaEye,
  FaStar,
  FaQuestionCircle,
  FaBookOpen,
  FaCalendarAlt,
  FaBullseye,
  FaArrowUp,
  FaArrowDown,
  FaEquals,
  FaMedal,
  FaGraduationCap,
  FaBrain,
  FaLightbulb,
  FaExclamationTriangle,
  FaCheckCircle,
  FaPlay,
  FaPause,
  FaStop,
} from "react-icons/fa";
import { calculateLevel, getLevelInfo } from "@/lib/xp-utils";

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

interface DetailedChildrenPerformanceProps {
  childrenStats: ChildStats[];
  loading?: boolean;
  dateRange?: {
    startDate: Date;
    endDate: Date;
    period: "7d" | "30d" | "3m";
  };
}

const DetailedChildrenPerformance: React.FC<DetailedChildrenPerformanceProps> = ({
  childrenStats,
  loading = false,
  dateRange,
}) => {
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "analytics" | "subjects" | "progress">("overview");

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

    if (diffHours < 24) return { status: "Today", color: "text-green-600" };
    if (diffHours < 48) return { status: "Yesterday", color: "text-yellow-600" };
    if (diffHours < 168)
      return {
        status: `${Math.floor(diffHours / 24)} days ago`,
        color: "text-orange-600",
      };
    return { status: "Inactive", color: "text-red-600" };
  };

  const getPerformanceColor = (accuracy: number) => {
    if (accuracy >= 90) return "text-green-600 bg-green-50";
    if (accuracy >= 80) return "text-blue-600 bg-blue-50";
    if (accuracy >= 70) return "text-yellow-600 bg-yellow-50";
    if (accuracy >= 60) return "text-orange-600 bg-orange-50";
    return "text-red-600 bg-red-50";
  };

  const getStreakEmoji = (streak: number) => {
    if (streak >= 7) return "🔥🔥🔥";
    if (streak >= 3) return "🔥🔥";
    if (streak >= 1) return "🔥";
    return "💤";
  };

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <FaArrowUp className="text-green-600" />;
    if (current < previous) return <FaArrowDown className="text-red-600" />;
    return <FaEquals className="text-gray-600" />;
  };

  const prepareWeeklyData = (child: ChildStats) => {
    return (
      child.dailyStats?.map((day) => ({
        day: new Date(day.date).toLocaleDateString("en-US", {
          weekday: "short",
        }),
        accuracy: day.accuracy,
        questions: day.questions,
        timeMinutes: Math.round(day.timeSpent / 60),
        xp: day.questions * 10, // Estimate XP based on questions
      })) || []
    );
  };

  const prepareSubjectData = (child: ChildStats) => {
    if (child.subjectBreakdown.length === 0) {
      return [{
        name: "No Data",
        questions: 0,
        accuracy: 0,
        timeMinutes: 0,
        fill: "#e5e7eb",
      }];
    }
    const colors = ["#6366f1", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#3b82f6"];
    return child.subjectBreakdown.map((subject, index) => ({
      name: subject.subject,
      questions: subject.questions,
      accuracy: subject.accuracy,
      timeMinutes: Math.round(subject.timeSpent / 60),
      fill: colors[index % colors.length],
    }));
  };

  const prepareRadarData = (child: ChildStats) => {
    if (child.subjectBreakdown.length === 0) {
      return [{
        subject: "No Data",
        accuracy: 0,
        questions: 0,
        timeEfficiency: 0,
      }];
    }
    return child.subjectBreakdown.map((subject) => ({
      subject: subject.subject,
      accuracy: subject.accuracy,
      questions: Math.min(subject.questions / 10, 100), // Normalize to 0-100
      timeEfficiency: Math.min((subject.accuracy * subject.questions) / 10, 100), // Combined metric
    }));
  };

  const getLearningInsights = (child: ChildStats) => {
    const insights = [];
    
    // Accuracy insights
    if (child.today.accuracy >= 90) {
      insights.push({ type: "success", text: "Excellent accuracy today!", icon: FaCheckCircle });
    } else if (child.today.accuracy < 70) {
      insights.push({ type: "warning", text: "Accuracy needs improvement", icon: FaExclamationTriangle });
    }

    // Streak insights
    if (child.currentStreak >= 7) {
      insights.push({ type: "success", text: "Amazing consistency streak!", icon: FaFire });
    } else if (child.currentStreak === 0) {
      insights.push({ type: "warning", text: "No recent activity", icon: FaPause });
    }

    // Study time insights
    if (child.today.timeSpent >= 3600) { // 1 hour
      insights.push({ type: "success", text: "Great study session today!", icon: FaClock });
    } else if (child.today.timeSpent < 900) { // 15 minutes
      insights.push({ type: "info", text: "Short study session", icon: FaLightbulb });
    }

    // Subject insights
    if (child.subjectBreakdown.length > 0) {
      const weakestSubject = child.subjectBreakdown.reduce((min, subject) => 
        subject.accuracy < min.accuracy ? subject : min
      );
      if (weakestSubject.accuracy < 70) {
        insights.push({ 
          type: "warning", 
          text: `${weakestSubject.subject} needs attention`, 
          icon: FaBookOpen 
        });
      }
    } else {
      insights.push({ 
        type: "info", 
        text: "Start practicing to see subject insights", 
        icon: FaBookOpen 
      });
    }

    return insights;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
            Add children to your account to see their detailed performance here.
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

  const selectedChildData = selectedChild 
    ? childrenStats.find(child => child.id === selectedChild)
    : childrenStats[0];

  if (!selectedChildData) return null;

  const levelInfo = getLevelInfo(selectedChildData.xpPoints);
  const weeklyData = prepareWeeklyData(selectedChildData);
  const subjectData = prepareSubjectData(selectedChildData);
  const radarData = prepareRadarData(selectedChildData);
  const insights = getLearningInsights(selectedChildData);

  return (
    <div className="space-y-6">
      {/* Child Selector */}
      <div className="flex flex-wrap gap-2">
        {childrenStats.map((child) => (
          <Button
            key={child.id}
            variant={selectedChild === child.id || (!selectedChild && child.id === childrenStats[0].id) ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedChild(child.id)}
            className="flex items-center gap-2"
          >
            <FaUser className="w-3 h-3" />
            {child.name}
            <Badge variant="secondary" className="ml-1">
              {child.subjectBreakdown.length} subjects
            </Badge>
          </Button>
        ))}
      </div>

      {/* Main Performance Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Overview */}
        <div className="lg:col-span-1 space-y-6">
          {/* Child Profile Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                    <FaUser className="text-indigo-600 text-xl" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{selectedChildData.name}</h3>
                    <p className="text-sm text-gray-600">
                      Level {calculateLevel(selectedChildData.xpPoints)} • {selectedChildData.xpPoints.toLocaleString()} XP
                    </p>
                  </div>
                </CardTitle>
                <div className="text-right">
                  <div className="flex items-center justify-end gap-1 mb-1">
                    <span className="text-2xl">{getStreakEmoji(selectedChildData.currentStreak)}</span>
                  </div>
                  <p className="text-sm font-bold text-orange-600">
                    {selectedChildData.currentStreak} day streak
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Level Progress */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Level Progress</span>
                  <span className="text-sm text-gray-600">
                    {levelInfo.xpInCurrentLevel} / {levelInfo.xpNeededForCurrentLevel} XP
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${levelInfo.progressToNextLevel}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  {levelInfo.xpToNextLevel} XP to Level {calculateLevel(selectedChildData.xpPoints) + 1}
                </p>
              </div>

              {/* Activity Status */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Last Active</span>
                <span className={`text-sm font-medium ${getActivityStatus(selectedChildData.lastActivityDate).color}`}>
                  {getActivityStatus(selectedChildData.lastActivityDate).status}
                </span>
              </div>

              {/* Longest Streak */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Longest Streak</span>
                <span className="text-sm font-bold text-orange-600">
                  {selectedChildData.longestStreak} days
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Learning Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FaLightbulb className="text-amber-600" />
                Learning Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {insights.map((insight, index) => {
                  const Icon = insight.icon;
                  return (
                    <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                      <Icon className={`w-4 h-4 ${
                        insight.type === 'success' ? 'text-green-600' :
                        insight.type === 'warning' ? 'text-amber-600' :
                        'text-blue-600'
                      }`} />
                      <span className="text-sm text-gray-700">{insight.text}</span>
                    </div>
                  );
                })}
                {insights.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No specific insights available
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Analytics */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tab Navigation */}
          <div className="bg-white rounded-xl border border-gray-200 p-1 shadow-sm">
            <div className="flex space-x-1">
              {[
                { id: "overview", label: "Overview", icon: FaChartLine },
                { id: "analytics", label: "Analytics", icon: FaBrain },
                { id: "subjects", label: "Subjects", icon: FaBookOpen },
                { id: "progress", label: "Progress", icon: FaBullseye },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all duration-300 ${
                      activeTab === tab.id
                        ? "bg-indigo-600 text-white shadow-lg"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Content */}
          <div className="min-h-[400px]">
            {activeTab === "overview" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Today's Performance */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FaCalendarAlt className="text-green-600" />
                      Today's Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <FaClock className="w-6 h-6 text-green-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-green-700">
                          {formatTime(selectedChildData.today.timeSpent)}
                        </p>
                        <p className="text-sm text-green-600">Study Time</p>
                      </div>
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <FaQuestionCircle className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-blue-700">
                          {selectedChildData.today.questionsAnswered}
                        </p>
                        <p className="text-sm text-blue-600">Questions</p>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <FaChartLine className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-purple-700">
                          {selectedChildData.today.accuracy}%
                        </p>
                        <p className="text-sm text-purple-600">Accuracy</p>
                      </div>
                      <div className="text-center p-4 bg-amber-50 rounded-lg">
                        <FaTrophy className="w-6 h-6 text-amber-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-amber-700">
                          +{selectedChildData.today.xpEarned}
                        </p>
                        <p className="text-sm text-amber-600">XP Earned</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Weekly Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FaBullseye className="text-indigo-600" />
                      This Week
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Total Study Time</span>
                        <span className="font-semibold">{formatTime(selectedChildData.week.timeSpent)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Questions Answered</span>
                        <span className="font-semibold">{selectedChildData.week.questionsAnswered}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Average Accuracy</span>
                        <span className="font-semibold">{selectedChildData.week.accuracy}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Sessions Completed</span>
                        <span className="font-semibold">{selectedChildData.week.sessionsCompleted}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Weekly Progress Chart */}
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FaChartLine className="text-indigo-600" />
                      Progress
                      {dateRange && (
                        <span className="text-sm text-gray-500 ml-2 font-normal">
                          ({dateRange.period === "7d" ? "7 days" : 
                            dateRange.period === "30d" ? "Month" : "Quarter"})
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={weeklyData}>
                          <XAxis dataKey="day" />
                          <YAxis />
                          <Tooltip />
                          <Area
                            type="monotone"
                            dataKey="questions"
                            stackId="1"
                            stroke="#6366f1"
                            fill="#6366f1"
                            fillOpacity={0.6}
                          />
                          <Area
                            type="monotone"
                            dataKey="accuracy"
                            stackId="2"
                            stroke="#10b981"
                            fill="#10b981"
                            fillOpacity={0.6}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "analytics" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Subject Performance Radar */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FaBrain className="text-purple-600" />
                      Subject Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={radarData}>
                          <PolarGrid />
                          <PolarAngleAxis dataKey="subject" />
                          <PolarRadiusAxis />
                          <Radar
                            name="Performance"
                            dataKey="accuracy"
                            stroke="#6366f1"
                            fill="#6366f1"
                            fillOpacity={0.3}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Learning Efficiency */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FaBullseye className="text-green-600" />
                      Learning Efficiency
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {selectedChildData.subjectBreakdown.map((subject, index) => {
                        const efficiency = Math.round((subject.accuracy * subject.questions) / 10);
                        return (
                          <div key={index} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">{subject.subject}</span>
                              <span className="text-sm text-gray-600">{efficiency}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full"
                                style={{ width: `${efficiency}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "subjects" && (
              <div className="space-y-6">
                {/* Subject Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FaBookOpen className="text-indigo-600" />
                      Subject Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={subjectData}
                              dataKey="questions"
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={100}
                            >
                              {subjectData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-4">
                        {subjectData.map((subject, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: subject.fill }}
                              ></div>
                              <div>
                                <p className="font-medium">{subject.name}</p>
                                <p className="text-sm text-gray-600">
                                  {subject.questions} questions • {subject.timeMinutes} min
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`font-bold ${getPerformanceColor(subject.accuracy)}`}>
                                {subject.accuracy}%
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "progress" && (
              <div className="space-y-6">
                {/* Progress Trends */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FaBullseye className="text-green-600" />
                      Progress Trends
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={weeklyData}>
                          <XAxis dataKey="day" />
                          <YAxis />
                          <Tooltip />
                          <Line
                            type="monotone"
                            dataKey="accuracy"
                            stroke="#10b981"
                            strokeWidth={3}
                            dot={{ fill: "#10b981", strokeWidth: 2, r: 4 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="questions"
                            stroke="#6366f1"
                            strokeWidth={3}
                            dot={{ fill: "#6366f1", strokeWidth: 2, r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Achievement Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FaMedal className="text-amber-600" />
                      Achievement Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg">
                        <FaTrophy className="w-8 h-8 text-green-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-green-700">
                          {selectedChildData.xpPoints.toLocaleString()}
                        </p>
                        <p className="text-sm text-green-600">Total XP</p>
                      </div>
                      <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-red-50 rounded-lg">
                        <FaFire className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-orange-700">
                          {selectedChildData.longestStreak}
                        </p>
                        <p className="text-sm text-orange-600">Best Streak</p>
                      </div>
                      <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
                        <FaGraduationCap className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-blue-700">
                          {selectedChildData.week.sessionsCompleted}
                        </p>
                        <p className="text-sm text-blue-600">This Week</p>
                      </div>
                      <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg">
                        <FaChartLine className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-purple-700">
                          {selectedChildData.week.accuracy}%
                        </p>
                        <p className="text-sm text-purple-600">Avg Accuracy</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailedChildrenPerformance; 