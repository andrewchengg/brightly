"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";

interface Quest {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  icon: string;
  color: string;
  category: string;
  isCompleted: boolean;
  completedAt?: string;
}

interface QuestResponse {
  quests: Quest[];
  locked?: boolean;
  level?: number;
  requiredLevel?: number;
  message?: string;
}

interface QuestContextType {
  questData: QuestResponse | null;
  loading: boolean;
  error: string | null;
  refreshQuests: () => Promise<void>;
  lastFetched: number | null;
}

const QuestContext = createContext<QuestContextType | undefined>(undefined);

export function QuestProvider({ children }: { children: ReactNode }) {
  const [questData, setQuestData] = useState<QuestResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<number | null>(null);

  const fetchQuests = useCallback(async () => {
    // If data was fetched recently (within 30 seconds), don't refetch
    if (lastFetched && Date.now() - lastFetched < 30000) {
      return;
    }

    try {
      setError(null);
      setLoading(true);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch("/api/weekly-quests", {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setQuestData(data);
      setLastFetched(Date.now());
    } catch (error: any) {
      console.error("Error fetching weekly quests:", error);
      setError(
        error.name === "AbortError" ? "Request timeout" : "Failed to load"
      );

      // Set fallback data to prevent blank state
      if (!questData) {
        setQuestData({ quests: [] });
      }
    } finally {
      setLoading(false);
    }
  }, [lastFetched, questData]);

  const refreshQuests = useCallback(async () => {
    setLastFetched(null); // Force refresh
    await fetchQuests();
  }, [fetchQuests]);

  // Initial fetch on mount
  useEffect(() => {
    fetchQuests();
  }, [fetchQuests]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (Date.now() - (lastFetched || 0) > 5 * 60 * 1000) {
        setLastFetched(null);
        fetchQuests();
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [lastFetched, fetchQuests]);

  // Listen for practice session completion events to refresh quest data
  useEffect(() => {
    const handlePracticeSessionComplete = () => {
      console.log("🎯 Practice session completed - refreshing quest data");
      refreshQuests();
    };

    // Listen for custom practice completion events
    window.addEventListener(
      "practiceSessionCompleted",
      handlePracticeSessionComplete
    );

    return () => {
      window.removeEventListener(
        "practiceSessionCompleted",
        handlePracticeSessionComplete
      );
    };
  }, [refreshQuests]);

  const value: QuestContextType = {
    questData,
    loading,
    error,
    refreshQuests,
    lastFetched,
  };

  return (
    <QuestContext.Provider value={value}>{children}</QuestContext.Provider>
  );
}

export function useQuests() {
  const context = useContext(QuestContext);
  if (context === undefined) {
    throw new Error("useQuests must be used within a QuestProvider");
  }
  return context;
}

// Hook specifically for quest data (with automatic loading states)
export function useQuestData() {
  const { questData, loading, error, refreshQuests } = useQuests();

  return {
    quests: questData?.quests || [],
    locked: questData?.locked || false,
    level: questData?.level || 1,
    requiredLevel: questData?.requiredLevel || 2,
    message: questData?.message || "",
    loading,
    error,
    refreshQuests, // Expose refresh function
  };
}

// Utility function to trigger quest refresh from anywhere in the app
export function triggerQuestRefresh() {
  const event = new CustomEvent("practiceSessionCompleted");
  window.dispatchEvent(event);
}
