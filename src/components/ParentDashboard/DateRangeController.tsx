"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { 
  FaChevronLeft, 
  FaChevronRight, 
  FaCalendarWeek, 
  FaCalendarAlt, 
  FaCalendar,
  FaSpinner
} from "react-icons/fa";

export type TimePeriod = "7d" | "30d" | "3m";

export interface DateRange {
  startDate: Date;
  endDate: Date;
  period: TimePeriod;
}

interface DateRangeControllerProps {
  currentRange: DateRange;
  onRangeChange: (newRange: DateRange) => void;
  updating?: boolean;
}

const DateRangeController: React.FC<DateRangeControllerProps> = ({
  currentRange,
  onRangeChange,
  updating = false,
}) => {
  const getTimeLabels = () => {
    const { startDate, endDate, period } = currentRange;
    
    switch (period) {
      case "7d":
        // Convert UTC dates back to local time for display
        const localStartDate = new Date(startDate.getTime() + (8 * 60 * 60 * 1000));
        const localEndDate = new Date(endDate.getTime() + (8 * 60 * 60 * 1000));
        
        return {
          main: `${localStartDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${localEndDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
          subtitle: "7-day period"
        };
      case "30d":
        return {
          main: startDate.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
          subtitle: "Monthly view"
        };
      case "3m":
        const quarters = [
          { name: "Q1", months: ["Jan", "Feb", "Mar"] },
          { name: "Q2", months: ["Apr", "May", "Jun"] },
          { name: "Q3", months: ["Jul", "Aug", "Sep"] },
          { name: "Q4", months: ["Oct", "Nov", "Dec"] }
        ];
        const quarterIndex = Math.floor(startDate.getMonth() / 3);
        const quarter = quarters[quarterIndex];
        return {
          main: `${quarter.name} ${startDate.getFullYear()}`,
          subtitle: `${quarter.months.join(" - ")}`
        };
      default:
        return { main: "", subtitle: "" };
    }
  };

  const navigateTime = (direction: "prev" | "next") => {
    const { startDate, endDate, period } = currentRange;
    let newStartDate: Date;
    let newEndDate: Date;

    const multiplier = direction === "next" ? 1 : -1;

    switch (period) {
      case "7d":
        // Convert UTC dates back to local time for calculation
        const localStartDate = new Date(startDate.getTime() + (8 * 60 * 60 * 1000));
        const localEndDate = new Date(endDate.getTime() + (8 * 60 * 60 * 1000));
        
        // Move the local range by 7 days in the specified direction
        newStartDate = new Date(localStartDate);
        newStartDate.setDate(localStartDate.getDate() + (7 * multiplier));
        newStartDate.setHours(0, 0, 0, 0);
        
        // Calculate end date as 6 days after start date (for 7 days total)
        newEndDate = new Date(newStartDate);
        newEndDate.setDate(newStartDate.getDate() + 6);
        newEndDate.setHours(23, 59, 59, 999);
        
        // Convert back to UTC to match the hook's timezone handling
        newStartDate = new Date(newStartDate.getTime() - (8 * 60 * 60 * 1000));
        newEndDate = new Date(newEndDate.getTime() - (8 * 60 * 60 * 1000));
        break;
      case "30d":
        newStartDate = new Date(startDate);
        newStartDate.setMonth(startDate.getMonth() + multiplier);
        newStartDate.setDate(1);
        newEndDate = new Date(newStartDate);
        newEndDate.setMonth(newStartDate.getMonth() + 1);
        newEndDate.setDate(0); // Last day of the month
        break;
      case "3m":
        newStartDate = new Date(startDate);
        newStartDate.setMonth(startDate.getMonth() + (3 * multiplier));
        newStartDate.setDate(1);
        newEndDate = new Date(newStartDate);
        newEndDate.setMonth(newStartDate.getMonth() + 3);
        newEndDate.setDate(0); // Last day of the 3rd month
        break;
      default:
        return;
    }

    onRangeChange({
      startDate: newStartDate,
      endDate: newEndDate,
      period,
    });
  };

  const changePeriod = (newPeriod: TimePeriod) => {
    const today = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (newPeriod) {
      case "7d":
        // Set end date to end of today at 23:59:59.999
        endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999);
        
        // Set start date to 6 days before today at 00:00:00.000 (for 7 days total including today)
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 6);
        startDate.setHours(0, 0, 0, 0);
        
        // Convert to UTC to match the hook's timezone handling
        const utcEndDate = new Date(endDate.getTime() - (8 * 60 * 60 * 1000));
        const utcStartDate = new Date(startDate.getTime() - (8 * 60 * 60 * 1000));
        
        endDate = utcEndDate;
        startDate = utcStartDate;
        break;
      case "30d":
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      case "3m":
        const quarterStart = Math.floor(today.getMonth() / 3) * 3;
        startDate = new Date(today.getFullYear(), quarterStart, 1);
        endDate = new Date(today.getFullYear(), quarterStart + 3, 0);
        break;
      default:
        return;
    }

    onRangeChange({
      startDate,
      endDate,
      period: newPeriod,
    });
  };

  const timeLabels = getTimeLabels();

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Time Period Buttons */}
      <div className="flex items-center gap-2">
        <Button
          variant={currentRange.period === "7d" ? "default" : "outline"}
          size="sm"
          onClick={() => changePeriod("7d")}
          className="flex items-center gap-2"
        >
          <FaCalendarWeek className="w-3 h-3" />
          7 Days
        </Button>
        <Button
          variant={currentRange.period === "30d" ? "default" : "outline"}
          size="sm"
          onClick={() => changePeriod("30d")}
          className="flex items-center gap-2"
        >
          <FaCalendarAlt className="w-3 h-3" />
          Month
        </Button>
        <Button
          variant={currentRange.period === "3m" ? "default" : "outline"}
          size="sm"
          onClick={() => changePeriod("3m")}
          className="flex items-center gap-2"
        >
          <FaCalendar className="w-3 h-3" />
          Quarter
        </Button>
      </div>

      {/* Current Period Display & Navigation */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigateTime("prev")}
          className="p-2"
        >
          <FaChevronLeft className="w-3 h-3" />
        </Button>
        
        <div className="text-center min-w-[160px]">
          <div className="font-semibold text-gray-900 flex items-center justify-center gap-2">
            {timeLabels.main}
            {updating && (
              <FaSpinner className="w-3 h-3 text-blue-500 animate-spin" />
            )}
          </div>
          <div className="text-xs text-gray-500">{timeLabels.subtitle}</div>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigateTime("next")}
          className="p-2"
        >
          <FaChevronRight className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
};

export default DateRangeController; 