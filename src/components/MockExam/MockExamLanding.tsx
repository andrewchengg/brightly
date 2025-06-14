// src/components/MockExam/MockExamLanding.tsx
"use client";

import { useState } from "react";
import MockExamComponent from "./MockExamComponent";
import {
  FaCalculator,
  FaFlask,
  FaBook,
  FaGlobeAmericas,
  FaClock,
  FaStar,
  FaPlay,
  FaLock,
  FaCheckCircle,
} from "react-icons/fa";

interface PaperConfig {
  id: string;
  name: string;
  duration: number; // Duration in minutes
  totalMarks: number;
  description: string;
}

interface SubjectConfig {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  available: boolean;
  papers: PaperConfig[];
}

const subjectsConfig: SubjectConfig[] = [
  {
    id: "mathematics",
    name: "Mathematics",
    icon: <FaCalculator className="text-2xl" />,
    color: "blue",
    description: "Algebraic concepts, geometry, and calculus",
    available: true,
    papers: [
      {
        id: "paper1",
        name: "Paper 1",
        duration: 60,
        totalMarks: 45,
        description: "Booklet A (MCQ) and Booklet B (Short Answer)",
      },
      {
        id: "paper2",
        name: "Paper 2",
        duration: 90,
        totalMarks: 55,
        description: "Short Answer and Long Answer Questions",
      },
    ],
  },
  {
    id: "science",
    name: "Science",
    icon: <FaFlask className="text-2xl" />,
    color: "green",
    description: "Physics, chemistry, and biology concepts",
    available: false,
    papers: [],
  },
  {
    id: "english",
    name: "English",
    icon: <FaBook className="text-2xl" />,
    color: "purple",
    description: "Literature, grammar, and composition",
    available: false,
    papers: [],
  },
  {
    id: "history",
    name: "History",
    icon: <FaGlobeAmericas className="text-2xl" />,
    color: "orange",
    description: "World history and historical analysis",
    available: false,
    papers: [],
  },
];

interface MockExamLandingProps {
  userId: string;
}

// PaperSelection will now only be 'paper1' or 'paper2'
type PaperSelection = "paper1" | "paper2";

