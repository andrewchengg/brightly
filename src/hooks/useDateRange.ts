"use client";

import { useState, useEffect } from "react";
import { DateRange, TimePeriod } from "@/components/ParentDashboard/DateRangeController";

export interface DateRangeData {
  children: any[];
  overallStats: any;
}

export const useDateRange = () => {
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    // Initialize with current week
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 6);
    const endDate = new Date(today);

    return {
      startDate,
      endDate,
      period: "7d" as TimePeriod,
    };
  });

  const [data, setData] = useState<DateRangeData | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDataForRange = async (range: DateRange, isInitialLoad = false) => {
    if (isInitialLoad) {
      setInitialLoading(true);
    } else {
      setUpdating(true);
    }
    setError(null);

    try {
      const params = new URLSearchParams({
        startDate: range.startDate.toISOString(),
        endDate: range.endDate.toISOString(),
        period: range.period,
      });

      const response = await fetch(`/api/parent/statistics?${params}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch data: ${response.status} ${errorText}`);
      }

      const fetchedData = await response.json();
      setData(fetchedData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error("Error fetching date range data:", err);
    } finally {
      if (isInitialLoad) {
        setInitialLoading(false);
      } else {
        setUpdating(false);
      }
    }
  };

  useEffect(() => {
    fetchDataForRange(dateRange, data === null);
  }, [dateRange]);

  const updateDateRange = (newRange: DateRange) => {
    setDateRange(newRange);
  };

  const refetch = () => {
    fetchDataForRange(dateRange, false);
  };

  return {
    dateRange,
    updateDateRange,
    data,
    loading: initialLoading,
    updating,
    error,
    refetch,
  };
};

export default useDateRange; 