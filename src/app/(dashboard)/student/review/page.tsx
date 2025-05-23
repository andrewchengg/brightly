// src/app/(dashboard)/student/review/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from 'react-toastify';
import { FaLightbulb, FaBook, FaRegEdit, FaSyncAlt, FaExclamationTriangle, FaSpinner, FaInfoCircle } from "react-icons/fa";
import { QuestionType as PrismaQuestionType, PracticeSessionType as PrismaPracticeSessionType, DifficultyLevel as PrismaDifficultyLevel } from '@/generated/prisma';
import Image from 'next/image'; // Ensure Image is imported
import { FaEye } from "react-icons/fa";

interface OptionClient { id: string; text: string; }
interface QuestionForDisplay {
  id: number;
  text: string;
  questionType: keyof typeof PrismaQuestionType;
  options: OptionClient[];
  correctAnswer: any;
  explanation?: string | null;
  hint?: string | null;
  imageUrl?: string | null;
  difficulty: keyof typeof PrismaDifficultyLevel;
  topic: { name: string; id: number; };
  subject: { name: string; id: number; };
  questionGroup?: { name: string; id: number; } | null;
}
interface WrongAnswerReviewItem {
  studentAnswerId: string;
  submittedAnswer: any;
  attemptedAt: Date;
  question: QuestionForDisplay;
  practiceSession: {
    id: string;
    title?: string | null;
    type: keyof typeof PrismaPracticeSessionType;
  };
}