export default function MockExamLanding({ userId }: MockExamLandingProps) {
  const [examStarted, setExamStarted] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(
    "mathematics"
  );
  const [selectedPaperOption, setSelectedPaperOption] =
    useState<PaperSelection | null>(null);
  // const router = useRouter();

  const handleSubjectSelect = (subjectId: string) => {
    setSelectedSubject(subjectId);
    setSelectedPaperOption(null);
  };

  const handlePaperOptionSelect = (paperOption: PaperSelection) => {
    setSelectedPaperOption(paperOption);
  };

  const handleStartExam = () => {
    if (selectedSubject && selectedPaperOption) {
      setExamStarted(true);
    } else {
      alert("Please select a subject and a paper to start the exam.");
    }
  };

  const getCurrentSubjectConfig = (): SubjectConfig | undefined => {
    return subjectsConfig.find((s) => s.id === selectedSubject);
  };

  let examDurationMinutes = 0;
  let initialPaperIdForComponent = ""; // Will be 'paper1' or 'paper2'
  const currentSubjectData = getCurrentSubjectConfig();

  if (currentSubjectData && selectedPaperOption) {
    // No 'both' case anymore for duration calculation here
    const paperConfig = currentSubjectData.papers.find(
      (p) => p.id === selectedPaperOption
    );
    examDurationMinutes = paperConfig?.duration || 0;
    initialPaperIdForComponent = selectedPaperOption;
  }

  if (
    examStarted &&
    selectedSubject &&
    selectedPaperOption &&
    initialPaperIdForComponent
  ) {
    if (
      !currentSubjectData ||
      !currentSubjectData.papers.find(
        (p) => p.id === initialPaperIdForComponent
      )
    ) {
      return (
        <div className="p-8 text-center text-red-500">
          Error: Invalid exam configuration. Please re-select.
        </div>
      );
    }
    return (
      <MockExamComponent
        userId={userId}
        examDurationMinutes={examDurationMinutes}
        subjectId={selectedSubject}
        paperId={initialPaperIdForComponent}
        isBothPapers={false} // Always false now
      />
    );
  }

  const getColorClasses = (color: string, isSelected: boolean = false) => {
    const colorMap = {
      blue: {
        bg: isSelected
          ? "bg-gradient-to-r from-blue-500 to-indigo-600"
          : "bg-gradient-to-r from-blue-50 to-indigo-50",
        border: isSelected ? "border-blue-500" : "border-blue-200",
        text: isSelected ? "text-white" : "text-blue-700",
        hover: "hover:border-blue-400 hover:shadow-lg",
      },
      green: {
        bg: isSelected
          ? "bg-gradient-to-r from-green-500 to-emerald-600"
          : "bg-gradient-to-r from-green-50 to-emerald-50",
        border: isSelected ? "border-green-500" : "border-green-200",
        text: isSelected ? "text-white" : "text-green-700",
        hover: "hover:border-green-400 hover:shadow-lg",
      },
      purple: {
        bg: isSelected
          ? "bg-gradient-to-r from-purple-500 to-violet-600"
          : "bg-gradient-to-r from-purple-50 to-violet-50",
        border: isSelected ? "border-purple-500" : "border-purple-200",
        text: isSelected ? "text-white" : "text-purple-700",
        hover: "hover:border-purple-400 hover:shadow-lg",
      },
      orange: {
        bg: isSelected
          ? "bg-gradient-to-r from-orange-500 to-red-600"
          : "bg-gradient-to-r from-orange-50 to-red-50",
        border: isSelected ? "border-orange-500" : "border-orange-200",
        text: isSelected ? "text-white" : "text-orange-700",
        hover: "hover:border-orange-400 hover:shadow-lg",
      },
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.blue;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50">
      <div className="max-w-6xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full mb-6 shadow-lg">
            <FaCheckCircle className="text-3xl text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mb-4">
            Mock Exam Center
          </h1>
          <p className="text-xl text-gray-600">
            Choose your subject and prepare for success
          </p>
        </div>

        {/* Subject Selection */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
            <FaStar className="mr-3 text-indigo-500" />
            Select Subject
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {subjectsConfig.map((subject) => {
              const isSelected = selectedSubject === subject.id;
              const colorClasses = getColorClasses(subject.color, isSelected);

              return (
                <button
                  key={subject.id}
                  onClick={() =>
                    subject.available ? handleSubjectSelect(subject.id) : null
                  }
                  disabled={!subject.available}
                  className={`relative p-6 rounded-xl border-2 transition-all duration-300 transform ${
                    subject.available
                      ? `${colorClasses.bg} ${colorClasses.border} ${colorClasses.hover} hover:scale-105 cursor-pointer`
                      : "bg-gray-100 border-gray-200 cursor-not-allowed opacity-60"
                  } ${isSelected ? "scale-105 shadow-xl" : ""}`}
                >
                  <div className="text-center">
                    <div
                      className={`mb-4 ${
                        subject.available ? colorClasses.text : "text-gray-400"
                      }`}
                    >
                      {subject.icon}
                    </div>
                    <h3
                      className={`font-bold text-lg mb-2 ${
                        subject.available ? colorClasses.text : "text-gray-500"
                      }`}
                    >
                      {subject.name}
                    </h3>
                    <p
                      className={`text-sm ${
                        subject.available
                          ? isSelected
                            ? "text-white/80"
                            : "text-gray-600"
                          : "text-gray-400"
                      }`}
                    >
                      {subject.description}
                    </p>

                    {!subject.available && (
                      <div className="absolute top-4 right-4">
                        <FaLock className="text-gray-400" />
                      </div>
                    )}

                    {isSelected && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                        <FaCheckCircle className="text-white text-sm" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {!selectedSubject && (
            <div className="mt-6 text-center text-gray-500">
              <p>Please select a subject to continue</p>
            </div>
          )}
        </div>

        {/* Paper Selection */}
        {selectedSubject && getCurrentSubjectConfig()?.available && (
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <FaClock className="mr-3 text-indigo-500" />
              Select Paper for {getCurrentSubjectConfig()?.name}
            </h2>

            <div className="grid gap-6 md:grid-cols-2">
              {getCurrentSubjectConfig()?.papers.map((paper) => {
                const isSelected = selectedPaperOption === paper.id;

                return (
                  <button
                    key={paper.id}
                    onClick={() =>
                      handlePaperOptionSelect(paper.id as PaperSelection)
                    }
                    className={`p-6 rounded-xl border-2 text-left transition-all duration-300 transform hover:scale-105 ${
                      isSelected
                        ? "border-indigo-500 bg-gradient-to-r from-indigo-50 to-purple-50 shadow-xl scale-105 ring-2 ring-indigo-300"
                        : "border-gray-300 hover:border-indigo-400 bg-white hover:shadow-lg"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-bold text-xl text-gray-800">
                        {paper.name}
                      </h3>
                      {isSelected && (
                        <FaCheckCircle className="text-indigo-500 text-xl" />
                      )}
                    </div>

                    <p className="text-gray-600 mb-4">{paper.description}</p>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center text-blue-600">
                        <FaClock className="mr-2" />
                        <span className="font-semibold">
                          {paper.duration} minutes
                        </span>
                      </div>
                      <div className="flex items-center text-green-600">
                        <FaStar className="mr-2" />
                        <span className="font-semibold">
                          {paper.totalMarks} marks
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Coming Soon for unavailable subjects */}
        {selectedSubject && !getCurrentSubjectConfig()?.available && (
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 border border-gray-100 text-center">
            <div className="mb-4">
              <FaLock className="text-4xl text-gray-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-700 mb-2">
                Coming Soon!
              </h3>
              <p className="text-gray-600">
                {getCurrentSubjectConfig()?.name} mock exams are currently being
                prepared. Please check back later or try Mathematics which is
                available now.
              </p>
            </div>
          </div>
        )}

        {/* Start Exam Button */}
        {selectedPaperOption && getCurrentSubjectConfig()?.available && (
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 border border-gray-100">
            <div className="text-center">
              <button
                onClick={handleStartExam}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold text-xl px-12 py-4 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-300"
              >
                <FaPlay className="mr-3" />
                Start {getCurrentSubjectConfig()?.name} -{" "}
                {
                  getCurrentSubjectConfig()?.papers.find(
                    (p) => p.id === selectedPaperOption
                  )?.name
                }
              </button>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
            <FaBook className="mr-3 text-indigo-500" />
            Important Instructions
          </h3>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-700 mb-3">
                General Guidelines:
              </h4>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-indigo-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Ensure you have a stable internet connection
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-indigo-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Once started, the timer cannot be paused
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-indigo-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  The exam will auto-submit when time expires
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-indigo-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Save your answers frequently during the exam
                </li>
              </ul>
            </div>

            {selectedSubject === "mathematics" && (
              <div>
                <h4 className="font-semibold text-gray-700 mb-3">
                  Mathematics Specific:
                </h4>
                <ul className="space-y-2 text-gray-600">
                  {selectedPaperOption === "paper1" && (
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      Paper 1: Calculators are NOT allowed
                    </li>
                  )}
                  {selectedPaperOption === "paper2" && (
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      Paper 2: Calculators ARE allowed
                    </li>
                  )}
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    Show all working for full marks
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    Read questions carefully before answering
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
