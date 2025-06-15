"use client";

import React, {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  FaCommentDots,
  FaHistory,
  FaCalendarAlt,
  FaSearch,
  FaTrash,
  FaEye,
} from "react-icons/fa";
import { format } from "date-fns";

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
  isActive: boolean;
  createdAt: string;
  lastActivity: string;
  messageCount: number;
  lastMessage: ChatMessage | null;
}

interface ChatHistoryProps {
  onSessionSelect?: (sessionId: string) => void;
  className?: string;
}

export interface ChatHistoryRef {
  refreshSessions: () => void;
}

const ChatHistory = forwardRef<ChatHistoryRef, ChatHistoryProps>(
  ({ onSessionSelect, className = "" }, ref) => {
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedSession, setSelectedSession] = useState<string | null>(null);

    // Fetch chat sessions
    const fetchSessions = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/chat-sessions");

        if (!response.ok) {
          throw new Error("Failed to fetch chat sessions");
        }

        const data = await response.json();
        setSessions(data.sessions || []);
      } catch (err: any) {
        console.error("Error fetching sessions:", err);
        setError(err.message || "Failed to load chat history");
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      fetchSessions();
    }, []);

    // Expose refresh function to parent
    useImperativeHandle(ref, () => ({
      refreshSessions: fetchSessions,
    }));

    // Filter sessions based on search term
    const filteredSessions = sessions.filter((session) => {
      const searchLower = searchTerm.toLowerCase();
      const titleMatch = session.title?.toLowerCase().includes(searchLower);
      const lastMessageMatch = session.lastMessage?.content
        .toLowerCase()
        .includes(searchLower);
      return titleMatch || lastMessageMatch;
    });

    const handleSessionClick = (sessionId: string) => {
      setSelectedSession(sessionId);
      if (onSessionSelect) {
        onSessionSelect(sessionId);
      }
    };

    const handleDeleteSession = async (
      sessionId: string,
      e: React.MouseEvent
    ) => {
      e.stopPropagation(); // Prevent session selection when clicking delete

      if (
        !confirm(
          "Are you sure you want to delete this conversation? This action cannot be undone."
        )
      ) {
        return;
      }

      try {
        const response = await fetch(`/api/chat-sessions/${sessionId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error("Failed to delete session");
        }

        // Remove from local state
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));

        // If the deleted session was selected, clear selection
        if (selectedSession === sessionId) {
          setSelectedSession(null);
        }
      } catch (error) {
        console.error("Error deleting session:", error);
        alert("Failed to delete conversation. Please try again.");
      }
    };

    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      const now = new Date();
      const diffDays = Math.floor(
        (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays === 0) {
        return format(date, "HH:mm");
      } else if (diffDays === 1) {
        return "Yesterday";
      } else if (diffDays < 7) {
        return format(date, "EEEE");
      } else {
        return format(date, "MMM dd");
      }
    };

    const getSessionPreview = (session: ChatSession) => {
      if (session.lastMessage) {
        const content = session.lastMessage.content;
        return content.length > 80 ? content.substring(0, 80) + "..." : content;
      }
      return "No messages yet";
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
              <FaCommentDots className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p className="text-sm">{error}</p>
              <button
                onClick={fetchSessions}
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
      <div
        className={`bg-white rounded-lg shadow-sm border flex flex-col h-full ${className}`}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <FaHistory className="mr-2 text-indigo-600" />
              Chat History
            </h2>
            <span className="text-sm text-gray-500">
              {sessions.length} conversations
            </span>
          </div>

          {/* Search */}
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
          </div>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto">
          {filteredSessions.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              {searchTerm ? (
                <>
                  <FaSearch className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p className="text-sm">
                    No conversations found matching "{searchTerm}"
                  </p>
                </>
              ) : (
                <>
                  <FaCommentDots className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <p className="text-sm">No chat history yet</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Start a conversation with the AI to see it here
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredSessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => handleSessionClick(session.id)}
                  className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                    selectedSession === session.id
                      ? "bg-indigo-50 border-r-2 border-indigo-600"
                      : ""
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-gray-900 text-sm line-clamp-1">
                      {session.title || "Untitled Conversation"}
                    </h3>
                    <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                      {formatDate(session.lastActivity)}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                    {getSessionPreview(session)}
                  </p>

                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span className="flex items-center">
                      <FaCommentDots className="mr-1" />
                      {session.messageCount} messages
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="flex items-center">
                        <FaCalendarAlt className="mr-1" />
                        {format(new Date(session.createdAt), "MMM dd, yyyy")}
                      </span>
                      <button
                        onClick={(e) => handleDeleteSession(session.id, e)}
                        className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50 ml-1"
                        title="Delete conversation"
                      >
                        <FaTrash className="text-xs" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }
);

ChatHistory.displayName = "ChatHistory";

export default ChatHistory;
