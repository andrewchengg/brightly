// src/components/MockExam/MockExamLanding.tsx
'use client';

import { useState } from 'react';
import MockExamComponent from './MockExamComponent';
// import { useRouter } from 'next/navigation'; // Not currently used

interface PaperConfig {
  id: string;
  name: string;
  duration: number; // Duration in minutes
  totalMarks: number;
  description: string;
}

interface SubjectConfig {
  id: string;
  name: string;
  papers: PaperConfig[];
}

const subjectsConfig: SubjectConfig[] = [
  {
    id: 'mathematics',
    name: 'Mathematics',
    papers: [
      {
        id: 'paper1',
        name: 'Paper 1',
        duration: 60, 
        totalMarks: 45,
        description: 'Booklet A (MCQ) and Booklet B (Short Answer)'
      },
      {
        id: 'paper2',
        name: 'Paper 2',
        duration: 90, 
        totalMarks: 55,
        description: 'Short Answer and Long Answer Questions'
      }
    ]
  },
  // Add other subjects here if needed
];

interface MockExamLandingProps {
  userId: string;
}

// PaperSelection will now only be 'paper1' or 'paper2'
type PaperSelection = 'paper1' | 'paper2'; 

export default function MockExamLanding({ userId }: MockExamLandingProps) {
  const [examStarted, setExamStarted] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string | null>('mathematics'); 
  const [selectedPaperOption, setSelectedPaperOption] = useState<PaperSelection | null>(null); 
  // const router = useRouter(); 

  const handleSubjectSelect = (subjectId: string) => {
    setSelectedSubject(subjectId);
    setSelectedPaperOption(null); 
  };

  const handlePaperOptionSelect = (paperOption: PaperSelection) => {
    setSelectedPaperOption(paperOption);
  };

  const handleStartExam = () => {
    if (selectedSubject && selectedPaperOption) {
        setExamStarted(true);
    } else {
        alert("Please select a subject and a paper to start the exam.");
    }
  };

  const getCurrentSubjectConfig = (): SubjectConfig | undefined => {
    return subjectsConfig.find(s => s.id === selectedSubject);
  };
  
  let examDurationMinutes = 0;
  let initialPaperIdForComponent = ''; // Will be 'paper1' or 'paper2'
  const currentSubjectData = getCurrentSubjectConfig();

  if (currentSubjectData && selectedPaperOption) {
    // No 'both' case anymore for duration calculation here
    const paperConfig = currentSubjectData.papers.find(p => p.id === selectedPaperOption);
    examDurationMinutes = paperConfig?.duration || 0; 
    initialPaperIdForComponent = selectedPaperOption;
  }


  if (examStarted && selectedSubject && selectedPaperOption && initialPaperIdForComponent) {
    if (!currentSubjectData || !currentSubjectData.papers.find(p => p.id === initialPaperIdForComponent)) {
        return <div className="p-8 text-center text-red-500">Error: Invalid exam configuration. Please re-select.</div>;
    }
    return (
      <MockExamComponent 
        userId={userId} 
        examDurationMinutes={examDurationMinutes} 
        subjectId={selectedSubject}
        paperId={initialPaperIdForComponent} 
        isBothPapers={false} // Always false now
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto bg-white shadow-xl rounded-lg p-6 md:p-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-8 text-center text-indigo-700">Mock Exam Center</h1>
        
        <div className="mb-6">
            <h2 className="text-xl font-semibold mt-2 text-gray-700">Select Paper for Mathematics</h2>
        </div>
        <div className="space-y-4">
            {getCurrentSubjectConfig()?.papers.map((paper) => (
                <button 
                    key={paper.id} 
                    onClick={() => handlePaperOptionSelect(paper.id as PaperSelection)}
                    className={`w-full p-4 rounded-lg border-2 text-left transition-all 
                                ${selectedPaperOption === paper.id 
                                    ? 'border-indigo-500 bg-indigo-50 shadow-lg scale-105 ring-2 ring-indigo-300' 
                                    : 'border-gray-300 hover:border-indigo-400 bg-white hover:shadow-md'}`}
                >
                    <h3 className="font-semibold text-gray-800">{paper.name}</h3>
                    <p className="text-sm text-gray-500">{paper.description}</p>
                    <p className="text-xs text-gray-400 mt-1">Duration: {paper.duration} mins | Marks: {paper.totalMarks}</p>
                </button>
            ))}
            {/* "Both Papers" button is now removed */}
        </div>

        {selectedPaperOption && (
            <div className="mt-8 text-center">
                <button
                    onClick={handleStartExam}
                    className="px-8 py-3 bg-green-500 text-white font-semibold rounded-lg shadow-md hover:bg-green-600 transition-colors text-lg md:px-10 md:text-xl"
                >
                    Start Exam: {getCurrentSubjectConfig()?.papers.find(p => p.id === selectedPaperOption)?.name}
                </button>
            </div>
        )}
        
        <div className="mt-10 p-6 bg-gray-50 rounded-lg border">
            <h3 className="font-semibold text-gray-700 mb-3">Instructions:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                <li>Ensure you have a stable internet connection.</li>
                <li>Once started, the timer cannot be paused.</li>
                <li>The exam will auto-submit when the time expires.</li>
                {selectedSubject === 'mathematics' && (
                    <>
                        {selectedPaperOption === 'paper1' && <li>Paper 1: Calculators are NOT allowed.</li>}
                        {selectedPaperOption === 'paper2' && <li>Paper 2: Calculators ARE allowed.</li>}
                    </>
                )}
            </ul>
        </div>
      </div>
    </div>
  );
}