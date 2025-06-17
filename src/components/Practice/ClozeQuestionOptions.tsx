// src/components/Practice/ClozeQuestionOptions.tsx
import React from "react";
import { Button } from "@/components/ui/button";
import { QuestionClient } from "@/app/(dashboard)/student/practice/question-group/[questionGroupId]/page"; // Adjust path

interface OptionClient {
  id: string;
  text: string;
}

interface ClozeQuestionOptionsProps {
  currentQuestion: QuestionClient;
  selectedAnswer: string | null;
  isAnswerCorrect: boolean | null;
  onAnswerSelect: (optionId: string, optionText: string) => void; // Changed from handleAnswerMCQ
}

const ClozeQuestionOptions: React.FC<ClozeQuestionOptionsProps> = ({
  currentQuestion,
  selectedAnswer,
  isAnswerCorrect,
  onAnswerSelect,
}) => {
  if (currentQuestion.questionType !== "MULTIPLE_CHOICE") {
    return (
      <p className="text-sm text-red-500">
        Error: This component only supports MCQ for cloze.
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-2">
      {currentQuestion.options && currentQuestion.options.length > 0 ? (
        currentQuestion.options.map((option, index: number) => {
          const optionId = option.id;
          const optionText = option.text;
          const optionLetter = String.fromCharCode(65 + index);
          const isThisSelected = selectedAnswer === optionId;

          let buttonClass =
            "bg-white hover:bg-gray-50 border border-gray-300 text-gray-700";
          if (selectedAnswer !== null) {
            if (isThisSelected) {
              buttonClass = isAnswerCorrect
                ? "bg-green-100 border-green-500 text-green-800 ring-2 ring-green-500"
                : "bg-red-100 border-red-500 text-red-800 ring-2 ring-red-500";
            } else if (
              String(currentQuestion.correctAnswer || "").toLowerCase() ===
              optionId.toLowerCase()
            ) {
              buttonClass = "bg-green-100 border-green-500 text-green-800"; // Show correct if user picked wrong
            }
          } else {
            buttonClass =
              "bg-white hover:bg-indigo-50 border-gray-300 hover:border-indigo-400";
          }

          return (
            <Button
              key={option.id || index}
              onClick={() => onAnswerSelect(optionId, optionText)}
              disabled={selectedAnswer !== null}
              variant="outline" // Use outline or a custom variant
              className={`w-full text-left p-3 rounded-md transition-all duration-150 text-sm justify-start ${buttonClass}`}
            >
              <span className="font-semibold mr-2">{optionLetter}.</span>{" "}
              {optionText}
            </Button>
          );
        })
      ) : (
        <div className="p-3 bg-yellow-50 border rounded-md text-yellow-800 text-center text-sm">
          <p>No options available for this question.</p>
        </div>
      )}
    </div>
  );
};

export default ClozeQuestionOptions;
