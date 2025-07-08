"use client";

import React, { useState, useEffect } from "react";
import { FaRobot, FaChalkboard, FaTimes } from "react-icons/fa";
import { AIAssistant } from "@/components/AILearningAssistant";
import WhiteboardModal from "@/components/ui/WhiteboardModal";
import { AIAssistantProps } from "@/components/AILearningAssistant/types";

interface MobileFloatingButtonsProps {
  aiAssistantProps: AIAssistantProps;
  className?: string;
}

const MobileFloatingButtons: React.FC<MobileFloatingButtonsProps> = ({
  aiAssistantProps,
  className = "",
}) => {
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Don't render on desktop
  if (!isMobile) {
    return null;
  }

  return (
    <>
      {/* Floating Buttons Container */}
      <div className={`fixed bottom-6 right-6 z-40 flex flex-col gap-3 ${className}`}>
        {/* AI Assistant (Bright Ben) Button */}
        <button
          onClick={() => setShowAIAssistant(true)}
          className="w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group"
          title="Open Bright Ben AI Assistant"
        >
          <FaRobot size={20} className="group-hover:scale-110 transition-transform duration-200" />
        </button>

        {/* Whiteboard Button */}
        <button
          onClick={() => setShowWhiteboard(true)}
          className="w-14 h-14 bg-purple-800 hover:bg-purple-900 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group"
          title="Open Whiteboard"
        >
          <FaChalkboard size={20} className="group-hover:scale-110 transition-transform duration-200" />
        </button>
      </div>

      {/* AI Assistant Full Screen Modal */}
      {showAIAssistant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
          <div className="w-full h-[90vh] bg-white rounded-t-2xl shadow-2xl animate-slide-up">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-indigo-50 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center">
                  <FaRobot size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Bright Ben</h3>
                  <p className="text-sm text-gray-600">Your AI Learning Assistant</p>
                </div>
              </div>
              <button
                onClick={() => setShowAIAssistant(false)}
                className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors duration-200"
              >
                <FaTimes size={16} className="text-gray-600" />
              </button>
            </div>

            {/* AI Assistant Content */}
            <div className="h-[calc(90vh-80px)] overflow-hidden">
              <AIAssistant
                {...aiAssistantProps}
                className="h-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* Whiteboard Full Screen Modal */}
      {showWhiteboard && (
        <WhiteboardModal
          isOpen={showWhiteboard}
          onClose={() => setShowWhiteboard(false)}
          onSave={(imageDataURL) => {
            console.log("Whiteboard saved:", imageDataURL);
            setShowWhiteboard(false);
          }}
        />
      )}


    </>
  );
};

export default MobileFloatingButtons; 