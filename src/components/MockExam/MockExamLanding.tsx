'use client';

import { useState } from 'react';
import MockExamComponent from './MockExamComponent';
import { useRouter } from 'next/navigation';

interface Paper {
  id: string;
  name: string;
  duration: number;
  totalMarks: number;
  description: string;
}

interface Subject {
  id: string;
  name: string;
  papers: Paper[];
}

const subjects: Subject[] = [
  {
    id: 'mathematics',
    name: 'Mathematics',
    papers: [
      {
        id: 'paper1',
        name: 'Paper 1',
        duration: 0.5, // 30 seconds
        totalMarks: 45,
        description: 'Booklet A (MCQ) and Booklet B (Short Answer)'
      },
      {
        id: 'paper2',
        name: 'Paper 2',
        duration: 0.5, // 30 seconds
        totalMarks: 55,
        description: 'Short Answer and Long Answer Questions'
      }
    ]
  },
  {
    id: 'science',
    name: 'Science',
    papers: []
  },
  {
    id: 'english',
    name: 'English',
    papers: []
  },
  {
    id: 'chinese',
    name: 'Chinese',
    papers: []
  }
];

interface MockExamLandingProps {
  userId: string;
}

type PaperSelection = 'paper1' | 'paper2' | 'both';

export default function MockExamLanding({ userId }: MockExamLandingProps) {
  const [examStarted, setExamStarted] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedPaper, setSelectedPaper] = useState<PaperSelection | null>(null);
  const router = useRouter();

  const handleSubjectSelect = (subjectId: string) => {
    setSelectedSubject(subjectId);
    setSelectedPaper(null);
  };

  const handlePaperSelect = (paperSelection: PaperSelection) => {
    setSelectedPaper(paperSelection);
    setExamStarted(true);
  };

  const getCurrentSubject = () => {
    return subjects.find(s => s.id === selectedSubject);
  };

  if (!examStarted) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="w-full max-w-4xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold mb-8 text-center">Mock Exam</h1>
          
          {!selectedSubject ? (
            // Subject Selection
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4">Select Subject</h2>
              <div className="grid grid-cols-2 gap-4">
                {subjects.map((subject) => (
                  <button
                    key={subject.id}
                    onClick={() => handleSubjectSelect(subject.id)}
                    className={`
                      p-8 rounded-lg text-xl font-semibold
                      transition-all duration-200
                      ${selectedSubject === subject.id 
                        ? 'bg-blue-600 text-white transform scale-95' 
                        : 'bg-white hover:bg-blue-100 text-gray-800 hover:transform hover:scale-105'
                      }
                      border-2 border-gray-200 hover:border-blue-500
                      shadow-lg hover:shadow-xl
                      flex items-center justify-center
                      min-h-[150px]
                    `}
                  >
                    {subject.name}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            // Paper Selection
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <div className="flex items-center mb-6">
                <button
                  onClick={() => setSelectedSubject(null)}
                  className="mr-4 text-blue-600 hover:text-blue-800"
                >
                  ← Back to Subjects
                </button>
                <h2 className="text-xl font-semibold">Select Paper for {getCurrentSubject()?.name}</h2>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {selectedSubject === 'mathematics' ? (
                  <>
                    <button
                      onClick={() => handlePaperSelect('paper1')}
                      className={`
                        p-6 rounded-lg text-lg font-semibold
                        transition-all duration-200
                        ${selectedPaper === 'paper1' 
                          ? 'bg-blue-600 text-white transform scale-95' 
                          : 'bg-white hover:bg-blue-100 text-gray-800 hover:transform hover:scale-105'
                        }
                        border-2 border-gray-200 hover:border-blue-500
                        shadow-lg hover:shadow-xl
                        text-left
                      `}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-xl font-bold mb-2">Paper 1 Only</h3>
                          <p className="text-gray-600 mb-2">Booklet A (MCQ) and Booklet B (Short Answer)</p>
                          <div className="flex gap-4 text-sm">
                            <span className="text-gray-600">Duration: 1 hour</span>
                            <span className="text-gray-600">Total Marks: 45</span>
                          </div>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => handlePaperSelect('paper2')}
                      className={`
                        p-6 rounded-lg text-lg font-semibold
                        transition-all duration-200
                        ${selectedPaper === 'paper2' 
                          ? 'bg-blue-600 text-white transform scale-95' 
                          : 'bg-white hover:bg-blue-100 text-gray-800 hover:transform hover:scale-105'
                        }
                        border-2 border-gray-200 hover:border-blue-500
                        shadow-lg hover:shadow-xl
                        text-left
                      `}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-xl font-bold mb-2">Paper 2 Only</h3>
                          <p className="text-gray-600 mb-2">Short Answer and Long Answer Questions</p>
                          <div className="flex gap-4 text-sm">
                            <span className="text-gray-600">Duration: 1 hour 30 minutes</span>
                            <span className="text-gray-600">Total Marks: 55</span>
                          </div>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => handlePaperSelect('both')}
                      className={`
                        p-6 rounded-lg text-lg font-semibold
                        transition-all duration-200
                        ${selectedPaper === 'both' 
                          ? 'bg-blue-600 text-white transform scale-95' 
                          : 'bg-white hover:bg-blue-100 text-gray-800 hover:transform hover:scale-105'
                        }
                        border-2 border-gray-200 hover:border-blue-500
                        shadow-lg hover:shadow-xl
                        text-left
                      `}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-xl font-bold mb-2">Both Papers</h3>
                          <p className="text-gray-600 mb-2">Complete Paper 1 followed by Paper 2</p>
                          <div className="flex gap-4 text-sm">
                            <span className="text-gray-600">Total Duration: 2 hours 30 minutes</span>
                            <span className="text-gray-600">Total Marks: 100</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  </>
                ) : (
                  getCurrentSubject()?.papers.map((paper) => (
                    <button
                      key={paper.id}
                      onClick={() => handlePaperSelect(paper.id as PaperSelection)}
                      className={`
                        p-6 rounded-lg text-lg font-semibold
                        transition-all duration-200
                        ${selectedPaper === paper.id 
                          ? 'bg-blue-600 text-white transform scale-95' 
                          : 'bg-white hover:bg-blue-100 text-gray-800 hover:transform hover:scale-105'
                        }
                        border-2 border-gray-200 hover:border-blue-500
                        shadow-lg hover:shadow-xl
                        text-left
                      `}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-xl font-bold mb-2">{paper.name}</h3>
                          <p className="text-gray-600 mb-2">{paper.description}</p>
                          <div className="flex gap-4 text-sm">
                            <span className="text-gray-600">Duration: {paper.duration} minutes</span>
                            <span className="text-gray-600">Total Marks: {paper.totalMarks}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Instructions</h2>
            <ol className="list-decimal list-inside space-y-2 text-gray-600">
              <li>Select a subject to begin the exam.</li>
              <li>Choose the paper(s) you want to attempt.</li>
              <li>Follow all instructions carefully.</li>
              <li>Answer all questions.</li>
              {selectedSubject === 'mathematics' && (
                <>
                  <li>Paper 1: Calculators are <span className="underline font-semibold">NOT</span> allowed.</li>
                  <li>Paper 2: Calculators are allowed.</li>
                  {selectedPaper === 'both' && (
                    <li>You will automatically proceed to Paper 2 after completing Paper 1.</li>
                  )}
                </>
              )}
            </ol>
          </div>
        </div>

        {/* Debug Panel */}
        <div className="fixed bottom-4 right-4 z-50">
          <button className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded-md text-sm font-medium">
            Debug Panel
          </button>
        </div>
      </div>
    );
  }

  return (
    <MockExamComponent 
      userId={userId} 
      examDurationMinutes={selectedPaper === 'both' ? 0.5 : getCurrentSubject()?.papers.find(p => p.id === selectedPaper)?.duration || 0.5}
      subjectId={selectedSubject || ''}
      paperId={selectedPaper || ''}
      isBothPapers={selectedPaper === 'both'}
    />
  );
} 