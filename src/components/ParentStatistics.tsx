"use client";

import { useState, useEffect } from "react";
import {
  FaClock,
  FaQuestionCircle,
  FaCheckCircle,
  FaTrophy,
  FaFire,
  FaChartLine,
  FaSpinner,
  FaBook,
} from "react-icons/fa";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface DailyStats {
  date: string;
  questions: number;
  correctAnswers: number;
  timeSpent: number;
  accuracy: number;
}

interface SubjectStats {
  subject: string;
  questions: number;
  correct: number;
  accuracy: number;
  timeSpent: number;
}

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
  subjectBreakdown: SubjectStats[];
  dailyStats: DailyStats[];
}

interface OverallStats {
  totalChildren: number;
  todayTotalTime: number;
  todayTotalQuestions: number;
  todayTotalCorrect: number;
  weekTotalSessions: number;
}

interface ParentStatisticsProps {
  className?: string;
}

const ParentStatistics: React.FC<ParentStatisticsProps> = ({ className }) => {
  const [stats, setStats] = useState<{
    children: ChildStats[];
    overallStats: OverallStats;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/parent/statistics");
        if (response.ok) {
          const data = await response.json();
          setStats(data);
          if (data.children.length > 0 && !selectedChild) {
            setSelectedChild(data.children[0].id);
          }
        }
      } catch (error) {
        console.error("Error fetching statistics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <FaSpinner className="animate-spin text-2xl text-indigo-600" />
        <span className="ml-2 text-gray-600">Loading statistics...</span>
      </div>
    );
  }

  if (!stats || stats.children.length === 0) {
    return (
      <div className={`text-center p-8 ${className}`}>
        <FaChartLine className="mx-auto text-4xl text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">
          No Statistics Available
        </h3>
        <p className="text-gray-600">
          Your children haven't started any practice sessions yet.
        </p>
      </div>
    );
  }

  const selectedChildStats =
    stats.children.find((child) => child.id === selectedChild) ||
    stats.children[0];

  return (
    <div className={className}>
      {/* Overall Family Stats */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <FaChartLine className="text-indigo-600" />
          Family Statistics Today
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <FaClock className="text-blue-500 text-xl" />
              <div>
                <p className="text-sm text-gray-600">Time Spent</p>
                <p className="text-lg font-semibold">
                  {stats.overallStats.todayTotalTime}m
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <FaQuestionCircle className="text-green-500 text-xl" />
              <div>
                <p className="text-sm text-gray-600">Questions</p>
                <p className="text-lg font-semibold">
                  {stats.overallStats.todayTotalQuestions}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <FaCheckCircle className="text-emerald-500 text-xl" />
              <div>
                <p className="text-sm text-gray-600">Correct</p>
                <p className="text-lg font-semibold">
                  {stats.overallStats.todayTotalCorrect}
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <FaTrophy className="text-amber-500 text-xl" />
              <div>
                <p className="text-sm text-gray-600">Accuracy</p>
                <p className="text-lg font-semibold">
                  {stats.overallStats.todayTotalQuestions > 0
                    ? Math.round(
                        (stats.overallStats.todayTotalCorrect /
                          stats.overallStats.todayTotalQuestions) *
                          100
                      )
                    : 0}
                  %
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Child Selector */}
      {stats.children.length > 1 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            Select Child
          </h3>
          <div className="flex flex-wrap gap-2">
            {stats.children.map((child) => (
              <Button
                key={child.id}
                onClick={() => setSelectedChild(child.id)}
                variant={selectedChild === child.id ? "default" : "outline"}
                size="sm"
                className="flex items-center gap-2"
              >
                {child.name}
                {child.today.questionsAnswered > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                    {child.today.questionsAnswered}
                  </span>
                )}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Individual Child Statistics */}
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            {selectedChildStats.name}'s Performance
          </h3>

          {/* Today's Performance */}
          <div className="mb-6">
            <h4 className="text-md font-medium text-gray-700 mb-3">
              Today's Activity
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <FaClock className="text-blue-500" />
                  <div>
                    <p className="text-sm text-gray-600">Time Spent</p>
                    <p className="text-lg font-semibold">
                      {selectedChildStats.today.timeSpentMinutes}m
                    </p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <FaQuestionCircle className="text-green-500" />
                  <div>
                    <p className="text-sm text-gray-600">Questions</p>
                    <p className="text-lg font-semibold">
                      {selectedChildStats.today.questionsAnswered}
                    </p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <FaCheckCircle className="text-emerald-500" />
                  <div>
                    <p className="text-sm text-gray-600">Accuracy</p>
                    <p className="text-lg font-semibold">
                      {selectedChildStats.today.accuracy}%
                    </p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <FaTrophy className="text-amber-500" />
                  <div>
                    <p className="text-sm text-gray-600">XP Earned</p>
                    <p className="text-lg font-semibold">
                      {selectedChildStats.today.xpEarned}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Weekly Overview */}
          <div className="mb-6">
            <h4 className="text-md font-medium text-gray-700 mb-3">
              This Week
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <FaClock className="text-blue-500" />
                  <div>
                    <p className="text-sm text-gray-600">Total Time</p>
                    <p className="text-lg font-semibold">
                      {selectedChildStats.week.timeSpentMinutes}m
                    </p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <FaQuestionCircle className="text-green-500" />
                  <div>
                    <p className="text-sm text-gray-600">Questions</p>
                    <p className="text-lg font-semibold">
                      {selectedChildStats.week.questionsAnswered}
                    </p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <FaCheckCircle className="text-emerald-500" />
                  <div>
                    <p className="text-sm text-gray-600">Accuracy</p>
                    <p className="text-lg font-semibold">
                      {selectedChildStats.week.accuracy}%
                    </p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <FaFire className="text-red-500" />
                  <div>
                    <p className="text-sm text-gray-600">Streak</p>
                    <p className="text-lg font-semibold">
                      {selectedChildStats.currentStreak}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Subject Breakdown */}
          {selectedChildStats.subjectBreakdown.length > 0 && (
            <div className="mb-6">
              <h4 className="text-md font-medium text-gray-700 mb-3 flex items-center gap-2">
                <FaBook className="text-indigo-500" />
                Subject Performance (This Week)
              </h4>
              <div className="grid gap-3">
                {selectedChildStats.subjectBreakdown.map((subject, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h5 className="font-medium text-gray-800">
                          {subject.subject}
                        </h5>
                        <p className="text-sm text-gray-600">
                          {subject.questions} questions • {subject.timeSpent}{" "}
                          minutes
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-gray-800">
                          {subject.accuracy}%
                        </p>
                        <p className="text-sm text-gray-600">
                          {subject.correct}/{subject.questions}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Daily Progress Chart */}
          <div>
            <h4 className="text-md font-medium text-gray-700 mb-3">
              Daily Progress (Last 7 Days)
            </h4>
            <Card className="p-4">
              <div className="space-y-3">
                {selectedChildStats.dailyStats.map((day, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 rounded-lg bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-700 w-16">
                        {new Date(day.date).toLocaleDateString("en-US", {
                          weekday: "short",
                        })}
                      </span>
                      <span className="text-sm text-gray-600">
                        {Math.round(day.timeSpent / 60)}m
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-600">
                        {day.questions} questions
                      </span>
                      <span
                        className={`text-sm font-medium px-2 py-1 rounded-full ${
                          day.accuracy >= 80
                            ? "bg-green-100 text-green-800"
                            : day.accuracy >= 60
                            ? "bg-yellow-100 text-yellow-800"
                            : day.accuracy > 0
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {day.accuracy}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParentStatistics;
