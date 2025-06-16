"use client";

import { useEffect, useState } from "react";
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
  const [reports, setReports] = useState<QuestionReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<QuestionReport | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  useEffect(() => {
    fetchReports();
  }, []);

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
      setReports(reports.map(report => 
        report.id === reportId 
          ? { ...report, status: newStatus, updatedAt: new Date().toISOString() }
          : report
      ));
      
      toast.success(`Report status updated to ${STATUS_LABELS[newStatus as keyof typeof STATUS_LABELS]}`);
    } catch (err: any) {
      toast.error("Failed to update report status");
    } finally {
      setUpdatingStatus(null);
    }
  };

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
          Review and manage student-reported questions ({reports.length} total)
        </p>
      </div>

      {reports.length === 0 ? (
        <Card className="p-8 text-center">
          <FaFlag className="text-4xl text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No Reports Yet</h3>
          <p className="text-gray-500">No question reports have been submitted by students.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {reports.map((report) => (
            <Card key={report.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-red-100 rounded-full">
                    <FaFlag className="text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">
                      {REPORT_TYPE_LABELS[report.reportType as keyof typeof REPORT_TYPE_LABELS]}
                    </h3>
                    <p className="text-sm text-gray-500 flex items-center">
                      <FaCalendarAlt className="mr-1" />
                      {new Date(report.createdAt).toLocaleDateString()} at{" "}
                      {new Date(report.createdAt).toLocaleTimeString()}
                    </p>
                    <p className="text-sm text-gray-600 font-medium mt-1">
                      Question ID: {report.question.id} • {report.question.subject.name} • {report.question.topic.name}
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
                    onClick={() => setSelectedReport(report)}
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
                    <p className="text-sm text-gray-600">@{report.student.username}</p>
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
                      <span className="font-medium">Question ID:</span> {report.question.id}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Subject:</span> {report.question.subject.name}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Topic:</span> {report.question.topic.name}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Type:</span> {report.question.questionType}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Difficulty:</span> {report.question.difficulty}
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

              {report.status === "PENDING" && (
                <div className="mt-4 flex space-x-2">
                  <Button
                    size="sm"
                    onClick={() => updateReportStatus(report.id, "UNDER_REVIEW")}
                    disabled={updatingStatus === report.id}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {updatingStatus === report.id ? <FaSpinner className="animate-spin mr-1" /> : null}
                    Mark Under Review
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => updateReportStatus(report.id, "RESOLVED")}
                    disabled={updatingStatus === report.id}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {updatingStatus === report.id ? <FaSpinner className="animate-spin mr-1" /> : null}
                    Mark Resolved
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateReportStatus(report.id, "REJECTED")}
                    disabled={updatingStatus === report.id}
                    className="border-red-300 text-red-600 hover:bg-red-50"
                  >
                    {updatingStatus === report.id ? <FaSpinner className="animate-spin mr-1" /> : null}
                    Reject
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Question Details Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-bold">Question Details</h2>
              <button
                onClick={() => setSelectedReport(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-lg mb-3">Question Text</h3>
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <p className="text-gray-800">{selectedReport.question.text}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-lg mb-3">Question Metadata</h3>
                  <div className="space-y-2">
                    <p><span className="font-medium">ID:</span> {selectedReport.question.id}</p>
                    <p><span className="font-medium">Type:</span> {selectedReport.question.questionType}</p>
                    <p><span className="font-medium">Difficulty:</span> {selectedReport.question.difficulty}</p>
                    <p><span className="font-medium">Subject:</span> {selectedReport.question.subject.name}</p>
                    <p><span className="font-medium">Topic:</span> {selectedReport.question.topic.name}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-3">Report Details</h3>
                  <div className="space-y-2">
                    <p><span className="font-medium">Report ID:</span> {selectedReport.id}</p>
                    <p><span className="font-medium">Type:</span> {REPORT_TYPE_LABELS[selectedReport.reportType as keyof typeof REPORT_TYPE_LABELS]}</p>
                    <p><span className="font-medium">Status:</span> {STATUS_LABELS[selectedReport.status as keyof typeof STATUS_LABELS]}</p>
                    <p><span className="font-medium">Submitted:</span> {new Date(selectedReport.createdAt).toLocaleString()}</p>
                    <p><span className="font-medium">Updated:</span> {new Date(selectedReport.updatedAt).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-3">Student Report</h3>
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedReport.description}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={() => setSelectedReport(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 