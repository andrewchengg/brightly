"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FaBook,
  FaCalculator,
  FaFlask,
  FaGlobeAmericas,
  FaLanguage,
  FaLock,
  FaCrown,
  FaGift,
} from "react-icons/fa";

interface SubjectWithPricing {
  id: number;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  gradient: string;
  disabled: boolean;
  comingSoon: boolean;
  // Removed subscription-related fields for development
}

interface SubjectSelectionWithPricingProps {
  studentId: string;
  className?: string;
}

// Updated subjects data without subscription restrictions
const subjectsWithPricing: SubjectWithPricing[] = [
  {
    id: 1,
    name: "Mathematics",
    description:
      "Build strong mathematical foundations with interactive problem-solving",
    icon: FaCalculator,
    gradient: "from-blue-500 to-indigo-600",
    disabled: false,
    comingSoon: false,
  },
  {
    id: 2,
    name: "Science",
    description: "Explore the wonders of science through hands-on experiments",
    icon: FaFlask,
    gradient: "from-green-500 to-emerald-600",
    disabled: true,
    comingSoon: true,
  },
  {
    id: 3,
    name: "English",
    description: "Master English language skills with comprehensive practice",
    icon: FaLanguage,
    gradient: "from-purple-500 to-pink-600",
    disabled: true,
    comingSoon: true,
  },
  {
    id: 4,
    name: "Chinese",
    description: "Learn Chinese language and culture with AI-powered tutoring",
    icon: FaBook,
    gradient: "from-red-500 to-orange-600",
    disabled: false,
    comingSoon: false,
  },
  {
    id: 5,
    name: "Social Studies",
    description: "Understand the world around us through history and geography",
    icon: FaGlobeAmericas,
    gradient: "from-yellow-500 to-orange-500",
    disabled: true,
    comingSoon: true,
  },
];

const SubjectSelectionWithPricing: React.FC<
  SubjectSelectionWithPricingProps
> = ({ studentId, className = "" }) => {
  const router = useRouter();
  const [subjects, setSubjects] =
    useState<SubjectWithPricing[]>(subjectsWithPricing);

  console.log(
    "[DEV MODE] SubjectSelectionWithPricing: All subscription restrictions removed"
  );

  const handleSubjectClick = (subject: SubjectWithPricing) => {
    if (subject.disabled || subject.comingSoon) {
      return;
    }

    // DEVELOPMENT MODE: Direct navigation to subject practice, no subscription checks
    router.push(`/student/practice/subject/${subject.id}`);
  };

  return (
    <div className={`w-full max-w-6xl mx-auto p-6 ${className}`}>
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Choose Your Subject
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Start your learning journey with our comprehensive practice sessions
          designed to help you excel.
        </p>
        {/* Development mode notice */}
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            🚧 <strong>Development Mode:</strong> All subjects are freely
            accessible
          </p>
        </div>
      </div>

      {/* Subjects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {subjects.map((subject) => {
          const IconComponent = subject.icon;

          return (
            <Card
              key={subject.id}
              className={`relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-105 border-2 ${
                subject.disabled || subject.comingSoon
                  ? "border-gray-200 bg-gray-50"
                  : "border-gray-200 hover:border-indigo-300 bg-white"
              }`}
              onClick={() => handleSubjectClick(subject)}
            >
              {/* Gradient Background */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${subject.gradient} opacity-10`}
              ></div>

              <div className="relative p-6">
                {/* Subject Icon */}
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`p-3 rounded-full bg-gradient-to-br ${subject.gradient} text-white shadow-lg`}
                  >
                    <IconComponent className="text-2xl" />
                  </div>

                  {/* Development badge for available subjects */}
                  {!subject.disabled && !subject.comingSoon && (
                    <Badge className="bg-green-500 text-white text-xs">
                      <FaCrown className="mr-1" />
                      Available
                    </Badge>
                  )}
                </div>

                {/* Subject Details */}
                <div className="mb-4">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {subject.name}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {subject.description}
                  </p>
                </div>

                {/* Action Button */}
                <div className="mt-auto">
                  {subject.disabled || subject.comingSoon ? (
                    <Button
                      disabled
                      className="w-full bg-gray-300 text-gray-500 cursor-not-allowed"
                    >
                      <FaLock className="mr-2" />
                      {subject.comingSoon ? "Coming Soon" : "Locked"}
                    </Button>
                  ) : (
                    <Button
                      className={`w-full bg-gradient-to-r ${subject.gradient} hover:opacity-90 text-white font-semibold`}
                    >
                      Start Practicing
                    </Button>
                  )}
                </div>
              </div>

              {/* Coming Soon Overlay */}
              {(subject.disabled || subject.comingSoon) && (
                <div className="absolute inset-0 bg-gray-200/50 flex items-center justify-center">
                  <div className="text-center">
                    <FaLock className="text-gray-400 text-3xl mb-2 mx-auto" />
                    <p className="text-gray-500 font-medium">
                      {subject.comingSoon ? "Coming Soon" : "Locked"}
                    </p>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Development Notice */}
      <div className="text-center pt-6 border-t border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Development Mode Active
        </h3>
        <p className="text-gray-600 mb-4">
          All subscription restrictions have been temporarily removed for
          development testing.
        </p>
      </div>
    </div>
  );
};

export default SubjectSelectionWithPricing;
