"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  FaCommentDots,
  FaPaperPlane,
  FaLightbulb,
  FaExclamationTriangle,
} from "react-icons/fa";
import { ChatMessage, AIAssistantProps, AITutorRequest } from "./types";
import { moderateUserContent } from "@/lib/ai-moderation";

const AIAssistant: React.FC<AIAssistantProps> = ({
  questionContext,
  passageContext,
  sessionContext,
  className = "",
  disabled = false,
  onMessageSent,
  onResponseReceived,
}) => {
  const [userMessage, setUserMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const chatContentRef = useRef<HTMLDivElement>(null);

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
      const requestBody: AITutorRequest = {
        messages: updatedHistory,
        context: {
          question: questionContext,
          passage: passageContext,
          session: sessionContext,
        },
      };

      const response = await fetch("/api/ai-tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`AI service error: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

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
    <div className={`bg-indigo-50 flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="p-3 border-b border-indigo-200 bg-indigo-100 flex items-center shadow-sm">
        <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-white mr-2.5">
          <FaCommentDots />
        </div>
        <div className="flex-1">
          <div className="font-semibold text-indigo-800 text-sm">
            AI Learning Assistant
          </div>
          <div className="text-xs text-indigo-600">
            {sessionContext.sessionType === "cloze_passage"
              ? "Passage Helper"
              : "Study Guide"}
          </div>
        </div>
        <div className="text-xs text-indigo-600 flex items-center">
          <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1"></span>
          Online
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-2 bg-red-50 border-b border-red-200 flex items-center text-red-700 text-xs">
          <FaExclamationTriangle className="mr-2" />
          {error}
        </div>
      )}

      {/* Chat Content */}
      <div
        ref={chatContentRef}
        className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar"
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
};

export default AIAssistant;
