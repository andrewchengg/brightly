"use client";

import { useState, useRef, useEffect } from "react";
import {
  FaRobot,
  FaPaperPlane,
  FaSpinner,
  FaCalendarPlus,
  FaCheck,
  FaTimes,
  FaLightbulb,
  FaChartLine,
  FaBookOpen,
  FaClock,
  FaUserGraduate,
} from "react-icons/fa";

interface Message {
  id: string;
  content: string;
  isBot: boolean;
  timestamp: Date;
  roadmap?: RoadmapItem[];
  schedule?: ScheduleItem[];
}

interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  estimatedTime: string;
  priority: "high" | "medium" | "low";
  category: string;
  dueDate?: string;
}

interface ScheduleItem {
  id: string;
  title: string;
  time: string;
  duration: string;
  subject: string;
  type: string;
  description: string;
}

const suggestedQuestions = [
  {
    icon: FaChartLine,
    text: "Analyze my child's performance data and identify weak topics",
    category: "Data-Driven Analysis",
  },
  {
    icon: FaBookOpen,
    text: "Create a study plan focusing on their struggling subjects",
    category: "Targeted Learning",
  },
  {
    icon: FaClock,
    text: "Design a daily schedule based on their current performance",
    category: "Smart Scheduling",
  },
  {
    icon: FaCalendarPlus,
    text: "Create a day-by-day study plan starting tomorrow",
    category: "Daily Planning",
  },
];

export default function ParentPlanPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content:
        "Hello! I'm your AI educational planner with access to your child's real performance data. I can analyze their actual learning patterns, identify specific weak topics, and create data-driven improvement plans. Ask me anything about their progress, and I'll provide insights based on their current performance metrics!",
      isBot: true,
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingRoadmap, setPendingRoadmap] = useState<RoadmapItem[] | null>(
    null
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSuggestedQuestion = (question: string) => {
    setInputValue(question);
  };

  const generateAIResponse = async (
    message: string
  ): Promise<{
    content: string;
    roadmap?: RoadmapItem[];
    schedule?: ScheduleItem[];
  }> => {
    try {
      const response = await fetch("/api/ai-planner", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        throw new Error("Failed to get AI response");
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error calling AI:", error);
      throw error;
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      isBot: false,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await generateAIResponse(inputValue);

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response.content,
        isBot: true,
        timestamp: new Date(),
        roadmap: response.roadmap,
        schedule: response.schedule,
      };

      setMessages((prev) => [...prev, botMessage]);

      if (response.roadmap) {
        setPendingRoadmap(response.roadmap);
      }
    } catch (error) {
      console.error("Error generating response:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "I'm sorry, I encountered an error. Please try again.",
        isBot: true,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveRoadmap = async () => {
    if (!pendingRoadmap) return;

    // Here you would integrate with your calendar API
    console.log("Adding roadmap to calendar:", pendingRoadmap);

    const confirmationMessage: Message = {
      id: Date.now().toString(),
      content:
        "Perfect! I've added the roadmap to your child's calendar. You'll receive notifications for each milestone, and we'll track progress together. The plan will automatically adjust based on your child's performance.",
      isBot: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, confirmationMessage]);
    setPendingRoadmap(null);
  };

  const handleRejectRoadmap = () => {
    const rejectionMessage: Message = {
      id: Date.now().toString(),
      content:
        "No problem! Let me know if you'd like me to modify the plan or create a different approach. I can adjust the timeline, focus areas, or methodology based on your preferences.",
      isBot: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, rejectionMessage]);
    setPendingRoadmap(null);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="flex flex-col max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center w-12 h-12 bg-indigo-100 rounded-full">
            <FaRobot className="text-indigo-600" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              AI Educational Planner
            </h1>
            <p className="text-gray-600">
              Get personalized insights and plans for your child's learning
              journey
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-6 min-h-[600px]">
        {/* Suggested Questions Sidebar */}
        <div className="w-80 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Quick Questions
          </h3>
          <div className="space-y-3">
            {suggestedQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => handleSuggestedQuestion(question.text)}
                className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-200 group"
              >
                <div className="flex items-start gap-3">
                  <question.icon
                    className="text-indigo-600 mt-1 flex-shrink-0"
                    size={16}
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900 group-hover:text-indigo-700">
                      {question.text}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {question.category}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat Interface */}
        <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col">
          {/* Messages */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.isBot ? "justify-start" : "justify-end"
                  }`}
                >
                  <div
                    className={`max-w-3xl rounded-lg p-4 ${
                      message.isBot
                        ? "bg-gray-100 text-gray-900"
                        : "bg-indigo-600 text-white"
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{message.content}</div>

                    {/* Roadmap Display */}
                    {message.roadmap && (
                      <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <FaCalendarPlus className="text-indigo-600" />
                          Daily Learning Roadmap
                        </h4>
                        <div className="space-y-3">
                          {message.roadmap.map((item, index) => (
                            <div
                              key={item.id}
                              className="border border-gray-200 rounded-lg p-4 relative"
                            >
                              {/* Day Number Badge */}
                              <div className="absolute -top-2 -left-2 bg-indigo-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                                {index + 1}
                              </div>

                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                  <h5 className="font-semibold text-gray-900 text-base">
                                    {item.title}
                                  </h5>
                                  <p className="text-sm text-gray-700 mt-2 leading-relaxed">
                                    {item.description}
                                  </p>
                                  <div className="flex items-center gap-3 mt-3">
                                    <span
                                      className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(
                                        item.priority
                                      )}`}
                                    >
                                      {item.priority} priority
                                    </span>
                                    <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                      ⏱️ {item.estimatedTime}
                                    </span>
                                    <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                                      📚 {item.category}
                                    </span>
                                    {item.dueDate && (
                                      <span className="text-xs text-gray-600">
                                        📅{" "}
                                        {new Date(
                                          item.dueDate
                                        ).toLocaleDateString()}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {pendingRoadmap && (
                          <div className="flex gap-3 mt-4">
                            <button
                              onClick={handleApproveRoadmap}
                              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                              <FaCheck size={14} />
                              Add to Calendar
                            </button>
                            <button
                              onClick={handleRejectRoadmap}
                              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                            >
                              <FaTimes size={14} />
                              Modify Plan
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Schedule Display */}
                    {message.schedule && (
                      <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <FaClock className="text-blue-600" />
                          Daily Study Schedule
                        </h4>
                        <div className="space-y-2">
                          {message.schedule.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <div className="font-medium text-blue-600 text-sm min-w-[60px]">
                                  {item.time}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-gray-900 text-sm">
                                    {item.title}
                                  </div>
                                  <div className="text-xs text-gray-600">
                                    {item.description}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                                    {item.subject}
                                  </span>
                                  <span>{item.duration}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="text-xs opacity-70 mt-2">
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg p-4 flex items-center gap-3">
                    <FaSpinner className="animate-spin text-indigo-600" />
                    <span className="text-gray-600">AI is thinking...</span>
                  </div>
                </div>
              )}
            </div>
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 p-6">
            <div className="flex gap-3">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder="Ask me anything about your child's education..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                <FaPaperPlane size={16} />
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