export default function StudentReviewPage() {
  const [wrongAnswers, setWrongAnswers] = useState<WrongAnswerReviewItem[]>([]);
  const [filteredAnswers, setFilteredAnswers] = useState<WrongAnswerReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const [selectedSubject, setSelectedSubject] = useState("All");
  const [selectedTopic, setSelectedTopic] = useState("All"); // Topic filtering can be complex if topics are not globally unique
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);

  const fetchWrongAnswers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/student/review/wrong-answers');
      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'Failed to fetch review data' }));
        throw new Error(errData.error?.message || 'Failed to fetch review data');
      }
      const data: WrongAnswerReviewItem[] = await response.json();
      setWrongAnswers(data);
      setFilteredAnswers(data); // Initially show all
    } catch (err: any) {
      console.error('Error fetching wrong answers:', err);
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWrongAnswers();
  }, []);

  useEffect(() => {
    let filtered = wrongAnswers;
    if (selectedSubject !== "All") {
      filtered = filtered.filter(item => item.question.subject.name === selectedSubject);
    }
    // Add topic filtering if implemented
    // if (selectedTopic !== "All") {
    //   filtered = filtered.filter(item => item.question.topic.name === selectedTopic);
    // }
    setFilteredAnswers(filtered);
  }, [selectedSubject, selectedTopic, wrongAnswers]);

  const uniqueSubjects = ["All", ...new Set(wrongAnswers.map(item => item.question.subject.name).sort())];
  // const uniqueTopics = ["All", ...new Set(wrongAnswers.map(item => item.question.topic.name).sort())];


  const getOptionText = (options: OptionClient[], optionId: string | number): string => {
    const opt = options.find(o => String(o.id).toLowerCase() === String(optionId).toLowerCase());
    return opt?.text || String(optionId);
  };

  const renderSubmittedAnswer = (item: WrongAnswerReviewItem) => {
    if (item.submittedAnswer === null || item.submittedAnswer === undefined) return <span className="italic text-gray-500">Not answered</span>;
    const qType = item.question.questionType;

    switch (qType) {
      case PrismaQuestionType.MULTIPLE_CHOICE:
        return item.question.options ? getOptionText(item.question.options, String(item.submittedAnswer)) : String(item.submittedAnswer);
      case PrismaQuestionType.MULTI_PART:
        if (typeof item.submittedAnswer === 'object' && item.submittedAnswer !== null) {
          return (
            <ul className="list-disc list-inside pl-4 text-xs">
              {Object.entries(item.submittedAnswer).map(([part, ans]) => (
                <li key={part}><strong>{part}:</strong> {String(ans)}</li>
              ))}
            </ul>
          );
        }
        return JSON.stringify(item.submittedAnswer);
      default:
        return String(item.submittedAnswer);
    }
  };
  
  const renderCorrectAnswer = (question: QuestionForDisplay) => {
    if (question.correctAnswer === null || question.correctAnswer === undefined) return "N/A";
    switch (question.questionType) {
      case PrismaQuestionType.MULTIPLE_CHOICE:
        if (typeof question.correctAnswer === 'object' && !Array.isArray(question.correctAnswer) && question.correctAnswer.id && question.correctAnswer.text) {
            return `${question.correctAnswer.id}. ${question.correctAnswer.text}`;
        }
        const correctAnswerId = String(question.correctAnswer);
        const correctOption = question.options.find(opt => String(opt.id).toLowerCase() === correctAnswerId.toLowerCase());
        return correctOption ? `${correctOption.id}. ${correctOption.text}` : correctAnswerId;
      case PrismaQuestionType.MULTI_PART:
        if (typeof question.correctAnswer === 'object' && question.correctAnswer !== null && !Array.isArray(question.correctAnswer)) {
          return (
            <ul className="list-disc list-inside pl-4 text-xs">
              {Object.entries(question.correctAnswer).map(([part, ans]) => (
                <li key={part}><strong>{part}:</strong> {String(ans)}</li>
              ))}
            </ul>
          );
        }
        return JSON.stringify(question.correctAnswer);
      case PrismaQuestionType.FILL_IN_THE_BLANK:
      case PrismaQuestionType.OPEN_ENDED:
        return Array.isArray(question.correctAnswer) ? question.correctAnswer.join(' or ') : String(question.correctAnswer);
      default:
        return String(question.correctAnswer);
    }
  };


  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-8rem)]">
        <FaSpinner className="animate-spin text-4xl text-indigo-600" />
        <p className="ml-3 text-lg text-gray-600">Loading Your Review...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] text-center">
        <div className="bg-red-50 border-l-4 border-red-500 p-6 mb-6 max-w-md rounded-r-lg shadow-md">
          <h3 className="text-lg font-medium text-red-800 flex items-center"><FaExclamationTriangle className="mr-2"/> Error Loading Review</h3>
          <div className="mt-2 text-sm text-red-700"><p>{error}</p></div>
        </div>
        <Button onClick={fetchWrongAnswers} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md">
          <FaSyncAlt className="mr-2"/> Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8">
      <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl shadow-lg p-6 md:p-8 mb-8 text-white">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-xl">
                <FaLightbulb className="w-8 h-8" />
            </div>
            <div>
                <h1 className="text-2xl md:text-3xl font-bold">Review Your Mistakes</h1>
                <p className="mt-1 text-orange-100">Learn from your past attempts to master every concept!</p>
            </div>
          </div>
      </div>

      {/* Filters */}
      <Card className="mb-8 p-4">
        <CardHeader className="p-2">
          <CardTitle className="text-lg">Filter Questions</CardTitle>
        </CardHeader>
        <CardContent className="p-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="subjectFilter" className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <select 
              id="subjectFilter"
              value={selectedSubject} 
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
            >
              {uniqueSubjects.map(subject => <option key={subject} value={subject}>{subject}</option>)}
            </select>
          </div>
          {/* Add more filters like topic, date range if needed */}
        </CardContent>
      </Card>

      {filteredAnswers.length === 0 ? (
        <Card className="text-center py-12">
            <CardContent>
                <FaBook className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No Incorrect Answers Found</h3>
                <p className="text-gray-500">
                    {wrongAnswers.length > 0 ? "Try adjusting your filters or you've mastered these!" : "Great job! You haven't made any mistakes yet, or they haven't been recorded."}
                </p>
            </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {filteredAnswers.map((item) => (
            <Card key={item.studentAnswerId} className="overflow-hidden shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="bg-red-50 p-4 border-b border-red-200">
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-base text-red-700">
                            {item.question.subject.name} - {item.question.topic.name}
                        </CardTitle>
                        <CardDescription className="text-xs text-gray-500 mt-0.5">
                            From: {item.practiceSession.title || item.practiceSession.type.replace(/_/g, " ")} | Attempted: {new Date(item.attemptedAt).toLocaleDateString()}
                        </CardDescription>
                    </div>
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full capitalize ${
                        item.question.difficulty === PrismaDifficultyLevel.EASY ? 'bg-green-100 text-green-700' :
                        item.question.difficulty === PrismaDifficultyLevel.MEDIUM ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700' 
                    }`}>
                        {item.question.difficulty.toLowerCase()}
                    </span>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <p className="text-gray-800 whitespace-pre-wrap text-sm">{item.question.text}</p>
                {item.question.imageUrl && (item.question.imageUrl.startsWith('http://') || item.question.imageUrl.startsWith('https://')) ? (
                  <div className="my-2 flex justify-center">
                    <Image src={item.question.imageUrl} alt="Question visual" width={300} height={200} className="max-w-xs max-h-64 rounded-md border object-contain" />
                  </div>
                ) : item.question.imageUrl ? (
                     <p className="text-xs text-gray-500 my-2 text-center">(Local/Placeholder Image: {item.question.imageUrl})</p>
                ) : null}
                
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-xs font-semibold text-red-700 mb-1">Your Answer:</p>
                  <div className="text-sm text-red-800">{renderSubmittedAnswer(item)}</div>
                </div>
                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-xs font-semibold text-green-700 mb-1">Correct Answer:</p>
                  <div className="text-sm text-green-800">{renderCorrectAnswer(item.question)}</div>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpandedQuestionId(expandedQuestionId === item.studentAnswerId ? null : item.studentAnswerId)}
                  className="text-indigo-600 hover:text-indigo-800 text-xs"
                >
                  <FaEye className="mr-1.5" />
                  {expandedQuestionId === item.studentAnswerId ? "Hide Explanation" : "Show Explanation"}
                </Button>

                {expandedQuestionId === item.studentAnswerId && item.question.explanation && (
                  <div className="mt-2 p-3 bg-indigo-50 border border-indigo-200 rounded-md">
                    <p className="text-xs font-semibold text-indigo-700 mb-1">Explanation:</p>
                    <p className="text-xs text-indigo-800 whitespace-pre-wrap">{item.question.explanation}</p>
                  </div>
                )}
                 {expandedQuestionId === item.studentAnswerId && item.question.hint && (
                  <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-xs font-semibold text-yellow-700 mb-1">Hint:</p>
                    <p className="text-xs text-yellow-800 whitespace-pre-wrap">{item.question.hint}</p>
                  </div>
                )}

              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}