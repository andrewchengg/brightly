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
  simple = false,
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

  if (simple) {
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
                Are you sure you want to exit?
              </h3>
              <p className="text-gray-600 mb-6">All progress will be lost.</p>
            </div>
          </div>

          <div className="flex gap-3 p-6 pt-0">
            <Button
              variant="outline"
              onClick={handleStayAndContinue}
              className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Stay
            </Button>
            <Button
              onClick={handleExitWithoutSaving}
              variant="outline"
              className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
            >
              Exit
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-md mx-4 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="relative p-6 border-b border-gray-100">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-1"
          >
            <FaTimes size={16} />
          </button>

          <div className="flex items-center">
            <div className="flex-shrink-0 w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mr-4">
              <FaExclamationTriangle className="text-amber-600 text-xl" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {title}
              </h3>
              <p className="text-sm text-gray-600">{subtitle}</p>
            </div>
          </div>
        </div>

        {/* Progress Summary */}
        {currentProgress && (
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
            <div className="text-sm text-gray-700 mb-2">
              <strong>Your Current Progress:</strong>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Questions:</span>
                <span className="font-medium text-gray-900">
                  {currentProgress.currentQuestion} /{" "}
                  {currentProgress.totalQuestions}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Score:</span>
                <span className="font-medium text-amber-600">
                  {currentProgress.totalMarksEarned} /{" "}
                  {currentProgress.totalPossibleMarks} marks
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Correct:</span>
                <span className="font-medium text-green-600">
                  {currentProgress.correctAnswers}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Progress:</span>
                <span className="font-medium text-indigo-600">
                  {Math.round(
                    (currentProgress.currentQuestion /
                      currentProgress.totalQuestions) *
                      100
                  )}
                  %
                </span>
              </div>
            </div>
            <div className="text-center mb-4">
              <p className="text-gray-600">Current Progress:</p>
              <p className="text-lg font-semibold">
                {currentProgress.totalMarksEarned} /{" "}
                {currentProgress.totalPossibleMarks} marks
              </p>
              <p className="text-sm text-gray-500">
                {currentProgress.xpEarned} XP earned
              </p>
            </div>
          </div>
        )}

        {/* Warning Message */}
        <div className="px-6 py-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start">
              <FaExclamationTriangle className="text-amber-600 text-lg mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-amber-800 mb-1">
                  Warning: Progress Will Be Lost
                </h4>
                <p className="text-amber-700 text-sm">
                  If you exit now, your practice session and all progress will
                  be permanently deleted. You'll need to start over from the
                  beginning next time.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 p-6 pt-0">
          <Button
            variant="outline"
            onClick={handleStayAndContinue}
            className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Stay & Continue
          </Button>

          {showSaveOption && onSaveAndExit && (
            <Button
              onClick={handleSaveAndExit}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <FaSave className="mr-2" size={14} />
              Save & Exit
            </Button>
          )}

          <Button
            onClick={handleExitWithoutSaving}
            variant="outline"
            className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
          >
            <FaArrowLeft className="mr-2" size={14} />
            Exit & Delete Progress
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ExitPracticeDialog;
