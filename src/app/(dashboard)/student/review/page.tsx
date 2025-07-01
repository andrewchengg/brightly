// src/app/(dashboard)/student/review/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { toast } from "react-toastify";
import {
  FaLightbulb,
  FaBook,
  FaSyncAlt,
  FaExclamationTriangle,
  FaSpinner,
  FaEye,
  FaCalculator,
  FaFlask,
  FaGlobe,
  FaLanguage,
  FaArrowLeft,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaGraduationCap,
  FaUpload,
  FaImage,
  FaTimes,
  FaPlus,
  FaPlay,
} from "react-icons/fa";
import {
  QuestionType as PrismaQuestionType,
  PracticeSessionType as PrismaPracticeSessionType,
  DifficultyLevel as PrismaDifficultyLevel,
} from "@/generated/prisma";
import Image from "next/image";

interface OptionClient {
  id: string;
  text: string;
}
interface QuestionForDisplay {
  id: number;
  text: string;
  questionType: keyof typeof PrismaQuestionType;
  options: OptionClient[];
  correctAnswer: any;
  explanation?: string | null;
  hint?: string | null;
  imageUrl?: string | null;
  requiresImage?: boolean;
  difficulty: keyof typeof PrismaDifficultyLevel;
  topic: { name: string; id: number };
  subject: { name: string; id: number };
  questionGroup?: { name: string; id: number } | null;
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

// Subject configuration with icons and colors
const subjectConfig = {
  Math: {
    icon: FaCalculator,
    color: "from-blue-500 to-blue-600",
    bgColor: "bg-blue-50",
    textColor: "text-blue-700",
  },
  Science: {
    icon: FaFlask,
    color: "from-green-500 to-green-600",
    bgColor: "bg-green-50",
    textColor: "text-green-700",
  },
  English: {
    icon: FaGlobe,
    color: "from-purple-500 to-purple-600",
    bgColor: "bg-purple-50",
    textColor: "text-purple-700",
  },
  Chinese: {
    icon: FaLanguage,
    color: "from-red-500 to-red-600",
    bgColor: "bg-red-50",
    textColor: "text-red-700",
  },
};

export default function StudentReviewPage() {
  const router = useRouter();
  const [wrongAnswers, setWrongAnswers] = useState<WrongAnswerReviewItem[]>([]);
  const [filteredAnswers, setFilteredAnswers] = useState<
    WrongAnswerReviewItem[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(
    null
  );

  // Upload questions state
  const [showUploadSection, setShowUploadSection] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);
  const [userUploadedQuestions, setUserUploadedQuestions] = useState<
    QuestionForDisplay[]
  >([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchWrongAnswers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/student/review/wrong-answers");
      if (!response.ok) {
        const errData = await response
          .json()
          .catch(() => ({ error: "Failed to fetch review data" }));
        throw new Error(
          errData.error?.message || "Failed to fetch review data"
        );
      }
      const data: WrongAnswerReviewItem[] = await response.json();
      setWrongAnswers(data);
    } catch (err: any) {
      console.error("Error fetching wrong answers:", err);
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserUploadedQuestions = async () => {
    try {
      const response = await fetch("/api/student/uploaded-questions");
      if (response.ok) {
        const data: QuestionForDisplay[] = await response.json();
        setUserUploadedQuestions(data);
      }
    } catch (err) {
      console.error("Error fetching uploaded questions:", err);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size should be less than 10MB");
        return;
      }

      // Check if it's an image or PDF
      const isImage = file.type.startsWith("image/");
      const isPDF = file.type === "application/pdf";

      if (!isImage && !isPDF) {
        toast.error("Please upload an image or PDF file");
        return;
      }

      setUploadedImage(file);

      // Only show preview for images
      if (isImage) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setImagePreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        // For PDFs, clear the image preview
        setImagePreview(null);
      }
    }
  };

  const handleUploadQuestion = async () => {
    if (!uploadedImage) {
      toast.error("Please select a file first");
      return;
    }

    setIsProcessingUpload(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadedImage);

      const response = await fetch("/api/student/upload-question", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to process question file");
      }

      const data = await response.json();
      toast.success("Question extracted and added for review!");

      // Reset upload state
      setUploadedImage(null);
      setImagePreview(null);
      setShowUploadSection(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Refresh user uploaded questions
      fetchUserUploadedQuestions();
    } catch (error) {
      console.error("Error uploading question:", error);
      toast.error("Failed to process question file. Please try again.");
    } finally {
      setIsProcessingUpload(false);
    }
  };

  const removeImage = () => {
    setUploadedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    fetchWrongAnswers();
    fetchUserUploadedQuestions();
  }, []);

