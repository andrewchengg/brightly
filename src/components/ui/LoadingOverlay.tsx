import React from "react";
import { CuteLoader, StudyLoader } from "./CuteLoader";

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
  variant?: "dots" | "study" | "pulse";
  backdrop?: "blur" | "dark" | "light";
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isVisible,
  message = "Loading...",
  variant = "study",
  backdrop = "blur",
}) => {
  if (!isVisible) return null;

  const backdropClasses = {
    blur: "bg-white/80 backdrop-blur-sm",
    dark: "bg-black/50",
    light: "bg-white/90",
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${backdropClasses[backdrop]} transition-all duration-300`}
    >
      <div className="bg-white rounded-2xl shadow-2xl p-8 mx-4 max-w-sm w-full text-center border border-gray-100">
        {variant === "study" && <StudyLoader text={message} />}
        {variant === "dots" && <CuteLoader variant="dots" text={message} />}
        {variant === "pulse" && <CuteLoader variant="pulse" text={message} />}
      </div>
    </div>
  );
};

export default LoadingOverlay;
