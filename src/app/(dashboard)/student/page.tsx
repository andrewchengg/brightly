// src/app/(dashboard)/student/page.tsx
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import Link from "next/link";
import Image from "next/image";
import { FaChartLine, FaCheckCircle, FaFire, FaMedal, FaTasks, FaPlayCircle, FaTrophy, FaArrowLeft } from "react-icons/fa"; 
import { PracticeSession as PrismaPracticeSessionType, PracticeSessionStatus, PracticeSessionType, Student as PrismaStudentType } from "@/generated/prisma"; 

import Announcements from "@/components/Announcements";
import StudentSetupCheck from "@/components/StudentSetupCheck";
import StudentCalendar from "@/components/StudentCalendar";
import { Button } from "@/components/ui/button"; 

interface AssignedTask extends PrismaPracticeSessionType { 
    subjectName?: string | null;
    topicName?: string | null;
    mockExamPaperIdentifier?: 'paper1' | 'paper2' | null; 
}

function getTaskPath(task: AssignedTask): string {
    // ... (getTaskPath function remains the same as provided previously)
    let path = "/student/practice"; 
    if (task.type === PracticeSessionType.TOPIC_QUIZ && task.topicId) {
        path = `/student/practice/topic/${task.topicId}?sessionId=${task.id}`;
    } else if (task.type === PracticeSessionType.MOCK_EXAM) {
        let paperId = task.mockExamPaperIdentifier; 
        if (!paperId) { 
            if (task.title?.toLowerCase().includes("paper 1")) paperId = 'paper1';
            else if (task.title?.toLowerCase().includes("paper 2")) paperId = 'paper2';
        }
        if (paperId && task.subjectId) { 
             path = `/student/mock-exam?paperId=${paperId}&sessionId=${task.id}&subjectId=${task.subjectId}`;
        } else if (task.subjectId) { 
            console.warn(`Mock exam task (ID: ${task.id}) for subject ${task.subjectId} is missing specific paper identifier. Defaulting path.`);
            path = `/student/mock-exam?sessionId=${task.id}&subjectId=${task.subjectId}`;
        } else {
            console.warn(`Mock exam task (ID: ${task.id}) is missing subjectId. Cannot form specific link.`);
            path = `/student/mock-exam?sessionId=${task.id}`; 
        }
    } else if (task.type === PracticeSessionType.PRACTICE) { 
        if (task.topicId) {
            path = `/student/practice/random?topicId=${task.topicId}&sessionId=${task.id}`;
        } else if (task.subjectId) {
            path = `/student/practice/random?subjectId=${task.subjectId}&sessionId=${task.id}`;
        }
    } else if (task.type === PracticeSessionType.QUESTION_GROUP_PRACTICE && task.basedOnQuestionGroupId){
        path = `/student/practice/question-group/${task.basedOnQuestionGroupId}?sessionId=${task.id}`;
    }
    return path;
}

