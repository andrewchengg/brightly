"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "react-toastify";
import {
  FaFlag,
  FaUser,
  FaBook,
  FaCalendarAlt,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimesCircle,
  FaEye,
  FaSpinner,
  FaFilter,
} from "react-icons/fa";

interface QuestionReport {
  id: string;
  reportType: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  question: {
    id: number;
    text: string;
    questionType: string;
    difficulty: string;
    subject: {
      id: number;
      name: string;
    };
    topic: {
      id: number;
      name: string;
    };
  };
  student: {
    id: string;
    name: string;
    username: string;
    email: string | null;
  };
}

const REPORT_TYPE_LABELS = {
  INCORRECT_ANSWER: "Incorrect Answer",
  WRONG_EXPLANATION: "Wrong Explanation",
  POOR_FORMATTING: "Poor Formatting",
  TECHNICAL_ISSUE: "Technical Issue",
  INAPPROPRIATE_CONTENT: "Inappropriate Content",
  OTHER: "Other",
};

const STATUS_LABELS = {
  PENDING: "Pending",
  UNDER_REVIEW: "Under Review",
  RESOLVED: "Resolved",
  REJECTED: "Rejected",
};

const STATUS_COLORS = {
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  UNDER_REVIEW: "bg-blue-100 text-blue-800 border-blue-200",
  RESOLVED: "bg-green-100 text-green-800 border-green-200",
  REJECTED: "bg-red-100 text-red-800 border-red-200",
};

