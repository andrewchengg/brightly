// src/app/(dashboard)/admin/content/create/chinese/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { FaArrowLeft, FaMicrophoneAlt, FaPencilAlt, FaListOl, FaHeadphones, FaEdit, FaArrowRight, FaAlignLeft } from "react-icons/fa";

interface ChineseContentType {
    id: string;
    name: string;
    description: string;
    icon: React.ElementType;
    path: string;
    disabled?: boolean;
}

const chineseContentTypes: ChineseContentType[] = [
    { id: "oral", name: "Oral Prompt (口试提示)", description: "Create prompts for reading, picture/video conversation.", icon: FaMicrophoneAlt, path: "/admin/content/create/chinese/oral" },
    { id: "mcq", name: "Multiple Choice Question (选择题)", description: "For Paper 2 Section A (vocabulary, grammar, cloze).", icon: FaListOl, path: "/admin/content/create/chinese/mcq", disabled: true },
    { id: "composition", name: "Composition Prompt (作文题目)", description: "Picture-based prompts for Paper 1.", icon: FaPencilAlt, path: "/admin/content/create/chinese/composition", disabled: true },
    { id: "comprehension", name: "Comprehension Question (理解问答)", description: "Passages and questions for Paper 2 Section B.", icon: FaAlignLeft, path: "/admin/content/create/chinese/comprehension", disabled: true },
    { id: "listening", name: "Listening Comprehension (听力)", description: "Audio scripts and MCQs for Paper 3.", icon: FaHeadphones, path: "/admin/content/create/chinese/listening", disabled: true },
    { id: "practical-writing", name: "Practical Writing (实用文)", description: "Notices, emails for Paper 2 Section C.", icon: FaEdit, path: "/admin/content/create/chinese/practical-writing", disabled: true },
];


export default function CreateChineseContentTypePage() {
  const router = useRouter();

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <Button variant="outline" onClick={() => router.push('/admin/content/create')} className="mb-6">
        <FaArrowLeft className="mr-2" /> Back to Subjects
      </Button>
      <Card className="shadow-lg">
        <CardHeader className="bg-red-50 border-b border-red-200">
          <CardTitle className="text-2xl md:text-3xl text-red-700">Create Chinese Content (创建华文内容)</CardTitle>
          <CardDescription className="text-red-600">Select the type of Chinese question or prompt you want to create.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {chineseContentTypes.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.id}
                  onClick={() => !type.disabled && router.push(type.path)}
                  disabled={type.disabled}
                  className={`group flex flex-col items-start p-6 bg-white rounded-lg border-2  hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1
                    ${type.disabled 
                        ? 'border-gray-200 opacity-60 cursor-not-allowed' 
                        : 'border-gray-200 hover:border-red-500 cursor-pointer'}`}
                >
                    <div className={`p-3 rounded-lg mb-3 ${type.disabled ? 'bg-gray-200': 'bg-red-100 group-hover:bg-red-500'} transition-colors duration-300`}>
                        <Icon className={`w-8 h-8 ${type.disabled ? 'text-gray-400': 'text-red-600 group-hover:text-white'} transition-colors duration-300`} />
                    </div>
                  <h3 className={`text-lg font-semibold ${type.disabled ? 'text-gray-500' : 'text-gray-700 group-hover:text-red-600'} transition-colors duration-300 mb-1`}>
                    {type.name}
                  </h3>
                  <p className={`text-sm ${type.disabled ? 'text-gray-400' : 'text-gray-500 group-hover:text-red-500'} transition-colors duration-300 mb-3`}>
                    {type.description}
                  </p>
                  <span className={`flex items-center text-sm font-medium mt-auto 
                    ${type.disabled ? 'text-gray-400' : 'text-red-500 group-hover:text-red-700'} transition-colors duration-300`}
                  >
                    {type.disabled ? "Coming Soon" : "Create Now"}
                    {!type.disabled && <FaArrowRight className="ml-1.5 text-gray-400 group-hover:text-red-600 group-hover:translate-x-1 transition-all duration-300" />}
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
