import React from "react";

interface CuteLoaderProps {
  text?: string;
  size?: "sm" | "md" | "lg";
  variant?: "dots" | "pulse" | "bounce";
  className?: string;
}

export const CuteLoader: React.FC<CuteLoaderProps> = ({
  text = "Loading...",
  size = "md",
  variant = "dots",
  className = "",
}) => {
  const sizeClasses = {
    sm: "w-2 h-2",
    md: "w-3 h-3",
    lg: "w-4 h-4",
  };

  const containerSizeClasses = {
    sm: "gap-1",
    md: "gap-1.5",
    lg: "gap-2",
  };

  if (variant === "dots") {
    return (
      <div className={`flex flex-col items-center justify-center ${className}`}>
        <div className={`flex items-center ${containerSizeClasses[size]} mb-3`}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`${sizeClasses[size]} bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-bounce`}
              style={{
                animationDelay: `${i * 0.1}s`,
                animationDuration: "0.6s",
              }}
            />
          ))}
        </div>
        {text && <p className="text-sm text-gray-600 animate-pulse">{text}</p>}
      </div>
    );
  }

  if (variant === "pulse") {
    return (
      <div className={`flex flex-col items-center justify-center ${className}`}>
        <div className="relative mb-3">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-ping opacity-75"></div>
          <div className="absolute top-0 left-0 w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse"></div>
        </div>
        {text && <p className="text-sm text-gray-600 animate-pulse">{text}</p>}
      </div>
    );
  }

  if (variant === "bounce") {
    return (
      <div className={`flex flex-col items-center justify-center ${className}`}>
        <div className="mb-3">
          <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-bounce transform hover:scale-110 transition-transform">
            <div className="w-full h-full rounded-full bg-white/30 animate-pulse"></div>
          </div>
        </div>
        {text && <p className="text-sm text-gray-600 animate-pulse">{text}</p>}
      </div>
    );
  }

  return null;
};

// Alternative spinning book loader for education theme
export const StudyLoader: React.FC<{
  text?: string;
  className?: string;
  theme?: "light" | "dark";
}> = ({ text = "Loading...", className = "", theme = "light" }) => {
  const iconColor = theme === "dark" ? "text-white" : "text-blue-500";
  const textColor = theme === "dark" ? "text-white" : "text-gray-600";
  const sparkleColor1 = theme === "dark" ? "bg-yellow-300" : "bg-yellow-400";
  const sparkleColor2 = theme === "dark" ? "bg-purple-300" : "bg-purple-400";

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className="relative mb-2">
        {/* Book icon with spin animation */}
        <div className="animate-spin duration-1000">
          <svg
            className={`w-6 h-6 ${iconColor}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
          </svg>
        </div>
        {/* Sparkles around the book */}
        <div
          className={`absolute -top-0.5 -right-0.5 w-1.5 h-1.5 ${sparkleColor1} rounded-full animate-ping`}
        ></div>
        <div
          className={`absolute -bottom-0.5 -left-0.5 w-1 h-1 ${sparkleColor2} rounded-full animate-ping`}
          style={{ animationDelay: "0.5s" }}
        ></div>
      </div>
      {text && <p className={`text-xs ${textColor} animate-pulse`}>{text}</p>}
    </div>
  );
};

export default CuteLoader;
