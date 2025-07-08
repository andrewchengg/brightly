// src/app/(dashboard)/student/practice/chinese/oral/reading/[passageId]/page.tsx
"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { FaArrowLeft, FaBookOpen, FaSpinner, FaMicrophone, FaStop, FaPaperPlane, FaCommentDots, FaClock, FaGraduationCap, FaExclamationTriangle, FaPlay, FaInfoCircle } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { OralPromptType, DifficultyLevel } from '@/generated/prisma';

interface OralPromptClient {
  id: number;
  title: string;
  description?: string | null;
  passageText?: string | null;
  difficulty?: DifficultyLevel | null;
  estimatedTimeSeconds?: number | null;
  keywords: string[];
  studentInstructions?: string | null;
  subject?: { id: number; name: string };
  topic?: { id: number; name: string } | null;
}

interface AnalysisFeedback {
  comprehensionAndResponse?: string;
  vocabularyAndStructure?: string;
  fluencyAndCoherence?: string;
  pronunciationAndIntonation?: string;
}

const difficultyColors = {
  [DifficultyLevel.EASY]: "bg-green-100 text-green-800",
  [DifficultyLevel.MEDIUM]: "bg-yellow-100 text-yellow-800", 
  [DifficultyLevel.HARD]: "bg-red-100 text-red-800",
  [DifficultyLevel.VERY_HARD]: "bg-purple-100 text-purple-800"
};

const PSLE_ORAL_READING_INSTRUCTIONS = [
    "你将有约1分钟的时间默读短文。",
    "请你清楚、流利、有感情地朗读短文。",
    "注意正确的读音、语调和停顿。",
    "朗读时，声音要响亮。",
    "考试时，请保持冷静。",
    "点击“开始练习”按钮后，录音将自动开始。"
];

