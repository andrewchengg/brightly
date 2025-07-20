import React from "react";
import {
  FaExclamationTriangle,
  FaTimes,
  FaArrowLeft,
  FaSave,
} from "react-icons/fa";
import { Button } from "@/components/ui/button";

interface ExitPracticeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onExit: () => void;
  onSaveAndExit?: () => void;
  title?: string;
  subtitle?: string;
  currentProgress?: {
    currentQuestion: number;
    totalQuestions: number;
    score: number;
    correctAnswers: number;
    totalMarksEarned: number;
    totalPossibleMarks: number;
    xpEarned: number;
  };
  showSaveOption?: boolean;
  simple?: boolean;
}

export const ExitPracticeDialog: React.FC<ExitPracticeDialogProps> = ({
  isOpen,
  onClose,
  onExit,
  onSaveAndExit,
  title = "Exit Practice Session?",
  subtitle = "Are you sure you want to leave this practice session?",
  currentProgress,
  showSaveOption = false,
  simple = true, // Default to simple version
}) => {
  const handleStayAndContinue = () => {
    onClose();
  };

  const handleSaveAndExit = () => {
    if (onSaveAndExit) {
      onSaveAndExit();
    }
  };

  const handleExitWithoutSaving = () => {
    onExit();
  };

  if (!isOpen) return null;

  // Use simple version by default
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md mx-4 animate-in fade-in zoom-in duration-200">
        <div className="relative p-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-1"
          >
            <FaTimes size={16} />
          </button>

          <div className="text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaExclamationTriangle className="text-amber-600 text-2xl" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {title}
            </h3>
            <p className="text-gray-600 mb-6">
              {subtitle || "All progress will be lost."}
            </p>

            {/* Show minimal progress info if available */}
            {currentProgress && (
              <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Progress:</span>
                  <span className="font-medium text-gray-900">
                    {currentProgress.currentQuestion} /{" "}
                    {currentProgress.totalQuestions} questions
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 p-6 pt-0">
          <Button
            variant="outline"
            onClick={handleStayAndContinue}
            className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Stay & Continue
          </Button>

          {showSaveOption && onSaveAndExit ? (
            <Button
              onClick={handleSaveAndExit}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <FaSave className="mr-2" size={14} />
              Save & Exit
            </Button>
          ) : (
            <Button
              onClick={handleExitWithoutSaving}
              variant="outline"
              className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
            >
              <FaArrowLeft className="mr-2" size={14} />
              Exit
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExitPracticeDialog;
