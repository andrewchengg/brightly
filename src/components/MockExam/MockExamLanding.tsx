// src/components/MockExam/MockExamLanding.tsx
"use client";

import { useState, useEffect } from "react";
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
  FaFlag,
  FaTimes,
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
    color: "purple",
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
    color: "purple",
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
    color: "purple",
    description: "World history and historical analysis",
    available: false,
    papers: [],
  },
];

const QUESTION_REPORT_TYPES = [
  { value: "TECHNICAL_ISSUE", label: "Technical Issue" },
  { value: "SYSTEM_ERROR", label: "System Error" },
  { value: "UI_PROBLEM", label: "Interface Problem" },
  { value: "PERFORMANCE_ISSUE", label: "Performance Issue" },
  { value: "OTHER", label: "Other" },
];

function ReportIssueModal({
  open,
  onClose,
  studentId,
}: {
  open: boolean;
  onClose: () => void;
  studentId: string | null;
}) {
  const [reportType, setReportType] = useState(QUESTION_REPORT_TYPES[0].value);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId) {
      setError("Missing user info.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/questions/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: null, // No specific question for system issues
          studentId,
          reportType,
          description: `[MOCK EXAM SYSTEM] ${description}`,
        }),
      });
      if (!res.ok) throw new Error("Failed to submit report");
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!open) {
      setReportType(QUESTION_REPORT_TYPES[0].value);
      setDescription("");
      setSuccess(false);
      setError(null);
    }
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"
          onClick={onClose}
        >
          <FaTimes />
        </button>
        <h2 className="text-lg font-bold mb-4 flex items-center">
          <FaFlag className="mr-2 text-red-500" /> Report System Issue
        </h2>
        {success ? (
          <div className="text-green-600 font-semibold text-center py-4">
            Thank you! Your report has been submitted.
            <button
              className="block mt-4 mx-auto px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Type of Issue
              </label>
              <select
                className="w-full border rounded p-2"
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                required
              >
                {QUESTION_REPORT_TYPES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Description
              </label>
              <textarea
                className="w-full border rounded p-2 min-h-[80px]"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the issue you're experiencing..."
                required
              />
            </div>
            {error && <div className="text-red-600 text-sm">{error}</div>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-60"
                disabled={submitting}
              >
                {submitting ? "Submitting..." : "Submit Report"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

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
  const [showReportModal, setShowReportModal] = useState(false);
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
          ? "bg-purple-800"
          : "bg-purple-100",
        border: isSelected ? "border-purple-800" : "border-purple-200",
        text: isSelected ? "text-white" : "text-purple-800",
        hover: "hover:border-purple-300 hover:shadow-lg",
      },
      green: {
        bg: isSelected
          ? "bg-purple-800"
          : "bg-purple-100",
        border: isSelected ? "border-purple-800" : "border-purple-200",
        text: isSelected ? "text-white" : "text-purple-800",
        hover: "hover:border-purple-300 hover:shadow-lg",
      },
      purple: {
        bg: isSelected
          ? "bg-purple-800"
          : "bg-purple-100",
        border: isSelected ? "border-purple-800" : "border-purple-200",
        text: isSelected ? "text-white" : "text-purple-800",
        hover: "hover:border-purple-300 hover:shadow-lg",
      },
      orange: {
        bg: isSelected
          ? "bg-purple-800"
          : "bg-purple-100",
        border: isSelected ? "border-purple-800" : "border-purple-200",
        text: isSelected ? "text-white" : "text-purple-800",
        hover: "hover:border-purple-300 hover:shadow-lg",
      },
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.blue;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-100">
      <div className="max-w-6xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="text-center mb-12 relative">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-purple-800 rounded-full mb-6 shadow-lg">
            <FaCheckCircle className="text-3xl text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-purple-800 mb-4">
            Mock Exam Center
          </h1>
          <p className="text-xl text-gray-600">
            Choose your subject and prepare for success
          </p>
          
          {/* Report Issue Button */}
          <button
            className="absolute top-0 right-0 flex items-center text-xs text-red-600 hover:text-red-800 border border-red-200 hover:border-red-400 px-2 py-1 rounded transition"
            onClick={() => setShowReportModal(true)}
          >
            <FaFlag className="mr-1" /> Report Issue
          </button>
        </div>

        {/* Subject Selection */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
            <FaStar className="mr-3 text-purple-800" />
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
              <FaClock className="mr-3 text-purple-800" />
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
                        ? "border-purple-800 bg-purple-100 shadow-xl scale-105 ring-2 ring-purple-300"
                        : "border-gray-300 hover:border-purple-300 bg-white hover:shadow-lg"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-bold text-xl text-gray-800">
                        {paper.name}
                      </h3>
                      {isSelected && (
                        <FaCheckCircle className="text-purple-800 text-xl" />
                      )}
                    </div>

                    <p className="text-gray-600 mb-4">{paper.description}</p>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center text-purple-800">
                        <FaClock className="mr-2" />
                        <span className="font-semibold">
                          {paper.duration} minutes
                        </span>
                      </div>
                      <div className="flex items-center text-purple-800">
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
                className="bg-purple-800 hover:bg-purple-900 text-white font-bold text-xl px-12 py-4 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-300"
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
            <FaBook className="mr-3 text-purple-800" />
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

      <ReportIssueModal
        open={showReportModal}
        onClose={() => setShowReportModal(false)}
        studentId={userId}
      />
    </div>
  );
}
