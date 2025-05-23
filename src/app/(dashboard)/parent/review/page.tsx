"use client";

import { useState, useEffect } from "react";
import { FaLightbulb, FaBook, FaCalendarAlt, FaChartBar, FaEye, FaTrophy, FaUserGraduate } from "react-icons/fa";

// Mock data for children
const mockChildren = [
  { id: 1, name: "Emma Johnson", class: "Grade 8A" },
  { id: 2, name: "Alex Johnson", class: "Grade 6B" },
];

// Mock data for wrong questions - in a real app, this would come from an API
const mockWrongQuestions = [
  {
    id: 1,
    childId: 1,
    childName: "Emma Johnson",
    subject: "Mathematics",
    topic: "Algebra",
    question: "Solve for x: 2x + 5 = 15",
    childAnswer: "4",
    correctAnswer: "5",
    explanation: "To solve: 2x + 5 = 15, subtract 5 from both sides: 2x = 10, then divide by 2: x = 5",
    examType: "Practice",
    date: "2024-01-15",
    difficulty: "Medium"
  },
  {
    id: 2,
    childId: 1,
    childName: "Emma Johnson",
    subject: "Science",
    topic: "Physics",
    question: "What is the formula for kinetic energy?",
    childAnswer: "KE = mv²",
    correctAnswer: "KE = ½mv²",
    explanation: "Kinetic energy is half the mass times velocity squared: KE = ½mv²",
    examType: "Mock Exam",
    date: "2024-01-14",
    difficulty: "Easy"
  },
  {
    id: 3,
    childId: 2,
    childName: "Alex Johnson",
    subject: "English",
    topic: "Grammar",
    question: "Choose the correct sentence: A) He don't like pizza B) He doesn't like pizza",
    childAnswer: "A",
    correctAnswer: "B",
    explanation: "The correct form is 'He doesn't like pizza' because 'he' is third person singular and requires 'doesn't'",
    examType: "Weekly Challenge",
    date: "2024-01-13",
    difficulty: "Easy"
  },
  {
    id: 4,
    childId: 2,
    childName: "Alex Johnson",
    subject: "Mathematics",
    topic: "Geometry",
    question: "What is the area of a circle with radius 3cm?",
    childAnswer: "18π cm²",
    correctAnswer: "9π cm²",
    explanation: "Area of a circle = πr². With radius 3cm: Area = π × 3² = 9π cm²",
    examType: "Practice",
    date: "2024-01-12",
    difficulty: "Medium"
  }
];