const StudentPage = async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id;
  
  if (!userId) {
    return <p className="p-6 text-center">User not authenticated. Please sign in.</p>;
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
    }
  });

  const xpPoints = student?.xpPoints ?? 0; 
  const level = student?.level ?? 1;
  const nextLevelXP = level * 1000;
  const previousLevelXP = (level - 1) * 1000;
  const progressToNextLevel = (nextLevelXP - previousLevelXP > 0) ? Math.max(0, Math.min(100, ((xpPoints - previousLevelXP) / (nextLevelXP - previousLevelXP)) * 100)) : 0;
  const xpToNextLevel = nextLevelXP - xpPoints;
  const streak = student?.currentStreak ?? 0;

  const assignedTasksData = await prisma.practiceSession.findMany({
    where: {
      studentId: userId,
      OR: [
        { status: PracticeSessionStatus.NOT_STARTED },
        { status: PracticeSessionStatus.IN_PROGRESS } 
      ],
      assignedByParentId: { not: null }, 
    },
    include: {
        subject: { select: { id: true, name: true}}, 
        topic: { select: { id: true, name: true }},
    },
    orderBy: {
      createdAt: 'desc', 
    },
    take: 5, 
  });

  const assignedTasks: AssignedTask[] = assignedTasksData.map(task => {
    let mockExamPaperIdentifier: AssignedTask['mockExamPaperIdentifier'] = null;
    if (task.type === PracticeSessionType.MOCK_EXAM) {
        if (task.title?.toLowerCase().includes('paper 1')) mockExamPaperIdentifier = 'paper1';
        else if (task.title?.toLowerCase().includes('paper 2')) mockExamPaperIdentifier = 'paper2';
    }
    const baseTask = task as PrismaPracticeSessionType; 
    return {
      ...baseTask,
      subjectId: task.subjectId, 
      subjectName: task.subject?.name,
      topicName: task.topic?.name,
      mockExamPaperIdentifier,
  }});

  // Placeholder for student-specific UI data - fetch this from DB in a real app
  const studentUIData = {
    weeklyChallenge: { // This should be dynamic based on student's progress
      completed: 1, // Example
      total: 5,
      percentage: 20
    },
    badges: student?.studentBadges?.map(sb => sb.badge) || [], // If you fetch studentBadges with relations
    // For now, using a safe default if studentBadges is not fetched or empty
    // badges: [
    //   { id: 1, name: "Initiate", icon: "💡" },
    // ],
    // recentAchievements: [ // This should also be dynamic
    //   { id: 1, title: "Started first practice!", date: "Today", xp: 10 },
    // ]
  };

  // Fetch actual badges for the student
  const studentWithBadges = await prisma.student.findUnique({
    where: { id: userId },
    include: {
        studentBadges: {
            include: {
                badge: true,
            },
            orderBy: {
                awardedAt: 'desc' // Get most recent badges first
            },
            take: 3 // Limit to 3 for the dashboard display
        }
    }
  });
  const actualBadges = studentWithBadges?.studentBadges.map(sb => sb.badge) || [];


  return (
    <div className="p-4 md:p-6 flex gap-6 flex-col">
      {/* Hero Section (remains the same) */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 md:p-8 rounded-2xl shadow-lg text-white">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              Welcome back, {student?.name || "Student"}!
            </h1>
            <p className="mt-1 text-indigo-100 text-sm md:text-base">Ready to continue your learning journey today?</p>
            
            <div className="flex flex-wrap items-center gap-3 md:gap-4 mt-5">
              {student?.xpPoints !== null && student?.xpPoints !== undefined && ( 
                <div className="relative group">
                  <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1.5 md:px-4 md:py-2 rounded-xl">
                    <div className="w-8 h-8 md:w-10 md:h-10 bg-yellow-500 rounded-full flex items-center justify-center text-white shadow-inner">
                      <span className="font-bold text-sm md:text-base">{level}</span>
                    </div>
                    <div>
                      <span className="text-white font-semibold text-sm md:text-base">Level {level}</span>
                      <div className="w-28 md:w-36 mt-1">
                          <div className="w-full bg-white/30 rounded-full h-1.5">
                            <div className="bg-yellow-400 h-1.5 rounded-full" style={{ width: `${progressToNextLevel}%` }} ></div>
                          </div>
                          <div className="flex justify-between text-xs text-white/70 mt-0.5">
                            <span>{previousLevelXP}</span>
                            <span>{nextLevelXP}</span>
                          </div>
                      </div>
                    </div>
                    <div className="absolute hidden group-hover:block bg-white p-3 shadow-xl rounded-lg w-60 md:w-72 text-gray-700 z-10 top-full left-0 mt-2">
                      <p className="font-semibold mb-1.5 text-indigo-700 text-sm">Your Learning Progress</p>
                      <p className="mb-1.5 text-xs">You need {xpToNextLevel < 0 ? 0 : xpToNextLevel} more XP to reach Level {level + 1}</p>
                      <div className="flex items-center gap-1.5 mt-2 text-xs">
                        <FaTrophy className="text-yellow-500" />
                        <span>Total XP: <strong>{xpPoints}</strong></span>
                      </div>
                    </div>
                  </div>
                </div>
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
                    <p className="font-semibold mb-1.5 text-orange-600 text-sm">Activity Streak</p>
                    <p className="mb-1.5 text-xs">Keep practicing daily to maintain your streak!</p>
                    <div className="flex items-center gap-1.5 mt-2 text-xs">
                      <FaFire className="text-orange-500" />
                      <span>Longest streak: <strong>{student?.longestStreak || 0} days</strong></span>
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
                <FaTasks className="mr-2 md:mr-3 text-blue-500"/> Assigned Tasks
              </h2>
            </div>
            {assignedTasks.length > 0 ? (
              <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                {assignedTasks.map(task => (
                  <div key={task.id} className="p-3 border rounded-lg hover:shadow-md transition-shadow bg-blue-50 border-blue-200">
                    <div className="flex justify-between items-start gap-2">
                        <div>
                            <h3 className="font-medium text-blue-700 text-sm leading-tight">{task.title}</h3>
                            <p className="text-xs text-gray-600 mt-0.5">
                                {task.type.replace(/_/g, ' ').toLowerCase()}
                                {task.subjectName && ` - ${task.subjectName}`}
                                {task.topicName && ` / ${task.topicName}`}
                            </p>
                        </div>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0 ${task.status === PracticeSessionStatus.NOT_STARTED ? 'bg-yellow-200 text-yellow-800' : 'bg-orange-200 text-orange-800'}`}>
                            {task.status.replace(/_/g, ' ').toLowerCase()}
                        </span>
                    </div>
                    <div className="mt-2 text-right">
                        <Link href={getTaskPath(task)} passHref>
                           <button className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-3 py-1.5 rounded-md inline-flex items-center">
                               {task.status === PracticeSessionStatus.IN_PROGRESS ? "Resume" : "Start"} <FaPlayCircle className="ml-1.5 h-3 w-3"/>
                           </button>
                        </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No pending assignments from your parent right now.</p>
            )}
          </div>
          {/* Today's Mission (remains the same) */}
           <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Today's Mission</h2>
              <div className="bg-blue-100 text-blue-600 px-2 py-1 rounded-md text-sm font-medium">
                +50 XP
              </div>
            </div>
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-indigo-100 p-3 rounded-xl">
                <FaCheckCircle className="text-indigo-600 text-2xl" />
              </div>
              <div>
                <p className="text-lg font-medium text-gray-800">Solve 10 practice questions</p>
                <p className="text-sm text-gray-500 mt-1">Complete this to maintain your streak!</p>
              </div>
            </div>
            <div className="mt-4">
              <Link href="/student/practice">
                <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-medium transition">
                  Start Now
                </button>
              </Link>
            </div>
          </div>
        </div>
        
        <div className="lg:col-span-2 space-y-6">
          <StudentSetupCheck />
          <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
            <StudentCalendar />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Your Badges</h2>
              <div className="flex justify-around items-center h-24"> 
                {(actualBadges && actualBadges.length > 0) ? (
                    actualBadges.map(badge => (
                        <div key={badge.id} className="flex flex-col items-center" title={badge.name}>
                            {badge.icon && badge.icon.startsWith('/') ? // Check if it's a path
                                <Image src={badge.icon} alt={badge.name} width={36} height={36} className="mb-1 md:w-10 md:h-10"/> :
                                <div className="text-3xl md:text-4xl mb-1">{badge.icon || '🏆'}</div>
                            }
                            {/* <p className="text-xs text-gray-600">{badge.name}</p> */}
                        </div>
                    ))
                ) : (
                    <p className="text-sm text-gray-500">No badges earned yet. Keep practicing!</p>
                )}
              </div>
               <div className="mt-4 text-center">
                <Link href="/student/rewards">
                  <button className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
                    View All Badges →
                  </button>
                </Link>
              </div>
            </div>
            <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100">
              <Announcements />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentPage;