"use client";

import React, { useState, useEffect, useRef } from "react";
import { FaUser, FaRobot, FaImage, FaClock, FaArrowLeft } from "react-icons/fa";
import { format } from "date-fns";
import Image from "next/image";

interface ChatMessage {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  imageUrl?: string;
  hasImage: boolean;
  timestamp: string;
}

interface ChatSession {
  id: string;
  title: string | null;
  createdAt: string;
  lastActivity: string;
}

interface ChatViewerProps {
  sessionId: string;
  onBack?: () => void;
  className?: string;
}

export default function ChatViewer({
  sessionId,
  onBack,
  className = "",
}: ChatViewerProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [session, setSession] = useState<ChatSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch messages for the session
  const fetchMessages = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/chat-sessions/${sessionId}/messages`);

      if (!response.ok) {
        throw new Error("Failed to fetch chat messages");
      }

      const data = await response.json();
      setMessages(data.messages || []);
      setSession(data.session);
    } catch (err: any) {
      console.error("Error fetching messages:", err);
      setError(err.message || "Failed to load chat messages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionId) {
      fetchMessages();
    }
  }, [sessionId]);

  // Auto-scroll to bottom when new messages load
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const formatTimestamp = (timestamp: string) => {
    return format(new Date(timestamp), "MMM dd, yyyy 'at' HH:mm");
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
        <div className="p-6">
          <div className="flex items-center justify-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
        <div className="p-6">
          <div className="text-center text-red-600">
            <FaRobot className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p className="text-sm">{error}</p>
            <button
              onClick={fetchMessages}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {onBack && (
              <button
                onClick={onBack}
                className="mr-3 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FaArrowLeft />
              </button>
            )}
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {session?.title || "Chat Conversation"}
              </h2>
              {session && (
                <p className="text-sm text-gray-500 flex items-center">
                  <FaClock className="mr-1" />
                  Started {formatTimestamp(session.createdAt)}
                </p>
              )}
            </div>
          </div>
          <span className="text-sm text-gray-500">
            {messages.length} messages
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="h-96 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <FaRobot className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p className="text-sm">No messages in this conversation</p>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "USER" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] flex ${
                    message.role === "USER" ? "flex-row-reverse" : "flex-row"
                  } space-x-3`}
                >
                  {/* Avatar */}
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm ${
                      message.role === "USER" ? "bg-indigo-600" : "bg-green-600"
                    }`}
                  >
                    {message.role === "USER" ? <FaUser /> : <FaRobot />}
                  </div>

                  {/* Message Content */}
                  <div
                    className={`rounded-xl p-3 shadow-sm ${
                      message.role === "USER"
                        ? "bg-indigo-600 text-white rounded-br-none"
                        : "bg-gray-100 text-gray-800 rounded-bl-none"
                    }`}
                  >
                    {/* Image if present */}
                    {message.hasImage && message.imageUrl && (
                      <div className="mb-3">
                        <div className="relative w-40 h-32 rounded-lg overflow-hidden">
                          <Image
                            src={message.imageUrl}
                            alt="User uploaded image"
                            fill
                            className="object-cover"
                          />
                        </div>
                      </div>
                    )}

                    {/* Text content */}
                    <p className="text-sm whitespace-pre-wrap">
                      {message.content}
                    </p>

                    {/* Timestamp */}
                    <div
                      className={`text-xs mt-2 ${
                        message.role === "USER"
                          ? "text-indigo-200"
                          : "text-gray-500"
                      }`}
                    >
                      {format(new Date(message.timestamp), "HH:mm")}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
    </div>
  );
}
