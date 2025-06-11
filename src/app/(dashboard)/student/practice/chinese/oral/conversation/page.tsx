// src/app/(dashboard)/student/practice/chinese/oral/conversation/page.tsx
"use client";

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { FaMicrophone, FaStop, FaPaperPlane, FaArrowLeft, FaImage, FaSpinner, FaCommentDots, FaMicrophoneAlt } from 'react-icons/fa';
import { toast } from 'react-toastify';

const MOCK_ORAL_PROMPT = {
  id: "oral_conv_1",
  type: "picture" as "picture" | "video" | "passage",
  title: "公园里的一天 (A Day in the Park)",
  imageUrl: "/images/sample-oral-park-scene.jpg", 
  videoUrl: null,
  promptDetails: "A sunny day in a busy park. Children are playing, adults are relaxing. There's an ice cream cart.", // Example description
  guidingQuestions: [
    "图片里有什么？(What is in the picture?)",
    "你看到了什么天气？(What kind of weather do you see?)",
    "人们在做什么？(What are the people doing?)",
    "如果你在公园里，你会做什么？(If you were in the park, what would you do?)"
  ]
};

interface AnalysisFeedback {
    comprehensionAndResponse?: string;
    vocabularyAndStructure?: string;
    fluencyAndCoherence?: string;
    pronunciationAndIntonation?: string;
}

