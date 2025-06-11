// src/components/Practice/PassageDisplay.tsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  QuestionClient,
  OptionClient,
} from "@/app/(dashboard)/student/practice/chinese/cloze/[questionGroupId]/page"; // Adjust path as needed
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  FaCheck,
  FaQuestionCircle,
  FaTimes,
  FaInfoCircle,
  FaLanguage,
  FaBook,
  FaSpinner,
  FaTimes as FaClose,
  FaCommentDots,
} from "react-icons/fa";

interface PassageDisplayProps {
  passageTitle: string;
  passageContent: string | null;
  questions: QuestionClient[]; // All questions for this passage group
  answeredQuestions: Record<number, string | Record<string, string>>; // questionId: selectedOptionId
  onAnswerSelect: (questionId: number, selectedOptionId: string) => void;
  submitted: boolean; // To disable selects after submission
  questionResults: { id: number; correct: boolean }[]; // To show correctness after submission
  onAddTextToAIContext: (text: string) => void;
}

interface TextSelection {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface WordInfo {
  pinyin?: string;
  explanation?: string;
  loading?: boolean;
}

const PassageDisplay: React.FC<PassageDisplayProps> = ({
  passageTitle,
  passageContent,
  questions,
  answeredQuestions,
  onAnswerSelect,
  submitted,
  questionResults,
  onAddTextToAIContext,
}) => {
  const [showingExplanation, setShowingExplanation] = useState<number | null>(
    null
  );
  const [selectedText, setSelectedText] = useState<TextSelection | null>(null);
  const [wordInfo, setWordInfo] = useState<WordInfo | null>(null);
  const [showPinyin, setShowPinyin] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const passageRef = useRef<HTMLDivElement>(null);

  // Function to check if text contains Chinese characters
  const containsChinese = (text: string) => {
    return /[\u4e00-\u9fff]/.test(text);
  };

  // Function to get pinyin for Chinese text using the pinyin library
  const getPinyin = async (text: string): Promise<string> => {
    try {
      // Dynamically import the pinyin library (since it's a Node.js library)
      const { pinyin } = await import("pinyin");

      // Convert to pinyin with tone marks, heteronym handling, and proper spacing
      const pinyinArray = pinyin(text, {
        heteronym: false, // Only return the most common pronunciation
        segment: true, // Enable word segmentation for better accuracy
        style: "TONE", // Use tone marks (1st, 2nd, 3rd, 4th tone symbols)
      });

      // Join the pinyin array into a readable string
      const result = pinyinArray
        .map((item) => (Array.isArray(item) ? item[0] : item))
        .join(" ");

      return result;
    } catch (error) {
      console.error("Pinyin conversion error:", error);
      return "Unable to convert to pinyin";
    }
  };

  // Function to get explanation for Chinese text
  const getExplanation = async (text: string): Promise<string> => {
    try {
      // Call AI tutor API for explanation
      const response = await fetch("/api/ai-tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: `You are a Chinese language tutor for primary school students. Provide a clear, simple explanation for Chinese words or phrases. Keep explanations brief (1-2 sentences) and appropriate for young learners. Focus on meaning, usage, and any cultural context if relevant.`,
            },
            {
              role: "user",
              content: `Please explain the Chinese word/phrase "${text}" in simple terms for a primary school student.`,
            },
          ],
        }),
      });

      if (!response.ok) throw new Error("Explanation request failed");

      const data = await response.json();
      return data.message;
    } catch (error) {
      console.error("Explanation Error:", error);
      return "Sorry, I couldn't get an explanation for this text right now.";
    }
  };

  // Handle text selection
  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      setSelectedText(null);
      setWordInfo(null);
      setShowPinyin(false);
      setShowExplanation(false);
      return;
    }

    const selectedText = selection.toString().trim();
    if (selectedText.length === 0 || !containsChinese(selectedText)) {
      setSelectedText(null);
      setWordInfo(null);
      setShowPinyin(false);
      setShowExplanation(false);
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    setSelectedText({
      text: selectedText,
      x: rect.left + window.scrollX,
      y: rect.top + window.scrollY,
      width: rect.width,
      height: rect.height,
    });
    setWordInfo(null);
    setShowPinyin(false);
    setShowExplanation(false);
  }, []);

  // Add event listeners for text selection
  useEffect(() => {
    document.addEventListener("mouseup", handleTextSelection);
    document.addEventListener("keyup", handleTextSelection);

    return () => {
      document.removeEventListener("mouseup", handleTextSelection);
      document.removeEventListener("keyup", handleTextSelection);
    };
  }, [handleTextSelection]);

  // Handle pinyin request
  const handleShowPinyin = async () => {
    if (!selectedText) return;

    setWordInfo({ loading: true });
    setShowPinyin(true);

    try {
      const pinyin = await getPinyin(selectedText.text);
      setWordInfo((prev) => ({ ...prev, pinyin, loading: false }));
    } catch (error) {
      setWordInfo((prev) => ({
        ...prev,
        pinyin: "Unable to get pinyin",
        loading: false,
      }));
    }
  };

  // Handle explanation request
  const handleShowExplanation = async () => {
    if (!selectedText) return;

    setWordInfo((prev) => ({ ...prev, loading: true }));
    setShowExplanation(true);

    try {
      const explanation = await getExplanation(selectedText.text);
      setWordInfo((prev) => ({ ...prev, explanation, loading: false }));
    } catch (error) {
      setWordInfo((prev) => ({
        ...prev,
        explanation: "Unable to get explanation",
        loading: false,
      }));
    }
  };

  const handleAddToContext = () => {
    if (selectedText) {
      onAddTextToAIContext(selectedText.text);
      closeSelectionPopup();
    }
  };

  // Close selection popup
  const closeSelectionPopup = () => {
    setSelectedText(null);
    setWordInfo(null);
    setShowPinyin(false);
    setShowExplanation(false);
    window.getSelection()?.removeAllRanges();
  };

  if (passageContent === null)
    return <p className="text-center py-8">Loading passage...</p>;
  if (passageContent.trim() === "" && questions.length === 0)
    return <p className="text-center py-8">No passage content available.</p>;

  const questionsMap = new Map<string, QuestionClient>();
  questions.forEach((q) => {
    if (q.questionNumberOnPage) {
      questionsMap.set(q.questionNumberOnPage, q);
    }
  });

  const toggleExplanation = (questionId: number) => {
    setShowingExplanation((prev) => (prev === questionId ? null : questionId));
  };

  const renderInteractivePassage = () => {
    if (!passageContent) return null;

    const blankRegex = /(Q\d+)(\s*\([^)]*\))?/g; // Captures QXX and optional bracketed text
    let lastIndex = 0;
    const elements = [];
    let match;

    while ((match = blankRegex.exec(passageContent)) !== null) {
      // Text before the blank
      if (match.index > lastIndex) {
        elements.push(
          <span key={`text-${lastIndex}`}>
            {passageContent.substring(lastIndex, match.index)}
          </span>
        );
      }

      const fullMatch = match[0]; // e.g., "Q21 (1 努力 2 缓慢...)" or "Q22"
      const blankIdentifier = match[1]; // e.g., "Q21"
      const question = questionsMap.get(blankIdentifier);

      if (question && question.options) {
        const selectedValue = answeredQuestions[question.id] as
          | string
          | undefined;
        const resultForThisQuestion = submitted
          ? questionResults.find((r) => r.id === question.id)
          : undefined;
        let borderColorClass = "border-gray-300";
        if (submitted && resultForThisQuestion) {
          borderColorClass = resultForThisQuestion.correct
            ? "border-green-500 ring-2 ring-green-300"
            : "border-red-500 ring-2 ring-red-300";
        } else if (selectedValue) {
          borderColorClass = "border-indigo-500";
        }

        const correctOption = question.options.find(
          (o) => o.id === String(question.correctAnswer)
        );

        elements.push(
          <span
            key={`blank-${question.id}`}
            className="inline-block mx-1 align-bottom relative group"
          >
            <div className="inline-flex items-center gap-1">
              <Select
                value={selectedValue}
                onValueChange={(value) => {
                  console.log(
                    `Select change for Q_ID ${question.id}: ${value}`
                  );
                  onAnswerSelect(question.id, value);
                }}
                disabled={submitted}
              >
                <SelectTrigger
                  className={`w-auto min-w-[120px] max-w-[220px] h-9 text-base px-3 py-2 inline-flex items-center justify-between ${borderColorClass} ${
                    submitted && resultForThisQuestion?.correct === false
                      ? "bg-red-100"
                      : submitted && resultForThisQuestion?.correct === true
                      ? "bg-green-100"
                      : "bg-white hover:bg-gray-50"
                  }`}
                >
                  <SelectValue placeholder={`(${blankIdentifier})`} />
                </SelectTrigger>
                <SelectContent>
                  {question.options.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id}>
                      {opt.text}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status icon */}
              {submitted && resultForThisQuestion && (
                <span className="inline-flex items-center">
                  {resultForThisQuestion.correct ? (
                    <FaCheck className="text-green-600 text-base" />
                  ) : (
                    <FaTimes className="text-red-600 text-base" />
                  )}
                </span>
              )}

              {/* Question mark icon for explanation */}
              {submitted && (question.explanation || correctOption) && (
                <button
                  onClick={() => toggleExplanation(question.id)}
                  className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-600 transition-colors ml-1"
                  title="Show explanation"
                >
                  <FaQuestionCircle className="text-sm" />
                </button>
              )}
            </div>

            {/* Enhanced explanation tooltip/popup - Made much bigger */}
            {submitted &&
              showingExplanation === question.id &&
              (correctOption || question.explanation) && (
                <div className="absolute top-full left-0 mt-3 w-96 p-5 bg-white border border-gray-200 rounded-xl shadow-xl z-20">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center text-base font-semibold text-gray-700">
                      <FaInfoCircle className="mr-2 text-blue-500 text-lg" />
                      {blankIdentifier} Details
                    </div>
                    <button
                      onClick={() => setShowingExplanation(null)}
                      className="text-gray-400 hover:text-gray-600 text-xl"
                    >
                      ×
                    </button>
                  </div>

                  {/* Show correct answer */}
                  {correctOption && (
                    <div className="mb-3 p-3 bg-green-50 rounded-lg border-l-4 border-green-400">
                      <div className="text-sm font-semibold text-green-800 mb-2">
                        Correct Answer:
                      </div>
                      <div className="text-base text-green-700">
                        {correctOption.text}
                      </div>
                    </div>
                  )}

                  {/* Show user's answer if incorrect */}
                  {submitted &&
                    resultForThisQuestion &&
                    !resultForThisQuestion.correct &&
                    selectedValue && (
                      <div className="mb-3 p-3 bg-red-50 rounded-lg border-l-4 border-red-400">
                        <div className="text-sm font-semibold text-red-800 mb-2">
                          Your Answer:
                        </div>
                        <div className="text-base text-red-700">
                          {question.options.find((o) => o.id === selectedValue)
                            ?.text || selectedValue}
                        </div>
                      </div>
                    )}

                  {/* Show explanation */}
                  {question.explanation && (
                    <div className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                      <div className="text-sm font-semibold text-blue-800 mb-2">
                        Explanation:
                      </div>
                      <div className="text-base text-blue-700 leading-relaxed">
                        {question.explanation}
                      </div>
                    </div>
                  )}
                </div>
              )}

            {/* Simple hover tooltip for quick reference (only show if explanation popup is not open) */}
            {submitted &&
              showingExplanation !== question.id &&
              resultForThisQuestion?.correct === false &&
              correctOption && (
                <div className="absolute hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-2 w-max p-2 text-sm text-white bg-black rounded-md shadow-lg z-10">
                  Correct: {correctOption.text}
                </div>
              )}
          </span>
        );
      } else {
        // If no question found for this blank identifier, render the original text
        elements.push(
          <span key={`unmatched-${match.index}`}>{fullMatch}</span>
        );
      }
      lastIndex = blankRegex.lastIndex;
    }

    // Remaining text after the last blank
    if (lastIndex < passageContent.length) {
      elements.push(
        <span key={`text-end`}>{passageContent.substring(lastIndex)}</span>
      );
    }
    return <>{elements}</>;
  };

  return (
    <div className="mb-6 p-6 bg-gray-50 border-l-4 border-gray-400 rounded-r-lg shadow-sm relative">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold text-gray-800 flex items-center">
          {passageTitle || "Cloze Passage"}
        </h2>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          {submitted && (
            <div className="flex items-center">
              Click <FaQuestionCircle className="mx-1 text-blue-500" /> for
              explanations
            </div>
          )}
          <div className="flex items-center">
            <FaLanguage className="mr-1 text-purple-500" />
            Highlight Chinese text for pinyin & meanings
          </div>
        </div>
      </div>

      <div
        ref={passageRef}
        className="text-gray-800 whitespace-normal max-h-[calc(100vh-300px)] overflow-y-auto custom-scrollbar pr-3 leading-loose select-text"
        style={{ fontSize: "1.25rem", lineHeight: "2.2" }} // Increased font size and line height
      >
        {renderInteractivePassage()}
      </div>

      {/* Text Selection Popup */}
      {selectedText && (
        <div
          className="fixed bg-white rounded-lg shadow-2xl border border-gray-200 p-4 z-50 max-w-md"
          style={{
            left: selectedText.x,
            top: selectedText.y + selectedText.height + 10,
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <span className="text-lg font-semibold text-gray-800 mr-2">
                “{selectedText.text}”
              </span>
            </div>
            <button
              onClick={closeSelectionPopup}
              className="text-gray-400 hover:text-gray-600"
            >
              <FaClose />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={handleShowPinyin}
              disabled={showPinyin && wordInfo?.loading}
              className="flex items-center gap-2 px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors disabled:opacity-50"
            >
              <FaLanguage />
              <span>Pinyin</span>
              {showPinyin && wordInfo?.loading && (
                <FaSpinner className="animate-spin" />
              )}
            </button>
            <button
              onClick={handleShowExplanation}
              disabled={showExplanation && wordInfo?.loading}
              className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50"
            >
              <FaBook />
              <span>Explain</span>
              {showExplanation && wordInfo?.loading && (
                <FaSpinner className="animate-spin" />
              )}
            </button>
            <button
              onClick={handleAddToContext}
              className="flex items-center gap-2 px-3 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors"
              title="Add to AI chat for further questions"
            >
              <FaCommentDots />
              <span>Ask AI</span>
            </button>
          </div>

          {/* Results */}
          {showPinyin && wordInfo?.pinyin && (
            <div className="mb-3 p-3 bg-purple-50 rounded-lg border-l-4 border-purple-400">
              <div className="text-sm font-semibold text-purple-800 mb-1">
                Pinyin:
              </div>
              <div className="text-base text-purple-700 font-mono">
                {wordInfo.pinyin}
              </div>
            </div>
          )}

          {showExplanation && wordInfo?.explanation && (
            <div className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
              <div className="text-sm font-semibold text-blue-800 mb-1">
                Explanation:
              </div>
              <div className="text-sm text-blue-700 leading-relaxed">
                {wordInfo.explanation}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PassageDisplay;
