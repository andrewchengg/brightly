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
    switch (priority.toLowerCase()) {
      case "high":
        return "bg-purple-100 text-purple-800";
      case "medium":
        return "bg-purple-100 text-purple-800";
      case "low":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-gradient-to-br from-purple-50 via-white to-purple-100">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-purple-800 text-white shadow-lg">
        <div className="flex items-center space-x-3">
          <FaRobot className="w-8 h-8" />
          <div>
            <h1 className="text-xl font-bold">AI Educational Planner</h1>
            <p className="text-sm text-purple-100">
              Get personalized insights and plans for your child's learning journey
            </p>
          </div>
        </div>
      </div>

      {/* Quick Questions */}
      <div className="p-4 bg-white border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-700 mb-3">Quick Questions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {suggestedQuestions.map((question, index) => (
            <button
              key={index}
              onClick={() => handleSuggestedQuestion(question.text)}
              className="flex items-start p-3 text-left rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all duration-200"
            >
              <question.icon className="w-5 h-5 text-purple-800 mt-1 mr-3" />
              <div>
                <p className="text-gray-700">{question.text}</p>
                <span className="text-sm text-purple-800">{question.category}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Interface */}
      <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isBot ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`max-w-3xl rounded-lg p-4 ${
                  message.isBot
                    ? "bg-white border border-gray-200"
                    : "bg-purple-800 text-white"
                }`}
              >
                {message.isBot && (
                  <div className="flex items-center gap-2 mb-2">
                    <FaRobot className="text-purple-800" />
                    <span className="font-semibold text-purple-800">AI Planner</span>
                  </div>
                )}
                <p className="whitespace-pre-wrap">{message.content}</p>

                {/* Roadmap Display */}
                {message.roadmap && (
                  <div className="mt-4 space-y-3">
                    <h3 className="font-semibold text-purple-800">Learning Roadmap</h3>
                    {message.roadmap.map((item) => (
                      <div
                        key={item.id}
                        className="bg-white rounded-lg border border-gray-200 p-3"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-purple-800">{item.title}</h4>
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${getPriorityColor(
                              item.priority
                            )}`}
                          >
                            {item.priority}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{item.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <FaClock className="text-purple-800" />
                            {item.estimatedTime}
                          </span>
                          <span className="flex items-center gap-1">
                            <FaBookOpen className="text-purple-800" />
                            {item.category}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Schedule Display */}
                {message.schedule && (
                  <div className="mt-4 space-y-3">
                    <h3 className="font-semibold text-purple-800">Daily Schedule</h3>
                    {message.schedule.map((item) => (
                      <div
                        key={item.id}
                        className="bg-white rounded-lg border border-gray-200 p-3"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-purple-800">{item.title}</h4>
                          <span className="text-sm text-purple-800">{item.time}</span>
                        </div>
                        <p className="text-sm text-gray-600">{item.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <FaClock className="text-purple-800" />
                            {item.duration}
                          </span>
                          <span className="flex items-center gap-1">
                            <FaBookOpen className="text-purple-800" />
                            {item.subject}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 p-4 bg-white">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder="Ask me anything about your child's learning..."
              className="flex-1 px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <button
              onClick={handleSendMessage}
              disabled={isLoading || !inputValue.trim()}
              className="px-4 py-2 bg-purple-800 text-white rounded-lg hover:bg-purple-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <FaSpinner className="animate-spin" />
                  Thinking...
                </>
              ) : (
                <>
                  <FaPaperPlane />
                  Send
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
