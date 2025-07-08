// src/app/(dashboard)/student/mock-exam/loading.tsx
import { InteractiveLoadingAnimation } from "@/components/ui/InteractiveLoadingAnimation";

export default function MockExamLoading() {
  return (
    <InteractiveLoadingAnimation 
      title="Preparing Your Mock Exam"
      subtitle="Setting up your exam environment..."
      theme="study"
    />
  );
} 