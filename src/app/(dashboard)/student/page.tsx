import Announcements from "@/components/Announcements";
import BigCalendarContainer from "@/components/BigCalendarContainer";
import EventCalendarContainer from "@/components/EventCalendarContainer";
import StudentSetupCheck from "@/components/StudentSetupCheck";
import prisma from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import Image from "next/image";
import Link from "next/link";

const StudentPage = async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id;
  
  console.log(`Student page loaded for user: ${userId}`);

  // Get student information including XP points
  const student = await prisma.student.findUnique({
    where: { id: userId! },
    select: { 
      name: true,
      xpPoints: true
    }
  });

  // Calculate level and progress
  const xpPoints = student?.xpPoints || 0;
  const level = Math.floor(xpPoints / 1000) + 1;
  const nextLevelXP = level * 1000;
  const previousLevelXP = (level - 1) * 1000;
  const progressToNextLevel = ((xpPoints - previousLevelXP) / (nextLevelXP - previousLevelXP)) * 100;
  const xpToNextLevel = nextLevelXP - xpPoints;

  const classItem = await prisma.class.findMany({
    where: {
      students: { some: { id: userId! } },
    },
  });

  console.log(`Found ${classItem.length} classes for student:`, classItem);

  // If we have a class, let's check for lessons
  if (classItem.length > 0) {
    const lessons = await prisma.lesson.findMany({
      where: {
        classId: classItem[0].id,
      },
    });
    console.log(`Found ${lessons.length} lessons for class ${classItem[0].id}`);
  }

  // Other gamification data
  const studentData = {
    streak: 7,
    weeklyChallenge: {
      completed: 3,
      total: 5,
      percentage: 60
    },
    badges: [
      { id: 1, name: "Quick Learner", icon: "🏆" },
      { id: 2, name: "Math Whiz", icon: "🔢" },
      { id: 3, name: "Streak Master", icon: "🔥" }
    ]
  };

  return (
    <div className="p-4 flex gap-4 flex-col">
      {/* Gamification Header */}
      <div className="bg-white p-6 rounded-lg shadow-sm mb-2">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Welcome back, {student?.name || "Student"}!
            </h1>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex flex-col gap-1 relative group">
                <div className="flex items-center gap-2">
                  <div className="bg-yellow-100 px-3 py-1 rounded-full">
                    <span className="text-yellow-600 font-semibold">Level {level}</span>
                  </div>
                  <div className="flex items-center gap-1 bg-blue-50 px-3 py-1 rounded-full">
                    <span className="text-blue-600 font-medium">{xpPoints} XP</span>
                  </div>
                  <div className="cursor-help ml-1">
                    <span className="text-gray-400 text-sm">ⓘ</span>
                    <div className="absolute hidden group-hover:block bg-white p-3 shadow-lg rounded-md w-72 text-sm text-gray-600 border border-gray-200 z-10 top-full left-0 mt-2">
                      <p className="font-medium mb-1">XP & Level System</p>
                      <p className="mb-2">You gain XP by completing activities, quizzes, and daily challenges.</p>
                      <p className="mb-1">• You need 1000 XP to reach each new level</p>
                      <p className="mb-1">• You need {xpToNextLevel} more XP to reach Level {level + 1}</p>
                      <p>• Higher levels unlock new badges and achievements</p>
                    </div>
                  </div>
                </div>
                <div className="w-64 mt-1">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>{previousLevelXP} XP</span>
                    <span>{nextLevelXP} XP</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-yellow-400 h-2 rounded-full" 
                      style={{ width: `${progressToNextLevel}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 bg-orange-50 px-3 py-1 rounded-full">
                <span className="text-orange-500">🔥</span>
                <span className="text-orange-600 font-medium">{studentData.streak} day streak</span>
              </div>
            </div>
          </div>
          <Link href="/student/practice">
            <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium transition">
              Continue Practice
            </button>
          </Link>
        </div>
      </div>

      {/* Today's Goal and Weekly Challenge Progress */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-3">Today's Mission</h2>
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-3 rounded-full">
              <span className="text-2xl">📝</span>
            </div>
            <p className="text-lg">Solve 10 practice questions!</p>
          </div>
          <div className="mt-4 text-sm text-gray-500">
            Complete this mission to earn 50 XP and maintain your streak!
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-3">Weekly Challenge Progress</h2>
          <div className="mb-2 flex justify-between text-sm">
            <span>3 of 5 challenges completed</span>
            <span className="font-medium">{studentData.weeklyChallenge.percentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-indigo-600 h-2.5 rounded-full" 
              style={{ width: `${studentData.weeklyChallenge.percentage}%` }}
            ></div>
          </div>
          <div className="mt-4">
            <Link href="/student/weekly-challenge">
              <span className="text-indigo-600 font-medium hover:text-indigo-800 cursor-pointer">
                View challenges →
              </span>
            </Link>
          </div>
        </div>
      </div>

      <StudentSetupCheck />
      
      {/* Calendar and Schedule */}
      <div className="flex gap-4 flex-col xl:flex-row">
        {/* LEFT */}
        <div className="w-full xl:w-2/3">
          <div className="h-full bg-white p-4 rounded-md shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-xl font-semibold">
                Schedule {classItem.length > 0 ? `(${classItem[0].name})` : ""}
              </h1>
            </div>

            {classItem.length > 0 ? (
              <div className="h-[600px]">
                <BigCalendarContainer type="classId" id={classItem[0].id} />
              </div>
            ) : (
              <div className="p-4 text-center">
                No class assigned to this student.
              </div>
            )}
          </div>
        </div>
        
        {/* RIGHT */}
        <div className="w-full xl:w-1/3 flex flex-col gap-8">
          <EventCalendarContainer searchParams={{}} />
          <Announcements />
          
          {/* Badges and Achievements */}
          <div className="bg-white p-4 rounded-md shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Recent Badges</h2>
            <div className="flex gap-4">
              {studentData.badges.map(badge => (
                <div key={badge.id} className="flex flex-col items-center">
                  <div className="text-3xl mb-2">{badge.icon}</div>
                  <div className="text-sm font-medium">{badge.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentPage;
