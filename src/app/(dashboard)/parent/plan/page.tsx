"use client";

import { useState, useRef, useEffect } from "react";
import {
  FaRobot,
  FaPaperPlane,
  FaSpinner,
  FaCalendarPlus,
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSuggestedQuestion = (question: string) => {
    setInputValue(question);
    // Optionally, you can trigger send message automatically
    // handleSendMessage(question);
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
    const messageToSend = inputValue;
    if (!messageToSend.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: messageToSend,
      isBot: false,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await generateAIResponse(messageToSend);

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response.content,
        isBot: true,
        timestamp: new Date(),
        roadmap: response.roadmap,
        schedule: response.schedule,
      };

      setMessages((prev) => [...prev, botMessage]);
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

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "high":
        return "bg-purple-100 text-purple-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800"; // Changed for visual distinction
      case "low":
        return "bg-green-100 text-green-800"; // Changed for visual distinction
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-gradient-to-br from-purple-50 via-white to-purple-100 p-4">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-purple-800 text-white shadow-lg rounded-t-lg">
        <div className="flex items-center space-x-3">
          <FaRobot className="w-8 h-8" />
          <div>
            <h1 className="text-xl font-bold">AI Educational Planner</h1>
            <p className="text-sm text-purple-100">
              Personalized insights for your child's learning journey
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Suggested Questions Sidebar */}
        <div className="w-80 bg-white rounded-b-lg lg:rounded-bl-lg lg:rounded-br-none shadow-sm border border-gray-200 p-6 overflow-y-auto hidden md:block">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Quick Questions
          </h3>
          <div className="space-y-3">
            {suggestedQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => handleSuggestedQuestion(question.text)}
                className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all duration-200 group"
              >
                <div className="flex items-start gap-3">
                  <question.icon
                    className="text-purple-600 mt-1 flex-shrink-0"
                    size={16}
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900 group-hover:text-purple-700">
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
        <div className="flex-1 bg-white rounded-b-lg lg:rounded-br-lg lg:rounded-bl-none shadow-sm border border-gray-200 flex flex-col h-full">
          {/* Messages */}
          <div className="flex-1 p-6 overflow-y-auto min-h-0">
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
                        : "bg-purple-800 text-white"
                    }`}
                  >
                    {message.isBot && (
                      <div className="flex items-center gap-2 mb-2">
                        <FaRobot className="text-purple-800" />
                        <span className="font-semibold text-purple-800">
                          AI Planner
                        </span>
                      </div>
                    )}
                    <div className="whitespace-pre-wrap">{message.content}</div>

                    {/* Roadmap Display */}
                    {message.roadmap && (
                      <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <FaCalendarPlus className="text-purple-600" />
                          Learning Roadmap
                        </h4>
                        <div className="space-y-3">
                          {message.roadmap.map((item, index) => (
                            <div
                              key={item.id}
                              className="border border-gray-200 rounded-lg p-4 relative"
                            >
                              <div className="absolute -top-3 -left-3 bg-purple-800 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                                {index + 1}
                              </div>
                              <h5 className="font-semibold text-gray-900 text-base">
                                {item.title}
                              </h5>
                              <p className="text-sm text-gray-700 mt-2 leading-relaxed">
                                {item.description}
                              </p>
                              <div className="flex flex-wrap items-center gap-3 mt-3">
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(
                                    item.priority
                                  )}`}
                                >
                                  {item.priority} priority
                                </span>
                                <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded flex items-center gap-1">
                                  <FaClock /> {item.estimatedTime}
                                </span>
                                <span className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded flex items-center gap-1">
                                  <FaBookOpen /> {item.category}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Schedule Display */}
                    {message.schedule && (
                      <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <FaClock className="text-purple-600" />
                          Daily Study Schedule
                        </h4>
                        <div className="space-y-2">
                          {message.schedule.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
                            >
                              <div className="font-medium text-purple-800 text-sm min-w-[60px]">
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
                                <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full">
                                  {item.subject}
                                </span>
                                <span>{item.duration}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-200 p-4 bg-white rounded-b-lg lg:rounded-bl-none">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder="Ask me anything about your child's learning..."
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
              />
              <button
                onClick={handleSendMessage}
                disabled={isLoading || !inputValue.trim()}
                className="px-4 py-2 bg-purple-800 text-white rounded-lg hover:bg-purple-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
              >
                {isLoading ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    <span>Thinking...</span>
                  </>
                ) : (
                  <>
                    <FaPaperPlane />
                    <span>Send</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}