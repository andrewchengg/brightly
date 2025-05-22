import { useState } from "react";
import Announcements from "@/components/Announcements";
import StudentSetupCheck from "@/components/StudentSetupCheck";
import prisma from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import Image from "next/image";
import Link from "next/link";
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { FaCalendarPlus, FaChartLine, FaCheckCircle, FaFire, FaMedal, FaRegCalendarCheck, FaTrophy } from "react-icons/fa";

// Create a custom calendar component that allows adding events
const EnhancedCalendar = ({ events }) => {
  // Client-side component logic will be implemented in a separate component
  return null;
};

const StudentPage = async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id;
  
  console.log(`Student page loaded for user: ${userId}`);

  // Get student information including XP points and streak data
  const student = await prisma.student.findUnique({
    where: { id: userId! },
    select: { 
      name: true,
      xpPoints: true,
      currentStreak: true,
      longestStreak: true,
      lastActivityDate: true
    }
  });

  // Calculate level and progress
  const xpPoints = student?.xpPoints || 0;
  const level = Math.floor(xpPoints / 1000) + 1;
  const nextLevelXP = level * 1000;
  const previousLevelXP = (level - 1) * 1000;
  const progressToNextLevel = ((xpPoints - previousLevelXP) / (nextLevelXP - previousLevelXP)) * 100;
  const xpToNextLevel = nextLevelXP - xpPoints;

  // Get streak information
  const streak = student?.currentStreak || 0;

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
    weeklyChallenge: {
      completed: 3,
      total: 5,
      percentage: 60
    },
    badges: [
      { id: 1, name: "Quick Learner", icon: "🏆" },
      { id: 2, name: "Math Whiz", icon: "🔢" },
      { id: 3, name: "Streak Master", icon: "🔥" }
    ],
    recentAchievements: [
      { id: 1, title: "Completed 5 Math exercises", date: "Today", xp: 50 },
      { id: 2, title: "3-day streak", date: "Yesterday", xp: 30 },
      { id: 3, title: "Finished weekly challenge", date: "2 days ago", xp: 100 }
    ]
  };

  return (
    <div className="p-4 md:p-6 flex gap-6 flex-col">
      {/* Hero Section with Gamification Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 md:p-8 rounded-2xl shadow-lg text-white">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              Welcome back, {student?.name || "Student"}!
            </h1>
            <p className="mt-1 text-indigo-100 text-sm md:text-base">Ready to continue your learning journey today?</p>
            
            <div className="flex flex-wrap items-center gap-4 mt-5">
              {/* Level Badge */}
              <div className="relative group">
                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl">
                  <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center text-white shadow-inner">
                    <span className="font-bold">{level}</span>
                  </div>
                  <div>
                    <span className="text-white font-semibold">Level {level}</span>
                    <div className="w-36 mt-1">
                      <div className="w-full bg-white/30 rounded-full h-1.5">
                        <div 
                          className="bg-yellow-400 h-1.5 rounded-full" 
                          style={{ width: `${progressToNextLevel}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs text-white/70 mt-1">
                        <span>{previousLevelXP}</span>
                        <span>{nextLevelXP}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Tooltip */}
                  <div className="absolute hidden group-hover:block bg-white p-4 shadow-xl rounded-lg w-72 text-gray-700 z-10 top-full left-0 mt-2">
                    <p className="font-semibold mb-2 text-indigo-700">Your Learning Progress</p>
                    <p className="mb-2 text-sm">You need {xpToNextLevel} more XP to reach Level {level + 1}</p>
                    <div className="flex items-center gap-2 mt-3 text-sm">
                      <FaTrophy className="text-yellow-500" />
                      <span>Total XP: <strong>{xpPoints}</strong></span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* XP Badge */}
              <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl flex items-center gap-2">
                <FaMedal className="text-yellow-300 text-xl" />
                <span className="font-semibold">{xpPoints} XP</span>
              </div>
              
              {/* Streak Badge */}
              <div className="relative group">
                <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl flex items-center gap-2">
                  <FaFire className="text-orange-400 text-xl" />
                  <span className="font-semibold">{streak} day streak</span>
                  
                  {/* Tooltip */}
                  <div className="absolute hidden group-hover:block bg-white p-4 shadow-xl rounded-lg w-64 text-gray-700 z-10 top-full left-0 mt-2">
                    <p className="font-semibold mb-2 text-orange-600">Activity Streak</p>
                    <p className="mb-2 text-sm">Keep practicing daily to maintain your streak!</p>
                    <div className="flex items-center gap-2 mt-3 text-sm">
                      <FaFire className="text-orange-500" />
                      <span>Longest streak: <strong>{student?.longestStreak || 0} days</strong></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <Link href="/student/practice" className="mt-6 md:mt-0">
            <button className="bg-white text-indigo-700 hover:bg-indigo-50 px-6 py-3 rounded-xl font-semibold transition duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-1">
              Continue Learning
            </button>
          </Link>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Today's Mission and Weekly Challenge */}
        <div className="lg:col-span-1 space-y-6">
          {/* Today's Mission */}
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
          
          {/* Weekly Challenge */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Weekly Challenge</h2>
              <div className="bg-green-100 text-green-600 px-2 py-1 rounded-md text-sm font-medium">
                3/5 completed
              </div>
            </div>
            
            <div className="mb-3">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Progress</span>
                <span className="font-medium text-indigo-600">{studentData.weeklyChallenge.percentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-indigo-600 h-2.5 rounded-full" 
                  style={{ width: `${studentData.weeklyChallenge.percentage}%` }}
                ></div>
              </div>
            </div>
            
            <div className="space-y-3 my-4">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                  <FaCheckCircle className="text-green-500 text-xs" />
                </div>
                <span className="text-gray-700">Complete 3 Math exercises</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                  <FaCheckCircle className="text-green-500 text-xs" />
                </div>
                <span className="text-gray-700">Achieve 80% in a practice session</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                  <FaCheckCircle className="text-green-500 text-xs" />
                </div>
                <span className="text-gray-700">Maintain a 3-day streak</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-gray-400 text-xs">4</span>
                </div>
                <span className="text-gray-500">Complete a mock exam</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-gray-400 text-xs">5</span>
                </div>
                <span className="text-gray-500">Earn 200 XP this week</span>
              </div>
            </div>
            
            <div className="mt-4">
              <Link href="/student/weekly-challenge">
                <button className="w-full bg-white border border-indigo-600 text-indigo-600 hover:bg-indigo-50 py-2 rounded-lg font-medium transition">
                  View Challenges
                </button>
              </Link>
            </div>
          </div>
          
          {/* Recent Achievements */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Recent Achievements</h2>
            
            <div className="space-y-4">
              {studentData.recentAchievements.map(achievement => (
                <div key={achievement.id} className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div className="flex items-start gap-3">
                    <div className="bg-yellow-100 p-2 rounded-lg mt-1">
                      <FaTrophy className="text-yellow-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{achievement.title}</p>
                      <p className="text-xs text-gray-500">{achievement.date}</p>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-indigo-600">+{achievement.xp} XP</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Middle and Right columns - Calendar and Other widgets */}
        <div className="lg:col-span-2 space-y-6">
          <StudentSetupCheck />
          
          {/* Enhanced Calendar */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800">
                Your Schedule {classItem.length > 0 ? `(${classItem[0].name})` : ""}
              </h2>
              <button className="flex items-center gap-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-3 py-1.5 rounded-lg text-sm font-medium transition">
                <FaCalendarPlus size={14} />
                <span>Add Event</span>
              </button>
            </div>
            
            <div className="h-[500px]">
              {/* Calendar component will be replaced with client component */}
              <div className="border rounded-lg p-4 h-full">
                <div className="grid grid-cols-7 gap-1 h-full">
                  {/* Calendar Header */}
                  <div className="text-center font-medium text-gray-800 pb-2">Sun</div>
                  <div className="text-center font-medium text-gray-800 pb-2">Mon</div>
                  <div className="text-center font-medium text-gray-800 pb-2">Tue</div>
                  <div className="text-center font-medium text-gray-800 pb-2">Wed</div>
                  <div className="text-center font-medium text-gray-800 pb-2">Thu</div>
                  <div className="text-center font-medium text-gray-800 pb-2">Fri</div>
                  <div className="text-center font-medium text-gray-800 pb-2">Sat</div>
                  
                  {/* Calendar days - placeholder for client component */}
                  {Array(35).fill(0).map((_, index) => {
                    const day = (index % 7) + 1;
                    const isToday = day === new Date().getDate() % 7;
                    return (
                      <div 
                        key={index} 
                        className={`border rounded-lg p-1 h-16 overflow-hidden transition hover:bg-gray-50 cursor-pointer
                          ${isToday ? 'bg-indigo-50 border-indigo-200' : ''}`}
                      >
                        <div className="text-xs font-medium mb-1 ml-1">{day}</div>
                        {index === 10 && (
                          <div className="text-xs bg-blue-100 text-blue-700 p-1 rounded mb-1 truncate">
                            Math Quiz
                          </div>
                        )}
                        {index === 15 && (
                          <div className="text-xs bg-green-100 text-green-700 p-1 rounded mb-1 truncate">
                            Study Group
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          
          {/* Bottom grid for smaller widgets */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Badges/Rewards */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Your Badges</h2>
              <div className="flex justify-between">
                {studentData.badges.map(badge => (
                  <div key={badge.id} className="flex flex-col items-center">
                    <div className="text-4xl mb-3">{badge.icon}</div>
                    <div className="text-sm font-medium text-gray-700">{badge.name}</div>
                  </div>
                ))}
              </div>
              <div className="mt-6 text-center">
                <Link href="/student/rewards">
                  <button className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
                    View All Badges →
                  </button>
                </Link>
              </div>
            </div>
            
            {/* Announcements Preview */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <Announcements limit={2} showViewAll={true} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentPage;