const ParentReviewPage = () => {
  const [questions, setQuestions] = useState(mockWrongQuestions);
  const [filteredQuestions, setFilteredQuestions] = useState(mockWrongQuestions);
  const [selectedChild, setSelectedChild] = useState("All");
  const [selectedSubject, setSelectedSubject] = useState("All");
  const [selectedExamType, setSelectedExamType] = useState("All");
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);

  // Get unique children, subjects and exam types for filters
  const children = ["All", ...mockChildren.map(child => child.name)];
  const subjects = ["All", ...new Set(questions.map(q => q.subject))];
  const examTypes = ["All", ...new Set(questions.map(q => q.examType))];

  // Filter questions based on selected filters
  useEffect(() => {
    let filtered = questions;
    
    if (selectedChild !== "All") {
      filtered = filtered.filter(q => q.childName === selectedChild);
    }
    
    if (selectedSubject !== "All") {
      filtered = filtered.filter(q => q.subject === selectedSubject);
    }
    
    if (selectedExamType !== "All") {
      filtered = filtered.filter(q => q.examType === selectedExamType);
    }
    
    setFilteredQuestions(filtered);
  }, [selectedChild, selectedSubject, selectedExamType, questions]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy": return "text-green-600 bg-green-100";
      case "Medium": return "text-yellow-600 bg-yellow-100";
      case "Hard": return "text-red-600 bg-red-100";
      default: return "text-gray-600 bg-gray-100";
    }
  };

  const getExamTypeIcon = (examType: string) => {
    switch (examType) {
      case "Practice": return <FaBook className="w-4 h-4" />;
      case "Mock Exam": return <FaChartBar className="w-4 h-4" />;
      case "Weekly Challenge": return <FaTrophy className="w-4 h-4" />;
      default: return <FaBook className="w-4 h-4" />;
    }
  };

  // Get stats for selected child
  const getChildStats = () => {
    if (selectedChild === "All") {
      return {
        totalQuestions: questions.length,
        subjects: [...new Set(questions.map(q => q.subject))].length,
        children: mockChildren.length
      };
    } else {
      const childQuestions = questions.filter(q => q.childName === selectedChild);
      return {
        totalQuestions: childQuestions.length,
        subjects: [...new Set(childQuestions.map(q => q.subject))].length,
        children: 1
      };
    }
  };

  const stats = getChildStats();

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
            <FaLightbulb className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Children's Question Review</h1>
            <p className="text-gray-600">Monitor your children's learning progress and help them improve</p>
          </div>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="text-2xl font-bold text-red-600">{stats.totalQuestions}</div>
            <div className="text-sm text-gray-600">Wrong Questions</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="text-2xl font-bold text-blue-600">{stats.subjects}</div>
            <div className="text-sm text-gray-600">Subjects</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="text-2xl font-bold text-purple-600">{stats.children}</div>
            <div className="text-sm text-gray-600">Children</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="text-2xl font-bold text-green-600">{filteredQuestions.length}</div>
            <div className="text-sm text-gray-600">Filtered Results</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Child</label>
            <select
              value={selectedChild}
              onChange={(e) => setSelectedChild(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              {children.map(child => (
                <option key={child} value={child}>{child}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              {subjects.map(subject => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Exam Type</label>
            <select
              value={selectedExamType}
              onChange={(e) => setSelectedExamType(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              {examTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {filteredQuestions.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow-sm border text-center">
            <FaLightbulb className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">No questions found</h3>
            <p className="text-gray-500">Try adjusting your filters or check back later for new content.</p>
          </div>
        ) : (
          filteredQuestions.map((question) => (
            <div key={question.id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <FaUserGraduate className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-medium text-purple-600">{question.childName}</span>
                    </div>
                    <span className="text-sm text-gray-400">•</span>
                    <div className="flex items-center gap-2">
                      {getExamTypeIcon(question.examType)}
                      <span className="text-sm text-gray-600">{question.examType}</span>
                    </div>
                    <span className="text-sm text-gray-400">•</span>
                    <span className="text-sm text-gray-600">{question.subject} - {question.topic}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(question.difficulty)}`}>
                      {question.difficulty}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">{question.date}</div>
                </div>

                <div className="mb-4">
                  <h3 className="font-medium text-gray-800 mb-2">{question.question}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="text-sm font-medium text-red-700 mb-1">Child's Answer</div>
                      <div className="text-red-800">{question.childAnswer}</div>
                    </div>
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="text-sm font-medium text-green-700 mb-1">Correct Answer</div>
                      <div className="text-green-800">{question.correctAnswer}</div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setExpandedQuestion(expandedQuestion === question.id ? null : question.id)}
                  className="flex items-center gap-2 text-purple-600 hover:text-purple-800 font-medium"
                >
                  <FaEye className="w-4 h-4" />
                  {expandedQuestion === question.id ? "Hide Explanation" : "View Explanation"}
                </button>

                {expandedQuestion === question.id && (
                  <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="text-sm font-medium text-purple-700 mb-2">Explanation</div>
                    <div className="text-purple-800">{question.explanation}</div>
                    <div className="mt-3 p-3 bg-white border border-purple-200 rounded-lg">
                      <div className="text-sm font-medium text-gray-700 mb-1">💡 How to help your child:</div>
                      <div className="text-sm text-gray-600">
                        Review this concept together and encourage your child to practice similar problems. 
                        Consider setting up a study session to go through the solution step by step.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ParentReviewPage; 