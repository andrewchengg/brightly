import React, { useState } from "react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { FaCheck, FaTimes, FaQuestionCircle } from "react-icons/fa";
import { QuestionClient } from "@/app/(dashboard)/student/practice/chinese/cloze/[questionGroupId]/page";

interface ChinesePassageDisplayProps {
  title: string;
  content: string;
  audioUrl?: string | null;
  questions: QuestionClient[];
  answeredQuestions: Record<number, string | Record<string, string>>;
  onAnswerSelect: (questionId: number, selectedOptionId: string) => void;
  submitted: boolean;
  questionResults: { id: number; correct: boolean }[];
}

const ChinesePassageDisplay: React.FC<ChinesePassageDisplayProps> = ({
  title,
  content,
  audioUrl,
  questions,
  answeredQuestions,
  onAnswerSelect,
  submitted,
  questionResults,
}) => {
  const [showingExplanation, setShowingExplanation] = useState<number | null>(
    null
  );

  if (!content) {
    return <p className="text-center py-8">No passage content available.</p>;
  }

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
    if (!content) return null;

    const blankRegex = /(Q\d+)(\s*\([^)]*\))?/g; // Captures QXX and optional bracketed text
    let lastIndex = 0;
    const elements = [];
    let match;

    while ((match = blankRegex.exec(content)) !== null) {
      // Text before the blank
      if (match.index > lastIndex) {
        elements.push(
          <span key={`text-${lastIndex}`}>
            {content.substring(lastIndex, match.index)}
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
                onValueChange={(value) => onAnswerSelect(question.id, value)}
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

            {/* Enhanced explanation tooltip/popup */}
            {submitted &&
              showingExplanation === question.id &&
              (correctOption || question.explanation) && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-[9998]"
                    onClick={() => setShowingExplanation(null)}
                  />
                  {/* Popup */}
                  <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 p-5 bg-white border border-gray-200 rounded-xl shadow-xl z-[9999]">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center text-base font-semibold text-gray-700">
                        <FaQuestionCircle className="mr-2 text-blue-500 text-lg" />
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
                            {question.options.find(
                              (o) => o.id === selectedValue
                            )?.text || selectedValue}
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
                </>
              )}

            {/* Simple hover tooltip for quick reference */}
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
    if (lastIndex < content.length) {
      elements.push(
        <span key={`text-end`}>{content.substring(lastIndex)}</span>
      );
    }
    return <>{elements}</>;
  };

  return (
    <div className="p-4 bg-indigo-50 border-l-4 border-indigo-400 rounded-r-md shadow">
      <h2 className="text-lg font-semibold text-indigo-800 mb-2">{title}</h2>
      <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap max-h-[calc(100vh-350px)] overflow-y-auto custom-scrollbar pr-2">
        {renderInteractivePassage()}
      </div>
      {audioUrl && (
        <div className="mt-4">
          <audio controls className="w-full">
            <source src={audioUrl} type="audio/mpeg" />
            Your browser does not support the audio element.
          </audio>
        </div>
      )}
    </div>
  );
};

export default ChinesePassageDisplay;
