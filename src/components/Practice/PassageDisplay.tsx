// src/components/Practice/PassageDisplay.tsx
import React from "react";
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
} from "@/components/ui/select"; // Using your Select component
import { FaCheck, FaRegListAlt, FaTimes } from "react-icons/fa";

interface PassageDisplayProps {
  passageTitle: string;
  passageContent: string | null;
  questions: QuestionClient[]; // All questions for this passage group
  answeredQuestions: Record<number, string | Record<string, string>>; // questionId: selectedOptionId
  onAnswerSelect: (questionId: number, selectedOptionId: string) => void;
  submitted: boolean; // To disable selects after submission
  questionResults: { id: number; correct: boolean }[]; // To show correctness after submission
}
// src/components/Practice/PassageDisplay.tsx

// ... (imports and interface remain the same)

const PassageDisplay: React.FC<PassageDisplayProps> = ({
  passageTitle,
  passageContent,
  questions,
  answeredQuestions,
  onAnswerSelect,
  submitted,
  questionResults,
}) => {
  // No longer need passageDisplayRef for this specific scrolling,
  // as React handles the elements directly.
  // const passageDisplayRef = useRef<HTMLDivElement>(null);

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

        elements.push(
          <span
            key={`blank-${question.id}`}
            className="inline-block mx-1 align-bottom relative group"
          >
            <Select
              value={selectedValue}
              onValueChange={(value) => {
                console.log(`Select change for Q_ID ${question.id}: ${value}`);
                onAnswerSelect(question.id, value);
              }}
              disabled={submitted}
            >
              <SelectTrigger
                className={`w-auto min-w-[100px] max-w-[200px] h-8 text-sm px-2 py-1 inline-flex items-center justify-between ${borderColorClass} ${
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
            {submitted &&
              resultForThisQuestion &&
              (resultForThisQuestion.correct ? (
                <FaCheck className="inline-block ml-1 text-green-600" />
              ) : (
                <FaTimes className="inline-block ml-1 text-red-600" />
              ))}
            {/* Tooltip for correct answer on incorrect items after submission */}
            {submitted &&
              resultForThisQuestion?.correct === false &&
              question.correctAnswer && (
                <div className="absolute hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-max p-2 text-xs text-white bg-black rounded-md shadow-lg z-10">
                  Correct:{" "}
                  {question.options.find(
                    (o) => o.id === String(question.correctAnswer)
                  )?.text || String(question.correctAnswer)}
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
    <div className="mb-6 p-4 bg-indigo-50 border-l-4 border-indigo-400 rounded-r-md shadow">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-semibold text-indigo-800 flex items-center">
          {passageTitle || "Cloze Passage"}
        </h2>
      </div>
      <div
        className="text-gray-800 whitespace-normal max-h-[calc(100vh-300px)] overflow-y-auto custom-scrollbar pr-2 leading-loose"
        style={{ fontSize: "1.1rem", lineHeight: "2" }} // Increased line-height
      >
        {renderInteractivePassage()}
      </div>
    </div>
  );
};

export default PassageDisplay;
