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
        return {
          main: `${startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${endDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
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
    const { startDate, period } = currentRange;
    let newStartDate: Date;
    let newEndDate: Date;

    const multiplier = direction === "next" ? 1 : -1;

    switch (period) {
      case "7d":
        newStartDate = new Date(startDate);
        newStartDate.setDate(startDate.getDate() + (7 * multiplier));
        newStartDate.setHours(0, 0, 0, 0);
        newEndDate = new Date(newStartDate);
        newEndDate.setDate(newStartDate.getDate() + 6);
        newEndDate.setHours(23, 59, 59, 999);
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
        endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999);
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 6);
        startDate.setHours(0, 0, 0, 0);
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