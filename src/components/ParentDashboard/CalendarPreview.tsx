"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  FaCalendarAlt,
  FaArrowRight,
  FaClock,
  FaGraduationCap,
  FaUser,
  FaCalendarDay,
  FaUsers,
} from "react-icons/fa";

interface Event {
  id: string;
  title: string;
  start: Date;
  end: Date;
  description?: string;
  type: "personal" | "lesson";
  childName?: string;
  childrenNames?: string;
  subject?: { name: string };
  teacher?: { name: string };
  class?: { name: string };
}

interface CalendarPreviewProps {
  limit?: number;
}

const CalendarPreview: React.FC<CalendarPreviewProps> = ({ limit = 5 }) => {
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUpcomingEvents = async () => {
      try {
        // Fetch personal events
        const personalResponse = await fetch("/api/parent/events");
        let personalEvents: Event[] = [];

        if (personalResponse.ok) {
          const personalData = await personalResponse.json();
          personalEvents = personalData.map((event: any) => ({
            id: event.id,
            title: event.title,
            start: new Date(event.startTime),
            end: new Date(event.endTime),
            description: event.description,
            type: "personal" as const,
            childName: event.childName,
          }));
        }

        // Fetch class lessons
        const lessonsResponse = await fetch("/api/parent/lessons");
        let lessonEvents: Event[] = [];

        if (lessonsResponse.ok) {
          const lessonsData = await lessonsResponse.json();
          lessonEvents = lessonsData.map((lesson: any) => ({
            id: lesson.id,
            title: `${lesson.name} - ${lesson.subject?.name || "Subject"}`,
            start: new Date(lesson.startTime),
            end: new Date(lesson.endTime),
            description: `Teacher: ${
              lesson.teacher?.name || "Unknown"
            } | Class: ${lesson.class?.name || "Unknown"}`,
            type: "lesson" as const,
            childrenNames: lesson.childrenNames,
            subject: lesson.subject,
            teacher: lesson.teacher,
            class: lesson.class,
          }));
        }

        // Combine and filter upcoming events
        const allEvents = [...personalEvents, ...lessonEvents];
        const now = new Date();
        const upcoming = allEvents
          .filter((event) => event.start >= now)
          .sort((a, b) => a.start.getTime() - b.start.getTime())
          .slice(0, limit);

        setUpcomingEvents(upcoming);
      } catch (error) {
        console.error("Error fetching events:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUpcomingEvents();
  }, [limit]);

  const formatDateTime = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const isToday = date.toDateString() === today.toDateString();
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    if (isToday) {
      return `Today, ${date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })}`;
    } else if (isTomorrow) {
      return `Tomorrow, ${date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })}`;
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    }
  };

  const getEventIcon = (event: Event) => {
    if (event.type === "lesson") {
      return <FaGraduationCap className="text-purple-800" />;
    }
    return <FaUser className="text-purple-800" />;
  };

  const getEventColor = (event: Event) => {
    if (event.type === "lesson") {
      return "border-l-purple-800 bg-purple-100";
    }
    return "border-l-purple-800 bg-purple-100";
  };

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <FaCalendarAlt className="mr-2 text-purple-800" />
              Upcoming Events
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="animate-pulse">
                <div className="flex items-center p-3 border border-gray-200 rounded-lg">
                  <div className="w-8 h-8 bg-gray-200 rounded mr-3"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-48"></div>
                    <div className="h-3 bg-gray-200 rounded w-32"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <FaCalendarAlt className="mr-2 text-purple-800" />
            Upcoming Events
          </CardTitle>
          <Link href="/parent/calendar">
            <Button
              variant="outline"
              size="sm"
              className="text-purple-800 hover:bg-purple-100"
            >
              View Full Calendar
              <FaArrowRight className="ml-2 w-3 h-3" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {upcomingEvents.length === 0 ? (
          <div className="text-center py-8">
            <FaCalendarDay className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg font-medium">
              No upcoming events
            </p>
            <p className="text-gray-400 text-sm">
              Your schedule is clear for now
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingEvents.map((event) => (
              <div
                key={event.id}
                className={`group border-l-4 ${getEventColor(
                  event
                )} rounded-lg p-3 hover:shadow-md transition-all duration-200`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {getEventIcon(event)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 truncate">
                      {event.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                      <FaClock className="w-3 h-3" />
                      <span>{formatDateTime(event.start)}</span>
                    </div>
                    {(event.childName || event.childrenNames) && (
                      <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                        <FaUsers className="w-3 h-3" />
                        <span>{event.childName || event.childrenNames}</span>
                      </div>
                    )}
                    {event.description && event.type === "lesson" && (
                      <p className="text-xs text-gray-500 mt-1 truncate">
                        {event.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {upcomingEvents.length >= limit && (
              <div className="pt-3 border-t border-gray-200">
                <Link href="/parent/calendar">
                  <Button
                    variant="outline"
                    className="w-full text-green-600 hover:bg-green-50"
                  >
                    View All Events
                    <FaArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CalendarPreview;
