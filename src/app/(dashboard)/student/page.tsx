// src/app/(dashboard)/student/page.tsx
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { FaFire, FaMedal, FaTasks, FaPlayCircle } from "react-icons/fa";
import {
  PracticeSession as PrismaPracticeSessionType,
  PracticeSessionStatus,
  PracticeSessionType,
} from "@/generated/prisma";

import { Button } from "@/components/ui/button";
import XPBar from "@/components/XPBar";
import dynamic from "next/dynamic";

// Lazy load heavy components
const StudentCalendar = dynamic(() => import("@/components/StudentCalendar"), {
  loading: () => (
    <div className="h-64 bg-gray-100 rounded-lg animate-pulse flex items-center justify-center">
      <span className="text-gray-500">Loading calendar...</span>
    </div>
  ),
});

const WeeklyQuestsPreview = dynamic(
  () => import("@/components/WeeklyQuestsPreview"),
  {
    loading: () => (
      <div className="h-32 bg-gray-100 rounded-lg animate-pulse flex items-center justify-center">
        <span className="text-gray-500">Loading quests...</span>
      </div>
    ),
  }
);

interface AssignedTask extends PrismaPracticeSessionType {
  subjectName?: string | null;
  topicName?: string | null;
  mockExamPaperIdentifier?: "paper1" | "paper2" | null;
}

function getTaskPath(task: AssignedTask): string {
  let path = "/student/practice";
  if (task.type === PracticeSessionType.TOPIC_QUIZ && task.topicId) {
    path = `/student/practice/topic/${task.topicId}?sessionId=${task.id}`;
  } else if (task.type === PracticeSessionType.MOCK_EXAM) {
    let paperId = task.mockExamPaperIdentifier;
    if (!paperId) {
      if (task.title?.toLowerCase().includes("paper 1")) paperId = "paper1";
      else if (task.title?.toLowerCase().includes("paper 2"))
        paperId = "paper2";
    }
    if (paperId && task.subjectId) {
      path = `/student/mock-exam?paperId=${paperId}&sessionId=${task.id}&subjectId=${task.subjectId}`;
    } else if (task.subjectId) {
      path = `/student/mock-exam?sessionId=${task.id}&subjectId=${task.subjectId}`;
    } else {
      path = `/student/mock-exam?sessionId=${task.id}`;
    }
  } else if (task.type === PracticeSessionType.PRACTICE) {
    if (task.topicId) {
      path = `/student/practice/random?topicId=${task.topicId}&sessionId=${task.id}`;
    } else if (task.subjectId) {
      path = `/student/practice/random?subjectId=${task.subjectId}&sessionId=${task.id}`;
    }
  } else if (
    task.type === PracticeSessionType.QUESTION_GROUP_PRACTICE &&
    task.basedOnQuestionGroupId
  ) {
    path = `/student/practice/question-group/${task.basedOnQuestionGroupId}?sessionId=${task.id}`;
  }
  return path;
}