export default function PassagePracticePage() {
  const router = useRouter();
  const params = useParams();
  const passageId = params.passageId as string;

  const [passage, setPassage] = useState<OralPromptClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewState, setViewState] = useState<'instructions' | 'practice' | 'feedback'>('instructions');
  
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [isLoadingTranscription, setIsLoadingTranscription] = useState(false);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [analysisFeedback, setAnalysisFeedback] = useState<AnalysisFeedback | null>(null);
  const [recordingError, setRecordingError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const fetchPassage = async () => {
      if (!passageId) return;
      
      setLoading(true);
      setError(null);
      try {
        // Fetch ALL prompts first, then filter. This is inefficient if you have many.
        // Ideally, your API would support fetching a single prompt by ID.
        // For now, using the existing GET all and filtering.
        const response = await fetch(`/api/oral-prompts?subjectId=4&promptType=PASSAGE_READING&productionReady=true`);
        
        if (!response.ok) {
          const errData = await response.json().catch(() => ({error: "Server error"}));
          throw new Error(`Failed to fetch passage: ${response.status} - ${errData.error || "Unknown error"}`);
        }
        
        const data: { oralPrompts: OralPromptClient[] } = await response.json();
        const foundPassage = data.oralPrompts.find((p: OralPromptClient) => p.id === parseInt(passageId, 10));
        
        if (!foundPassage) {
          throw new Error("Passage not found");
        }
        setPassage(foundPassage);
      } catch (err: any) {
        console.error("Error fetching passage:", err);
        setError(err.message || "Failed to load passage");
      } finally {
        setLoading(false);
      }
    };

    fetchPassage();
  }, [passageId]);

  useEffect(() => {
    return () => { 
      if (audioUrl) URL.revokeObjectURL(audioUrl); 
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    };
  }, [audioUrl]);

  const startRecording = async () => {
    setRecordingError(null);
    setTranscription(null);
    setAudioBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setAnalysisFeedback(null);

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        audioChunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (event) => {
          audioChunksRef.current.push(event.data);
        };

        mediaRecorderRef.current.onstop = () => {
          const completeBlob = new Blob(audioChunksRef.current, { type: mediaRecorderRef.current?.mimeType || 'audio/webm' });
          setAudioBlob(completeBlob);
          setAudioUrl(URL.createObjectURL(completeBlob));
          stream.getTracks().forEach(track => track.stop()); // Stop microphone access
        };

        mediaRecorderRef.current.start();
        setIsRecording(true);
        toast.info("录音开始 (Recording started)...");
      } catch (err) {
        console.error("Error accessing microphone:", err);
        setRecordingError("无法使用麦克风，请检查权限。(Could not access microphone. Please check permissions.)");
        toast.error("麦克风权限被拒绝或未找到。(Microphone access denied or not found.)");
      }
    } else {
      setRecordingError("您的浏览器不支持录音功能。(Audio recording is not supported by your browser.)");
      toast.error("不支持录音。(Audio recording not supported.)");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast.info("录音结束 (Recording stopped).");
    }
  };

  const handleStartPractice = () => {
    setViewState('practice');
    startRecording(); // Automatically start recording when practice view is shown
  };
  
  const handleFinishReading = () => {
    stopRecording();
    setViewState('feedback'); // Move to feedback view to show audio player and submit button
  };

  const handleSendForTranscriptionAndAnalysis = async () => {
    if (!audioBlob || !passage) {
      toast.error("没有录音或文章未加载。(No audio recorded or passage not loaded.)");
      return;
    }
    
    setIsLoadingTranscription(true);
    setTranscription(null);
    setRecordingError(null);
    setAnalysisFeedback(null);

    let currentTranscription = "";
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "oral_reading.webm");

      const transResponse = await fetch('/api/transcribe-audio', { 
        method: 'POST',
        body: formData, 
      });

      if (!transResponse.ok) {
        const errData = await transResponse.json().catch(() => ({ error: "Transcription request failed."}));
        throw new Error(errData.error || `转录失败 (Transcription failed): ${transResponse.status}`);
      }
      const transResult = await transResponse.json();
      if (transResult.transcription) {
        currentTranscription = transResult.transcription;
        setTranscription(currentTranscription);
        toast.success("转录完成！(Transcription received!)");
      } else {
        throw new Error(transResult.error || "转录结果为空。(Transcription result was empty.)");
      }
    } catch (err: any) {
      console.error("Error during transcription phase:", err);
      setRecordingError(`转录错误 (Transcription Error): ${err.message}`);
      toast.error(`转录错误 (Transcription Error): ${err.message}`);
      setIsLoadingTranscription(false);
      return;
    } finally {
      setIsLoadingTranscription(false);
    }

    if (currentTranscription) {
      setIsLoadingAnalysis(true);
      try {
        const analysisResponse = await fetch('/api/analyze-oral-response', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transcription: currentTranscription,
            promptTitle: passage.title,
            promptType: "passage", // Explicitly set for passage reading
            promptDetails: passage.passageText || "", // Send passage text as details
            originalPassageText: passage.passageText || "", // For comparison
          }),
        });
        if (!analysisResponse.ok) {
            const errData = await analysisResponse.json().catch(() => ({error: "Analysis request failed."}));
            throw new Error(errData.error || `分析失败 (Analysis failed): ${analysisResponse.status}`);
        }
        const analysisResult = await analysisResponse.json();
        setAnalysisFeedback(analysisResult.feedback);
        toast.success("分析完成！(Analysis complete!)");
      } catch (err: any) {
        console.error("Error during analysis phase:", err);
        setRecordingError(`分析错误 (Analysis Error): ${err.message}`);
        toast.error(`分析错误 (Analysis Error): ${err.message}`);
      } finally {
        setIsLoadingAnalysis(false);
      }
    }
  };

  const resetPractice = () => {
    setIsRecording(false);
    setAudioBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setTranscription(null);
    setAnalysisFeedback(null);
    setRecordingError(null);
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current = null;
    }
    setViewState('instructions'); // Go back to instructions
  };

  const formatTime = (seconds?: number | null) => {
    if (seconds === null || seconds === undefined) return "N/A";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (loading) { /* ... loading state ... */ }
  if (error || !passage) { /* ... error state ... */ }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <Button variant="outline" onClick={() => router.push('/student/practice/chinese/oral/reading')} className="mb-6">
        <FaArrowLeft className="mr-2" /> Back to Passages List
      </Button>

      <Card className="shadow-xl">
        <CardHeader className="bg-gradient-to-r from-red-500 to-orange-500 text-white p-6">
          <div className="flex items-center gap-3 mb-2">
            <FaBookOpen className="w-8 h-8" />
            <div className="flex-1">
              <CardTitle className="text-2xl md:text-3xl">{passage?.title}</CardTitle>
              <CardDescription className="text-orange-100 mt-1">朗读短文练习</CardDescription>
            </div>
            {passage?.difficulty && (
              <span className={`px-3 py-1 rounded-full text-sm font-medium bg-white/20 text-white`}>
                <FaGraduationCap className="inline mr-1" />
                {passage.difficulty}
              </span>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {viewState === 'instructions' && (
            <div className="bg-purple-100 border-l-4 border-purple-800 p-6 rounded-md">
              <h2 className="text-xl font-semibold text-purple-800 mb-4 flex items-center">
                <FaInfoCircle className="mr-2" /> 考试指示 (Instructions)
              </h2>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                {PSLE_ORAL_READING_INSTRUCTIONS.map((instr, index) => (
                  <li key={index}>{instr}</li>
                ))}
              </ul>
              <Button onClick={handleStartPractice} size="lg" className="mt-8 w-full bg-green-500 hover:bg-green-600">
                <FaPlay className="mr-2" /> 开始练习 (Start Practice)
              </Button>
            </div>
          )}

          {viewState === 'practice' && passage && (
            <div>
              <h3 className="font-semibold text-lg mb-3 text-gray-700">请朗读以下短文 (Please read the passage below):</h3>
              {isRecording && (
                <div className="mb-4 p-2 bg-red-100 text-red-700 rounded-md text-sm flex items-center justify-center">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse mr-2"></div>
                  正在录音 (Recording...)
                </div>
              )}
              <div className="bg-gray-50 p-4 rounded-lg border max-h-[60vh] overflow-y-auto">
                <p className="text-gray-800 leading-relaxed whitespace-pre-wrap text-lg">
                  {passage.passageText || "No passage text available."}
                </p>
              </div>
              <Button onClick={handleFinishReading} size="lg" className="mt-6 w-full bg-red-600 hover:bg-red-700">
                <FaStop className="mr-2" /> 完成朗读 (Finish Reading)
              </Button>
            </div>
          )}

          {viewState === 'feedback' && (
            <div className="space-y-6">
              {audioUrl && (
                <div>
                  <h3 className="font-semibold text-lg mb-2 text-gray-700">你的录音 (Your Recording):</h3>
                  <audio controls src={audioUrl} className="w-full">
                    Your browser does not support the audio element.
                  </audio>
                </div>
              )}
              
              {recordingError && <p className="text-sm text-red-500">{recordingError}</p>}

              <div className="flex gap-3">
                <Button 
                  onClick={handleSendForTranscriptionAndAnalysis} 
                  disabled={isLoadingTranscription || isLoadingAnalysis || !audioBlob}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {(isLoadingTranscription || isLoadingAnalysis) ? (
                    <FaSpinner className="animate-spin mr-2" />
                  ) : (
                    <FaCommentDots className="mr-2" />
                  )}
                  {(isLoadingTranscription) ? "正在转录 (Transcribing...)" : (isLoadingAnalysis) ? "正在分析 (Analyzing...)" : "获取反馈 (Get Feedback)"}
                </Button>
                <Button 
                  onClick={resetPractice} 
                  variant="outline"
                  disabled={isLoadingTranscription || isLoadingAnalysis}
                >
                  <FaPlay className="mr-2" /> 再试一次 (Try Again)
                </Button>
              </div>

              {transcription && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <h3 className="font-semibold text-lg mb-2 text-blue-700">我们听到的 (What We Heard):</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{transcription}</p>
                </div>
              )}
              
              {isLoadingAnalysis && (
                <div className="p-4 text-center text-gray-600">
                    <FaSpinner className="animate-spin text-2xl text-indigo-500 mx-auto mb-2"/>
                    正在分析您的朗读 (Analyzing your reading)...
                </div>
              )}

              {analysisFeedback && (
                 <div className="space-y-4">
                    <h3 className="text-xl font-bold text-purple-800 border-b pb-2">反馈报告 (Feedback Report)</h3>
                    {analysisFeedback.comprehensionAndResponse && (
                        <FeedbackSection title="朗读准确性 (Reading Accuracy)" content={analysisFeedback.comprehensionAndResponse} />
                    )}
                    {analysisFeedback.vocabularyAndStructure && (
                        <FeedbackSection title="词汇与发音 (Vocabulary & Pronunciation)" content={analysisFeedback.vocabularyAndStructure} />
                    )}
                     {analysisFeedback.fluencyAndCoherence && (
                        <FeedbackSection title="流利度与连贯性 (Fluency & Coherence)" content={analysisFeedback.fluencyAndCoherence} />
                    )}
                    {analysisFeedback.pronunciationAndIntonation && (
                        <FeedbackSection title="语音语调 (Pronunciation & Intonation)" content={analysisFeedback.pronunciationAndIntonation} />
                    )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface FeedbackSectionProps {
  title: string;
  content: string;
}

const FeedbackSection: React.FC<FeedbackSectionProps> = ({ title, content }) => (
  <div className="p-4 bg-purple-100 border border-purple-200 rounded-md">
      <h4 className="font-semibold text-md mb-1 text-purple-800">{title}:</h4>
      <div className="text-sm text-gray-700 whitespace-pre-wrap space-y-1">
          {content.split('\n').map((line, index) => {
              if (line.match(/^(Accuracy:|Pronunciation:|Fluency:|Intonation:|Vocabulary:|Areas for improvement:|Strengths:|Overall:|Comprehension:|Relevance:|Appropriateness:)/i)) {
                  return <strong key={index} className="block mt-1">{line}</strong>;
              }
              return <p key={index}>{line}</p>;
          })}
      </div>
  </div>
); 