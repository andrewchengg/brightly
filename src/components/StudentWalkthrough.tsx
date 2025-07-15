"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { FaBook, FaQuestionCircle, FaCalendarAlt, FaFileAlt, FaChartBar, FaLightbulb, FaTimes, FaArrowRight, FaArrowLeft } from "react-icons/fa";

interface WalkthroughStep {
  id: string;
  title: string;
  description: string;
  targetSelector: string;
  position: "top" | "bottom" | "left" | "right";
  offset?: { x: number; y: number };
}

const walkthroughSteps: WalkthroughStep[] = [
  {
    id: "welcome",
    title: "Welcome to Brightly! 🎉",
    description: "Let's take a quick tour of your learning dashboard. You'll discover all the amazing features that will help you excel in your studies.",
    targetSelector: "body",
    position: "top",
  },
  {
    id: "practice",
    title: "Practice Makes Perfect 📚",
    description: "Click on 'Practice' to access topical practice for all four subjects. You can choose specific topics or take random practice sessions to improve your skills.",
    targetSelector: 'a[href="/student/practice"]',
    position: "right",
    offset: { x: 10, y: 0 },
  },
  {
    id: "ask-ben",
    title: "Ask Ben - Your AI Tutor 🤖",
    description: "Need help with any academic question? Click 'Ask Ben' to consult our AI tutor. Ben can help with explanations, problem-solving, and study tips!",
    targetSelector: 'a[href="/student/ask"]',
    position: "right",
    offset: { x: 10, y: 0 },
  },
  {
    id: "weekly-challenge",
    title: "Weekly Challenges 🏆",
    description: "Test your knowledge with our weekly challenges! These special assignments help you stay motivated and track your progress over time.",
    targetSelector: 'a[href="/student/weekly-challenge"]',
    position: "right",
    offset: { x: 10, y: 0 },
  },
  {
    id: "mock-exams",
    title: "Mock Exams 📝",
    description: "Prepare for real exams with our mock exam feature. Practice under timed conditions to build confidence and improve your exam performance.",
    targetSelector: 'a[href="/student/mock-exam"]',
    position: "right",
    offset: { x: 10, y: 0 },
  },
  {
    id: "results",
    title: "Track Your Progress 📊",
    description: "View your results and progress in 'My Results'. See how you're performing across different subjects and topics.",
    targetSelector: 'a[href="/student/results"]',
    position: "right",
    offset: { x: 10, y: 0 },
  },
  {
    id: "review",
    title: "Review & Learn 🔍",
    description: "Use the 'Review' section to go back over questions you've answered. This helps reinforce your learning and identify areas for improvement.",
    targetSelector: 'a[href="/student/review"]',
    position: "right",
    offset: { x: 10, y: 0 },
  },
  {
    id: "calendar",
    title: "Your Practice Calendar 📅",
    description: "Your practice calendar shows your learning schedule and helps you stay organized. Check it regularly to see upcoming assignments and track your daily practice.",
    targetSelector: ".bg-white.rounded-2xl.shadow-xl.p-6.h-fit:first-of-type",
    position: "left",
    offset: { x: -10, y: 0 },
  },
  {
    id: "quests",
    title: "Weekly Quests 🎯",
    description: "Complete weekly quests to earn XP and rewards! These fun challenges keep you motivated and help you develop good study habits.",
    targetSelector: "#dashboard-weekly-quests-card",
    position: "left",
    offset: { x: -10, y: 0 },
  },
  {
    id: "complete",
    title: "You're All Set! 🚀",
    description: "Congratulations! You've completed the tour. You're now ready to start your learning journey with Brightly. Remember, practice regularly and don't hesitate to ask Ben for help!",
    targetSelector: "body",
    position: "top",
  },
];

interface StudentWalkthroughProps {
  isOpen: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

export default function StudentWalkthrough({ isOpen, onComplete, onSkip }: StudentWalkthroughProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const step = walkthroughSteps[currentStep];
    
    // Wait a bit for the DOM to be ready
    const timer = setTimeout(() => {
      const element = document.querySelector(step.targetSelector) as HTMLElement;
      setTargetElement(element);

      if (element && element !== document.body) {
        // For sidebar elements, scroll the sidebar into view
        if (element.closest('#sidebar')) {
          const sidebar = document.getElementById('sidebar');
          if (sidebar) {
            sidebar.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        } else {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [currentStep, isOpen]);

  const handleNext = () => {
    if (currentStep < walkthroughSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  if (!isOpen) return null;

  const step = walkthroughSteps[currentStep];
  const isLastStep = currentStep === walkthroughSteps.length - 1;

  // Calculate position for the modal based on target element
  const getModalPosition = () => {
    if (!targetElement || targetElement === document.body) {
      return { transform: "none" };
    }

    const rect = targetElement.getBoundingClientRect();
    const isSidebarElement = targetElement.closest('#sidebar');
    
    if (isSidebarElement) {
      return { transform: "translateX(20px)" };
    }

    if (step.position === "left") {
      return { transform: "translateX(-20px)" };
    } else if (step.position === "right") {
      return { transform: "translateX(20px)" };
    }

    return { transform: "none" };
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={handleSkip} />

      {/* Highlight overlay for target element */}
      {targetElement && targetElement !== document.body && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            top: targetElement.offsetTop - 4,
            left: targetElement.offsetLeft - 4,
            width: targetElement.offsetWidth + 8,
            height: targetElement.offsetHeight + 8,
            border: "3px solid #8B5CF6",
            borderRadius: "12px",
            boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.5)",
          }}
        />
      )}

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className={`bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 relative ${
            step.position === "top" ? "mb-4" : ""
          }`}
          style={getModalPosition()}
        >
          {/* Close button */}
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <FaTimes className="w-4 h-4 text-gray-500" />
          </button>

          {/* Content */}
          <div className="p-6">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {step.title}
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                {step.description}
              </p>
            </div>

            {/* Progress indicator */}
            <div className="mb-6">
              <div className="flex justify-between text-xs text-gray-500 mb-2">
                <span>Step {currentStep + 1} of {walkthroughSteps.length}</span>
                <span>{Math.round(((currentStep + 1) / walkthroughSteps.length) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentStep + 1) / walkthroughSteps.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Navigation buttons */}
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 0}
                className="flex items-center gap-2"
              >
                <FaArrowLeft className="w-3 h-3" />
                Previous
              </Button>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleSkip}
                  className="text-gray-600"
                >
                  Skip Tour
                </Button>
                <Button
                  onClick={handleNext}
                  className="bg-purple-600 hover:bg-purple-700 flex items-center gap-2"
                >
                  {isLastStep ? "Get Started" : "Next"}
                  {!isLastStep && <FaArrowRight className="w-3 h-3" />}
                </Button>
              </div>
            </div>
          </div>

          {/* Arrow pointing to target */}
          {targetElement && targetElement !== document.body && (
            <div
              className={`absolute w-0 h-0 border-8 border-transparent ${
                step.position === "top" ? "border-b-white -top-4 left-1/2 transform -translate-x-1/2" :
                step.position === "bottom" ? "border-t-white -bottom-4 left-1/2 transform -translate-x-1/2" :
                step.position === "left" ? "border-r-white -left-4 top-1/2 transform -translate-y-1/2" :
                "border-l-white -right-4 top-1/2 transform -translate-y-1/2"
              }`}
            />
          )}
        </div>
      </div>
    </>
  );
} 