export default function QuestionReportsPage() {
  const router = useRouter();
  const [reports, setReports] = useState<QuestionReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  // Filter states
  const [filters, setFilters] = useState({
    status: "ALL",
    reportType: "ALL",
    subject: "ALL",
    searchTerm: "",
    dateRange: "ALL",
  });

  const [filteredReports, setFilteredReports] = useState<QuestionReport[]>([]);

  useEffect(() => {
    fetchReports();
  }, []);

  // Apply filters whenever reports or filters change
  useEffect(() => {
    applyFilters();
  }, [reports, filters]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/question-reports");
      if (!response.ok) throw new Error("Failed to fetch reports");
      const data = await response.json();
      setReports(data);
    } catch (err: any) {
      setError(err.message || "Failed to load reports");
      toast.error("Failed to load question reports");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...reports];

    // Filter by status
    if (filters.status !== "ALL") {
      filtered = filtered.filter((report) => report.status === filters.status);
    }

    // Filter by report type
    if (filters.reportType !== "ALL") {
      filtered = filtered.filter(
        (report) => report.reportType === filters.reportType
      );
    }

    // Filter by subject
    if (filters.subject !== "ALL") {
      filtered = filtered.filter(
        (report) => report.question.subject.name === filters.subject
      );
    }

    // Filter by search term (student name, question text, description)
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(
        (report) =>
          report.student.name.toLowerCase().includes(searchLower) ||
          report.student.username.toLowerCase().includes(searchLower) ||
          report.question.text.toLowerCase().includes(searchLower) ||
          report.description.toLowerCase().includes(searchLower) ||
          report.question.id.toString().includes(searchLower)
      );
    }

    // Filter by date range
    if (filters.dateRange !== "ALL") {
      const now = new Date();
      const filterDate = new Date();

      switch (filters.dateRange) {
        case "TODAY":
          filterDate.setHours(0, 0, 0, 0);
          break;
        case "WEEK":
          filterDate.setDate(now.getDate() - 7);
          break;
        case "MONTH":
          filterDate.setMonth(now.getMonth() - 1);
          break;
      }

      if (filters.dateRange !== "ALL") {
        filtered = filtered.filter(
          (report) => new Date(report.createdAt) >= filterDate
        );
      }
    }

    setFilteredReports(filtered);
  };

  const updateReportStatus = async (reportId: string, newStatus: string) => {
    try {
      setUpdatingStatus(reportId);
      const response = await fetch("/api/admin/question-reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, status: newStatus }),
      });
      if (!response.ok) throw new Error("Failed to update status");

      // Update local state
      setReports(
        reports.map((report) =>
          report.id === reportId
            ? {
                ...report,
                status: newStatus,
                updatedAt: new Date().toISOString(),
              }
            : report
        )
      );

      toast.success(
        `Report status updated to ${
          STATUS_LABELS[newStatus as keyof typeof STATUS_LABELS]
        }`
      );
    } catch (err: any) {
      toast.error("Failed to update report status");
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleViewDetails = (questionId: number) => {
    // Find the report for this question
    const report = reports.find((r) => r.question.id === questionId);
    if (report) {
      // Store report details in sessionStorage to be accessed by question-review page
      sessionStorage.setItem(
        "questionReportDetails",
        JSON.stringify({
          reportId: report.id,
          reportType: report.reportType,
          description: report.description,
          status: report.status,
          createdAt: report.createdAt,
          updatedAt: report.updatedAt,
          student: report.student,
          reportTypeLabel:
            REPORT_TYPE_LABELS[
              report.reportType as keyof typeof REPORT_TYPE_LABELS
            ],
          statusLabel:
            STATUS_LABELS[report.status as keyof typeof STATUS_LABELS],
        })
      );
    }
    router.push(`/admin/question-review?questionId=${questionId}`);
  };

  const clearFilters = () => {
    setFilters({
      status: "ALL",
      reportType: "ALL",
      subject: "ALL",
      searchTerm: "",
      dateRange: "ALL",
    });
  };

  // Get unique subjects for filter dropdown
  const uniqueSubjects = Array.from(
    new Set(reports.map((report) => report.question.subject.name))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-indigo-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading question reports...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FaExclamationTriangle className="text-4xl text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchReports}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
          <FaFlag className="mr-3 text-red-500" />
          Question Reports
        </h1>
        <p className="text-gray-600">
          Review and manage student-reported questions ({reports.length} total,{" "}
          {filteredReports.length} shown)
        </p>
      </div>

      {/* Filters Section */}
      <Card className="p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center">
            <FaFilter className="mr-2" />
            Filters
          </h2>
          <Button variant="outline" size="sm" onClick={clearFilters}>
            Clear All Filters
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-4">
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, status: e.target.value }))
              }
              className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Report Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Report Type
            </label>
            <select
              value={filters.reportType}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, reportType: e.target.value }))
              }
              className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="ALL">All Types</option>
              {Object.entries(REPORT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Subject Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject
            </label>
            <select
              value={filters.subject}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, subject: e.target.value }))
              }
              className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="ALL">All Subjects</option>
              {uniqueSubjects.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date Range
            </label>
            <select
              value={filters.dateRange}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, dateRange: e.target.value }))
              }
              className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="ALL">All Time</option>
              <option value="TODAY">Today</option>
              <option value="WEEK">Last 7 Days</option>
              <option value="MONTH">Last 30 Days</option>
            </select>
          </div>

          {/* Search Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              placeholder="Student, question ID, description..."
              value={filters.searchTerm}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, searchTerm: e.target.value }))
              }
              className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Active Filters Display */}
        {(filters.status !== "ALL" ||
          filters.reportType !== "ALL" ||
          filters.subject !== "ALL" ||
          filters.dateRange !== "ALL" ||
          filters.searchTerm) && (
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-gray-600">Active filters:</span>
            {filters.status !== "ALL" && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                Status:{" "}
                {STATUS_LABELS[filters.status as keyof typeof STATUS_LABELS]}
              </span>
            )}
            {filters.reportType !== "ALL" && (
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                Type:{" "}
                {
                  REPORT_TYPE_LABELS[
                    filters.reportType as keyof typeof REPORT_TYPE_LABELS
                  ]
                }
              </span>
            )}
            {filters.subject !== "ALL" && (
              <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                Subject: {filters.subject}
              </span>
            )}
            {filters.dateRange !== "ALL" && (
              <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                Date:{" "}
                {filters.dateRange === "TODAY"
                  ? "Today"
                  : filters.dateRange === "WEEK"
                  ? "Last 7 Days"
                  : "Last 30 Days"}
              </span>
            )}
            {filters.searchTerm && (
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                Search: "{filters.searchTerm}"
              </span>
            )}
          </div>
        )}
      </Card>

      {/* Status Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {Object.entries(STATUS_LABELS).map(([status, label]) => {
          const count = filteredReports.filter(
            (report) => report.status === status
          ).length;
          const totalCount = reports.filter(
            (report) => report.status === status
          ).length;
          const colorClass =
            status === "PENDING"
              ? "bg-yellow-50 border-yellow-200 text-yellow-800"
              : status === "UNDER_REVIEW"
              ? "bg-blue-50 border-blue-200 text-blue-800"
              : status === "RESOLVED"
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-red-50 border-red-200 text-red-800";

          return (
            <Card key={status} className={`p-4 border-2 ${colorClass}`}>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {count}
                  {count !== totalCount && (
                    <span className="text-sm text-gray-500 ml-1">
                      / {totalCount}
                    </span>
                  )}
                </div>
                <div className="text-sm font-medium">{label}</div>
              </div>
            </Card>
          );
        })}
      </div>

      {filteredReports.length === 0 ? (
        <Card className="p-8 text-center">
          <FaFlag className="text-4xl text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            {reports.length === 0
              ? "No Reports Yet"
              : "No Reports Match Filters"}
          </h3>
          <p className="text-gray-500">
            {reports.length === 0
              ? "No question reports have been submitted by students."
              : "Try adjusting your filters to see more reports."}
          </p>
          {reports.length > 0 && (
            <Button onClick={clearFilters} className="mt-4">
              Clear All Filters
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Pending Reports */}
          {filteredReports.filter((report) => report.status === "PENDING")
            .length > 0 && (
            <div>
              <div className="flex items-center mb-4">
                <div className="w-4 h-4 bg-yellow-500 rounded-full mr-3"></div>
                <h2 className="text-xl font-semibold text-gray-800">
                  Pending Reports (
                  {
                    filteredReports.filter(
                      (report) => report.status === "PENDING"
                    ).length
                  }
                  )
                </h2>
              </div>
              <div className="space-y-4">
                {filteredReports
                  .filter((report) => report.status === "PENDING")
                  .map((report) => renderReportCard(report))}
              </div>
            </div>
          )}

          {/* Under Review Reports */}
          {filteredReports.filter((report) => report.status === "UNDER_REVIEW")
            .length > 0 && (
            <div>
              <div className="flex items-center mb-4">
                <div className="w-4 h-4 bg-blue-500 rounded-full mr-3"></div>
                <h2 className="text-xl font-semibold text-gray-800">
                  Under Review (
                  {
                    filteredReports.filter(
                      (report) => report.status === "UNDER_REVIEW"
                    ).length
                  }
                  )
                </h2>
              </div>
              <div className="space-y-4">
                {filteredReports
                  .filter((report) => report.status === "UNDER_REVIEW")
                  .map((report) => renderReportCard(report))}
              </div>
            </div>
          )}

          {/* Resolved Reports */}
          {filteredReports.filter((report) => report.status === "RESOLVED")
            .length > 0 && (
            <div>
              <div className="flex items-center mb-4">
                <div className="w-4 h-4 bg-green-500 rounded-full mr-3"></div>
                <h2 className="text-xl font-semibold text-gray-800">
                  Resolved (
                  {
                    filteredReports.filter(
                      (report) => report.status === "RESOLVED"
                    ).length
                  }
                  )
                </h2>
              </div>
              <div className="space-y-4">
                {filteredReports
                  .filter((report) => report.status === "RESOLVED")
                  .map((report) => renderReportCard(report))}
              </div>
            </div>
          )}

          {/* Rejected Reports */}
          {filteredReports.filter((report) => report.status === "REJECTED")
            .length > 0 && (
            <div>
              <div className="flex items-center mb-4">
                <div className="w-4 h-4 bg-red-500 rounded-full mr-3"></div>
                <h2 className="text-xl font-semibold text-gray-800">
                  Rejected (
                  {
                    filteredReports.filter(
                      (report) => report.status === "REJECTED"
                    ).length
                  }
                  )
                </h2>
              </div>
              <div className="space-y-4">
                {filteredReports
                  .filter((report) => report.status === "REJECTED")
                  .map((report) => renderReportCard(report))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // Helper function to render individual report cards
  function renderReportCard(report: QuestionReport) {
    return (
      <Card key={report.id} className="p-6 hover:shadow-lg transition-shadow">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-100 rounded-full">
              <FaFlag className="text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">
                {
                  REPORT_TYPE_LABELS[
                    report.reportType as keyof typeof REPORT_TYPE_LABELS
                  ]
                }
              </h3>
              <p className="text-sm text-gray-500 flex items-center">
                <FaCalendarAlt className="mr-1" />
                {new Date(report.createdAt).toLocaleDateString()} at{" "}
                {new Date(report.createdAt).toLocaleTimeString()}
              </p>
              <p className="text-sm text-gray-600 font-medium mt-1">
                Question ID: {report.question.id} •{" "}
                {report.question.subject.name} • {report.question.topic.name}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium border ${
                STATUS_COLORS[report.status as keyof typeof STATUS_COLORS]
              }`}
            >
              {STATUS_LABELS[report.status as keyof typeof STATUS_LABELS]}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleViewDetails(report.question.id)}
            >
              <FaEye className="mr-1" /> View Details
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-2 flex items-center">
              <FaUser className="mr-2 text-blue-500" />
              Student Information
            </h4>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="font-medium">{report.student.name}</p>
              <p className="text-sm text-gray-600">
                @{report.student.username}
              </p>
              {report.student.email && (
                <p className="text-sm text-gray-600">{report.student.email}</p>
              )}
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-2 flex items-center">
              <FaBook className="mr-2 text-green-500" />
              Question Information
            </h4>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm">
                <span className="font-medium">Question ID:</span>{" "}
                {report.question.id}
              </p>
              <p className="text-sm">
                <span className="font-medium">Subject:</span>{" "}
                {report.question.subject.name}
              </p>
              <p className="text-sm">
                <span className="font-medium">Topic:</span>{" "}
                {report.question.topic.name}
              </p>
              <p className="text-sm">
                <span className="font-medium">Type:</span>{" "}
                {report.question.questionType}
              </p>
              <p className="text-sm">
                <span className="font-medium">Difficulty:</span>{" "}
                {report.question.difficulty}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <h4 className="font-medium text-gray-900 mb-2">Report Description</h4>
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded-r-lg">
            <p className="text-gray-700">{report.description}</p>
          </div>
        </div>

        <div className="mt-4 border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-gray-700">
                Change Status:
              </span>
              <select
                value={report.status}
                onChange={(e) => updateReportStatus(report.id, e.target.value)}
                disabled={updatingStatus === report.id}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              {updatingStatus === report.id && (
                <FaSpinner className="animate-spin text-indigo-600" />
              )}
            </div>

            {/* Quick Action Buttons for Common Transitions */}
            <div className="flex space-x-2">
              {report.status === "PENDING" && (
                <>
                  <Button
                    size="sm"
                    onClick={() =>
                      updateReportStatus(report.id, "UNDER_REVIEW")
                    }
                    disabled={updatingStatus === report.id}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Start Review
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => updateReportStatus(report.id, "RESOLVED")}
                    disabled={updatingStatus === report.id}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Quick Resolve
                  </Button>
                </>
              )}
              {report.status === "UNDER_REVIEW" && (
                <>
                  <Button
                    size="sm"
                    onClick={() => updateReportStatus(report.id, "RESOLVED")}
                    disabled={updatingStatus === report.id}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Mark Resolved
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => updateReportStatus(report.id, "PENDING")}
                    disabled={updatingStatus === report.id}
                    variant="outline"
                    className="border-yellow-300 text-yellow-600 hover:bg-yellow-50"
                  >
                    Back to Pending
                  </Button>
                </>
              )}
              {(report.status === "RESOLVED" ||
                report.status === "REJECTED") && (
                <Button
                  size="sm"
                  onClick={() => updateReportStatus(report.id, "UNDER_REVIEW")}
                  disabled={updatingStatus === report.id}
                  variant="outline"
                  className="border-blue-300 text-blue-600 hover:bg-blue-50"
                >
                  Reopen for Review
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>
    );
  }
}
