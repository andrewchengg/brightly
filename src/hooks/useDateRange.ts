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
    console.log('useDateRange - Local today:', today);
    
    // Set end date to end of current day in UTC+8
    const endDate = new Date(today);
    endDate.setHours(23, 59, 59, 999);
    
    // Create start date 6 days ago (for 7 day total including today)
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);
    
    // Convert local dates (UTC+8) to UTC for API queries
    const utcEndDate = new Date(endDate.getTime() - (8 * 60 * 60 * 1000));
    const utcStartDate = new Date(startDate.getTime() - (8 * 60 * 60 * 1000));

    console.log('useDateRange - Date conversion:', {
      localStart: startDate.toLocaleString(),
      utcStart: utcStartDate.toISOString(),
      localEnd: endDate.toLocaleString(),
      utcEnd: utcEndDate.toISOString(),
    });

    return {
      startDate: utcStartDate,
      endDate: utcEndDate,
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