export default function OralConversationPracticePage() {
  const router = useRouter();
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [isLoadingTranscription, setIsLoadingTranscription] = useState(false);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [analysisFeedback, setAnalysisFeedback] = useState<AnalysisFeedback | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    return () => { if (audioUrl) URL.revokeObjectURL(audioUrl); };
  }, [audioUrl]);

  const startRecording = async () => {
    // ... (startRecording logic remains the same)
    setError(null);
    setTranscription(null);
    setAudioBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setAnalysisFeedback(null); // Reset feedback

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' }); // Specify mimeType
        audioChunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (event) => {
          audioChunksRef.current.push(event.data);
        };

        mediaRecorderRef.current.onstop = () => {
          const completeBlob = new Blob(audioChunksRef.current, { type: mediaRecorderRef.current?.mimeType || 'audio/webm' });
          setAudioBlob(completeBlob);
          setAudioUrl(URL.createObjectURL(completeBlob));
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorderRef.current.start();
        setIsRecording(true);
        toast.info("Recording started...");
      } catch (err) {
        console.error("Error accessing microphone:", err);
        setError("Could not access microphone. Please check permissions.");
        toast.error("Microphone access denied or not found.");
      }
    } else {
      setError("Audio recording is not supported by your browser.");
      toast.error("Audio recording not supported.");
    }
  };

  const stopRecording = () => {
    // ... (stopRecording logic remains the same)
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast.info("Recording stopped.");
    }
  };

  const handleSendForTranscriptionAndAnalysis = async () => {
    if (!audioBlob) {
      toast.error("No audio recorded.");
      return;
    }
    setIsLoadingTranscription(true);
    setTranscription(null);
    setError(null);
    setAnalysisFeedback(null);

    // 1. Get Transcription
    let currentTranscription = "";
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "oral_recording.webm");

      const transResponse = await fetch('/api/transcribe-audio', { 
        method: 'POST',
        body: formData, 
      });

      if (!transResponse.ok) {
        const errData = await transResponse.json().catch(() => ({ error: "Transcription request failed."}));
        throw new Error(errData.error || `Transcription failed: ${transResponse.status}`);
      }
      const transResult = await transResponse.json();
      if (transResult.transcription) {
        currentTranscription = transResult.transcription;
        setTranscription(currentTranscription);
        toast.success("Transcription received!");
      } else {
        throw new Error(transResult.error || "Transcription result was empty.");
      }
    } catch (err: any) {
      console.error("Error during transcription phase:", err);
      setError(`Transcription Error: ${err.message}`);
      toast.error(`Transcription Error: ${err.message}`);
      setIsLoadingTranscription(false);
      return; // Stop if transcription fails
    } finally {
      setIsLoadingTranscription(false);
    }

    // 2. Get Analysis (if transcription was successful)
    if (currentTranscription) {
      setIsLoadingAnalysis(true);
      try {
        const analysisResponse = await fetch('/api/analyze-oral-response', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transcription: currentTranscription,
            promptTitle: MOCK_ORAL_PROMPT.title,
            promptType: MOCK_ORAL_PROMPT.type,
            promptDetails: MOCK_ORAL_PROMPT.promptDetails,
            guidingQuestions: MOCK_ORAL_PROMPT.guidingQuestions,
          }),
        });
        if (!analysisResponse.ok) {
            const errData = await analysisResponse.json().catch(() => ({error: "Analysis request failed."}));
            throw new Error(errData.error || `Analysis failed: ${analysisResponse.status}`);
        }
        const analysisResult = await analysisResponse.json();
        setAnalysisFeedback(analysisResult.feedback);
        toast.success("Analysis complete!");
      } catch (err: any) {
        console.error("Error during analysis phase:", err);
        setError(`Analysis Error: ${err.message}`);
        toast.error(`Analysis Error: ${err.message}`);
      } finally {
        setIsLoadingAnalysis(false);
      }
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8">
      <Button variant="outline" onClick={() => router.back()} className="mb-6">
        <FaArrowLeft className="mr-2" /> Back to Chinese Practice
      </Button>

      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-red-500 to-orange-500 text-white p-6">
          {/* ... CardHeader content (same as before) ... */}
          <div className="flex items-center gap-3">
            <FaMicrophoneAlt className="w-8 h-8" />
            <div>
              <CardTitle className="text-2xl">Oral Practice: {MOCK_ORAL_PROMPT.title}</CardTitle>
              <CardDescription className="text-orange-100">
                {MOCK_ORAL_PROMPT.type === "picture" ? "Describe the picture and answer questions." : "Watch the video and answer questions."}
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Prompt Display Area (same as before) ... */}
          <div>
            <h3 className="font-semibold text-lg mb-2 text-gray-700">Prompt:</h3>
            {MOCK_ORAL_PROMPT.imageUrl && (
              <div className="mb-4 border rounded-lg overflow-hidden shadow-sm">
                <img src={MOCK_ORAL_PROMPT.imageUrl} alt={MOCK_ORAL_PROMPT.title} className="w-full h-auto max-h-[400px] object-contain bg-gray-100" />
              </div>
            )}
            {MOCK_ORAL_PROMPT.guidingQuestions && MOCK_ORAL_PROMPT.guidingQuestions.length > 0 && (
              <div className="bg-gray-50 p-4 rounded-md">
                <h4 className="font-medium text-sm text-gray-600 mb-2">Guiding Questions:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                  {MOCK_ORAL_PROMPT.guidingQuestions.map((q, i) => <li key={i}>{q}</li>)}
                </ul>
              </div>
            )}
          </div>

          {/* Recording Controls (same as before) ... */}
           <div className="text-center space-y-4 py-6 border-t border-b">
            {!isRecording ? (
              <Button onClick={startRecording} size="lg" className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 text-base">
                <FaMicrophone className="mr-2" /> Start Recording
              </Button>
            ) : (
              <Button onClick={stopRecording} size="lg" variant="destructive" className="px-8 py-3 text-base">
                <FaStop className="mr-2" /> Stop Recording
              </Button>
            )}
            {error && !isLoadingTranscription && !isLoadingAnalysis && <p className="text-sm text-red-500 mt-2">{error}</p>}
          </div>


          {audioUrl && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg mb-2 text-gray-700">Your Recording:</h3>
                <audio controls src={audioUrl} className="w-full">
                  Your browser does not support the audio element.
                </audio>
              </div>
              <Button 
                onClick={handleSendForTranscriptionAndAnalysis} 
                disabled={isLoadingTranscription || isLoadingAnalysis || !audioBlob}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {(isLoadingTranscription || isLoadingAnalysis) ? <FaSpinner className="animate-spin mr-2" /> : <FaCommentDots className="mr-2" />}
                {(isLoadingTranscription) ? "Transcribing..." : (isLoadingAnalysis) ? "Analyzing..." : "Get Transcription & Analysis"}
              </Button>
            </div>
          )}

          {transcription && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <h3 className="font-semibold text-lg mb-2 text-blue-700">Transcription:</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{transcription}</p>
            </div>
          )}
          
          {isLoadingAnalysis && (
            <div className="mt-4 p-4 text-center text-gray-600">
                <FaSpinner className="animate-spin text-2xl text-indigo-500 mx-auto mb-2"/>
                Analyzing your response...
            </div>
          )}

          {analysisFeedback && !isLoadingAnalysis && (
             <div className="mt-6 space-y-4">
                <h3 className="text-xl font-bold text-purple-700 border-b pb-2">Feedback Report</h3>
                {analysisFeedback.comprehensionAndResponse && (
                    <FeedbackSection title="Comprehension & Response" content={analysisFeedback.comprehensionAndResponse} />
                )}
                {analysisFeedback.vocabularyAndStructure && (
                    <FeedbackSection title="Vocabulary & Sentence Structures" content={analysisFeedback.vocabularyAndStructure} />
                )}
                 {analysisFeedback.fluencyAndCoherence && (
                    <FeedbackSection title="Fluency & Coherence (from text)" content={analysisFeedback.fluencyAndCoherence} />
                )}
                {analysisFeedback.pronunciationAndIntonation && (
                    <FeedbackSection title="Pronunciation & Intonation" content={analysisFeedback.pronunciationAndIntonation} />
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
    <div className="p-4 bg-purple-50 border border-purple-200 rounded-md">
        <h4 className="font-semibold text-md mb-1 text-purple-800">{title}:</h4>
        <div className="text-sm text-gray-700 whitespace-pre-wrap space-y-1">
            {content.split('\n').map((line, index) => {
                if (line.match(/^(Comprehension:|Relevance:|Appropriateness:|Vocabulary:|Sentence Structures:|Fluency \(Text-based\):|Coherence:)/i)) {
                    return <strong key={index} className="block mt-1">{line}</strong>;
                }
                return <p key={index}>{line}</p>;
            })}
        </div>
    </div>
);
