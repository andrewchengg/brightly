// src/app/(dashboard)/admin/content/create/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { FaCalculator, FaFlask, FaLanguage, FaBookOpen as FaChineseIcon, FaArrowRight } from "react-icons/fa"; // Using FaBookOpen for Chinese for now

// In a real app, you might fetch subjects from the DB or have a more dynamic config
const subjectsForCreation = [
  { id: "1", name: "Mathematics", icon: FaCalculator, pathSuffix: "mathematics" }, // Assuming subjectId 1 is Math
  { id: "3", name: "English", icon: FaLanguage, pathSuffix: "english" },       // Assuming subjectId 3 is English
  { id: "2", name: "Science", icon: FaFlask, pathSuffix: "science" },       // Assuming subjectId 2 is Science
  { id: "4", name: "Chinese", icon: FaChineseIcon, pathSuffix: "chinese" },   // Assuming subjectId 4 is Chinese
];

export default function CreateContentSubjectSelectionPage() {
  const router = useRouter();

  const handleSubjectSelect = (subjectPathSuffix: string) => {
    router.push(`/admin/content/create/${subjectPathSuffix}`);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <Card className="shadow-lg">
        <CardHeader className="bg-gray-50 border-b">
          <CardTitle className="text-2xl md:text-3xl text-gray-800">Create New Content</CardTitle>
          <CardDescription>Select a subject to start creating questions or prompts.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {subjectsForCreation.map((subject) => {
              const Icon = subject.icon;
              return (
                <button
                  key={subject.id}
                  onClick={() => handleSubjectSelect(subject.pathSuffix)}
                  className="group flex flex-col items-center justify-center p-6 bg-white rounded-lg border-2 border-gray-200 hover:border-indigo-500 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                >
                  <div className="p-4 bg-indigo-100 rounded-full mb-4 group-hover:bg-indigo-500 transition-colors duration-300">
                    <Icon className="w-10 h-10 text-indigo-600 group-hover:text-white transition-colors duration-300" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-700 group-hover:text-indigo-600 transition-colors duration-300 mb-1">
                    {subject.name}
                  </h3>
                  <p className="text-sm text-gray-500 group-hover:text-indigo-500 transition-colors duration-300">
                    Create {subject.name.toLowerCase()} content
                  </p>
                  <FaArrowRight className="mt-3 text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all duration-300" />
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}