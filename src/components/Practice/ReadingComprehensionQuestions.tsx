import React from "react";
import { Button } from "@/components/ui/button";
import {
  FaCheck,
  FaTimes,
  FaLightbulb,
  FaSpinner,
  FaArrowRight,
} from "react-icons/fa";

interface OptionClient {
  id: string;
  text: string;
}

interface QuestionClient {
  id: number;
  text: string;
  question?: string;
  options: OptionClient[];
  correctAnswer: string | string[] | Record<string, string> | null;
  hint?: string;
  explanation?: string | null;
  topic: { id: number; name: string; subjectId?: number };
  difficulty?: string;
  pointsAwarded?: number;
  questionType?: string;
  imageUrl?: string;
  topicName?: string;
  questionNumberOnPage?: string;
}

interface ReadingComprehensionQuestionsProps {
  questions: QuestionClient[];
  currentQuestionIndex: number;
  currentQuestion: QuestionClient | null;
  selectedAnswer: string | null;
  isAnswerCorrect: boolean | null;
  showHint: boolean;
  onAnswerSelect: (optionId: string) => void;
  onShowHint: () => void;
  onNextQuestion: () => void;
  loading?: boolean | string;
}

const ReadingComprehensionQuestions: React.FC<
  ReadingComprehensionQuestionsProps
> = ({
  questions,
  currentQuestionIndex,
  currentQuestion,
  selectedAnswer,
  isAnswerCorrect,
  showHint,
  onAnswerSelect,
  onShowHint,
  onNextQuestion,
  loading = false,
}) => {
  if (!currentQuestion) {
    return (
      <div className="p-6 text-center text-gray-600">
        <p>No questions available for this passage.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        {/* Progress indicator */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
            <span className="text-sm text-gray-500">
              {currentQuestion.pointsAwarded || 10} points
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${
                  ((currentQuestionIndex + 1) / questions.length) * 100
                }%`,
              }}
            ></div>
          </div>
        </div>

        {/* Question */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 leading-relaxed">
            {currentQuestion.text || currentQuestion.question}
          </h3>

          {/* Question image if available */}
          {currentQuestion.imageUrl && (
            <div className="mb-4 flex justify-center">
              <img
                src={currentQuestion.imageUrl}
                alt="Question visual aid"
                className="max-w-full max-h-64 rounded-lg border border-gray-200 shadow-sm"
              />
            </div>
          )}
        </div>

        {/* Options */}
        <div className="space-y-3 mb-6">
          {currentQuestion.options.map((option, index) => {
            const isSelected = selectedAnswer === option.id;
            const isCorrectOption =
              String(currentQuestion.correctAnswer).toLowerCase() ===
              option.id.toLowerCase();

            let buttonStyle =
              "border-2 text-left p-4 rounded-lg transition-all duration-200 w-full";

            if (selectedAnswer === null) {
              // Before selection
              buttonStyle += isSelected
                ? " border-indigo-500 bg-indigo-50 text-indigo-900"
                : " border-gray-300 bg-white text-gray-700 hover:border-indigo-300 hover:bg-indigo-25";
            } else {
              // After selection
              if (isSelected && isAnswerCorrect) {
                buttonStyle += " border-green-500 bg-green-50 text-green-900";
              } else if (isSelected && !isAnswerCorrect) {
                buttonStyle += " border-red-500 bg-red-50 text-red-900";
              } else if (isCorrectOption && !isAnswerCorrect) {
                buttonStyle += " border-green-500 bg-green-50 text-green-900";
              } else {
                buttonStyle += " border-gray-300 bg-gray-50 text-gray-600";
              }
            }

            return (
              <button
                key={option.id}
                onClick={() =>
                  selectedAnswer === null && onAnswerSelect(option.id)
                }
                disabled={selectedAnswer !== null}
                className={buttonStyle}
              >
                <div className="flex items-center">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full border-2 border-current flex items-center justify-center font-semibold mr-4">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span className="text-sm font-medium">{option.text}</span>
                  {selectedAnswer !== null && (
                    <span className="ml-auto">
                      {isSelected && isAnswerCorrect && (
                        <FaCheck className="text-green-600" />
                      )}
                      {isSelected && !isAnswerCorrect && (
                        <FaTimes className="text-red-600" />
                      )}
                      {isCorrectOption && !isAnswerCorrect && (
                        <FaCheck className="text-green-600" />
                      )}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Feedback after answering */}
        {selectedAnswer !== null && (
          <div
            className={`mb-6 p-4 rounded-lg border-l-4 ${
              isAnswerCorrect
                ? "bg-green-50 border-green-400 text-green-800"
                : "bg-red-50 border-red-400 text-red-800"
            }`}
          >
            <p className="font-semibold mb-2">
              {isAnswerCorrect ? "Correct!" : "Incorrect"}
            </p>
            {!isAnswerCorrect && (
              <p className="text-sm">
                The correct answer is:{" "}
                {
                  currentQuestion.options.find(
                    (opt) =>
                      opt.id.toLowerCase() ===
                      String(currentQuestion.correctAnswer).toLowerCase()
                  )?.text
                }
              </p>
            )}
            {currentQuestion.explanation && (
              <div className="mt-3 pt-3 border-t border-current border-opacity-20">
                <p className="font-semibold text-sm mb-1">Explanation:</p>
                <p className="text-sm">{currentQuestion.explanation}</p>
              </div>
            )}
          </div>
        )}

        {/* Hint */}
        {showHint && currentQuestion.hint && (
          <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg">
            <div className="flex items-start">
              <FaLightbulb className="text-yellow-500 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="font-semibold text-yellow-900 text-sm mb-1">
                  Hint:
                </p>
                <p className="text-yellow-800 text-sm">
                  {currentQuestion.hint}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <Button
            onClick={onShowHint}
            disabled={
              selectedAnswer !== null || showHint || !currentQuestion.hint
            }
            variant="outline"
            className="w-full sm:w-auto"
          >
            <FaLightbulb className="mr-2" />
            Show Hint
          </Button>

          <Button
            onClick={onNextQuestion}
            disabled={
              selectedAnswer === null ||
              (typeof loading === "string" && loading === "submitting")
            }
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700"
          >
            {typeof loading === "string" && loading === "submitting" && (
              <FaSpinner className="animate-spin mr-2" />
            )}
            {currentQuestionIndex < questions.length - 1 ? (
              <>
                Next Question
                <FaArrowRight className="ml-2" />
              </>
            ) : (
              "🏁 Show Results"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ReadingComprehensionQuestions;
