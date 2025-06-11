// src/components/ui/progress.tsx
import * as React from "react";
import { cn } from "@/lib/utils"; // Assuming you have this utility

interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  progressClassName?: string; // To style the inner progress bar
}

const ProgressBar = React.forwardRef<HTMLDivElement, ProgressBarProps>(
  ({ className, value = 0, max = 100, progressClassName, ...props }, ref) => {
    const percentage = value && max ? Math.min(Math.max(0, value), max) / max * 100 : 0;

    return (
      <div
        ref={ref}
        className={cn(
          "relative h-2 w-full overflow-hidden rounded-full bg-gray-200", // Default background for the bar
          className // Allows overriding height and background from where it's used
        )}
        {...props}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300 ease-out", // Default styling for the progress itself
            progressClassName // This will contain the bg-color like 'bg-blue-600'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    );
  }
);
ProgressBar.displayName = "ProgressBar";

export { ProgressBar };
