// src/app/(dashboard)/student/practice/launch-group-by-topic/[topicId]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { FaSpinner } from "react-icons/fa";
import { toast } from "react-toastify";

// Map Topic IDs to their specific practice page paths
const topicToPracticePathMap: Record<string, string | undefined> = {
  "43": "/student/practice/chinese/cloze", // Cloze Passage
  "44": "/student/practice/chinese/reading-comprehension", // Reading Comprehension
  "45": "/student/practice/chinese/dialogue", // Dialogue Completion
  // Add more mappings here if other topics also use question groups with specific page types
};

export default function LaunchGroupByTopicPage() {
  const router = useRouter();
  const params = useParams();
  const topicId = params.topicId as string;
  const [loadingMessage, setLoadingMessage] = useState(
    "Finding a suitable practice session..."
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!topicId) {
      setError("Topic ID is missing.");
      return;
    }

    const basePracticePath = topicToPracticePathMap[topicId];
    if (!basePracticePath) {
      setError(
        `No specific practice page configured for Topic ID ${topicId}. Defaulting to generic group practice or error.`
      );
      // Optionally, redirect to generic group practice if that's a fallback
      // router.replace(`/student/practice/topic/${topicId}`); // Or show error
      toast.error(
        `Configuration error: No specific practice page for Topic ID ${topicId}.`
      );
      return;
    }

    const launchPractice = async () => {
      try {
        const response = await fetch(
          `/api/questions/get-random-group-for-topic?topicId=${topicId}`
        );

        if (!response.ok) {
          const errData = await response.json().catch(() => ({
            error: { message: "Failed to fetch practice group." },
          }));
          throw new Error(
            errData.error?.message ||
              "Could not find a practice session for this topic."
          );
        }

        const data = await response.json();
        if (data.questionGroupId) {
          setLoadingMessage(
            `Practice session found! Redirecting (Group ID: ${data.questionGroupId})...`
          );
          // Construct the final path using the base path from the map
          router.replace(`${basePracticePath}/${data.questionGroupId}`);
        } else {
          throw new Error("No suitable practice session ID returned.");
        }
      } catch (err: any) {
        console.error("Error launching group practice by topic:", err);
        setError(err.message);
        toast.error(err.message);
      }
    };

    launchPractice();
  }, [topicId, router]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-6 rounded-md shadow-md max-w-lg">
          <h2 className="text-xl font-semibold mb-2">
            Could Not Start Practice
          </h2>
          <p className="mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-center items-center min-h-screen p-4">
      <FaSpinner className="animate-spin text-4xl text-indigo-500" />
      <p className="mt-4 text-indigo-600 font-medium">{loadingMessage}</p>
    </div>
  );
}
