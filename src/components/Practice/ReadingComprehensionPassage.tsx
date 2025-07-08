// src/components/Practice/ReadingComprehensionPassage.tsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  FaLanguage,
  FaBook,
  FaSpinner,
  FaTimes as FaClose,
  FaCommentDots,
} from "react-icons/fa";

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

interface ReadingComprehensionPassageProps {
  passageTitle: string;
  passageContent: string | null;
  onAddTextToAIContext: (text: string) => void;
}

const ReadingComprehensionPassage: React.FC<
  ReadingComprehensionPassageProps
> = ({ passageTitle, passageContent, onAddTextToAIContext }) => {
  const [selectedText, setSelectedText] = useState<TextSelection | null>(null);
  const [wordInfo, setWordInfo] = useState<WordInfo | null>(null);
  const [showPinyin, setShowPinyin] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [customQuestion, setCustomQuestion] = useState("");
  const [showQuestionInput, setShowQuestionInput] = useState(false);
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
          context: {
            session: {
              sessionType: "reading_comprehension",
              totalQuestions: 1,
              answeredQuestions: 0,
              correctAnswers: 0,
              isCompleted: false,
              studentLevel: "Primary School"
            },
            selectedText: text,
            passage: {
              title: passageTitle,
              content: passageContent || ""
            }
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Explanation request failed");
      }

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
    console.log('Selected text:', selectedText); // Debug log

    if (selectedText.length === 0 || !containsChinese(selectedText)) {
      console.log('No Chinese text detected'); // Debug log
      setSelectedText(null);
      setWordInfo(null);
      setShowPinyin(false);
      setShowExplanation(false);
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    console.log('Selection position:', rect); // Debug log

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
    console.log('Adding text selection event listeners'); // Debug log
    document.addEventListener("mouseup", handleTextSelection);
    document.addEventListener("keyup", handleTextSelection);

    return () => {
      console.log('Removing text selection event listeners'); // Debug log
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
      console.log('Fetching pinyin for:', selectedText.text); // Debug log
      const pinyin = await getPinyin(selectedText.text);
      console.log('Pinyin result:', pinyin); // Debug log
      setWordInfo((prev) => ({ ...prev, pinyin, loading: false }));
    } catch (error) {
      console.error("Pinyin conversion error:", error);
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

  const handleSubmitQuestion = () => {
    if (selectedText && customQuestion.trim()) {
      onAddTextToAIContext(`${selectedText.text}\n\nQuestion: ${customQuestion.trim()}`);
      setCustomQuestion("");
      setShowQuestionInput(false);
      closeSelectionPopup();
    }
  };

  // Close selection popup
  const closeSelectionPopup = () => {
    setSelectedText(null);
    setWordInfo(null);
    setShowPinyin(false);
    setShowExplanation(false);
    setShowQuestionInput(false);
    setCustomQuestion("");
    window.getSelection()?.removeAllRanges();
  };

  if (passageContent === null) {
    return (
      <div className="p-6 text-center text-gray-600">
        <p>Loading passage...</p>
      </div>
    );
  }

  if (passageContent.trim() === "") {
    return (
      <div className="p-6 text-center text-gray-600">
        <p>No passage content available.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-semibold text-gray-800">
            {passageTitle || "Reading Passage"}
          </h2>
          <div className="flex items-center text-sm text-gray-600">
            <FaLanguage className="mr-1 text-purple-800" />
            <span>Highlight Chinese text for help</span>
          </div>
        </div>
      </div>

      {/* Passage Content */}
      <div className="flex-1 overflow-auto">
        <div
          ref={passageRef}
          className="p-6 text-gray-800 leading-loose select-text"
          style={{
            fontSize: "1.1rem",
            lineHeight: "2.0",
            fontFamily:
              "'Noto Sans SC', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif",
          }}
        >
          {passageContent.split("\n").map((paragraph, index) => (
            <p key={index} className="mb-4 last:mb-0">
              {paragraph}
            </p>
          ))}
        </div>
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
                "{selectedText.text}"
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
              className="flex items-center gap-2 px-3 py-2 bg-purple-100 text-purple-800 rounded-lg hover:bg-purple-200 transition-colors disabled:opacity-50"
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
              title="Add this text as context for your question"
            >
              <FaCommentDots />
              <span>Add as Context</span>
            </button>
          </div>

          {/* Custom Question Input */}
          {showQuestionInput && (
            <div className="mb-3">
              <div className="text-sm text-gray-600 mb-2">
                Ask a question about "{selectedText.text}":
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customQuestion}
                  onChange={(e) => setCustomQuestion(e.target.value)}
                  placeholder="Type your question here..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSubmitQuestion();
                    }
                  }}
                />
                <button
                  onClick={handleSubmitQuestion}
                  disabled={!customQuestion.trim()}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </div>
          )}

          {/* Results */}
          {showPinyin && wordInfo?.pinyin && (
            <div className="mb-3 p-3 bg-purple-100 rounded-lg border-l-4 border-purple-200">
              <div className="text-sm font-semibold text-purple-800 mb-1">
                Pinyin:
              </div>
              <div className="text-base text-purple-800 font-mono">
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

export default ReadingComprehensionPassage;

