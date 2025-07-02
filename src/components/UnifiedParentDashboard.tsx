"use client";

import { useState, useEffect } from "react";
import { Calendar, momentLocalizer, View, Views } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import {
  FaClock,
  FaQuestionCircle,
  FaCheckCircle,
  FaTrophy,
  FaFire,
  FaChartLine,
  FaSpinner,
  FaBook,
  FaUsers,
  FaGraduationCap,
  FaCalendarDay,
  FaArrowRight,
  FaUser,
  FaCalendarAlt,
  FaCalendarPlus,
  FaTimes,
  FaTasks,
  FaChartBar,
  FaChartPie,
  FaArrowUp,
  FaArrowDown,
  FaEquals,
} from "react-icons/fa";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { toast } from "react-toastify";
import { createClient } from "@/lib/supabase/client";
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
  Area,
  AreaChart,
} from "recharts";

const localizer = momentLocalizer(moment);

// Interfaces (same as before)
interface Event {
  id: string;
  title: string;
  start: Date;
  end: Date;
  description?: string;
  type: "personal" | "lesson";
  childName?: string;
  childrenNames?: string;
  subject?: { name: string };
  teacher?: { name: string };
  class?: { name: string };
}

interface Child {
  id: string;
  name: string;
  username: string;
  email?: string;
  img?: string;
  level: number;
  xpPoints: number;
  class?: { name: string };
  grade?: { level: number; name?: string };
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

const UnifiedParentDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState<Child[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [stats, setStats] = useState<{
    children: ChildStats[];
    overallStats: OverallStats;
  } | null>(null);
  const [assignedTasks, setAssignedTasks] = useState<any>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [calendarView, setCalendarView] = useState<View>(Views.WEEK);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState<{
    start: Date;
    end: Date;
  } | null>(null);
  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    childId: "",
    date: "",
    startTime: "",
    endTime: "",
  });
  const [addingEvent, setAddingEvent] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      try {
        // Fetch children data
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          toast.error("You must be logged in to view this page.");
          return;
        }

        // Fetch children list
        const { data: studentsData, error: studentsError } = await supabase
          .from("Student")
          .select(
            `
            id, name, username, email, img, level, xpPoints, classId, gradeId,
            Class ( id, name ), Grade ( id, level, name )
          `
          )
          .eq("parentId", user.id);

        if (studentsError) {
          throw new Error(studentsError.message);
        }
        setChildren(studentsData || []);

        // Fetch statistics
        const statsResponse = await fetch("/api/parent/statistics");
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats(statsData);
        }

        // Fetch assigned tasks
        const tasksResponse = await fetch("/api/parent/assigned-tasks");
        if (tasksResponse.ok) {
          const tasksData = await tasksResponse.json();
          setAssignedTasks(tasksData);
        }

        // Fetch calendar events
        const [personalResponse, lessonsResponse] = await Promise.all([
          fetch("/api/parent/events"),
          fetch("/api/parent/lessons"),
        ]);

        let allEvents: Event[] = [];

        if (personalResponse.ok) {
          const personalData = await personalResponse.json();
          const personalEvents = personalData.map((event: any) => ({
            id: event.id,
            title: event.title,
            start: new Date(event.startTime),
            end: new Date(event.endTime),
            description: event.description,
            type: "personal" as const,
            childName: event.childName,
          }));
          allEvents = [...allEvents, ...personalEvents];
        }

        if (lessonsResponse.ok) {
          const lessonsData = await lessonsResponse.json();
          const lessonEvents = lessonsData.map((lesson: any) => ({
            id: lesson.id,
            title: `${lesson.name} - ${lesson.subject?.name || "Subject"}`,
            start: new Date(lesson.startTime),
            end: new Date(lesson.endTime),
            description: `Teacher: ${
              lesson.teacher?.name || "Unknown"
            } | Class: ${lesson.class?.name || "Unknown"}`,
            type: "lesson" as const,
            childrenNames: lesson.childrenNames,
            subject: lesson.subject,
            teacher: lesson.teacher,
            class: lesson.class,
          }));
          allEvents = [...allEvents, ...lessonEvents];
        }

        setEvents(allEvents);
      } catch (error: any) {
        console.error("Error fetching data:", error);
        toast.error(error.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [supabase]);

  const handleSelectEvent = (event: Event) => {
    setSelectedEvent(event);
    setShowEventModal(true);
  };

  const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    setSelectedSlot({ start, end });
    setEventForm({
      title: "",
      description: "",
      childId: children.length > 0 ? children[0].id : "",
      date: moment(start).format("YYYY-MM-DD"),
      startTime: moment(start).format("HH:mm"),
      endTime: moment(end).format("HH:mm"),
    });
    setShowAddEventModal(true);
  };

  const handleAddEvent = async () => {
    if (
      !eventForm.title.trim() ||
      !eventForm.childId ||
      !eventForm.date ||
      !eventForm.startTime ||
      !eventForm.endTime
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    const startDateTime = new Date(`${eventForm.date}T${eventForm.startTime}`);
    const endDateTime = new Date(`${eventForm.date}T${eventForm.endTime}`);

    if (endDateTime <= startDateTime) {
      toast.error("End time must be after start time");
      return;
    }

    setAddingEvent(true);
    try {
      const response = await fetch("/api/student/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: eventForm.title,
          description: eventForm.description,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          studentId: eventForm.childId,
        }),
      });

      if (response.ok) {
        toast.success("Event added successfully!");
        setShowAddEventModal(false);
        setEventForm({
          title: "",
          description: "",
          childId: "",
          date: "",
          startTime: "",
          endTime: "",
        });
        // Refresh events
        const personalResponse = await fetch("/api/parent/events");
        if (personalResponse.ok) {
          const personalData = await personalResponse.json();
          const personalEvents = personalData.map((event: any) => ({
            id: event.id,
            title: event.title,
            start: new Date(event.startTime),
            end: new Date(event.endTime),
            description: event.description,
            type: "personal" as const,
            childName: event.childName,
          }));
          // Update only personal events, keep lessons
          setEvents((prev) => [
            ...prev.filter((e) => e.type === "lesson"),
            ...personalEvents,
          ]);
        }
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to add event");
      }
    } catch (error) {
      console.error("Error adding event:", error);
      toast.error("Failed to add event");
    } finally {
      setAddingEvent(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <FaSpinner className="animate-spin text-2xl text-indigo-600" />
        <span className="ml-2 text-gray-600">Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Parent Dashboard</h1>
        <div className="text-sm text-gray-600">
          {stats
            ? `${stats.children.length} children • ${events.length} events`
            : "Loading..."}
        </div>
      </div>

      {/* Enhanced Statistical Overview */}
      {stats && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
              <FaChartBar className="text-indigo-600" />
              Family Learning Analytics
            </h2>
            <div className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
              {stats.children.length} Active Learner
              {stats.children.length !== 1 ? "s" : ""}
            </div>
          </div>

          {/* Key Performance Indicators */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">
                    Total Time Today
                  </p>
                  <p className="text-2xl font-bold text-blue-700">
                    {stats.overallStats.todayTotalTime}m
                  </p>
                  <div className="flex items-center mt-1">
                    <FaArrowUp className="text-green-500 text-xs mr-1" />
                    <span className="text-xs text-green-600">
                      +12% vs yesterday
                    </span>
                  </div>
                </div>
                <FaClock className="text-blue-500 text-2xl opacity-60" />
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium">
                    Questions Answered
                  </p>
                  <p className="text-2xl font-bold text-green-700">
                    {stats.overallStats.todayTotalQuestions}
                  </p>
                  <div className="flex items-center mt-1">
                    <FaArrowUp className="text-green-500 text-xs mr-1" />
                    <span className="text-xs text-green-600">
                      +8% vs yesterday
                    </span>
                  </div>
                </div>
                <FaQuestionCircle className="text-green-500 text-2xl opacity-60" />
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-emerald-600 font-medium">
                    Correct Answers
                  </p>
                  <p className="text-2xl font-bold text-emerald-700">
                    {stats.overallStats.todayTotalCorrect}
                  </p>
                  <div className="flex items-center mt-1">
                    <FaArrowUp className="text-green-500 text-xs mr-1" />
                    <span className="text-xs text-green-600">
                      {stats.overallStats.todayTotalQuestions > 0
                        ? Math.round(
                            (stats.overallStats.todayTotalCorrect /
                              stats.overallStats.todayTotalQuestions) *
                              100
                          )
                        : 0}
                      % accuracy
                    </span>
                  </div>
                </div>
                <FaCheckCircle className="text-emerald-500 text-2xl opacity-60" />
              </div>
            </Card>
            <Card className="p-6 bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-amber-600 font-medium">
                    Weekly Sessions
                  </p>
                  <p className="text-2xl font-bold text-amber-700">
                    {stats.overallStats.weekTotalSessions}
                  </p>
                  <div className="flex items-center mt-1">
                    <FaEquals className="text-gray-500 text-xs mr-1" />
                    <span className="text-xs text-gray-600">
                      Same as last week
                    </span>
                  </div>
                </div>
                <FaTrophy className="text-amber-500 text-2xl opacity-60" />
              </div>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Weekly Progress Chart */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <FaChartLine className="text-indigo-600" />
                <h3 className="text-lg font-semibold text-gray-800">
                  Weekly Learning Progress
                </h3>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.children[0]?.dailyStats || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => moment(value).format("ddd")}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      labelFormatter={(value) => moment(value).format("MMM DD")}
                      formatter={(value, name) => [
                        name === "questionsAnswered"
                          ? `${value} questions`
                          : name === "timeSpent"
                          ? `${Math.round(Number(value) / 60)} minutes`
                          : `${value}%`,
                        name === "questionsAnswered"
                          ? "Questions"
                          : name === "timeSpent"
                          ? "Time Spent"
                          : "Accuracy",
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="questionsAnswered"
                      stroke="#3b82f6"
                      fill="url(#questionsGradient)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="accuracy"
                      stroke="#10b981"
                      fill="url(#accuracyGradient)"
                      strokeWidth={2}
                    />
                    <defs>
                      <linearGradient
                        id="questionsGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#3b82f6"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="#3b82f6"
                          stopOpacity={0.05}
                        />
                      </linearGradient>
                      <linearGradient
                        id="accuracyGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#10b981"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="#10b981"
                          stopOpacity={0.05}
                        />
                      </linearGradient>
                    </defs>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Subject Distribution Chart */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <FaChartPie className="text-purple-600" />
                <h3 className="text-lg font-semibold text-gray-800">
                  Subject Distribution
                </h3>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.children[0]?.subjectBreakdown || []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ subject, questions }) =>
                        questions > 0 ? `${subject}: ${questions}` : ""
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="questions"
                    >
                      {(stats.children[0]?.subjectBreakdown || []).map(
                        (entry: any, index: number) => {
                          const colors = [
                            "#3b82f6",
                            "#10b981",
                            "#f59e0b",
                            "#ef4444",
                            "#8b5cf6",
                            "#06b6d4",
                          ];
                          return (
                            <Cell
                              key={`cell-${index}`}
                              fill={colors[index % colors.length]}
                            />
                          );
                        }
                      )}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [
                        `${value} questions`,
                        "Questions Answered",
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Children Performance Summary */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <FaUsers className="text-indigo-600" />
              <h3 className="text-lg font-semibold text-gray-800">
                Children Performance Summary
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-4 font-medium text-gray-600">
                      Child
                    </th>
                    <th className="text-center py-2 px-4 font-medium text-gray-600">
                      Today's Time
                    </th>
                    <th className="text-center py-2 px-4 font-medium text-gray-600">
                      Questions
                    </th>
                    <th className="text-center py-2 px-4 font-medium text-gray-600">
                      Accuracy
                    </th>
                    <th className="text-center py-2 px-4 font-medium text-gray-600">
                      Level
                    </th>
                    <th className="text-center py-2 px-4 font-medium text-gray-600">
                      Streak
                    </th>
                    <th className="text-center py-2 px-4 font-medium text-gray-600">
                      Last Login
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stats.children.map((child) => (
                    <tr
                      key={child.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                            <FaUser className="text-indigo-600 text-sm" />
                          </div>
                          <span className="font-medium text-gray-800">
                            {child.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-blue-600 font-semibold">
                          {child.today.timeSpentMinutes}m
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-green-600 font-semibold">
                          {child.today.questionsAnswered}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`font-semibold ${
                            child.today.accuracy >= 80
                              ? "text-green-600"
                              : child.today.accuracy >= 60
                              ? "text-yellow-600"
                              : "text-red-600"
                          }`}
                        >
                          {child.today.accuracy}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full text-sm font-medium">
                          Level {child.level}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <FaFire className="text-orange-500 text-sm" />
                          <span className="text-orange-600 font-semibold">
                            {child.currentStreak}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-gray-600">
                          {child.lastActivityDate
                            ? moment.utc(child.lastActivityDate).add(8, 'hours').format("MMM D, YYYY h:mm A")
                            : "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Assigned Tasks Overview */}
      {assignedTasks && (
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FaTasks className="text-indigo-600" />
            Assigned Homework
            <span className="text-sm bg-gray-100 text-gray-600 px-2 py-1 rounded-full ml-2">
              {assignedTasks.all?.length || 0} total
            </span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <FaClock className="text-yellow-600" />
                <span className="font-semibold text-yellow-800">Pending</span>
              </div>
              <div className="text-2xl font-bold text-yellow-600">
                {assignedTasks.pending?.length || 0}
              </div>
              <div className="text-sm text-yellow-700">Not started</div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <FaSpinner className="text-blue-600" />
                <span className="font-semibold text-blue-800">In Progress</span>
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {assignedTasks.inProgress?.length || 0}
              </div>
              <div className="text-sm text-blue-700">Currently working</div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <FaCheckCircle className="text-green-600" />
                <span className="font-semibold text-green-800">Completed</span>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {assignedTasks.completed?.length || 0}
              </div>
              <div className="text-sm text-green-700">Finished</div>
            </div>
          </div>

          {/* Recent Tasks */}
          {assignedTasks.all && assignedTasks.all.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Recent Assignments</h3>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {assignedTasks.all.slice(0, 5).map((task: any) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">
                        {task.title}
                      </div>
                      <div className="text-sm text-gray-600">
                        {task.child.name} • {task.subject?.name} •{" "}
                        {task.topic?.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        Assigned {moment(task.assignedAt).fromNow()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          task.status === "COMPLETED"
                            ? "bg-green-100 text-green-800"
                            : task.status === "IN_PROGRESS"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {task.status === "COMPLETED"
                          ? "Completed"
                          : task.status === "IN_PROGRESS"
                          ? "In Progress"
                          : "Pending"}
                      </div>
                      {task.status === "COMPLETED" &&
                        task.accuracy !== null && (
                          <div className="text-xs text-gray-600 mt-1">
                            {task.accuracy}% accuracy
                          </div>
                        )}
                    </div>
                  </div>
                ))}
              </div>

              {assignedTasks.all.length > 5 && (
                <div className="text-center mt-3">
                  <button className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
                    View all assignments →
                  </button>
                </div>
              )}
            </div>
          )}

          {assignedTasks.all?.length === 0 && (
            <div className="text-center py-6 text-gray-500">
              <FaTasks className="mx-auto text-3xl mb-2 opacity-50" />
              <p>No homework assigned yet</p>
              <p className="text-sm mt-1">
                Create assignments from the "Manage Homework" page
              </p>
            </div>
          )}
        </Card>
      )}

      {/* Calendar Section */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <FaCalendarAlt className="text-indigo-600" />
            Family Schedule
          </h2>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                const now = new Date();
                setEventForm({
                  title: "",
                  description: "",
                  childId: children.length > 0 ? children[0].id : "",
                  date: moment(now).format("YYYY-MM-DD"),
                  startTime: moment(now).format("HH:mm"),
                  endTime: moment(now).add(1, "hour").format("HH:mm"),
                });
                setShowAddEventModal(true);
              }}
              size="sm"
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700"
            >
              <FaCalendarPlus size={14} />
              Add Event
            </Button>
            <div className="flex items-center gap-1 bg-white rounded-md border">
              <Button
                onClick={() => setCalendarView(Views.WEEK)}
                variant={calendarView === Views.WEEK ? "default" : "ghost"}
                size="sm"
                className="rounded-r-none text-xs px-2 py-1"
              >
                Week
              </Button>
              <Button
                onClick={() => setCalendarView(Views.DAY)}
                variant={calendarView === Views.DAY ? "default" : "ghost"}
                size="sm"
                className="rounded-l-none text-xs px-2 py-1"
              >
                Day
              </Button>
            </div>
          </div>
        </div>

        <Card className="p-4">
          <div className="h-[400px]">
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              views={["week", "day"]}
              view={calendarView}
              date={calendarDate}
              onView={setCalendarView}
              onNavigate={setCalendarDate}
              onSelectEvent={handleSelectEvent}
              onSelectSlot={handleSelectSlot}
              selectable
              popup
              style={{ height: "100%" }}
              eventPropGetter={(event) => ({
                style: {
                  backgroundColor:
                    event.type === "lesson" ? "#059669" : "#f59e0b",
                  borderRadius: "4px",
                  opacity: 0.8,
                  color: "white",
                  border: "0px",
                  display: "block",
                  cursor: "pointer",
                },
              })}
            />
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-amber-500 rounded"></div>
              <span>Personal Events</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-600 rounded"></div>
              <span>Class Lessons</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Individual Child Performance */}
      {stats && stats.children.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <FaBook className="text-indigo-600" />
            Individual Performance (This Week)
          </h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {stats.children.map((childStats) => (
              <Card key={childStats.id} className="p-4">
                <h3 className="font-semibold text-gray-800 mb-3">
                  {childStats.name}
                </h3>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="text-center p-2 bg-blue-50 rounded">
                    <p className="text-xs text-blue-600">Time</p>
                    <p className="font-semibold text-blue-800">
                      {childStats.week.timeSpentMinutes}m
                    </p>
                  </div>
                  <div className="text-center p-2 bg-green-50 rounded">
                    <p className="text-xs text-green-600">Questions</p>
                    <p className="font-semibold text-green-800">
                      {childStats.week.questionsAnswered}
                    </p>
                  </div>
                  <div className="text-center p-2 bg-emerald-50 rounded">
                    <p className="text-xs text-emerald-600">Accuracy</p>
                    <p className="font-semibold text-emerald-800">
                      {childStats.week.accuracy}%
                    </p>
                  </div>
                  <div className="text-center p-2 bg-red-50 rounded">
                    <p className="text-xs text-red-600">Streak</p>
                    <p className="font-semibold text-red-800">
                      {childStats.currentStreak}
                    </p>
                  </div>
                </div>

                {childStats.subjectBreakdown.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Subject Performance:
                    </p>
                    <div className="space-y-1">
                      {childStats.subjectBreakdown
                        .slice(0, 3)
                        .map((subject: any, index: number) => (
                          <div
                            key={index}
                            className="flex justify-between text-sm"
                          >
                            <span className="text-gray-600">
                              {subject.subject}
                            </span>
                            <span className="font-medium">
                              {subject.accuracy}%
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Add Event Modal */}
      {showAddEventModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md p-6 bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Add New Event</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddEventModal(false)}
              >
                <FaTimes />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <Input
                  type="text"
                  value={eventForm.title}
                  onChange={(e) =>
                    setEventForm({ ...eventForm, title: e.target.value })
                  }
                  placeholder="Enter event title"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Child *
                </label>
                <select
                  value={eventForm.childId}
                  onChange={(e) =>
                    setEventForm({ ...eventForm, childId: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select a child</option>
                  {children.map((child) => (
                    <option key={child.id} value={child.id}>
                      {child.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <Textarea
                  value={eventForm.description}
                  onChange={(e) =>
                    setEventForm({ ...eventForm, description: e.target.value })
                  }
                  placeholder="Enter event description (optional)"
                  rows={3}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date *
                </label>
                <Input
                  type="date"
                  value={eventForm.date}
                  onChange={(e) =>
                    setEventForm({ ...eventForm, date: e.target.value })
                  }
                  className="w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time *
                  </label>
                  <Input
                    type="time"
                    value={eventForm.startTime}
                    onChange={(e) =>
                      setEventForm({ ...eventForm, startTime: e.target.value })
                    }
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Time *
                  </label>
                  <Input
                    type="time"
                    value={eventForm.endTime}
                    onChange={(e) =>
                      setEventForm({ ...eventForm, endTime: e.target.value })
                    }
                    className="w-full"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleAddEvent}
                  disabled={addingEvent}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                >
                  {addingEvent ? "Adding..." : "Add Event"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowAddEventModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Event Details Modal */}
      {showEventModal && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md p-6 bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">{selectedEvent.title}</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEventModal(false)}
              >
                ×
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  <FaCalendarAlt className="inline mr-2" />
                  {moment(selectedEvent.start).format("MMMM D, YYYY")}
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  <FaClock className="inline mr-2" />
                  {moment(selectedEvent.start).format("h:mm A")} -{" "}
                  {moment(selectedEvent.end).format("h:mm A")}
                </p>

                {selectedEvent.type === "lesson" &&
                  selectedEvent.childrenNames && (
                    <p className="text-sm text-gray-600 mb-2">
                      <FaUsers className="inline mr-2" />
                      Children: {selectedEvent.childrenNames}
                    </p>
                  )}

                {selectedEvent.type === "personal" &&
                  selectedEvent.childName && (
                    <p className="text-sm text-gray-600 mb-2">
                      <FaUsers className="inline mr-2" />
                      Child: {selectedEvent.childName}
                    </p>
                  )}

                {selectedEvent.description && (
                  <p className="text-sm text-gray-700 mt-3 p-3 bg-gray-50 rounded">
                    {selectedEvent.description}
                  </p>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default UnifiedParentDashboard;
