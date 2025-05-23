// src/components/MockExam/MockExamLanding.tsx
'use client';

import { useState } from 'react';
import MockExamComponent from './MockExamComponent';
import { useRouter } from 'next/navigation';

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

type PaperSelection = 'paper1' | 'paper2' | 'both';

export default function MockExamLanding({ userId }: MockExamLandingProps) {
  const [examStarted, setExamStarted] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string | null>('mathematics'); // Default to Mathematics
  const [selectedPaperOption, setSelectedPaperOption] = useState<PaperSelection | null>(null); 
  const router = useRouter();

  const handlePaperOptionSelect = (paperOption: PaperSelection) => {
    setSelectedPaperOption(paperOption);
  };

  const handleStartExam = () => {
    if (selectedSubject && selectedPaperOption) {
        setExamStarted(true);
    } else {
        alert("Please select a paper option.");
    }
  };

  const getCurrentSubjectConfig = () => subjectsConfig.find(s => s.id === selectedSubject);
  
  let examDurationMinutes = 0;
  let initialPaperIdForComponent = '';
  const currentSubjectData = getCurrentSubjectConfig();

  if (currentSubjectData && selectedPaperOption) {
    if (selectedPaperOption === 'both') { // For Phase 1, 'both' will just start Paper 1. Sequential logic in MockExamComponent.
      const paper1Config = currentSubjectData.papers.find(p => p.id === 'paper1');
      examDurationMinutes = paper1Config?.duration || 60; // Duration for the first paper
      initialPaperIdForComponent = 'paper1'; 
    } else {
      const paperConfig = currentSubjectData.papers.find(p => p.id === selectedPaperOption);
      examDurationMinutes = paperConfig?.duration || 0;
      initialPaperIdForComponent = selectedPaperOption;
    }
  }


  if (examStarted && selectedSubject && selectedPaperOption && initialPaperIdForComponent) {
    return (
      <MockExamComponent 
        userId={userId} 
        examDurationMinutes={examDurationMinutes} // This will be for the current paper
        subjectId={selectedSubject}
        paperId={initialPaperIdForComponent} 
        isBothPapers={selectedPaperOption === 'both'}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto bg-white shadow-xl rounded-lg p-8">
        <h1 className="text-3xl font-bold mb-8 text-center text-indigo-700">Mock Exam Center</h1>
        
        {/* Subject is pre-selected to Mathematics for Phase 1 simplicity */}
        <div className="mb-8">
            <h2 className="text-xl font-semibold mt-2 text-gray-700">Select Paper for Mathematics</h2>
        </div>
        <div className="space-y-4">
            {getCurrentSubjectConfig()?.papers.map((paper) => (
                <button key={paper.id} onClick={() => handlePaperOptionSelect(paper.id as PaperSelection)}
                    className={`w-full p-4 rounded-lg border-2 text-left transition-all ${selectedPaperOption === paper.id ? 'border-indigo-500 bg-indigo-50 shadow-lg scale-105' : 'border-gray-300 hover:border-indigo-400 bg-white hover:shadow-md'}`}>
                    <h3 className="font-semibold text-gray-800">{paper.name}</h3>
                    <p className="text-sm text-gray-500">{paper.description}</p>
                    <p className="text-xs text-gray-400 mt-1">Duration: {paper.duration} mins | Marks: {paper.totalMarks}</p>
                </button>
            ))}
            {/* "Both Papers" option can be enabled in a later phase */}
            <button onClick={() => handlePaperOptionSelect('both')}
                     disabled // Disable for Phase 1
                     className={`w-full p-4 rounded-lg border-2 text-left transition-all ${selectedPaperOption === 'both' ? 'border-indigo-500 bg-indigo-50 shadow-lg scale-105' : 'border-gray-300 hover:border-indigo-400 bg-white hover:shadow-md'} ${true ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <h3 className="font-semibold text-gray-800">Attempt Both Papers (Coming Soon)</h3>
                    <p className="text-sm text-gray-500">Complete Paper 1 followed by Paper 2.</p>
                    <p className="text-xs text-gray-400 mt-1">Total Duration: {getCurrentSubjectConfig()?.papers.reduce((sum, p) => sum + p.duration, 0)} mins | Total Marks: {getCurrentSubjectConfig()?.papers.reduce((sum, p) => sum + p.totalMarks, 0)}</p>
                </button>
        </div>

        {selectedPaperOption && (
            <div className="mt-8 text-center">
                <button
                    onClick={handleStartExam}
                    className="px-10 py-3 bg-green-500 text-white font-semibold rounded-lg shadow-md hover:bg-green-600 transition-colors text-lg"
                >
                    Start Exam: {selectedPaperOption === 'both' ? 'Both Papers' : getCurrentSubjectConfig()?.papers.find(p => p.id === selectedPaperOption)?.name}
                </button>
            </div>
        )}
        
        <div className="mt-12 p-6 bg-gray-50 rounded-lg border">
            <h3 className="font-semibold text-gray-700 mb-3">Instructions:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                <li>Ensure you have a stable internet connection.</li>
                <li>Once started, the timer cannot be paused.</li>
                <li>The exam will auto-submit when the time expires.</li>
                {selectedSubject === 'mathematics' && (
                    <>
                        {(selectedPaperOption === 'paper1' || selectedPaperOption === 'both') && <li>Paper 1: Calculators are NOT allowed.</li>}
                        {(selectedPaperOption === 'paper2' || selectedPaperOption === 'both') && <li>Paper 2: Calculators ARE allowed.</li>}
                    </>
                )}
            </ul>
        </div>
      </div>
    </div>
  );
}