  useEffect(() => {
    if (selectedSubject) {
      const filtered = wrongAnswers.filter(
        (item) => item.question.subject.name === selectedSubject
      );
      setFilteredAnswers(filtered);
    }
  }, [selectedSubject, wrongAnswers]);

  const uniqueSubjects = [
    ...new Set(wrongAnswers.map((item) => item.question.subject.name)),
  ];

  const getSubjectStats = (subjectName: string) => {
    const subjectQuestions = wrongAnswers.filter(
      (item) => item.question.subject.name === subjectName
    );
    return {
      total: subjectQuestions.length,
      topics: [
        ...new Set(subjectQuestions.map((item) => item.question.topic.name)),
      ].length,
    };
  };

  const getOptionText = (
    options: OptionClient[],
    optionId: string | number
  ): string => {
    const opt = options.find(
      (o) => String(o.id).toLowerCase() === String(optionId).toLowerCase()
    );
    return opt?.text || String(optionId);
  };

  const renderSubmittedAnswer = (item: WrongAnswerReviewItem) => {
    if (item.submittedAnswer === null || item.submittedAnswer === undefined)
      return <span className="italic text-gray-500">Not answered</span>;

    const qType = item.question.questionType;
    switch (qType) {
      case PrismaQuestionType.MULTIPLE_CHOICE:
        return item.question.options
          ? getOptionText(item.question.options, String(item.submittedAnswer))
          : String(item.submittedAnswer);
      case PrismaQuestionType.MULTI_PART:
        if (
          typeof item.submittedAnswer === "object" &&
          item.submittedAnswer !== null
        ) {
          return (
            <ul className="list-disc list-inside pl-4 text-sm">
              {Object.entries(item.submittedAnswer).map(([part, ans]) => (
                <li key={part}>
                  <strong>{part}:</strong> {String(ans)}
                </li>
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
    if (question.correctAnswer === null || question.correctAnswer === undefined)
      return "N/A";

    if (
      typeof question.correctAnswer === "object" &&
      question.correctAnswer !== null
    ) {
      if (question.correctAnswer.id && question.correctAnswer.text) {
        return `${question.correctAnswer.id}. ${question.correctAnswer.text}`;
      }

      if (question.correctAnswer.id && !question.correctAnswer.text) {
        const correctOption = question.options?.find(
          (opt) =>
            String(opt.id).toLowerCase() ===
            String(question.correctAnswer.id).toLowerCase()
        );
        return correctOption
          ? `${correctOption.id}. ${correctOption.text}`
          : String(question.correctAnswer.id);
      }

      if (
        !Array.isArray(question.correctAnswer) &&
        Object.keys(question.correctAnswer).length > 1
      ) {
        return (
          <ul className="list-disc list-inside pl-4 text-sm">
            {Object.entries(question.correctAnswer).map(([part, ans]) => (
              <li key={part}>
                <strong>{part}:</strong> {String(ans)}
              </li>
            ))}
          </ul>
        );
      }

      if (Object.keys(question.correctAnswer).length === 1) {
        const value = Object.values(question.correctAnswer)[0];
        return String(value);
      }
    }

    switch (question.questionType) {
      case PrismaQuestionType.MULTIPLE_CHOICE:
        const correctAnswerId = String(question.correctAnswer);
        const correctOption = question.options?.find(
          (opt) =>
            String(opt.id).toLowerCase() === correctAnswerId.toLowerCase()
        );
        return correctOption
          ? `${correctOption.id}. ${correctOption.text}`
          : correctAnswerId;

      case PrismaQuestionType.MULTI_PART:
        if (
          typeof question.correctAnswer === "object" &&
          question.correctAnswer !== null &&
          !Array.isArray(question.correctAnswer)
        ) {
          return (
            <ul className="list-disc list-inside pl-4 text-sm">
              {Object.entries(question.correctAnswer).map(([part, ans]) => (
                <li key={part}>
                  <strong>{part}:</strong> {String(ans)}
                </li>
              ))}
            </ul>
          );
        }
        return JSON.stringify(question.correctAnswer);

      case PrismaQuestionType.FILL_IN_THE_BLANK:
      case PrismaQuestionType.OPEN_ENDED:
        return Array.isArray(question.correctAnswer)
          ? question.correctAnswer.join(" or ")
          : String(question.correctAnswer);

      default:
        if (Array.isArray(question.correctAnswer)) {
          return question.correctAnswer.join(" or ");
        }
        return String(question.correctAnswer);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="text-center">
          <FaSpinner className="animate-spin text-6xl text-indigo-600 mx-auto mb-4" />
          <p className="text-xl text-gray-600 font-medium">
            Loading Your Review...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="bg-red-100 p-6 rounded-2xl mb-6">
            <FaExclamationTriangle className="text-5xl text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-red-800 mb-2">
              Oops! Something went wrong
            </h3>
            <p className="text-red-600">{error}</p>
          </div>
          <Button
            onClick={fetchWrongAnswers}
            className="bg-red-500 hover:bg-red-600 text-white px-8 py-3 rounded-xl shadow-lg"
          >
            <FaSyncAlt className="mr-2" /> Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Subject Selection Screen
  if (!selectedSubject) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto p-4 md:p-6">
          {/* Header Section - Matching practice page style */}
          <div className="mb-8">
            <div className="bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 rounded-3xl p-8 md:p-10 text-white relative overflow-hidden shadow-xl">
              {/* Decorative elements */}
              <div className="absolute top-4 right-4 opacity-20">
                <div className="w-16 h-16 border-2 border-white rounded-lg rotate-12"></div>
              </div>
              <div className="absolute bottom-4 right-8 opacity-10">
                <div className="w-8 h-8 bg-white rounded-full"></div>
              </div>
              <div className="absolute top-8 left-8 opacity-10">
                <FaTimesCircle className="w-12 h-12 text-white" />
              </div>

              <div className="relative z-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                  <div className="mb-4 md:mb-0">
                    <h1 className="text-3xl md:text-4xl font-bold mb-3">
                      Review Your Mistakes
                    </h1>
                    <p className="text-indigo-100 text-lg md:text-xl">
                      Learn from your errors and master every concept
                    </p>
                  </div>
                  <Button
                    onClick={() => router.push("/student/practice")}
                    className="bg-white/20 text-white hover:bg-white/30 font-bold text-lg px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 backdrop-blur-sm border border-white/20"
                  >
                    <FaPlay className="mr-2 h-5 w-5" /> Start Practice
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Upload Feature Highlight */}

          {/* Upload Questions Section */}
          <Card className="mb-8 bg-white border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
                    <FaUpload className="text-gray-600 text-lg" />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-gray-900">
                      Upload Your Past Papers & Questions
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                      Save your past exam papers or individual questions for
                      easy revision access
                    </CardDescription>
                  </div>
                </div>
                <Button
                  onClick={() => setShowUploadSection(!showUploadSection)}
                  variant="outline"
                  className="border-gray-300 text-gray-700 hover:bg-gray-50 font-medium"
                >
                  {showUploadSection ? (
                    <>
                      <FaTimes className="mr-2" />
                      Close
                    </>
                  ) : (
                    <>
                      <FaPlus className="mr-2" />
                      Upload Now
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>

            {/* Enhanced Info Section */}
            <CardContent className="pt-0 pb-4">
              <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900 mb-3">
                    How it works:
                  </h4>
                  <div className="text-sm text-gray-700 space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="w-2 h-2 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                      <span>
                        <strong>Upload full past papers</strong> - We'll extract
                        all questions for you to review
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-2 h-2 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                      <span>
                        <strong>Upload individual questions</strong> - Add
                        specific questions you want to practice
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-2 h-2 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                      <span>
                        <strong>Saved forever</strong> - Access your uploaded
                        questions anytime for revision
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-2 h-2 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                      <span>
                        <strong>Smart organization</strong> - Questions are
                        automatically categorized by subject and topic
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>

            {showUploadSection && (
              <CardContent className="pt-0">
                <div className="space-y-4">
                  {/* Upload Type Info */}
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h5 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <FaImage className="text-gray-600" />
                      What You Can Upload:
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-gray-700">
                        <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                        <span>Full exam papers (multiple questions)</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                        <span>Individual practice questions</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                        <span>Homework assignments</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                        <span>Textbook exercises</span>
                      </div>
                    </div>
                  </div>

                  {/* Image Preview */}
                  {(imagePreview ||
                    (uploadedImage &&
                      uploadedImage.type === "application/pdf")) && (
                    <div className="relative inline-block">
                      {imagePreview ? (
                        <Image
                          src={imagePreview}
                          alt="Question preview"
                          width={300}
                          height={200}
                          className="rounded-lg object-cover border-2 border-emerald-200 shadow-md"
                        />
                      ) : (
                        <div className="w-[300px] h-[200px] bg-red-50 border-2 border-red-200 rounded-lg flex flex-col items-center justify-center shadow-md">
                          <div className="text-red-500 text-4xl mb-2">📄</div>
                          <div className="text-red-700 font-medium">
                            {uploadedImage?.name}
                          </div>
                          <div className="text-red-600 text-sm">PDF File</div>
                        </div>
                      )}
                      <button
                        onClick={removeImage}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center hover:bg-red-600 transition-colors shadow-md"
                      >
                        <FaTimes className="text-xs" />
                      </button>
                    </div>
                  )}

                  {/* Upload Interface */}
                  <div className="flex items-center gap-4">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                    />

                    <Button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      variant="outline"
                      className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                    >
                      <FaUpload className="mr-2" />
                      Select File
                    </Button>

                    <Button
                      onClick={handleUploadQuestion}
                      disabled={!uploadedImage || isProcessingUpload}
                      className="bg-gradient-to-r from-emerald-500 to-blue-500 text-white hover:from-emerald-600 hover:to-blue-600 disabled:opacity-50"
                    >
                      {isProcessingUpload ? (
                        <>
                          <FaSpinner className="mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <FaUpload className="mr-2" />
                          Save & Extract Questions
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                    <p className="text-sm text-blue-800">
                      💡 <strong>Pro tip:</strong> Upload clear images or PDFs
                      with readable text. Our AI will automatically extract
                      questions, save them to your personal question bank, and
                      make them available for future revision sessions!
                    </p>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Uploaded Questions Display */}
          {userUploadedQuestions.length > 0 && (
            <Card className="mb-8 bg-white border-0 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl text-gray-900 flex items-center gap-3">
                      <div className="w-6 h-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
                        <FaBook className="text-gray-600 text-sm" />
                      </div>
                      Your Personal Question Bank (
                      {userUploadedQuestions.length})
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                      Saved questions from your uploaded papers - ready for
                      revision anytime!
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-lg">
                    <span className="text-gray-700 text-sm font-medium">
                      Saved Forever
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {userUploadedQuestions.slice(0, 3).map((question) => (
                    <div
                      key={question.id}
                      className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                    >
                      <div className="flex gap-3">
                        {/* Optimized Image Display */}
                        {question.imageUrl && question.requiresImage && (
                          <div className="flex-shrink-0">
                            <img
                              src={question.imageUrl}
                              alt="Question diagram"
                              className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                              loading="lazy"
                            />
                            <div className="text-xs text-gray-600 text-center mt-1 flex items-center justify-center gap-1">
                              <FaImage className="text-xs" />
                              Visual
                            </div>
                          </div>
                        )}

                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-800 line-clamp-2">
                            {question.text}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                            <span className="flex items-center gap-1">
                              <FaBook />
                              {question.subject.name}
                            </span>
                            <span className="flex items-center gap-1">
                              <FaGraduationCap />
                              {question.topic.name}
                            </span>
                            <span
                              className={`px-2 py-1 rounded-full text-xs ${
                                question.difficulty === "EASY"
                                  ? "bg-green-100 text-green-700"
                                  : question.difficulty === "MEDIUM"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {question.difficulty.toLowerCase()}
                            </span>
                            {question.requiresImage && (
                              <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700 flex items-center gap-1">
                                <FaImage />
                                Visual
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {userUploadedQuestions.length > 3 && (
                    <p className="text-sm text-gray-600 text-center">
                      +{userUploadedQuestions.length - 3} more questions
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Subject Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {uniqueSubjects.map((subject) => {
              const config = subjectConfig[
                subject as keyof typeof subjectConfig
              ] || {
                icon: FaBook,
                color: "from-gray-500 to-gray-600",
                bgColor: "bg-gray-50",
                textColor: "text-gray-700",
              };
              const stats = getSubjectStats(subject);
              const IconComponent = config.icon;

              return (
                <Card
                  key={subject}
                  className="group cursor-pointer transform hover:scale-105 transition-all duration-300 hover:shadow-2xl border-0 bg-white"
                  onClick={() => setSelectedSubject(subject)}
                >
                  <CardContent className="p-6 text-center">
                    <div
                      className={`w-16 h-16 bg-gradient-to-br ${config.color} rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}
                    >
                      <IconComponent className="text-2xl text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">
                      {subject}
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                        <FaTimesCircle className="text-red-500" />
                        <span>{stats.total} mistakes</span>
                      </div>
                      <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                        <FaBook className="text-blue-500" />
                        <span>{stats.topics} topics</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Stats Overview */}
          <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-xl">
            <CardContent className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-red-500 rounded-xl flex items-center justify-center mb-3">
                    <FaTimesCircle className="text-white text-xl" />
                  </div>
                  <div className="text-2xl font-bold text-gray-800">
                    {wrongAnswers.length}
                  </div>
                  <div className="text-sm text-gray-600">Total Mistakes</div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-500 rounded-xl flex items-center justify-center mb-3">
                    <FaBook className="text-white text-xl" />
                  </div>
                  <div className="text-2xl font-bold text-gray-800">
                    {uniqueSubjects.length}
                  </div>
                  <div className="text-sm text-gray-600">Subjects</div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-500 rounded-xl flex items-center justify-center mb-3">
                    <FaGraduationCap className="text-white text-xl" />
                  </div>
                  <div className="text-2xl font-bold text-gray-800">
                    {
                      [
                        ...new Set(
                          wrongAnswers.map((item) => item.question.topic.name)
                        ),
                      ].length
                    }
                  </div>
                  <div className="text-sm text-gray-600">Topics to Master</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Subject Review Screen
  const subjectConfig_selected = subjectConfig[
    selectedSubject as keyof typeof subjectConfig
  ] || {
    icon: FaBook,
    color: "from-gray-500 to-gray-600",
    bgColor: "bg-gray-50",
    textColor: "text-gray-700",
  };
  const SelectedIcon = subjectConfig_selected.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            onClick={() => setSelectedSubject(null)}
            variant="ghost"
            className="mb-4 text-gray-600 hover:text-gray-800"
          >
            <FaArrowLeft className="mr-2" />
            Back to Subjects
          </Button>

          <div
            className={`bg-gradient-to-r ${subjectConfig_selected.color} rounded-2xl p-6 text-white shadow-xl`}
          >
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
                <SelectedIcon className="text-3xl" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">{selectedSubject} Review</h1>
                <p className="text-white/90 mt-1">
                  {filteredAnswers.length} mistakes to review and learn from
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Review Items */}
        {filteredAnswers.length === 0 ? (
          <Card className="text-center py-16 bg-white/70 backdrop-blur-sm border-0 shadow-xl">
            <CardContent>
              <FaCheckCircle className="w-20 h-20 text-green-400 mx-auto mb-6" />
              <h3 className="text-2xl font-bold text-gray-800 mb-4">
                Perfect Score!
              </h3>
              <p className="text-gray-600 text-lg">
                No mistakes found in {selectedSubject}. You're doing great!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {filteredAnswers.map((item) => (
              <Card
                key={item.studentAnswerId}
                className="overflow-hidden bg-white border-0 shadow-lg hover:shadow-xl transition-shadow duration-300"
              >
                <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50 border-b border-red-100">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg text-red-700 font-semibold">
                        {item.question.topic.name}
                      </CardTitle>
                      <CardDescription className="text-sm text-gray-600 mt-1 flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <FaBook className="text-xs" />
                          {item.practiceSession.title ||
                            item.practiceSession.type.replace(/_/g, " ")}
                        </span>
                        <span className="flex items-center gap-1">
                          <FaClock className="text-xs" />
                          {new Date(item.attemptedAt).toLocaleDateString()}
                        </span>
                      </CardDescription>
                    </div>
                    <span
                      className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        item.question.difficulty === PrismaDifficultyLevel.EASY
                          ? "bg-green-100 text-green-700"
                          : item.question.difficulty ===
                            PrismaDifficultyLevel.MEDIUM
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {item.question.difficulty.toLowerCase()}
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="p-6 space-y-6">
                  {/* Question */}
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-3">
                      Question:
                    </h4>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {item.question.text}
                    </p>
                    {item.question.imageUrl &&
                      (item.question.imageUrl.startsWith("http://") ||
                        item.question.imageUrl.startsWith("https://")) && (
                        <div className="mt-4 flex justify-center">
                          <Image
                            src={item.question.imageUrl}
                            alt="Question visual"
                            width={400}
                            height={300}
                            className="max-w-md max-h-64 rounded-lg border object-contain shadow-md"
                          />
                        </div>
                      )}
                  </div>

                  {/* Answers Comparison */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-red-50 border-l-4 border-red-400 rounded-r-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <FaTimesCircle className="text-red-500" />
                        <span className="font-semibold text-red-700 text-sm">
                          Your Answer
                        </span>
                      </div>
                      <div className="text-red-800">
                        {renderSubmittedAnswer(item)}
                      </div>
                    </div>

                    <div className="p-4 bg-green-50 border-l-4 border-green-400 rounded-r-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <FaCheckCircle className="text-green-500" />
                        <span className="font-semibold text-green-700 text-sm">
                          Correct Answer
                        </span>
                      </div>
                      <div className="text-green-800">
                        {renderCorrectAnswer(item.question)}
                      </div>
                    </div>
                  </div>

                  {/* Explanation Toggle */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setExpandedQuestionId(
                        expandedQuestionId === item.studentAnswerId
                          ? null
                          : item.studentAnswerId
                      )
                    }
                    className="w-full border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                  >
                    <FaEye className="mr-2" />
                    {expandedQuestionId === item.studentAnswerId
                      ? "Hide Details"
                      : "Show Explanation & Hints"}
                  </Button>

                  {/* Expanded Content */}
                  {expandedQuestionId === item.studentAnswerId && (
                    <div className="space-y-4 pt-4 border-t border-gray-200">
                      {item.question.explanation && (
                        <div className="p-4 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg">
                          <h5 className="font-semibold text-blue-700 mb-2 flex items-center gap-2">
                            <FaLightbulb />
                            Explanation
                          </h5>
                          <p className="text-blue-800 leading-relaxed whitespace-pre-wrap">
                            {item.question.explanation}
                          </p>
                        </div>
                      )}

                      {item.question.hint && (
                        <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg">
                          <h5 className="font-semibold text-yellow-700 mb-2">
                            💡 Hint
                          </h5>
                          <p className="text-yellow-800 leading-relaxed whitespace-pre-wrap">
                            {item.question.hint}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
