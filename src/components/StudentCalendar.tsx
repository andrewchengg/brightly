"use client";

import { useState, useEffect } from "react";
import { Calendar, momentLocalizer, View, Views } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import {
  FaCalendarPlus,
  FaTimes,
  FaEdit,
  FaTrash,
  FaCalendarAlt,
  FaClock,
  FaChevronLeft,
  FaChevronRight,
  FaCalendarDay,
} from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "react-toastify";

const localizer = momentLocalizer(moment);

interface Event {
  id: number;
  title: string;
  start: Date;
  end: Date;
  description?: string;
  type: "personal" | "lesson";
}

interface StudentCalendarProps {
  className?: string;
}

const StudentCalendar: React.FC<StudentCalendarProps> = ({ className }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [view, setView] = useState<View>(Views.MONTH);
  const [date, setDate] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{
    start: Date;
    end: Date;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [practiceDates, setPracticeDates] = useState<{ [key: string]: any }>(
    {}
  );
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: "",
    startTime: "",
    endTime: "",
  });

  // Fetch practice dates from the API
  const fetchPracticeDates = async () => {
    try {
      const response = await fetch("/api/student/practice-dates");
      if (response.ok) {
        const data = await response.json();
        const datesMap: { [key: string]: any } = {};
        data.practiceDates.forEach((dayData: any) => {
          datesMap[dayData.date] = dayData;
        });
        setPracticeDates(datesMap);
      }
    } catch (error) {
      console.error("Error fetching practice dates:", error);
    }
  };

  // Fetch events from the API
  const fetchEvents = async () => {
    try {
      // Fetch personal events
      const personalResponse = await fetch("/api/student/events");
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
        }));
      }

      // Fetch class lessons
      const lessonsResponse = await fetch("/api/student/lessons");
      let lessonEvents: Event[] = [];

      if (lessonsResponse.ok) {
        const lessonsData = await lessonsResponse.json();
        lessonEvents = lessonsData.map((lesson: any) => ({
          id: lesson.id,
          title: `${lesson.name} - ${lesson.subject?.name || "Subject"}`,
          start: new Date(lesson.startTime),
          end: new Date(lesson.endTime),
          description: `Teacher: ${lesson.teacher?.name || "Unknown"}`,
          type: "lesson" as const,
        }));
      }

      // Combine both types of events
      setEvents([...personalEvents, ...lessonEvents]);
    } catch (error) {
      console.error("Error fetching events:", error);
      toast.error("Failed to load events");
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchPracticeDates();
  }, []);

  // Navigation functions
  const navigateToNext = () => {
    const newDate = new Date(date);
    if (view === Views.MONTH) {
      newDate.setMonth(date.getMonth() + 1);
    } else if (view === Views.WEEK) {
      newDate.setDate(date.getDate() + 7);
    } else if (view === Views.DAY) {
      newDate.setDate(date.getDate() + 1);
    }
    setDate(newDate);
  };

  const navigateToPrev = () => {
    const newDate = new Date(date);
    if (view === Views.MONTH) {
      newDate.setMonth(date.getMonth() - 1);
    } else if (view === Views.WEEK) {
      newDate.setDate(date.getDate() - 7);
    } else if (view === Views.DAY) {
      newDate.setDate(date.getDate() - 1);
    }
    setDate(newDate);
  };

  const navigateToToday = () => {
    setDate(new Date());
  };

  const handleDateJump = (selectedDate: string) => {
    if (selectedDate) {
      setDate(new Date(selectedDate));
    }
  };

  // Get current view title
  const getViewTitle = () => {
    if (view === Views.MONTH) {
      return moment(date).format("MMMM YYYY");
    } else if (view === Views.WEEK) {
      const startOfWeek = moment(date).startOf("week");
      const endOfWeek = moment(date).endOf("week");
      return `${startOfWeek.format("MMM D")} - ${endOfWeek.format(
        "MMM D, YYYY"
      )}`;
    } else if (view === Views.DAY) {
      return moment(date).format("dddd, MMMM D, YYYY");
    }
    return "";
  };

  // Handle slot selection (when user clicks on calendar)
  const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    setSelectedSlot({ start, end });
    setIsEditing(false);
    setFormData({
      title: "",
      description: "",
      date: moment(start).format("YYYY-MM-DD"),
      startTime: moment(start).format("HH:mm"),
      endTime: moment(end).format("HH:mm"),
    });
    setShowAddModal(true);
  };

  // Handle event selection (when user clicks on an event)
  const handleSelectEvent = (event: Event) => {
    setSelectedEvent(event);
    setShowEventModal(true);
  };

  // Handle edit event
  const handleEditEvent = (event: Event) => {
    setSelectedEvent(event);
    setIsEditing(true);
    setFormData({
      title: event.title,
      description: event.description || "",
      date: moment(event.start).format("YYYY-MM-DD"),
      startTime: moment(event.start).format("HH:mm"),
      endTime: moment(event.end).format("HH:mm"),
    });
    setShowEventModal(false);
    setShowAddModal(true);
  };

  // Validate form data
  const validateForm = () => {
    if (!formData.title.trim()) {
      toast.error("Please enter a title for the event");
      return false;
    }

    if (!formData.date || !formData.startTime || !formData.endTime) {
      toast.error("Please select date and times");
      return false;
    }

    // Combine date and time for validation
    const startDateTime = new Date(`${formData.date}T${formData.startTime}`);
    const endDateTime = new Date(`${formData.date}T${formData.endTime}`);

    if (endDateTime <= startDateTime) {
      toast.error("End time must be after start time");
      return false;
    }

    return true;
  };

  // Add new event
  const addEvent = async () => {
    if (!validateForm()) return;

    const startDateTime = new Date(`${formData.date}T${formData.startTime}`);
    const endDateTime = new Date(`${formData.date}T${formData.endTime}`);

    setLoading(true);
    try {
      const response = await fetch("/api/student/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
        }),
      });

      if (response.ok) {
        toast.success("Event added successfully!");
        setShowAddModal(false);
        setFormData({
          title: "",
          description: "",
          date: "",
          startTime: "",
          endTime: "",
        });
        fetchEvents();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to add event");
      }
    } catch (error) {
      console.error("Error adding event:", error);
      toast.error("Failed to add event");
    } finally {
      setLoading(false);
    }
  };

  // Update event
  const updateEvent = async () => {
    if (!selectedEvent || !validateForm()) return;

    const startDateTime = new Date(`${formData.date}T${formData.startTime}`);
    const endDateTime = new Date(`${formData.date}T${formData.endTime}`);

    setLoading(true);
    try {
      const response = await fetch(`/api/student/events/${selectedEvent.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
        }),
      });

      if (response.ok) {
        toast.success("Event updated successfully!");
        setShowAddModal(false);
        setIsEditing(false);
        setSelectedEvent(null);
        setFormData({
          title: "",
          description: "",
          date: "",
          startTime: "",
          endTime: "",
        });
        fetchEvents();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update event");
      }
    } catch (error) {
      console.error("Error updating event:", error);
      toast.error("Failed to update event");
    } finally {
      setLoading(false);
    }
  };

  // Delete event
  const deleteEvent = async (eventId: number) => {
    try {
      const response = await fetch(`/api/student/events/${eventId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Event deleted successfully!");
        setShowEventModal(false);
        fetchEvents();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to delete event");
      }
    } catch (error) {
      console.error("Error deleting event:", error);
      toast.error("Failed to delete event");
    }
  };

  const handleViewChange = (selectedView: View) => {
    setView(selectedView);
  };

  const handleNavigate = (newDate: Date) => {
    setDate(newDate);
  };

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Your Schedule
          </h2>
          <p className="text-gray-600 mt-1">
            Manage your events and track your practice
          </p>
        </div>
        <Button
          onClick={() => {
            setIsEditing(false);
            setFormData({
              title: "",
              description: "",
              date: moment().format("YYYY-MM-DD"),
              startTime: moment().format("HH:mm"),
              endTime: moment().add(1, "hour").format("HH:mm"),
            });
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
        >
          <FaCalendarPlus size={16} />
          <span>Add Event</span>
        </Button>
      </div>

      {/* Navigation Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-6 p-6 bg-gradient-to-r from-slate-50 to-blue-50 rounded-2xl shadow-sm border border-slate-200">
        {/* Left side - Navigation buttons */}
        <div className="flex items-center gap-3">
          <Button
            onClick={navigateToPrev}
            variant="outline"
            size="sm"
            className="flex items-center gap-2 border-slate-300 hover:bg-slate-100 hover:border-slate-400 transition-all duration-200"
          >
            <FaChevronLeft size={14} />
            <span className="hidden sm:inline">Previous</span>
          </Button>

          <Button
            onClick={navigateToToday}
            variant="outline"
            size="sm"
            className="flex items-center gap-2 px-4 border-indigo-300 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-400 transition-all duration-200"
          >
            <FaCalendarDay size={14} />
            <span>Today</span>
          </Button>

          <Button
            onClick={navigateToNext}
            variant="outline"
            size="sm"
            className="flex items-center gap-2 border-slate-300 hover:bg-slate-100 hover:border-slate-400 transition-all duration-200"
          >
            <span className="hidden sm:inline">Next</span>
            <FaChevronRight size={14} />
          </Button>
        </div>

        {/* Center - Current view title */}
        <div className="flex items-center gap-4">
          <h3 className="text-xl font-semibold text-slate-800 min-w-0">
            {getViewTitle()}
          </h3>

          {/* Date picker for quick navigation */}
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={moment(date).format("YYYY-MM-DD")}
              onChange={(e) => handleDateJump(e.target.value)}
              className="w-auto text-sm border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Right side - View selector */}
        <div className="flex items-center gap-1 bg-white rounded-xl border border-slate-200 shadow-sm p-1">
          <Button
            onClick={() => setView(Views.MONTH)}
            variant={view === Views.MONTH ? "default" : "ghost"}
            size="sm"
            className={`rounded-lg text-sm px-4 py-2 transition-all duration-200 ${
              view === Views.MONTH
                ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md"
                : "text-slate-600 hover:text-slate-800 hover:bg-slate-100"
            }`}
          >
            Month
          </Button>
          <Button
            onClick={() => setView(Views.WEEK)}
            variant={view === Views.WEEK ? "default" : "ghost"}
            size="sm"
            className={`rounded-lg text-sm px-4 py-2 transition-all duration-200 ${
              view === Views.WEEK
                ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md"
                : "text-slate-600 hover:text-slate-800 hover:bg-slate-100"
            }`}
          >
            Week
          </Button>
          <Button
            onClick={() => setView(Views.DAY)}
            variant={view === Views.DAY ? "default" : "ghost"}
            size="sm"
            className={`rounded-lg text-sm px-4 py-2 transition-all duration-200 ${
              view === Views.DAY
                ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md"
                : "text-slate-600 hover:text-slate-800 hover:bg-slate-100"
            }`}
          >
            Day
          </Button>
        </div>
      </div>

      <div className="h-[650px] bg-white rounded-2xl border border-slate-200 shadow-lg relative overflow-hidden">
        <style jsx global>{`
          /* Custom calendar styling */
          .rbc-calendar {
            font-family: inherit;
          }

          .rbc-toolbar {
            display: none !important; /* Hide the built-in toolbar to prevent duplication */
          }

          .rbc-month-view,
          .rbc-agenda-view,
          .rbc-time-view {
            border: none;
          }

          /* Dynamic font sizing based on view */
          ${view === Views.MONTH
            ? `
            .rbc-header {
              background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
              border-bottom: 1px solid #e2e8f0;
              padding: 12px 8px;
              font-weight: 600;
              font-size: 14px;
              color: #475569;
            }
            
            .rbc-date-cell {
              padding: 8px;
              font-weight: 500;
              font-size: 14px;
            }
            
            .rbc-event {
              border-radius: 8px;
              border: none;
              padding: 4px 8px;
              font-size: 12px;
              font-weight: 500;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            
            .rbc-month-row {
              min-height: 70px;
            }
          `
            : view === Views.WEEK
            ? `
            .rbc-header {
              background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
              border-bottom: 1px solid #e2e8f0;
              padding: 8px 6px;
              font-weight: 600;
              font-size: 12px;
              color: #475569;
            }
            
            .rbc-date-cell {
              padding: 4px;
              font-weight: 500;
              font-size: 12px;
            }
            
            .rbc-event {
              border-radius: 6px;
              border: none;
              padding: 2px 6px;
              font-size: 10px;
              font-weight: 500;
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            }
            
            .rbc-time-slot {
              font-size: 11px;
            }
            
            .rbc-time-header-content {
              font-size: 11px;
            }
          `
            : `
            .rbc-header {
              background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
              border-bottom: 1px solid #e2e8f0;
              padding: 6px 4px;
              font-weight: 600;
              font-size: 11px;
              color: #475569;
            }
            
            .rbc-date-cell {
              padding: 2px;
              font-weight: 500;
              font-size: 11px;
            }
            
            .rbc-event {
              border-radius: 4px;
              border: none;
              padding: 2px 4px;
              font-size: 9px;
              font-weight: 500;
              box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
            }
            
            .rbc-time-slot {
              font-size: 10px;
            }
            
            .rbc-time-header-content {
              font-size: 10px;
            }
            
            .rbc-time-content {
              font-size: 9px;
            }
          `}

          .rbc-today {
            background-color: rgba(99, 102, 241, 0.1);
          }

          .rbc-selected {
            background-color: rgba(99, 102, 241, 0.2);
          }

          /* Practice completed days - modern dot */
          .practice-completed::after {
            content: "";
            position: absolute;
            bottom: 6px;
            right: 6px;
            width: 8px;
            height: 8px;
            background: linear-gradient(135deg, #10b981, #059669);
            border-radius: 50%;
            box-shadow: 0 2px 4px rgba(16, 185, 129, 0.3);
          }

          /* Today + practiced - enhanced green dot */
          .practice-today-completed::after {
            content: "";
            position: absolute;
            bottom: 6px;
            right: 6px;
            width: 10px;
            height: 10px;
            background: linear-gradient(135deg, #10b981, #059669);
            border-radius: 50%;
            box-shadow: 0 0 12px rgba(16, 185, 129, 0.6);
            animation: pulse 2s infinite;
          }

          /* Today + not practiced - modern orange dot */
          .practice-today-pending::after {
            content: "";
            position: absolute;
            bottom: 6px;
            left: 6px;
            width: 8px;
            height: 8px;
            background: linear-gradient(135deg, #f59e0b, #d97706);
            border-radius: 50%;
            box-shadow: 0 2px 4px rgba(245, 158, 11, 0.3);
          }

          @keyframes pulse {
            0%,
            100% {
              transform: scale(1);
              opacity: 1;
            }
            50% {
              transform: scale(1.1);
              opacity: 0.8;
            }
          }
        `}</style>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          view={view}
          date={date}
          onView={handleViewChange}
          onNavigate={handleNavigate}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          selectable
          popup
          toolbar={false} // This removes the built-in toolbar completely
          style={{
            height: "100%",
            padding: "18px",
          }}
          eventPropGetter={(event) => ({
            style: {
              backgroundColor:
                event.type === "lesson"
                  ? "linear-gradient(135deg, #059669, #047857)"
                  : "linear-gradient(135deg, #6366f1, #4f46e5)",
              borderRadius: "8px",
              opacity: 0.9,
              color: "white",
              border: "0px",
              display: "block",
              cursor: "pointer",
              fontWeight: "500",
              fontSize: "12px",
            },
          })}
          dayPropGetter={(date) => {
            const today = new Date();
            const isToday = moment(date).isSame(today, "day");
            const dateKey = moment(date).format("YYYY-MM-DD");
            const hasPracticed = practiceDates[dateKey]?.hasPracticed;

            let backgroundColor = undefined;
            let border = undefined;
            let className = "";

            if (isToday && hasPracticed) {
              backgroundColor = "#ecfdf5"; // light green
              border = "2px solid #10b981"; // green border
              className = "practice-today-completed";
            } else if (isToday && !hasPracticed) {
              backgroundColor = "#fef3c7"; // light yellow
              border = "2px solid #f59e0b"; // orange border
              className = "practice-today-pending";
            } else if (isToday) {
              backgroundColor = "#f0f9ff"; // light blue
              border = "2px solid #3b82f6"; // blue border
            } else if (hasPracticed) {
              backgroundColor = "#f0fdf4"; // very light green
              border = "1px solid #22c55e"; // green border
              className = "practice-completed";
            }

            return {
              style: {
                backgroundColor,
                border,
                position: "relative" as const,
                borderRadius: "8px",
                transition: "all 0.2s ease",
              },
              className,
              title: hasPracticed
                ? `✨ Practiced on ${moment(date).format("MMM D")} - ${
                    practiceDates[dateKey].sessionCount
                  } session(s), ${practiceDates[dateKey].avgAccuracy}% accuracy`
                : isToday
                ? "🎯 Practice today to keep your streak!"
                : undefined,
            };
          }}
        />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-6 mt-6 p-4 bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg shadow-sm"></div>
          <span className="text-sm font-medium text-slate-700">
            Personal Events
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 bg-gradient-to-r from-emerald-600 to-green-600 rounded-lg shadow-sm"></div>
          <span className="text-sm font-medium text-slate-700">
            Class Lessons
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-lg">⭐</span>
          <span className="text-sm font-medium text-slate-700">
            Practice Completed
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-lg">🎯</span>
          <span className="text-sm font-medium text-slate-700">
            Practice Today!
          </span>
        </div>
      </div>

      {/* Event Details Modal */}
      {showEventModal && selectedEvent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md bg-white shadow-2xl border-0 rounded-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold mb-1">
                    {selectedEvent.title}
                  </h3>
                  <div className="flex items-center gap-2 text-indigo-100">
                    <FaCalendarAlt size={14} />
                    <span className="text-sm">
                      {moment(selectedEvent.start).format("MMMM D, YYYY")}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowEventModal(false)}
                  className="text-white hover:bg-white/20 rounded-full p-2"
                >
                  <FaTimes size={16} />
                </Button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 text-slate-600">
                <FaClock className="text-indigo-500" size={16} />
                <span className="font-medium">
                  {moment(selectedEvent.start).format("h:mm A")} -{" "}
                  {moment(selectedEvent.end).format("h:mm A")}
                </span>
              </div>

              {selectedEvent.description && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-slate-700 leading-relaxed">
                    {selectedEvent.description}
                  </p>
                </div>
              )}

              {selectedEvent.type === "personal" ? (
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={() => handleEditEvent(selectedEvent)}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg transition-all duration-200"
                  >
                    <FaEdit className="mr-2" size={14} />
                    Edit
                  </Button>
                  <Button
                    onClick={() => {
                      if (
                        window.confirm(
                          `Are you sure you want to delete "${selectedEvent.title}"?`
                        )
                      ) {
                        deleteEvent(selectedEvent.id);
                      }
                    }}
                    variant="outline"
                    className="flex-1 text-red-600 border-red-300 hover:bg-red-50 hover:border-red-400 transition-all duration-200"
                  >
                    <FaTrash className="mr-2" size={14} />
                    Delete
                  </Button>
                </div>
              ) : (
                <div className="pt-4">
                  <p className="text-sm text-slate-500 text-center p-4 bg-slate-50 rounded-xl">
                    Class lessons cannot be modified from here
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Add/Edit Event Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md bg-white shadow-2xl border-0 rounded-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">
                  {isEditing ? "Edit Event" : "Add New Event"}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowAddModal(false);
                    setIsEditing(false);
                    setSelectedEvent(null);
                  }}
                  className="text-white hover:bg-white/20 rounded-full p-2"
                >
                  <FaTimes size={16} />
                </Button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Title *
                </label>
                <Input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Enter event title"
                  className="w-full border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Description
                </label>
                <Textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Enter event description (optional)"
                  rows={3}
                  className="w-full border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-xl resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Date *
                </label>
                <div className="relative">
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                    className="w-full pl-12 border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-xl"
                  />
                  <FaCalendarAlt className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Start Time *
                  </label>
                  <div className="relative">
                    <Input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) =>
                        setFormData({ ...formData, startTime: e.target.value })
                      }
                      className="w-full pl-12 border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-xl"
                    />
                    <FaClock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    End Time *
                  </label>
                  <div className="relative">
                    <Input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) =>
                        setFormData({ ...formData, endTime: e.target.value })
                      }
                      className="w-full pl-12 border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-xl"
                    />
                    <FaClock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={isEditing ? updateEvent : addEvent}
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg transition-all duration-200 transform hover:scale-[1.02]"
                >
                  {loading
                    ? isEditing
                      ? "Updating..."
                      : "Adding..."
                    : isEditing
                    ? "Update Event"
                    : "Add Event"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddModal(false);
                    setIsEditing(false);
                    setSelectedEvent(null);
                  }}
                  className="flex-1 border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all duration-200"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default StudentCalendar;
