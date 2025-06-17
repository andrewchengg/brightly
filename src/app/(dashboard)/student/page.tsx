// src/app/(dashboard)/student/page.tsx
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { FaFire, FaMedal, FaTasks, FaPlayCircle } from "react-icons/fa";
import {
  PracticeSession as PrismaPracticeSessionType,
  PracticeSessionStatus,
  PracticeSessionType,
  Student as PrismaStudentType,
} from "@/generated/prisma";

import StudentCalendar from "@/components/StudentCalendar";
import { Button } from "@/components/ui/button";
import XPBar from "@/components/XPBar";
import WeeklyQuestsPreview from "@/components/WeeklyQuestsPreview";

interface AssignedTask extends PrismaPracticeSessionType {
  subjectName?: string | null;
  topicName?: string | null;
  mockExamPaperIdentifier?: "paper1" | "paper2" | null;
}

function getTaskPath(task: AssignedTask): string {
  // ... (getTaskPath function remains the same as provided previously)
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
      console.warn(
        `Mock exam task (ID: ${task.id}) for subject ${task.subjectId} is missing specific paper identifier. Defaulting path.`
      );
      path = `/student/mock-exam?sessionId=${task.id}&subjectId=${task.subjectId}`;
    } else {
      console.warn(
        `Mock exam task (ID: ${task.id}) is missing subjectId. Cannot form specific link.`
      );
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

const StudentPage = async () => {
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

  console.log(`Student dashboard loaded for user: ${userId}`);

  const student = await prisma.student.findUnique({
    where: { id: userId },
    select: {
      name: true,
      xpPoints: true,
      currentStreak: true,
      longestStreak: true,
      lastActivityDate: true,
      level: true,
    },
  });

  const xpPoints = student?.xpPoints ?? 0;
  const streak = student?.currentStreak ?? 0;

  const assignedTasksData = await prisma.practiceSession.findMany({
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
  });

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
    <div className="flex flex-col gap-6 p-6 min-h-screen">
      {/* Full-width welcome header */}
      <div className="bg-gradient-to-br from-blue-500 via-purple-600 to-indigo-700 text-white p-6 md:p-8 rounded-2xl shadow-xl w-full">
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
        <div className="flex-1">
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FaFire className="text-orange-500" />
              Your Practice Calendar
            </h2>
            <StudentCalendar />
          </div>
        </div>

        {/* Right side - Weekly Quests and Tasks */}
        <div className="w-full lg:w-80 space-y-6">
          {/* Weekly Quests - replaced Quick Actions */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <FaFire className="text-orange-500" />
                Weekly Quests
              </h2>
              <Link
                href="/student/weekly-quests"
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
              >
                View All
              </Link>
            </div>

            {/* Weekly Quests Preview */}
            <WeeklyQuestsPreview />

            {/* Quick Actions moved to bottom */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="grid grid-cols-1 gap-2">
                <Link
                  href="/student/practice"
                  className="block w-full p-2 bg-gradient-to-r from-green-600 to-emerald-700 text-white rounded-lg text-center font-medium text-sm hover:from-green-700 hover:to-emerald-800 transition-all"
                >
                  🎯 Practice Now
                </Link>
                <Link
                  href="/student/weekly-challenge"
                  className="block w-full p-2 bg-gradient-to-r from-purple-600 to-indigo-700 text-white rounded-lg text-center font-medium text-sm hover:from-purple-700 hover:to-indigo-800 transition-all"
                >
                  🏆 Weekly Challenge
                </Link>
              </div>
            </div>
          </div>

          {/* Your Tasks - moved below quick actions */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FaTasks className="text-blue-600" />
              Your Tasks
              <span className="text-sm font-normal text-gray-500 bg-blue-50 px-2 py-1 rounded-full">
                {assignedTasks.length} pending
              </span>
            </h2>

            {assignedTasks.length > 0 ? (
              <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                {assignedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-3 border rounded-lg hover:shadow-md transition-shadow bg-gray-50 border-gray-200"
                  >
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800 text-sm leading-tight">
                          {task.title}
                        </h3>
                        <p className="text-xs text-gray-600 mt-1">
                          📚 {task.subjectName || "Subject"}
                          {task.topicName && ` • 🎯 ${task.topicName}`}
                          {task.totalQuestions &&
                            ` • 📝 ${task.totalQuestions} questions`}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500">
                            ⏰ Assigned{" "}
                            {new Date(task.createdAt).toLocaleDateString()}
                          </span>
                          {task.examDurationMinutes && (
                            <span className="text-xs text-gray-500">
                              ⏱️ {task.examDurationMinutes}min
                            </span>
                          )}
                        </div>
                      </div>
                      <Link
                        href={`/student/practice/${task.id}`}
                        className="flex-shrink-0"
                      >
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 h-8 text-xs rounded-md flex items-center gap-1"
                        >
                          <FaPlayCircle className="text-xs" />
                          Start
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FaTasks className="mx-auto text-4xl mb-3 text-gray-300" />
                <p className="text-sm">No tasks assigned yet</p>
                <p className="text-xs">New tasks will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentPage;
