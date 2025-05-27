// src/app/(dashboard)/parent/child/[childId]/page.tsx
"use client";

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label'; 
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { toast } from 'react-toastify';
import { Subject, Topic, Student, Parent, PracticeSessionType as PrismaPracticeSessionType } from '@/generated/prisma';
import { createClient } from '@/lib/supabase/client'; 
import { FaArrowLeft, FaSpinner } from 'react-icons/fa';

interface SubjectWithTopics extends Subject {
    topics: Topic[];
}

enum AssignablePracticeType {
    TOPIC_QUIZ = "Topic Quiz",
    RANDOM_SUBJECT_PRACTICE = "Random Practice by Subject",
    MOCK_EXAM_PAPER = "Mock Exam Paper"
}

const mockExamPapersConfig: Record<string, Array<{id: string; name: string; duration: number; totalQuestions: number }>> = {
    mathematics: [
        { id: "paper1", name: "Paper 1 (Math)", duration: 60, totalQuestions: 30 },
        { id: "paper2", name: "Paper 2 (Math)", duration: 90, totalQuestions: 17 },
    ],
};

const DEFAULT_PRACTICE_QUESTIONS = 10;

export default function ParentAssignPracticePage() {
    const router = useRouter();
    const params = useParams();
    const childId = params.childId as string;

    const [child, setChild] = useState<Student | null>(null);
    const [parentInfo, setParentInfo] = useState<Parent | null>(null); // Renamed to avoid conflict with Parent type from Prisma
    const [subjectsWithTopics, setSubjectsWithTopics] = useState<SubjectWithTopics[]>([]);
    
    const [assignmentTitle, setAssignmentTitle] = useState("");
    const [selectedPracticeType, setSelectedPracticeType] = useState<AssignablePracticeType | "">("");
    
    const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
    const [selectedTopicId, setSelectedTopicId] = useState<string>("");
    const [selectedMockPaperId, setSelectedMockPaperId] = useState<string>("");
    
    const [isAssigning, setIsAssigning] = useState(false);
    const [loadingPage, setLoadingPage] = useState(true);
    const supabase = createClient();

    const resetFormFields = () => {
        setAssignmentTitle("");
        setSelectedSubjectId("");
        setSelectedTopicId("");
        setSelectedMockPaperId("");
        // Optionally reset selectedPracticeType if desired
        // setSelectedPracticeType(""); 
    };

    useEffect(() => {
        async function fetchData() {
            setLoadingPage(true);
            try {
                const { data: { user: parentAuthUser } } = await supabase.auth.getUser();
                if (!parentAuthUser) {
                    toast.error("Parent session not found.");
                    router.push('/sign-in');
                    return;
                }
                const { data: parentDbData } = await supabase.from("Parent").select("id, name").eq("id", parentAuthUser.id).single();
                setParentInfo(parentDbData as Parent);


                const { data: childData, error: childError } = await supabase
                    .from('Student')
                    .select('id, name, username, parentId') 
                    .eq('id', childId)
                    .single();
                
                if (childError || !childData) {
                    toast.error("Child not found.");
                    router.push('/parent/children'); 
                    return;
                }
                if (childData.parentId !== parentAuthUser.id) {
                    toast.error("Access denied to this child's details.");
                    router.push('/parent/children');
                    return;
                }
                setChild(childData as Student);

                const subjectsRes = await fetch('/api/subjects'); 
                if (!subjectsRes.ok) throw new Error('Failed to fetch subjects');
                const subjectsData = await subjectsRes.json();
                setSubjectsWithTopics(subjectsData);

            } catch (error: any) {
                toast.error(error.message || "Failed to load page data.");
                console.error("Error in ParentAssignPracticePage fetchData:", error);
            } finally {
                setLoadingPage(false);
            }
        }
        if (childId) {
            fetchData();
        }
    }, [childId, router, supabase]);

    const handleAssignPractice = async () => {
        if (!parentInfo || !child || !selectedPracticeType || !assignmentTitle.trim()) {
            toast.warn("Please fill in assignment title and select a practice type.");
            return;
        }
        
        let practiceDataPayload: any = {
            studentId: child.id,
            parentId: parentInfo.id, // Use parentInfo.id
            title: assignmentTitle,
        };

        let numQuestionsForApi = DEFAULT_PRACTICE_QUESTIONS;

        switch (selectedPracticeType) {
            case AssignablePracticeType.TOPIC_QUIZ:
                if (!selectedSubjectId || !selectedTopicId) {
                    toast.warn("Please select a subject and topic for the quiz.");
                    return;
                }
                practiceDataPayload = {
                    ...practiceDataPayload,
                    type: PrismaPracticeSessionType.TOPIC_QUIZ,
                    subjectId: parseInt(selectedSubjectId),
                    topicId: parseInt(selectedTopicId),
                    totalQuestions: numQuestionsForApi,
                };
                break;
            case AssignablePracticeType.RANDOM_SUBJECT_PRACTICE:
                if (!selectedSubjectId) {
                    toast.warn("Please select a subject for random practice.");
                    return;
                }
                practiceDataPayload = {
                    ...practiceDataPayload,
                    type: PrismaPracticeSessionType.PRACTICE, 
                    subjectId: parseInt(selectedSubjectId),
                    totalQuestions: numQuestionsForApi,
                };
                break;
            case AssignablePracticeType.MOCK_EXAM_PAPER:
                if (!selectedSubjectId || !selectedMockPaperId) {
                    toast.warn("Please select a subject and a mock exam paper.");
                    return;
                }
                
                const selectedSubjectName = subjectsWithTopics.find(s => s.id.toString() === selectedSubjectId)?.name.toLowerCase();
                // @ts-ignore
                const subjectPapers = selectedSubjectName ? mockExamPapersConfig[selectedSubjectName] : undefined;
                const paperConfig = subjectPapers?.find((p:any) => p.id === selectedMockPaperId);

                if (!paperConfig) {
                    toast.warn("Selected mock exam paper configuration not found.");
                    return;
                }
                practiceDataPayload = {
                    ...practiceDataPayload,
                    type: PrismaPracticeSessionType.MOCK_EXAM,
                    subjectId: parseInt(selectedSubjectId),
                    totalQuestions: paperConfig.totalQuestions, 
                    examDurationMinutes: paperConfig.duration,  
                    title: `${assignmentTitle} - ${paperConfig.name}`, 
                };
                break;
            default:
                toast.error("Invalid practice type selected.");
                return;
        }

        setIsAssigning(true);
        try {
            const response = await fetch('/api/parent/assign-practice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(practiceDataPayload),
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || "Failed to assign practice.");
            }
            toast.success(`"${practiceDataPayload.title}" assigned to ${child.name}!`);
            resetFormFields();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsAssigning(false);
        }
    };

    const currentSelectedSubjectForTopics = subjectsWithTopics.find(s => s.id.toString() === selectedSubjectId);
    const selectedSubjectNameForMock = subjectsWithTopics.find(s => s.id.toString() === selectedSubjectId)?.name.toLowerCase();
    // @ts-ignore
    const availableMockPapers = selectedSubjectNameForMock ? mockExamPapersConfig[selectedSubjectNameForMock] || [] : [];


    if (loadingPage) return <div className="flex justify-center items-center h-screen"><FaSpinner className="animate-spin text-4xl text-indigo-600"/></div>;
    if (!child || !parentInfo) return <div className="text-center p-8">Child or parent data could not be loaded.</div>;

    return (
        <div className="max-w-2xl mx-auto p-4 md:p-8">
            <Button variant="outline" onClick={() => router.push('/parent/children')} className="mb-6 flex items-center">
                <FaArrowLeft className="mr-2 h-4 w-4" /> Back to My Children
            </Button>
            <Card className="shadow-xl">
                <CardHeader className="bg-gray-50 border-b">
                    <CardTitle className="text-xl md:text-2xl text-gray-800">Assign Practice to {child.name}</CardTitle>
                    <CardDescription>Create and assign a new practice session or mock exam.</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    <div>
                        <Label htmlFor="assignmentTitle" className="font-medium text-gray-700">Assignment Title *</Label>
                        <Input 
                            id="assignmentTitle" 
                            value={assignmentTitle} 
                            onChange={(e) => setAssignmentTitle(e.target.value)}
                            placeholder={`e.g., ${child.name}'s Weekend Revision`}
                            className="mt-1"
                        />
                    </div>

                    <div>
                        <Label htmlFor="practiceTypeSelect" className="font-medium text-gray-700">Practice Type *</Label>
                        <Select value={selectedPracticeType} onValueChange={(value) => {
                            setSelectedPracticeType(value as AssignablePracticeType);
                            setSelectedSubjectId(""); setSelectedTopicId(""); setSelectedMockPaperId("");
                        }}>
                            <SelectTrigger id="practiceTypeSelect" className="mt-1"><SelectValue placeholder="Select Practice Type" /></SelectTrigger>
                            <SelectContent>
                                {Object.values(AssignablePracticeType).map(type => (
                                    <SelectItem key={type} value={type}>{type}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedPracticeType && ( // Only show subject if a practice type is selected
                         <div>
                            <Label htmlFor="subjectSelect" className="font-medium text-gray-700">Subject *</Label>
                            <Select value={selectedSubjectId} onValueChange={(value) => {setSelectedSubjectId(value); setSelectedTopicId(""); setSelectedMockPaperId("");}}>
                                <SelectTrigger id="subjectSelect" className="mt-1"><SelectValue placeholder="Select Subject" /></SelectTrigger>
                                <SelectContent>
                                    {subjectsWithTopics.map(subject => (
                                        <SelectItem key={subject.id} value={subject.id.toString()}>{subject.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {selectedPracticeType === AssignablePracticeType.TOPIC_QUIZ && selectedSubjectId && currentSelectedSubjectForTopics && (
                        <>
                            <div>
                                <Label htmlFor="topicSelect" className="font-medium text-gray-700">Topic *</Label>
                                <Select value={selectedTopicId} onValueChange={setSelectedTopicId}>
                                    <SelectTrigger id="topicSelect" className="mt-1"><SelectValue placeholder="Select Topic" /></SelectTrigger>
                                    <SelectContent>
                                        {currentSelectedSubjectForTopics.topics.map(topic => (
                                            <SelectItem key={topic.id} value={topic.id.toString()}>{topic.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <p className="text-sm text-gray-600 mt-2">Number of questions: {DEFAULT_PRACTICE_QUESTIONS}</p>
                        </>
                    )}

                    {selectedPracticeType === AssignablePracticeType.RANDOM_SUBJECT_PRACTICE && selectedSubjectId && (
                         <p className="text-sm text-gray-600 mt-2">Number of questions: {DEFAULT_PRACTICE_QUESTIONS}</p>
                    )}

                    {selectedPracticeType === AssignablePracticeType.MOCK_EXAM_PAPER && selectedSubjectId && (
                        <div>
                            <Label htmlFor="mockPaperSelect" className="font-medium text-gray-700">Mock Exam Paper *</Label>
                            <Select value={selectedMockPaperId} onValueChange={setSelectedMockPaperId}>
                                <SelectTrigger id="mockPaperSelect" className="mt-1" disabled={availableMockPapers.length === 0}>
                                    <SelectValue placeholder={availableMockPapers.length === 0 ? "No papers for this subject" : "Select Paper"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableMockPapers.map((paper:any) => ( 
                                        <SelectItem key={paper.id} value={paper.id}>{paper.name} ({paper.duration} mins, {paper.totalQuestions} Qs)</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {availableMockPapers.length === 0 && <p className="text-xs text-red-500 mt-1">No mock exam papers configured for this subject yet.</p>}
                        </div>
                    )}
                </CardContent>
                <CardFooter>
                    <Button 
                        onClick={handleAssignPractice} 
                        disabled={
                            isAssigning || 
                            !selectedPracticeType || // Must select a practice type
                            !assignmentTitle.trim() || // Must have a title
                            (selectedPracticeType && !selectedSubjectId) || // If type selected, subject must be selected
                            (selectedPracticeType === AssignablePracticeType.TOPIC_QUIZ && !selectedTopicId) ||
                            (selectedPracticeType === AssignablePracticeType.MOCK_EXAM_PAPER && !selectedMockPaperId)
                        } 
                        className="w-full md:w-auto"
                    >
                        {isAssigning ? <FaSpinner className="animate-spin mr-2"/> : null}
                        Assign to {child.name}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}