export default async function StudentPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id;

  if (!userId) {
    return (
      <p className="p-6 text-center">User not authenticated. Please sign in.</p>
    );
  }

  // Combine database queries for better performance
  const [student, assignedTasksData] = await Promise.all([
    prisma.student.findUnique({
      where: { id: userId },
      select: {
        name: true,
        xpPoints: true,
        currentStreak: true,
        longestStreak: true,
        lastActivityDate: true,
        level: true,
      },
    }),
    prisma.practiceSession.findMany({
      where: {
        studentId: userId,
        OR: [
          { status: PracticeSessionStatus.NOT_STARTED },
          { status: PracticeSessionStatus.IN_PROGRESS },
        ],
        assignedByParentId: { not: null },
      },
      include: {
        subject: { select: { id: true, name: true } },
        topic: { select: { id: true, name: true } },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    }),
  ]);

  const xpPoints = student?.xpPoints ?? 0;
  const streak = student?.currentStreak ?? 0;

  const assignedTasks: AssignedTask[] = assignedTasksData.map((task) => {
    let mockExamPaperIdentifier: AssignedTask["mockExamPaperIdentifier"] = null;
    if (task.type === PracticeSessionType.MOCK_EXAM) {
      if (task.title?.toLowerCase().includes("paper 1"))
        mockExamPaperIdentifier = "paper1";
      else if (task.title?.toLowerCase().includes("paper 2"))
        mockExamPaperIdentifier = "paper2";
    }
    const baseTask = task as PrismaPracticeSessionType;
    return {
      ...baseTask,
      subjectId: task.subjectId,
      subjectName: task.subject?.name,
      topicName: task.topic?.name,
      mockExamPaperIdentifier,
    };
  });

  return (
    <div className="flex flex-col gap-6 p-6 min-h-screen max-w-7xl mx-auto">
      {/* Full-width welcome header */}
      <div className="bg-purple-800 text-white p-6 md:p-8 rounded-2xl shadow-xl w-full">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 md:w-16 md:h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-2xl md:text-3xl font-bold">
            {student?.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              Welcome back, {student?.name || "Student"}!
            </h1>
            <p className="text-blue-100 text-sm md:text-base">
              Ready to continue your learning journey?
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 md:gap-4 mt-5">
          {student?.xpPoints !== null && student?.xpPoints !== undefined && (
            <XPBar
              currentXP={xpPoints}
              showTooltip={true}
              size="md"
              variant="light"
            />
          )}
          <div className="bg-white/20 backdrop-blur-sm px-3 py-1.5 md:px-4 md:py-2 rounded-xl flex items-center gap-2 text-sm md:text-base">
            <FaMedal className="text-yellow-300 text-lg md:text-xl" />
            <span className="font-semibold">{xpPoints} XP</span>
          </div>
          <div className="relative group">
            <div className="bg-white/20 backdrop-blur-sm px-3 py-1.5 md:px-4 md:py-2 rounded-xl flex items-center gap-2 text-sm md:text-base">
              <FaFire className="text-orange-400 text-lg md:text-xl" />
              <span className="font-semibold">{streak} day streak</span>
              <div className="absolute hidden group-hover:block bg-white p-3 shadow-xl rounded-lg w-60 md:w-64 text-gray-700 z-10 top-full left-0 mt-2">
                <p className="font-semibold mb-1.5 text-orange-600 text-sm">
                  Activity Streak
                </p>
                <p className="mb-1.5 text-xs">
                  Keep practicing daily to maintain your streak!
                </p>
                <div className="flex items-center gap-1.5 mt-2 text-xs">
                  <FaFire className="text-orange-500" />
                  <span>
                    Longest streak:{" "}
                    <strong>{student?.longestStreak || 0} days</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content - two column layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left side - Calendar */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-2xl shadow-xl p-6 h-fit">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FaFire className="text-orange-500" />
              Your Practice Calendar
            </h2>
            <StudentCalendar />
          </div>
        </div>

        {/* Right side - Weekly Quests and Tasks */}
        <div className="w-full lg:w-80 lg:flex-shrink-0 space-y-6">
          {/* Weekly Quests Preview */}
          <div className="bg-white rounded-2xl shadow-xl p-6 h-fit">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FaTasks className="text-purple-800" />
              Weekly Quests
            </h2>
            <WeeklyQuestsPreview />
          </div>

          {/* Assigned Tasks Section */}
          <div className="bg-white rounded-2xl shadow-xl p-6 h-fit">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <FaPlayCircle className="text-blue-500" />
                Assigned Tasks
              </h2>
              <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">
                {assignedTasks.length} pending
              </span>
            </div>

            {assignedTasks.length === 0 ? (
              <p className="text-gray-500 text-sm">
                No tasks assigned. Check back later!
              </p>
            ) : (
              <div className="space-y-3">
                {assignedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                  >
                    <h3 className="font-medium text-gray-800 text-sm mb-1">
                      {task.title}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {task.subjectName || "Unknown Subject"}
                      </span>
                      {task.topicName && (
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                          {task.topicName}
                        </span>
                      )}
                    </div>
                    <Link
                      href={getTaskPath(task)}
                      className="inline-block w-full text-center bg-blue-600 text-white px-3 py-1.5 rounded text-xs hover:bg-blue-700 transition-colors"
                    >
                      Start Practice
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
