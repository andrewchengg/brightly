"use client";

import { useState, useEffect } from "react";
import { FaSearch, FaFilter, FaTimes } from "react-icons/fa";

interface FilterOptions {
  subjects: Array<{
    id: number;
    name: string;
    topics: Array<{ id: number; name: string }>;
  }>;
  questionGroups: Array<{ id: number; name: string }>;
}

interface FilterValues {
  subjectId?: string;
  topicId?: string;
  difficulty?: string;
  questionType?: string;
  productionReady?: string;
  isRefactored?: string;
  questionGroupId?: string;
  search?: string;
}

interface QuestionFiltersProps {
  onFilterChange: (filters: FilterValues) => void;
  initialFilters?: FilterValues;
}

const DIFFICULTY_OPTIONS = [
  { value: "EASY", label: "Easy" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HARD", label: "Hard" },
];

const QUESTION_TYPE_OPTIONS = [
  { value: "MULTIPLE_CHOICE", label: "Multiple Choice" },
  { value: "TRUE_FALSE", label: "True/False" },
  { value: "SHORT_ANSWER", label: "Short Answer" },
  { value: "ESSAY", label: "Essay" },
  { value: "FILL_IN_THE_BLANK", label: "Fill in the Blank" },
];

const STATUS_OPTIONS = [
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
];

export default function QuestionFilters({
  onFilterChange,
  initialFilters = {},
}: QuestionFiltersProps) {
  const [filters, setFilters] = useState<FilterValues>(initialFilters);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    subjects: [],
    questionGroups: [],
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [availableTopics, setAvailableTopics] = useState<
    Array<{ id: number; name: string }>
  >([]);

  // Fetch filter options
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [subjectsRes, questionGroupsRes] = await Promise.all([
          fetch("/api/subjects/statistics"),
          fetch("/api/question-groups"),
        ]);

        const subjectsData = await subjectsRes.json();
        const questionGroupsData = questionGroupsRes.ok
          ? await questionGroupsRes.json()
          : { questionGroups: [] };

        setFilterOptions({
          subjects: subjectsData.subjects || [],
          questionGroups: questionGroupsData.questionGroups || [],
        });
      } catch (error) {
        console.error("Error fetching filter options:", error);
      }
    };

    fetchOptions();
  }, []);

  // Update available topics when subject changes
  useEffect(() => {
    if (filters.subjectId) {
      const selectedSubject = filterOptions.subjects.find(
        (s) => s.id.toString() === filters.subjectId
      );
      setAvailableTopics(selectedSubject?.topics || []);

      // Clear topic if it's not available in the new subject
      if (
        filters.topicId &&
        !selectedSubject?.topics.find(
          (t) => t.id.toString() === filters.topicId
        )
      ) {
        setFilters((prev) => ({ ...prev, topicId: undefined }));
      }
    } else {
      setAvailableTopics([]);
      setFilters((prev) => ({ ...prev, topicId: undefined }));
    }
  }, [filters.subjectId, filterOptions.subjects]);

  // Notify parent when filters change
  useEffect(() => {
    onFilterChange(filters);
  }, [filters, onFilterChange]);

  const handleFilterChange = (
    key: keyof FilterValues,
    value: string | undefined
  ) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
    }));
  };

  const clearAllFilters = () => {
    setFilters({});
  };

  const hasActiveFilters = Object.values(filters).some(
    (value) => value !== undefined && value !== ""
  );

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-100 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FaFilter className="text-indigo-600" />
          <h3 className="text-lg font-semibold text-gray-800">Filters</h3>
          {hasActiveFilters && (
            <span className="bg-indigo-100 text-indigo-800 text-xs font-medium px-2 py-1 rounded">
              Active
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            {showAdvanced ? "Hide Advanced" : "Show Advanced"}
          </button>
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1 text-sm text-red-600 hover:text-red-800 font-medium"
            >
              <FaTimes className="text-xs" />
              Clear All
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {/* Basic Filters Row 1 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Text
            </label>
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
              <input
                type="text"
                placeholder="Search question text..."
                value={filters.search || ""}
                onChange={(e) => handleFilterChange("search", e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject
            </label>
            <select
              value={filters.subjectId || ""}
              onChange={(e) => handleFilterChange("subjectId", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">All Subjects</option>
              {filterOptions.subjects.map((subject) => (
                <option key={subject.id} value={subject.id.toString()}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>

          {/* Topic */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Topic
            </label>
            <select
              value={filters.topicId || ""}
              onChange={(e) => handleFilterChange("topicId", e.target.value)}
              disabled={!filters.subjectId}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">All Topics</option>
              {availableTopics.map((topic) => (
                <option key={topic.id} value={topic.id.toString()}>
                  {topic.name}
                </option>
              ))}
            </select>
          </div>

          {/* Difficulty */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Difficulty
            </label>
            <select
              value={filters.difficulty || ""}
              onChange={(e) => handleFilterChange("difficulty", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">All Difficulties</option>
              {DIFFICULTY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Advanced Filters */}
        {showAdvanced && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
            {/* Question Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Question Type
              </label>
              <select
                value={filters.questionType || ""}
                onChange={(e) =>
                  handleFilterChange("questionType", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All Types</option>
                {QUESTION_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Production Ready */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Production Ready
              </label>
              <select
                value={filters.productionReady || ""}
                onChange={(e) =>
                  handleFilterChange("productionReady", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All</option>
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Is Refactored */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Is Refactored
              </label>
              <select
                value={filters.isRefactored || ""}
                onChange={(e) =>
                  handleFilterChange("isRefactored", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All</option>
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Question Group */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Question Group
              </label>
              <select
                value={filters.questionGroupId || ""}
                onChange={(e) =>
                  handleFilterChange("questionGroupId", e.target.value)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All Groups</option>
                {filterOptions.questionGroups.map((group) => (
                  <option key={group.id} value={group.id.toString()}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
