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
    <div className="p-4 md:p-6 flex gap-6 flex-col">
      {/* Hero Section (remains the same) */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 md:p-8 rounded-2xl shadow-lg text-white">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              Welcome back, {student?.name || "Student"}!
            </h1>
            <p className="mt-1 text-indigo-100 text-sm md:text-base">
              Ready to continue your learning journey today?
            </p>

            <div className="flex flex-wrap items-center gap-3 md:gap-4 mt-5">
              {student?.xpPoints !== null &&
                student?.xpPoints !== undefined && (
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
          <Link href="/student/practice" className="mt-6 md:mt-0 shrink-0">
            <button className="bg-white text-indigo-700 hover:bg-indigo-50 px-5 py-2.5 md:px-6 md:py-3 rounded-xl font-semibold transition duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 text-sm md:text-base">
              Explore Practice
            </button>
          </Link>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          {/* Assigned Tasks Section */}
          <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg md:text-xl font-semibold text-gray-800 flex items-center">
                <FaTasks className="mr-2 md:mr-3 text-indigo-600" />
                Homework from Parents
              </h2>
              {assignedTasks.length > 0 && (
                <div className="bg-amber-100 text-amber-700 px-2 py-1 rounded-full text-xs font-medium">
                  {assignedTasks.length} pending
                </div>
              )}
            </div>
            {assignedTasks.length > 0 ? (
              <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                {assignedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-3 border rounded-lg hover:shadow-md transition-shadow bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200"
                  >
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-indigo-800 text-sm leading-tight">
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
                      <span
                        className={`text-[10px] px-2 py-1 rounded-full font-semibold shrink-0 ${
                          task.status === PracticeSessionStatus.NOT_STARTED
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {task.status === PracticeSessionStatus.NOT_STARTED
                          ? "New"
                          : "In Progress"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        {task.type === PracticeSessionType.MOCK_EXAM && (
                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-medium">
                            Mock Exam
                          </span>
                        )}
                        {task.type === PracticeSessionType.TOPIC_QUIZ && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                            Practice Quiz
                          </span>
                        )}
                      </div>
                      <Link href={getTaskPath(task)} passHref>
                        <button className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-2 rounded-md inline-flex items-center font-medium transition-colors">
                          {task.status === PracticeSessionStatus.IN_PROGRESS
                            ? "Continue"
                            : "Start"}{" "}
                          <FaPlayCircle className="ml-1.5 h-3 w-3" />
                        </button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <FaTasks className="mx-auto text-3xl text-gray-400 mb-2" />
                <p className="text-sm text-gray-500 mb-1">
                  No homework assigned yet
                </p>
                <p className="text-xs text-gray-400">
                  Your parents can assign practice tasks for you
                </p>
              </div>
            )}
            {assignedTasks.length > 0 && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-800">
                  💡 <strong>Tip:</strong> Complete your homework to earn XP and
                  keep your parents happy! 🎉
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
            <StudentCalendar />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentPage;
