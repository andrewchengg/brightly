// src/components/AILearningAssistant/AIAssistant.tsx
"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  FaCommentDots,
  FaPaperPlane,
  FaLightbulb,
  FaExclamationTriangle,
} from "react-icons/fa";
import {
  ChatMessage,
  AIAssistantProps,
  AITutorRequest,
  AIAssistantRef,
} from "./types";
import { moderateUserContent } from "@/lib/ai-moderation";

const AIAssistant = forwardRef<AIAssistantRef, AIAssistantProps>(
  (
    {
      questionContext,
      passageContext,
      sessionContext,
      className = "",
      disabled = false,
      onMessageSent,
      onResponseReceived,
    },
    ref
  ) => {
    const [userMessage, setUserMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [selectedContext, setSelectedContext] = useState<string | null>(null);

    const chatContentRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Expose a function to parent components to add text to the input
    useImperativeHandle(ref, () => ({
      addTextToInput: (text: string) => {
        setSelectedContext(text);
        // Focus the textarea after adding context
        textareaRef.current?.focus();
      },
    }));

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
      if (chatContentRef.current) {
        setTimeout(() => {
          if (chatContentRef.current) {
            chatContentRef.current.scrollTop =
              chatContentRef.current.scrollHeight;
          }
        }, 100);
      }
    }, [chatHistory, isLoading]);

    // Build context for the AI based on current session
    const buildContextString = useCallback(() => {
      let context = "";

      if (passageContext) {
        context += `PASSAGE: "${passageContext.title || "Untitled"}"\n`;
        context += `Content: ${passageContext.content.substring(0, 500)}${
          passageContext.content.length > 500 ? "..." : ""
        }\n\n`;
      }

      if (questionContext) {
        context += `CURRENT QUESTION:\n`;
        context += `Q: ${questionContext.text}\n`;

        if (questionContext.options && questionContext.options.length > 0) {
          context += `Options:\n`;
          questionContext.options.forEach((opt, index) => {
            const letter = String.fromCharCode(65 + index);
            const marker = questionContext.userAnswer === opt.id ? "→ " : "";
            context += `  ${marker}${letter}. ${opt.text}\n`;
          });
        }

        if (questionContext.hint) {
          context += `Hint: ${questionContext.hint}\n`;
        }

        if (
          sessionContext.isCompleted &&
          questionContext.isCorrect !== undefined
        ) {
          context += `Result: ${
            questionContext.isCorrect ? "CORRECT" : "INCORRECT"
          }\n`;
          if (questionContext.explanation) {
            context += `Explanation: ${questionContext.explanation}\n`;
          }
        }
        context += "\n";
      }

      context += `SESSION INFO:\n`;
      context += `Type: ${sessionContext.sessionType}\n`;
      context += `Progress: ${sessionContext.answeredQuestions}/${sessionContext.totalQuestions} questions\n`;
      context += `Correct: ${sessionContext.correctAnswers}\n`;
      context += `Status: ${
        sessionContext.isCompleted ? "COMPLETED" : "IN PROGRESS"
      }\n`;

      return context;
    }, [questionContext, passageContext, sessionContext]);

    const handleSendMessage = useCallback(async () => {
      if (!userMessage.trim() || isLoading || disabled) return;

      const currentMessage = userMessage.trim();
      setUserMessage("");
      setError(null);

      // Moderate user input
      const moderation = moderateUserContent(currentMessage);
      if (!moderation.isAllowed) {
        setError(
          moderation.reason ||
            "Your message contains inappropriate content. Please keep questions focused on your learning."
        );
        return;
      }

      const sanitizedMessage = moderation.sanitizedContent || currentMessage;

      // Add user message to chat
      const newUserMessage: ChatMessage = {
        role: "user",
        content: sanitizedMessage,
        timestamp: new Date(),
      };

      const updatedHistory = [...chatHistory, newUserMessage];
      setChatHistory(updatedHistory);
      setIsLoading(true);

      // Notify parent component
      if (onMessageSent) {
        onMessageSent(sanitizedMessage);
      }

      try {
        console.log("AIAssistant: Sending message", { message: sanitizedMessage });
        
        // Create a default session context if none is provided
        const defaultSessionContext = {
          sessionType: "text_highlight",
          totalQuestions: 1,
          answeredQuestions: 0,
          correctAnswers: 0,
          isCompleted: false,
          studentLevel: "Primary School"
        };

        const requestBody: AITutorRequest = {
          messages: updatedHistory,
          context: {
            question: questionContext,
            passage: passageContext,
            session: sessionContext || defaultSessionContext,
            selectedText: selectedContext || undefined
          },
        };

        console.log("AIAssistant: Sending request to API", {
          requestBody: JSON.stringify(requestBody, null, 2),
        });

        const response = await fetch("/api/ai-tutor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        console.log("AIAssistant: Received API response", {
          status: response.status,
          statusText: response.statusText,
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error("AIAssistant: API error", {
            status: response.status,
            error: errorData,
          });
          throw new Error(errorData.error || "Failed to get response from AI");
        }

        const data = await response.json();
        console.log("AIAssistant: API response data", { data });

        const aiMessage: ChatMessage = {
          role: "assistant",
          content: data.message,
          timestamp: new Date(),
        };

        setChatHistory((prev) => [...prev, aiMessage]);

        // Notify parent component
        if (onResponseReceived) {
          onResponseReceived(data.message);
        }
      } catch (error: any) {
        console.error("AI Assistant Error:", error);
        const errorMessage = error.message.includes("rate limit")
          ? "You've asked too many questions recently. Please wait a moment before asking again."
          : "I'm having trouble connecting right now. Please try again in a moment.";

        setChatHistory((prev) => [
          ...prev,
          {
            role: "assistant",
            content: errorMessage,
            timestamp: new Date(),
          },
        ]);

        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    }, [
      userMessage,
      chatHistory,
      questionContext,
      passageContext,
      sessionContext,
      selectedContext,
      isLoading,
      disabled,
      onMessageSent,
      onResponseReceived,
    ]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    };

    const getWelcomeMessage = () => {
      if (sessionContext.sessionType === "cloze_passage") {
        return "Hi! I'm here to help you understand this passage and answer questions. Ask me about vocabulary, context clues, or anything you're unsure about!";
      }
      return "Hi! I'm your learning assistant. Ask me questions about the material, and I'll help guide you to the answers!";
    };

    const shouldShowWelcome = chatHistory.length === 0 && !isLoading;

    return (
      <div
        className={`flex flex-col bg-white rounded-lg shadow-lg ${className}`}
        style={{ height: isExpanded ? "600px" : "400px" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
          <div className="flex items-center">
            <FaCommentDots className="text-indigo-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-800">AI Assistant</h3>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            {isExpanded ? "Minimize" : "Expand"}
          </button>
        </div>

        {/* Pinned Selected Text */}
        {selectedContext && (
          <div className="p-3 bg-yellow-50 border-b border-yellow-200">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="text-xs font-medium text-yellow-800 mb-1">
                  Selected Text:
                </div>
                <div className="text-sm font-semibold text-yellow-900 bg-yellow-100 px-2 py-1 rounded">
                  "{selectedContext}"
                </div>
              </div>
              <button
                onClick={() => setSelectedContext(null)}
                className="text-yellow-600 hover:text-yellow-800 ml-2"
                title="Remove selected text"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Chat Content */}
        <div
          ref={chatContentRef}
          className="flex-1 overflow-auto p-4 space-y-4"
        >
          {shouldShowWelcome ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 p-4">
              <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center mb-3 text-2xl text-indigo-500">
                <FaLightbulb />
              </div>
              <p className="text-sm text-gray-600">{getWelcomeMessage()}</p>
            </div>
          ) : (
            chatHistory.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-xl p-2.5 shadow-sm text-sm ${
                    message.role === "user"
                      ? "bg-indigo-500 text-white rounded-br-none"
                      : "bg-white text-gray-800 border border-gray-200 rounded-bl-none"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  {message.timestamp && (
                    <div
                      className={`text-xs mt-1 ${
                        message.role === "user"
                          ? "text-indigo-200"
                          : "text-gray-400"
                      }`}
                    >
                      {message.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-xl p-2.5 shadow-sm text-sm bg-white text-gray-800 border border-gray-200 rounded-bl-none">
                <div className="flex space-x-1 items-center">
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  ></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-3 border-t border-indigo-200 bg-white">
          <div className="flex items-end space-x-2">
            <div className="flex-1">
              <textarea
                ref={textareaRef}
                value={userMessage}
                onChange={(e) => setUserMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  disabled
                    ? "Assistant is disabled"
                    : "Ask a question about your studies..."
                }
                disabled={disabled || isLoading}
                rows={1}
                className="w-full p-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
                style={{ minHeight: "38px", maxHeight: "100px" }}
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={disabled || isLoading || !userMessage.trim()}
              className="p-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              <FaPaperPlane className="w-4 h-4" />
            </button>
          </div>

          {/* Character count and guidelines */}
          <div className="flex justify-between items-center mt-1 text-xs text-gray-500">
            <span>Keep questions focused on your learning</span>
            <span className={userMessage.length > 800 ? "text-red-500" : ""}>
              {userMessage.length}/1000
            </span>
          </div>
        </div>
      </div>
    );
  }
);
AIAssistant.displayName = "AIAssistant";
export default AIAssistant;